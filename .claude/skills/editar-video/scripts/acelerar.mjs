/**
 * Fase 2c (opcional) — acelerar el video cortado, por ejemplo a 1,1x.
 *
 * Es una decisión de quien graba, no del editor: hay que preguntarle. Por defecto no se acelera.
 * El audio se acelera sin cambiar el tono (atempo) y el video queda a 30 fps.
 */
import { renameSync } from "node:fs";
import { resolve } from "node:path";

import {
  ayuda,
  leerArgumentos,
  morir,
  sondear,
  ffmpeg,
  asegurarCarpeta,
  mismoArchivo,
  vecinoTemporal,
  corta,
  fijo,
} from "./_comun.mjs";

const AYUDA = `
acelerar.mjs — acelera un video sin cambiar el tono de la voz, y lo deja a 30 fps

  node .claude/skills/editar-video/scripts/acelerar.mjs <entrada> <salida.mp4> <velocidad>

Recibe: el video cortado (después de cortar.mjs y apretar.mjs) y una velocidad entre 0.5 y 2
        (1.1 es 10 % más rápido). Acepta coma o punto decimal.
Devuelve: <salida.mp4> con el mismo tamaño, a 30 fps, que dura entrada / velocidad.

La velocidad la elige la persona que grabó: preguntale. Si no dice nada, no se acelera.

Después de acelerar, todos los tiempos cambian: transcribí el archivo acelerado y sacá de ahí
las palabras y los cortes. Nunca reuses tiempos medidos antes de acelerar.
La entrada y la salida pueden ser el mismo archivo.
`;

ayuda(process.argv, AYUDA);
const { libres } = leerArgumentos(process.argv.slice(2));
const [entrada, salidaPedida, velocidadTexto] = libres;
if (!entrada || !salidaPedida || velocidadTexto === undefined) {
  morir("Faltan argumentos: <entrada> <salida.mp4> <velocidad>. Probá con --ayuda.");
}

const velocidad = Number(String(velocidadTexto).replace(",", "."));
if (!Number.isFinite(velocidad) || velocidad < 0.5 || velocidad > 2) {
  morir(`La velocidad tiene que estar entre 0.5 y 2 (llegó "${velocidadTexto}").`);
}

const info = await sondear(entrada);
if (!info.video) morir("La entrada no tiene video.");

const enElLugar = mismoArchivo(entrada, salidaPedida);
const salida = enElLugar ? vecinoTemporal(salidaPedida) : salidaPedida;
asegurarCarpeta(salida);

const video = `[0:v]setpts=PTS/${velocidad},fps=30[v]`;
const audio = info.audio ? `;[0:a]atempo=${velocidad}[a]` : "";
await ffmpeg([
  "-v", "error", "-y",
  "-i", entrada,
  "-filter_complex", video + audio,
  "-map", "[v]",
  ...(info.audio ? ["-map", "[a]"] : []),
  "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
  ...(info.audio ? ["-c:a", "aac", "-b:a", "192k"] : []),
  salida,
]);
if (enElLugar) renameSync(salida, resolve(salidaPedida));

const final = await sondear(salidaPedida);
console.log(`${fijo(info.duracion)} s -> ${fijo(final.duracion)} s a ${velocidad}x, en ${corta(salidaPedida)}`);
console.log("Los tiempos cambiaron: transcribí este archivo, no reuses los de antes.");
