/**
 * Fase 3 — qué dijo y cuándo.
 *
 * Tres modos: el normal (Whisper sobre el video ya cortado), el de segunda opinión
 * (Gemini, para los nombres propios) y el de tramos (grabaciones crudas, un tramo por vez,
 * porque con silencios largos la transcripción deriva e inventa finales).
 */
import { readFileSync } from "node:fs";

import { ayuda, leerArgumentos, morir, escribirJson, corta, fijo } from "./_comun.mjs";
import {
  prepararAudio,
  prepararMp3,
  tramoConAire,
  whisperInstalado,
  asegurarWhisper,
  transcribirConWhisper,
  juntarPalabras,
  imprimirPalabras,
  carpetaWhisperPorDefecto,
  AYUDA_WHISPER,
} from "./_voz.mjs";
import { subirArchivo, borrarArchivo, preguntar, clave } from "./_gemini.mjs";

const AYUDA = `
transcribir.mjs — pasa la voz a texto con sus tiempos

  node .claude/skills/editar-video/scripts/transcribir.mjs <audio o video> <salida.json> [opciones]

Recibe: un .wav, o directamente el .mp4 / .mov — le saca el audio solo, con el ffmpeg del
        proyecto. No hace falta correr ffmpeg por fuera.

Modos:
  (sin --motor)          Whisper local. Devuelve los tokens con sus tiempos, que es lo que
                         come palabras.mjs.
  --motor gemini         segunda opinión, para los nombres propios y las palabras raras.
                         Devuelve {"frases":[{"inicio":segundos,"texto":"…"}]}.
  --tramos <mapa.json>   grabaciones crudas: transcribe cada tramo de tramos.mjs por separado,
                         con 0,3 s de aire a los lados. Devuelve un texto por tramo, con los
                         tiempos ya llevados a segundos del crudo.

Opciones:
  --idioma es            idioma del audio (por defecto es)
  --nombres "A, B, C"    nombres propios que tiene que escribir bien (modo gemini)
  --modelo small         modelo de Whisper (tiny, base, small, medium, large-v3)
  --whisper <carpeta>    dónde está Whisper (por defecto .whisper/, dentro del proyecto)
  --instalar             baja Whisper y el modelo si faltan. Es lo mismo que npm run whisper.

Con silencios largos, la transcripción del archivo entero deriva varios segundos y a veces
inventa un cierre que nadie dijo. Para eso está --tramos.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["instalar"] });
const [entrada, salida] = libres;
if (!entrada || !salida) morir("Faltan argumentos: <audio o video> <salida.json>. Probá con --ayuda.");

const idioma = opciones.idioma ?? "es";
const modelo = opciones.modelo ?? "small";
const carpeta = opciones.whisper ?? carpetaWhisperPorDefecto();

if (opciones.motor === "gemini") {
  await conGemini();
} else if (opciones.tramos) {
  await porTramos();
} else {
  await conWhisper();
}

async function prepararWhisper() {
  if (opciones.instalar) await asegurarWhisper(carpeta, modelo);
  else if (!whisperInstalado(carpeta, modelo)) morir(AYUDA_WHISPER(carpeta, modelo));
}

async function conWhisper() {
  await prepararWhisper();
  const audio = await prepararAudio(entrada);
  if (audio.temporal) console.log(`Audio extraído de ${corta(entrada)} a 16 kHz mono.`);
  console.log(`Transcribiendo con Whisper (${modelo}, ${idioma})…`);

  const tokens = await transcribirConWhisper({ ruta: audio.ruta, carpeta, modelo, idioma });
  escribirJson(salida, tokens, { compacto: true });

  const palabras = juntarPalabras(tokens);
  imprimirPalabras(palabras);
  console.log("");
  console.log(`${tokens.length} tokens, ${palabras.length} palabras en ${corta(salida)}`);
  console.log(`Siguiente: palabras.mjs ${corta(salida)} src/<slug>/palabras.json`);
}

async function porTramos() {
  await prepararWhisper();
  const crudo = JSON.parse(readFileSync(opciones.tramos, "utf8"));
  const mapa = Array.isArray(crudo) ? crudo : crudo.tramos;
  if (!Array.isArray(mapa) || mapa.length === 0) morir(`${corta(opciones.tramos)} no tiene tramos.`);

  const audio = await prepararAudio(entrada);
  const aire = 0.3;
  const resultado = [];

  for (const [i, tramo] of mapa.entries()) {
    const inicio = Number(tramo.inicio ?? tramo.rawStart);
    const fin = Number(tramo.fin ?? tramo.rawEnd);
    if (!Number.isFinite(inicio) || !Number.isFinite(fin)) morir(`El tramo ${i} no tiene inicio y fin.`);

    const pedazo = await tramoConAire(audio.ruta, inicio, fin, aire);
    const tokens = await transcribirConWhisper({ ruta: pedazo, carpeta, modelo, idioma });
    // El aire agregado adelante hay que restarlo para volver a segundos del crudo.
    const palabras = juntarPalabras(tokens, { corrimiento: inicio - aire }).map((p) => ({
      ...p,
      inicio: Number(Math.max(inicio, p.inicio).toFixed(3)),
      fin: Number(Math.min(fin, p.fin).toFixed(3)),
    }));
    const texto = palabras.map((p) => p.texto).join(" ");
    resultado.push({ tramo: i, inicio, fin, texto, palabras });
    console.log(`[${String(i).padStart(2, "0")}] ${fijo(inicio)}-${fijo(fin)}  ${texto}`);
  }

  escribirJson(salida, resultado);
  console.log("");
  console.log(`${resultado.length} tramos transcritos en ${corta(salida)}`);
}

async function conGemini() {
  clave(); // Antes de convertir el audio.
  const nombres = opciones.nombres ?? "Claude, Claude Code, Anthropic, GitHub";
  const mp3 = await prepararMp3(entrada);
  console.log("Subiendo el audio a Gemini…");
  const archivo = await subirArchivo(mp3, "audio/mpeg");

  const instruccion = [
    "Transcribí este audio en español de forma LITERAL, palabra por palabra, tal cual lo dice,",
    "sin corregir, sin resumir y sin agregar nada que no se escuche.",
    `Nombres propios que pueden aparecer y tenés que escribir bien: ${nombres}.`,
    "Si una parte no se entiende, escribí [no se entiende] en vez de inventar.",
    'Devolvé SOLO JSON: {"frases":[{"inicio":segundos,"texto":"…"}]}, una entrada por frase.',
  ].join("\n");

  try {
    const { modelo: usado, texto, datos } = await preguntar({
      partes: [
        { file_data: { file_uri: archivo.uri, mime_type: archivo.mimeType } },
        { text: instruccion },
      ],
    });
    escribirJson(salida, datos ?? texto);
    const frases = datos?.frases ?? [];
    for (const f of frases) console.log(`${fijo(Number(f.inicio ?? 0)).padStart(7)}  ${f.texto}`);
    console.log("");
    console.log(`${frases.length} frases (${usado}) en ${corta(salida)}`);
    console.log("Esta es la segunda opinión: los subtítulos son lo que dijo, con los nombres propios de acá.");
  } catch (e) {
    morir(`\nNo pude consultar a Gemini.\n${e.message}`);
  } finally {
    await borrarArchivo(archivo);
  }
}
