/**
 * Fase 8 y 9 — llevar un archivo a un nivel de sonoridad concreto.
 *
 * Dos pasadas de loudnorm: primero se mide, después se corrige con lo medido. Si la ganancia
 * no hace pasar el pico verdadero, la corrección es lineal —no toca la dinámica—; si lo hace,
 * loudnorm cae solo a modo dinámico. En un master eso está bien. En la voz no: ahí se usa
 * --fija, que es ganancia fija más limitador.
 */
import { extname } from "node:path";

import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  ffmpeg,
  corta,
  fijo,
  escribirJson,
  asegurarCarpeta,
} from "./_comun.mjs";

const AYUDA = `
nivelar.mjs — lleva un audio (o el audio de un video) a una sonoridad dada

  node .claude/skills/editar-video/scripts/nivelar.mjs <entrada> <salida> <lufs> \\
       [--copiar-video] [--pico -1.5] [--fija] [--limite -3] [--json <medicion.json>]

Recibe: el archivo y el objetivo en LUFS.
Devuelve: <salida> nivelada, y en pantalla lo medido, la ganancia aplicada y el modo.

  --copiar-video   no reencodea la imagen: solo cambia el audio. Es lo que se usa en el master.
  --pico           pico verdadero máximo en dB (por defecto -1.5)
  --fija           ganancia fija + limitador, sin loudnorm. Es lo que necesita la VOZ:
                   el modo dinámico de loudnorm la hace respirar raro.
  --limite         techo del limitador de --fija (por defecto -3 dB)

Los niveles del proyecto:
  voz     -19 LUFS con --fija, a WAV (el AAC mete saturaciones que no estaban)
  música  -33 LUFS
  master  -14 LUFS con --copiar-video, pico verdadero <= -1.3 dB
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2), {
  banderas: ["copiar-video", "fija"],
});
const [entrada, salida, objetivoCrudo] = libres;
if (!entrada || !salida || objetivoCrudo === undefined) morir("Faltan argumentos. Probá con --ayuda.");

const objetivo = Number(objetivoCrudo);
if (!Number.isFinite(objetivo)) morir("El objetivo tiene que ser un número en LUFS, por ejemplo -14.");
const pico = numero(opciones.pico, -1.5);
const limite = numero(opciones.limite, -3);
const copiarVideo = Boolean(opciones["copiar-video"]);

/** Códec de audio según la extensión pedida: WAV cuando el destino es WAV. */
function codecDe(ruta) {
  const ext = extname(ruta).toLowerCase();
  if (ext === ".wav") return ["-c:a", "pcm_s16le"];
  if (ext === ".flac") return ["-c:a", "flac"];
  return ["-c:a", "aac", "-b:a", copiarVideo ? "256k" : "192k"];
}

// Primera pasada: medir.
const medicionCruda = await ffmpeg(
  ["-i", entrada, "-af", `loudnorm=I=${objetivo}:TP=${pico}:LRA=11:print_format=json`, "-f", "null", "-"],
  { tolerar: true },
);
const bloques = medicionCruda.error.match(/\{[^{}]*"input_i"[^{}]*\}/g);
if (!bloques) morir(`No pude medir ${corta(entrada)}. ¿Tiene audio?`);
const m = JSON.parse(bloques[bloques.length - 1]);

const medido = Number(m.input_i);
const picoMedido = Number(m.input_tp);
const ganancia = objetivo - medido;

asegurarCarpeta(salida);
const comunes = ["-v", "error", "-y", "-i", entrada, "-ar", "48000"];
const video = copiarVideo ? ["-c:v", "copy"] : ["-vn"];

let modo;
if (opciones.fija) {
  modo = `fija (${fijo(ganancia, 2)} dB + limitador a ${limite} dB)`;
  await ffmpeg([
    ...comunes,
    "-af",
    `volume=${ganancia.toFixed(2)}dB,alimiter=limit=${limite}dB:level=disabled`,
    ...video,
    ...codecDe(salida),
    salida,
  ]);
} else {
  const filtro =
    `loudnorm=I=${objetivo}:TP=${pico}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:` +
    `measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  await ffmpeg([...comunes, "-af", filtro, ...video, ...codecDe(salida), salida]);
  modo =
    picoMedido + ganancia <= pico
      ? "lineal (no toca la dinámica)"
      : `DINÁMICO (el pico verdadero pasaría ${pico} dBTP)`;
}

// Segunda medición, sobre lo que quedó: es la que vale.
const verificacion = await ffmpeg(["-i", salida, "-af", "ebur128=peak=true", "-f", "null", "-"], {
  tolerar: true,
});
const resumen = verificacion.error.slice(verificacion.error.lastIndexOf("Summary"));
const dato = (etiqueta) => {
  const encontrado = resumen.match(new RegExp(`${etiqueta}:\\s*(-?[\\d.]+|-inf)`));
  return encontrado ? Number(encontrado[1]) : null;
};
const finalLufs = dato("I");
const finalPico = dato("Peak");

console.log(`entrada   ${fijo(medido, 2)} LUFS, pico verdadero ${fijo(picoMedido, 2)} dBTP`);
console.log(`ganancia  ${fijo(ganancia, 2)} dB`);
console.log(`modo      ${modo}`);
console.log(`salida    ${finalLufs === null ? "?" : fijo(finalLufs, 2)} LUFS, pico verdadero ${finalPico === null ? "?" : fijo(finalPico, 2)} dBTP`);
console.log(`archivo   ${corta(salida)}`);

if (!opciones.fija && modo.startsWith("DINÁMICO")) {
  console.log("");
  console.log("aviso  Modo dinámico. En un master está bien: el limitador apenas actúa.");
  console.log("       Si esto es la voz, rehacelo con --fija: el modo dinámico la hace respirar raro.");
}

if (opciones.json) {
  escribirJson(opciones.json, {
    entrada,
    salida,
    objetivo,
    medido,
    picoMedido,
    ganancia: Number(ganancia.toFixed(2)),
    modo,
    finalLufs,
    finalPico,
  });
  console.log(`medición en ${corta(opciones.json)}`);
}
