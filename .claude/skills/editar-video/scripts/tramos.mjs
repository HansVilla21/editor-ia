/**
 * Grabaciones crudas — dónde habla y dónde no, medido sobre la onda.
 *
 * Estos son los límites reales. El mapa de intentos de tomas.mjs sirve para saber qué
 * buscar; para cortar se usan estos.
 */
import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  sondear,
  detectarSilencios,
  escribirJson,
  corta,
  fijo,
} from "./_comun.mjs";

const AYUDA = `
tramos.mjs — los tramos de voz de una grabación, medidos sobre la onda

  node .claude/skills/editar-video/scripts/tramos.mjs <audio o video> <mapa.json> \\
       [--umbral -42] [--minimo 0.3] [--aire 0.12]

Recibe: el crudo (wav de 16 kHz mono, o cualquier archivo con audio).
Devuelve: <mapa.json> con cada tramo de voz en segundos del crudo, y el listado en pantalla.
          Ese mapa es lo que come transcribir.mjs --tramos, que transcribe uno por uno.

  --umbral   decibeles por debajo de los cuales es silencio
  --minimo   cuánto tiene que durar un silencio para separar dos tramos
  --aire     cuánto se agrega antes y después de cada tramo

Los umbrales dependen de la sala y del micrófono: el primer video se usa para ajustarlos,
y los que funcionen se anotan en memory/decisiones.md (Umbrales de corte).
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [entrada, mapaJson] = libres;
if (!entrada || !mapaJson) morir("Faltan argumentos. Probá con --ayuda.");

const umbral = numero(opciones.umbral, -42);
const minimo = numero(opciones.minimo, 0.3);
const aire = numero(opciones.aire, 0.12);

const info = await sondear(entrada);
if (!info.audio) morir("El archivo no tiene audio.");
const duracion = info.duracion;

const silencios = await detectarSilencios(entrada, { umbral, minimo, duracion });

const tramos = [];
let t = 0;
for (const [inicio, fin] of silencios) {
  if (inicio - t > 0.08) {
    tramos.push([Math.max(0, t - aire), Math.min(duracion, inicio + aire)]);
  }
  t = fin;
}
if (duracion - t > 0.08) tramos.push([Math.max(0, t - aire), duracion]);

if (tramos.length === 0) morir("No detecté voz. Revisá el umbral o el archivo.");

const tabla = tramos.map(([inicio, fin], indice) => ({
  indice,
  inicio: Number(inicio.toFixed(3)),
  fin: Number(fin.toFixed(3)),
  duracion: Number((fin - inicio).toFixed(3)),
}));

const hablado = tabla.reduce((s, f) => s + f.duracion, 0);

escribirJson(mapaJson, {
  origen: entrada,
  duracion: Number(duracion.toFixed(3)),
  umbral,
  minimo,
  aire,
  tramos: tabla,
});

for (const f of tabla) {
  console.log(`[${String(f.indice).padStart(2, "0")}] ${fijo(f.inicio)} - ${fijo(f.fin)}  (${fijo(f.duracion)} s)`);
}
console.log("");
console.log(`${tabla.length} tramos de voz, ${fijo(hablado)} s de ${fijo(duracion)} s (${fijo((100 * hablado) / duracion, 1)} % hablado)`);
console.log(`mapa en ${corta(mapaJson)}`);
