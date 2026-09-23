/**
 * Fase 2 — sacar las pausas de una grabación y dejarla en 1080x1920 a 30 fps.
 *
 * Además del video deja un mapa de tramos: los inicios de cada tramo son los jump cuts,
 * y de ahí sale el zoom alterno del estilo visual.
 */
import { renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  sondear,
  detectarSilencios,
  ffmpeg,
  escribirJson,
  temporal,
  corta,
  fijo,
  cuadroDe,
  mismoArchivo,
  vecinoTemporal,
  asegurarCarpeta,
} from "./_comun.mjs";

const AYUDA = `
cortar.mjs — corta los silencios y deja el video listo para componer

  node .claude/skills/editar-video/scripts/cortar.mjs <entrada> <salida.mp4> <tramos.json> \\
       [--umbral -36] [--minimo 0.28] [--antes 0.08] [--tras 0.14]

Recibe: la grabación (o el montaje de tomas, si la grabación era cruda).
Devuelve: <salida.mp4> a 1080x1920 y 30 fps, y <tramos.json> con cada tramo que quedó,
          sus segundos en el original, dónde cae en la salida y en qué cuadro empieza.
          Esos cuadros son los CORTES: los jump cuts del zoom alterno.

  --umbral   decibeles por debajo de los cuales es silencio (más alto corta más)
  --minimo   cuánto tiene que durar un silencio para que valga la pena sacarlo
  --antes    cuánto se deja antes de cada frase
  --tras     cuánto se deja después de cada frase. La cola de una "s" final tiene poca
             energía, ffmpeg la cuenta como silencio, y con menos de 0.14 se oye mocha
  --aire X   el atajo de antes: equivale a --antes X --tras max(X, 0.14)

La entrada y la salida pueden ser el mismo archivo: se escribe aparte y recién al final
se reemplaza.

Verificación: al terminar imprime el silencio que queda. Tiene que ser 5 % o menos.
Si queda alto, hay ruido de sala por encima del umbral: subirlo de a 2 dB y volver a medir.
Nunca bajar --minimo por debajo de 0.20: se come los finales suaves.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [entrada, salidaPedida, mapaJson] = libres;
if (!entrada || !salidaPedida || !mapaJson) morir("Faltan argumentos. Probá con --ayuda.");

const umbral = numero(opciones.umbral, -36);
const minimo = numero(opciones.minimo, 0.28);
// --aire es el atajo viejo: el mismo valor a los dos lados, pero después de la palabra nunca
// menos de 0.14 s, que es donde vive la cola de una "s" final.
const aire = opciones.aire === undefined ? null : numero(opciones.aire, 0.08);
const antes = numero(opciones.antes, aire ?? 0.08);
const tras = numero(opciones.tras, Math.max(aire ?? 0, 0.14));

const info = await sondear(entrada);
if (!info.audio) morir("La entrada no tiene audio: no hay silencios que detectar.");
const duracion = info.duracion;

const silencios = await detectarSilencios(entrada, { umbral, minimo, duracion });

// Lo que se queda es el hueco entre silencios, con aire a los lados.
// Un pedazo más corto que el aire es puro relleno: pasa cuando la grabación arranca o
// termina en silencio, y si se cuela mete un jump cut falso en CORTES.
const minimoTramo = Math.max(0.1, antes + 0.02);
const bruto = [];
let t = 0;
for (const [inicio, fin] of silencios) {
  const a = t;
  const b = inicio + tras;
  // Sin sonido entre el silencio anterior y este (la grabación arranca callada) no hay tramo.
  if (b - a > minimoTramo && inicio > a + antes) bruto.push([Math.max(0, a), Math.min(duracion, b)]);
  t = Math.max(0, fin - antes);
}
if (duracion - t > minimoTramo) bruto.push([t, duracion]);

// Dos tramos casi pegados son un tramo: cortar ahí solo mete un click.
const tramos = [];
for (const [a, b] of bruto) {
  if (tramos.length && a - tramos[tramos.length - 1][1] < 0.12) tramos[tramos.length - 1][1] = b;
  else tramos.push([a, b]);
}
if (tramos.length === 0) morir("No quedó ningún tramo con voz. Revisá el umbral.");

const partes = [];
const uniones = [];
tramos.forEach(([a, b], i) => {
  const fundido = Math.min(0.012, (b - a) / 4);
  partes.push(
    `[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS,fps=30,` +
      `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[v${i}]`,
  );
  partes.push(
    `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,aresample=48000,` +
      `afade=t=in:d=${fundido},afade=t=out:st=${(b - a - fundido).toFixed(4)}:d=${fundido}[a${i}]`,
  );
  uniones.push(`[v${i}][a${i}]`);
});
const grafo = `${partes.join(";\n")};\n${uniones.join("")}concat=n=${tramos.length}:v=1:a=1[v][a]`;

// El grafo va por archivo: con muchos tramos la línea de comando no da abasto.
const archivoGrafo = temporal("-cortar.txt");
writeFileSync(archivoGrafo, grafo, "utf8");

const enElLugar = mismoArchivo(entrada, salidaPedida);
const salida = enElLugar ? vecinoTemporal(salidaPedida) : salidaPedida;
asegurarCarpeta(salida);

await ffmpeg([
  "-v", "error", "-y",
  "-i", entrada,
  "-filter_complex_script", archivoGrafo,
  "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k",
  salida,
]);

if (enElLugar) renameSync(salida, resolve(salidaPedida));

let acumulado = 0;
const tabla = tramos.map(([a, b]) => {
  const fila = {
    inicioOrigen: Number(a.toFixed(3)),
    finOrigen: Number(b.toFixed(3)),
    inicioSalida: Number(acumulado.toFixed(3)),
    cuadro: cuadroDe(acumulado),
  };
  acumulado += b - a;
  return fila;
});

const finalInfo = await sondear(salidaPedida);
const silenciosFinales = await detectarSilencios(salidaPedida, {
  umbral,
  minimo,
  duracion: finalInfo.duracion,
});
const silencioRestante = silenciosFinales.reduce((s, [a, b]) => s + (b - a), 0);
const porcentaje = (100 * silencioRestante) / Math.max(0.001, finalInfo.duracion);

escribirJson(mapaJson, {
  origen: entrada,
  duracionOrigen: Number(duracion.toFixed(3)),
  duracionSalida: Number(finalInfo.duracion.toFixed(3)),
  umbral,
  minimo,
  antes,
  tras,
  silencioRestante: Number(porcentaje.toFixed(1)),
  cortes: tabla.map((f) => f.cuadro),
  tramos: tabla,
});

console.log(`${tramos.length} tramos: ${fijo(duracion)} s -> ${fijo(finalInfo.duracion)} s (${fijo(100 * (1 - finalInfo.duracion / duracion), 1)} % recortado)`);
console.log(`video en ${corta(salidaPedida)}`);
console.log(`tramos y CORTES en ${corta(mapaJson)}`);
console.log(`silencio restante: ${fijo(porcentaje, 1)} %`);

if (porcentaje > 5) {
  console.log("");
  console.log("aviso  Pasa el 5 %. Hay ruido de sala por encima del umbral.");
  console.log(`       Probá --umbral ${umbral + 2} y volvé a medir. No bajes --minimo de 0.20.`);
}
