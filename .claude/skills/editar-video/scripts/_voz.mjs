/**
 * Lo que comparten las herramientas de voz: preparar el audio, hablar con Whisper
 * y juntar los tokens sueltos en palabras.
 */
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { ffmpeg, temporal, sondear, morir, corta } from "./_comun.mjs";

export const WHISPER_VERSION = "1.5.5";
export const carpetaWhisperPorDefecto = () => join(homedir(), ".whisper-cpp");

/**
 * Deja el audio como lo quiere Whisper: WAV de 16 kHz, mono, PCM de 16 bits.
 * Acepta un video directamente, así nadie tiene que correr ffmpeg por su cuenta:
 * el ffmpeg del proyecto vive en node_modules y no está en el PATH de la máquina.
 */
export async function prepararAudio(entrada, { desde = null, hasta = null } = {}) {
  const info = await sondear(entrada);
  if (!info.audio) morir(`${corta(entrada)} no tiene pista de audio.`);

  const yaSirve =
    info.audio.codec === "pcm_s16le" &&
    info.audio.muestreo === 16000 &&
    info.audio.canales === 1 &&
    !info.video &&
    desde === null &&
    hasta === null;

  if (yaSirve) return { ruta: entrada, temporal: false, duracion: info.duracion };

  const destino = temporal("-voz16k.wav");
  const args = ["-v", "error", "-y"];
  if (desde !== null) args.push("-ss", String(desde));
  if (hasta !== null) args.push("-to", String(hasta));
  args.push("-i", entrada, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", destino);
  await ffmpeg(args);
  return { ruta: destino, temporal: true, duracion: info.duracion };
}

/** Un mp3 liviano para subir a Gemini: el WAV de una grabación larga tarda una eternidad. */
export async function prepararMp3(entrada) {
  const destino = temporal("-voz.mp3");
  await ffmpeg([
    "-v", "error", "-y", "-i", entrada,
    "-vn", "-ar", "24000", "-ac", "1", "-b:a", "96k", destino,
  ]);
  return destino;
}

/** Un tramo suelto, con 0,3 s de silencio a cada lado: sin eso Whisper se come la primera palabra. */
export async function tramoConAire(entrada, inicio, fin, aire = 0.3) {
  const destino = temporal("-tramo.wav");
  await ffmpeg([
    "-v", "error", "-y",
    "-ss", String(Math.max(0, inicio)),
    "-to", String(fin),
    "-i", entrada,
    "-af", `adelay=${Math.round(aire * 1000)},apad=pad_dur=${aire}`,
    "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
    destino,
  ]);
  return destino;
}

export function whisperInstalado(carpeta, modelo) {
  if (!existsSync(carpeta)) return false;
  const archivos = readdirSync(carpeta);
  const hayBinario = archivos.some((n) => /^(main|whisper-cli)(\.exe)?$/i.test(n));
  const hayModelo = existsSync(join(carpeta, `ggml-${modelo}.bin`));
  return hayBinario && hayModelo;
}

export const AYUDA_WHISPER = (carpeta, modelo) =>
  [
    `Whisper no está instalado en ${carpeta}.`,
    "",
    "Se baja una sola vez y queda fuera del proyecto, así que hay que pedirlo explícitamente:",
    "",
    `  node .claude/skills/editar-video/scripts/transcribir.mjs <audio> <salida.json> --instalar --modelo ${modelo}`,
    "",
    "Son unos 500 MB con el modelo small. La otra opción, sin instalar nada, es la segunda",
    "opinión de Gemini:  --motor gemini",
  ].join("\n");

export async function asegurarWhisper(carpeta, modelo) {
  const { installWhisperCpp, downloadWhisperModel } = await import("@remotion/install-whisper-cpp");
  console.log(`Instalando Whisper en ${carpeta} (una sola vez)…`);
  await installWhisperCpp({ to: carpeta, version: WHISPER_VERSION, printOutput: false });
  const { alreadyExisted } = await downloadWhisperModel({
    model: modelo,
    folder: carpeta,
    printOutput: false,
  });
  console.log(alreadyExisted ? `El modelo ${modelo} ya estaba.` : `Modelo ${modelo} descargado.`);
}

/** Devuelve los tokens de Whisper en el formato {text, startMs, endMs}. */
export async function transcribirConWhisper({ ruta, carpeta, modelo, idioma }) {
  const { transcribe, toCaptions } = await import("@remotion/install-whisper-cpp");
  const salida = await transcribe({
    inputPath: ruta,
    whisperPath: carpeta,
    whisperCppVersion: WHISPER_VERSION,
    model: modelo,
    language: idioma,
    translateToEnglish: false,
    tokenLevelTimestamps: true,
    printOutput: false,
  });
  return toCaptions({ whisperCppOutput: salida }).captions;
}

/**
 * Whisper entrega pedazos de palabra. Un token que empieza con espacio abre palabra nueva;
 * los demás se pegan al anterior.
 */
export function juntarPalabras(tokens, { corrimiento = 0 } = {}) {
  const palabras = [];
  let actual = null;
  for (const token of tokens) {
    const crudo = token.text ?? "";
    if (!crudo.trim() && !actual) continue;
    if (/^\s/.test(crudo) || actual === null) {
      if (actual) palabras.push(actual);
      actual = {
        texto: crudo.trim(),
        inicio: Number((token.startMs / 1000 + corrimiento).toFixed(3)),
        fin: Number((token.endMs / 1000 + corrimiento).toFixed(3)),
      };
    } else {
      actual.texto += crudo;
      actual.fin = Number((token.endMs / 1000 + corrimiento).toFixed(3));
    }
  }
  if (actual) palabras.push(actual);
  return palabras.filter((p) => p.texto);
}

/** Imprime las palabras con su segundo, cortando por puntuación, para poder leerlas. */
export function imprimirPalabras(palabras, prefijo = "") {
  let linea = [];
  for (const p of palabras) {
    linea.push(`${p.texto}@${p.inicio.toFixed(2)}`);
    if (/[.,:;?!]$/.test(p.texto)) {
      console.log(prefijo + linea.join(" "));
      linea = [];
    }
  }
  if (linea.length) console.log(prefijo + linea.join(" "));
}
