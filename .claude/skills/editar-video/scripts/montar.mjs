/**
 * Grabaciones crudas — pegar las tomas elegidas en un solo video corrido.
 *
 * Cada costura lleva un fundido de audio de 12 ms: sin eso queda un click en cada corte.
 */
import { readFileSync, writeFileSync } from "node:fs";

import {
  ayuda,
  leerArgumentos,
  morir,
  ffmpeg,
  escribirJson,
  temporal,
  corta,
  fijo,
  sondear,
  asegurarCarpeta,
} from "./_comun.mjs";
import { leerTamano, alCuadro, filtrosDePedazo } from "./_empalmar.mjs";

const AYUDA = `
montar.mjs — pega las tomas elegidas del crudo en un video de 1080x1920 a 30 fps

  node .claude/skills/editar-video/scripts/montar.mjs <crudo> <edl.json> <salida.mp4> <montaje.json> \\
       [--tamano 1080x1920]

Recibe: el crudo y una EDL con los segundos del crudo que se quedan, en orden final.

  edl.json = [{"desde": 12.4, "hasta": 18.9, "nota": "qué se dice acá"}, ...]
  (también acepta las claves "in" y "out", por si la EDL viene de otra herramienta)

Devuelve: <salida.mp4> con las tomas pegadas, y <montaje.json> con dónde cayó cada una
          en el video montado, en segundos y en cuadros.

  --tamano   ANCHOxALTO de la salida. Con un crudo en 4K, 1440x2560 deja margen para que los
             acercamientos del zoom sigan nítidos. Si montás así, pasale el mismo --tamano a
             cortar.mjs: si no, el corte lo vuelve a bajar a 1080x1920.

Después de montar hay que cortar las pausas sobre el montaje, no sobre el crudo:
  cortar.mjs <salida.mp4> <salida.mp4> tramos.json --umbral -33 --minimo 0.24
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [crudo, edlJson, salida, montajeJson] = libres;
if (!crudo || !edlJson || !salida || !montajeJson) morir("Faltan argumentos. Probá con --ayuda.");
const tamano = leerTamano(opciones.tamano);

let edl;
try {
  edl = JSON.parse(readFileSync(edlJson, "utf8"));
} catch (e) {
  morir(`No pude leer ${corta(edlJson)}: ${e.message}`);
}
if (Array.isArray(edl.tomas)) edl = edl.tomas;
if (!Array.isArray(edl) || edl.length === 0) morir("La EDL tiene que ser una lista con al menos una toma.");

const tomas = edl.map((p, i) => {
  const desde = Number(p.desde ?? p.in ?? p.inicio);
  const hasta = Number(p.hasta ?? p.out ?? p.fin);
  if (!Number.isFinite(desde) || !Number.isFinite(hasta) || hasta <= desde) {
    morir(`La toma ${i + 1} de la EDL no tiene un rango válido (desde ${p.desde ?? p.in}, hasta ${p.hasta ?? p.out}).`);
  }
  // Los bordes van a la grilla de 30 fps: así cada toma tiene exactamente los cuadros que dice
  // el mapa, y las costuras caen en el cuadro que después usan los CORTES.
  const [a, b] = [alCuadro(desde), alCuadro(hasta)];
  if (Math.round((b - a) * 30) < 1) morir(`La toma ${i + 1} de la EDL dura menos de un cuadro.`);
  return { desde: a, hasta: b, nota: p.nota ?? "" };
});

const info = await sondear(crudo);
for (const [i, t] of tomas.entries()) {
  if (t.hasta > info.duracion + 0.05) {
    morir(`La toma ${i + 1} termina en ${fijo(t.hasta)} s y el crudo dura ${fijo(info.duracion)} s.`);
  }
}

// Cada toma entra como su propia lectura del archivo. Cortar las tres con trim sobre una
// sola lectura funciona mientras estén en orden, y una EDL casi nunca lo está: es justamente
// para reordenar. Con el orden cambiado, los tiempos de concat se desarman y el video sale
// varias veces más largo de lo que mide la suma de las tomas.
const entradas = [];
const partes = [];
const uniones = [];
tomas.forEach(({ desde, hasta }, i) => {
  // Se lee un poco de más (0,1 s): los filtros dejan exactamente los cuadros de la toma.
  entradas.push("-ss", String(desde), "-t", String((hasta - desde + 0.1).toFixed(4)), "-i", crudo);
  const { video, audio } = filtrosDePedazo(i, i, 0, hasta - desde, { tamano, recortar: false });
  partes.push(video, audio);
  uniones.push(`[v${i}][a${i}]`);
});

const archivoGrafo = temporal("-montar.txt");
writeFileSync(
  archivoGrafo,
  `${partes.join(";\n")};\n${uniones.join("")}concat=n=${tomas.length}:v=1:a=1[v][a]`,
  "utf8",
);

asegurarCarpeta(salida);
await ffmpeg([
  "-v", "error", "-y",
  ...entradas,
  "-filter_complex_script", archivoGrafo,
  "-map", "[v]", "-map", "[a]",
  "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "192k",
  salida,
]);

let enCuadros = 0;
const tabla = tomas.map(({ desde, hasta, nota }) => {
  const fila = {
    crudoDesde: Number(desde.toFixed(4)),
    crudoHasta: Number(hasta.toFixed(4)),
    inicioSalida: Number((enCuadros / 30).toFixed(4)),
    cuadro: enCuadros,
    nota,
  };
  enCuadros += Math.round((hasta - desde) * 30);
  return fila;
});
const acumulado = enCuadros / 30;

escribirJson(montajeJson, {
  origen: crudo,
  duracionSalida: Number(acumulado.toFixed(3)),
  tomas: tabla,
});

for (const f of tabla) {
  console.log(`cuadro ${String(f.cuadro).padStart(5)}  ${fijo(f.crudoDesde)}-${fijo(f.crudoHasta)} del crudo  ${f.nota}`);
}
console.log("");
console.log(`${tomas.length} tomas -> ${fijo(acumulado)} s en ${corta(salida)}`);
console.log(`montaje en ${corta(montajeJson)}`);
