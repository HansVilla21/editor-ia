/**
 * Fase 2b — el mapa de intentos de una grabación cruda.
 *
 * Cuando la persona lee frase por frase y repite cuando se traba, primero hay que saber
 * qué intentos hay. Los tiempos que devuelve son APROXIMADOS y a veces confunde una pausa a
 * mitad de frase con un intento cortado: sirve para saber qué buscar, no para cortar.
 * Los límites reales salen de tramos.mjs.
 */
import { readFileSync, existsSync } from "node:fs";

import { ayuda, leerArgumentos, morir, escribirJson, corta, fijo, sondear } from "./_comun.mjs";
import { subirArchivo, borrarArchivo, preguntar, mimeDe, clave } from "./_gemini.mjs";
import { prepararMp3 } from "./_voz.mjs";

const AYUDA = `
tomas.mjs — lista cada intento de cada línea del guion en una grabación cruda

  node .claude/skills/editar-video/scripts/tomas.mjs <grabación> <guion.txt> <tomas.json>

Recibe: la grabación cruda (audio o video; si es video le saca el audio solo) y el guion con
        una frase por línea.
Devuelve: <tomas.json> con cada intento —qué líneas cubre, si está completo, si es fluido, qué
          falló y qué se dijo—, los tramos fuera de guion, y una recomendación por línea.

Los tiempos son aproximados. El flujo completo está en referencias/tomas.md:
  1. sondear.mjs      qué es el archivo
  2. tomas.mjs        qué intentos hay (esto)
  3. tramos.mjs       los límites reales, medidos sobre la onda
  4. transcribir.mjs --tramos   el texto de cada tramo
  5. armar edl.json   la última toma completa y fluida de cada línea
  6. montar.mjs       pegarlas
  7. cortar.mjs       sacar las pausas del montaje
`;

ayuda(process.argv, AYUDA);
const { libres } = leerArgumentos(process.argv.slice(2));
const [grabacion, guionRuta, salida] = libres;
if (!grabacion || !guionRuta || !salida) morir("Faltan argumentos: <grabación> <guion.txt> <tomas.json>. Probá con --ayuda.");
if (!existsSync(guionRuta)) morir(`No encuentro ${corta(guionRuta)}.`);

const lineas = readFileSync(guionRuta, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
if (lineas.length === 0) morir("El guion está vacío. Va una frase por línea.");

clave(); // Antes de convertir el audio: si falta la clave, no tiene sentido trabajar.

const info = await sondear(grabacion);
if (!info.audio) morir("La grabación no tiene audio.");

// Siempre se sube un mp3 liviano: subir el video entero tarda muchísimo y no aporta nada.
const audio = await prepararMp3(grabacion);

const instruccion = [
  "Esta es la grabación CRUDA de una persona leyendo un guion para un video corto, en español.",
  "Cuando se equivoca, se detiene y repite la frase; a veces repite varias veces. También hay",
  "silencios, muletillas y comentarios fuera de guion.",
  "",
  "GUION (una línea por frase):",
  ...lineas.map((l, i) => `${i + 1}. ${l}`),
  "",
  `La grabación dura ${fijo(info.duracion)} segundos. Escuchá TODO el audio con cuidado.`,
  "Para CADA intento de decir cada línea del guion, aunque sea parcial, devolvé una entrada.",
  "Tiempos en segundos con 0,1 de precisión: inicio es la primera sílaba, fin la última.",
  "",
  "  completo   dijo la línea entera (variaciones menores de palabras están bien)",
  "  fluido     sin trabarse, sin corregirse a mitad, sin alargar sílabas raro, sin cortar la última palabra",
  "  problema   qué falló, si no sirve",
  "  texto      lo que dijo, literal",
  "  lineas     si un intento cubre varias líneas seguidas, van todas",
  "",
  "Devolvé SOLO JSON:",
  '{"intentos":[{"lineas":[1],"inicio":0,"fin":0,"completo":true,"fluido":true,"problema":"","texto":""}],',
  ' "fueraDeGuion":[{"inicio":0,"fin":0,"texto":""}],',
  ' "recomendacion":[{"linea":1,"inicio":0,"motivo":""}]}',
  "En recomendacion elegí para cada línea el MEJOR intento: normalmente el último completo y fluido.",
].join("\n");

console.log(`Subiendo ${fijo(info.duracion)} s de audio a Gemini…`);
let archivo;
try {
  archivo = await subirArchivo(audio, mimeDe(audio));
  const { modelo, datos } = await preguntar({
    partes: [
      { file_data: { file_uri: archivo.uri, mime_type: archivo.mimeType } },
      { text: instruccion },
    ],
  });

  escribirJson(salida, { grabacion, guion: guionRuta, modelo, ...datos });

  const intentos = datos?.intentos ?? [];
  for (const intento of intentos) {
    const marcas = [intento.completo ? "completo" : "PARCIAL", intento.fluido ? "fluido" : "TRABADO"];
    console.log(
      `${fijo(Number(intento.inicio) || 0).padStart(7)} - ${fijo(Number(intento.fin) || 0).padStart(7)}  ` +
        `línea ${String((intento.lineas ?? []).join(",")).padEnd(6)} ${marcas.join(" ").padEnd(18)} ${intento.texto ?? ""}`,
    );
    if (intento.problema) console.log(`${" ".repeat(19)}problema: ${intento.problema}`);
  }

  const recomendacion = datos?.recomendacion ?? [];
  if (recomendacion.length) {
    console.log("");
    console.log("recomendación por línea");
    for (const r of recomendacion) {
      console.log(`  línea ${String(r.linea).padStart(3)}  desde ${fijo(Number(r.inicio) || 0).padStart(7)} s   ${r.motivo ?? ""}`);
    }
  }

  const sinCubrir = lineas
    .map((_, i) => i + 1)
    .filter((n) => !intentos.some((t) => (t.lineas ?? []).includes(n)));
  if (sinCubrir.length) {
    console.log("");
    console.log(`aviso  Estas líneas no aparecen en ningún intento: ${sinCubrir.join(", ")}`);
  }

  console.log("");
  console.log(`${intentos.length} intentos en ${corta(salida)} (${modelo})`);
  console.log("Los tiempos son aproximados. Para cortar, usar tramos.mjs sobre la onda.");
} catch (e) {
  morir(`\nNo pude consultar a Gemini.\n${e.message}`);
} finally {
  await borrarArchivo(archivo);
}
