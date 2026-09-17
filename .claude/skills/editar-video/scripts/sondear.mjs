/**
 * Fase 1 — qué es el archivo que nos pasaron, antes de tocarlo.
 */
import { ayuda, leerArgumentos, sondear, escribirJson, corta, fijo, morir } from "./_comun.mjs";

const AYUDA = `
sondear.mjs — lee un archivo de video o audio y dice qué es

  node .claude/skills/editar-video/scripts/sondear.mjs <archivo> [--json <salida.json>]

Recibe: la grabación tal como salió de la cámara o del teléfono.
Devuelve, en pantalla: duración, resolución, fps, rotación, espacio de color y audio.
Con --json, además escribe todo eso en un archivo para el resto de la cadena.

Qué mirar:
  rotación -90 o 90   el archivo es vertical rotado: mide 1920x1080 pero se ve 1080x1920.
                      ffmpeg aplica la rotación solo, no hay que corregir nada a mano.
  color distinto de bt709   hay que tonemapear antes de componer, o los colores se van.
  fps distinto de 30  el proyecto trabaja a 30: el corte y el montaje reencodean igual.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [archivo] = libres;
if (!archivo) morir("Falta el archivo. Probá con --ayuda.");

const info = await sondear(archivo);

console.log(`archivo     ${corta(archivo)}`);
console.log(`duración    ${fijo(info.duracion, 2)} s`);
console.log(`contenedor  ${info.contenedor ?? "desconocido"}`);

if (info.video) {
  const v = info.video;
  console.log(`video       ${v.codec} ${v.ancho}x${v.alto} a ${v.fps ?? "?"} fps`);
  console.log(`rotación    ${v.rotacion} grados  ->  se ve ${v.anchoMostrado}x${v.altoMostrado}`);
  console.log(`color       ${v.colores ?? "sin declarar"} / ${v.primarios ?? "-"} / ${v.transferencia ?? "-"} (${v.pixel ?? "-"})`);
} else {
  console.log("video       no tiene");
}

if (info.audio) {
  console.log(`audio       ${info.audio.codec} ${info.audio.canales} canal(es) a ${info.audio.muestreo} Hz`);
} else {
  console.log("audio       no tiene");
}

const avisos = [];
if (info.video) {
  if (Math.abs(info.video.rotacion) === 90 || Math.abs(info.video.rotacion) === 270) {
    avisos.push("Es vertical rotado. ffmpeg aplica la rotación solo: no hay que girarlo a mano.");
  }
  if (info.video.anchoMostrado > info.video.altoMostrado) {
    avisos.push("Se ve horizontal. Va a haber que recortar para llegar a 1080x1920.");
  }
  if (info.video.colores && info.video.colores !== "bt709") {
    avisos.push(`El espacio de color es ${info.video.colores}, no bt709: hay que tonemapear.`);
  }
  if (info.video.fps && Math.abs(info.video.fps - 30) > 0.5) {
    avisos.push(`Está a ${info.video.fps} fps y el proyecto trabaja a 30: cortar.mjs lo lleva a 30.`);
  }
}
if (!info.audio) avisos.push("No tiene pista de audio: no se puede cortar por silencios ni transcribir.");

if (avisos.length) {
  console.log("");
  for (const a of avisos) console.log(`aviso  ${a}`);
}

if (opciones.json) {
  escribirJson(opciones.json, info);
  console.log(`\nDatos completos en ${corta(opciones.json)}`);
}
