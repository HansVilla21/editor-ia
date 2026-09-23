/**
 * Hojas de contacto: sacar cuadros de un video y pegarlos en una tira para mirarlos.
 *
 * El proyecto no tiene librería de imágenes, así que el pegado lo hace el propio ffmpeg
 * (escalar, etiquetar y apilar). Si no aparece una tipografía en la máquina, la hoja sale
 * sin etiqueta encima y la correspondencia se imprime igual en pantalla.
 */
import { existsSync, rmSync } from "node:fs";
import { cpus } from "node:os";

import { ffmpeg, temporal, corta, asegurarCarpeta } from "./_comun.mjs";

/** Cuántos cuadros se sacan a la vez. Cada ffmpeg ya usa varios núcleos para decodificar. */
const PARALELO = Math.max(1, Math.min(4, Math.floor(cpus().length / 2)));

const FUENTES = [
  "C:/Windows/Fonts/consola.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Helvetica.ttc",
  "/Library/Fonts/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  "/usr/share/fonts/TTF/DejaVuSans.ttf",
  "/usr/share/fonts/dejavu/DejaVuSans.ttf",
];

let fuenteCache;
export function buscarFuente() {
  if (fuenteCache !== undefined) return fuenteCache;
  fuenteCache = FUENTES.find((f) => existsSync(f)) ?? null;
  return fuenteCache;
}

/** Dentro de un filtro, los dos puntos separan opciones: hay que escaparlos. */
const escapar = (texto) =>
  String(texto).split("\\").join("/").replace(/:/g, "\\:").replace(/'/g, "\\'");

/**
 * Saca un cuadro suelto del video: el más cercano a `segundos`. Con `ancho`, ya achicado.
 *
 * `-ss` antes de `-i` salta al cuadro clave anterior y decodifica desde ahí hasta el pedido: es
 * exacto y no recorre el archivo entero. ffmpeg devuelve el primer cuadro que empieza en ese
 * segundo o después; por eso se pide medio cuadro antes (`fps` es el del archivo), y sale el más
 * cercano, el mismo que dice la etiqueta f = round(segundos * 30).
 */
export async function extraerCuadro(video, segundos, salida, { fps = null, ancho = null } = {}) {
  asegurarCarpeta(salida);
  const medio = fps ? 0.5 / fps : 0;
  const desde = Math.max(0, segundos - medio);
  await ffmpeg([
    "-v", "error", "-y",
    "-ss", desde.toFixed(6),
    "-i", video,
    ...(ancho ? ["-vf", `scale=${ancho}:-2`] : []),
    "-frames:v", "1",
    "-update", "1",
    salida,
  ]);
  return salida;
}

/** Corre las tareas de a `cuantas` por vez y devuelve los resultados en el orden de entrada. */
async function enParalelo(tareas, cuantas) {
  const resultados = new Array(tareas.length);
  let siguiente = 0;
  const trabajar = async () => {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(cuantas, tareas.length)) }, trabajar));
  return resultados;
}

/**
 * Pega varias imágenes en una tira horizontal, con su etiqueta arriba a la izquierda.
 * Todas se llevan al mismo ancho, así que la tira sale pareja aunque cambien de tamaño.
 */
export async function armarTira(piezas, salida, { ancho = 240 } = {}) {
  asegurarCarpeta(salida);
  const fuente = buscarFuente();
  const entradas = [];
  const filtros = [];
  const etiquetas = [];

  piezas.forEach((pieza, i) => {
    entradas.push("-i", pieza.ruta);
    const cuerpo = Math.max(14, Math.round(ancho / 11));
    const texto = fuente
      ? `,drawtext=fontfile='${escapar(fuente)}':text='${escapar(pieza.etiqueta)}':` +
        `x=6:y=6:fontsize=${cuerpo}:fontcolor=#FFE45B:box=1:boxcolor=black@0.75:boxborderw=5`
      : "";
    filtros.push(`[${i}:v]scale=${ancho}:-2,setsar=1${texto}[t${i}]`);
    etiquetas.push(`[t${i}]`);
  });

  const union =
    piezas.length > 1
      ? `${etiquetas.join("")}hstack=inputs=${piezas.length}[hoja]`
      : `${etiquetas[0]}null[hoja]`;

  await ffmpeg([
    "-v",
    "error",
    "-y",
    ...entradas,
    "-filter_complex",
    `${filtros.join(";")};${union}`,
    "-map",
    "[hoja]",
    "-frames:v",
    "1",
    "-update",
    "1",
    salida,
  ]);
  return salida;
}

/**
 * Arma todas las hojas de una lista de momentos.
 * `momentos` es [{segundos, etiqueta}]; devuelve las rutas escritas.
 *
 * Cada cuadro se saca con su propia búsqueda y ya al ancho de la hoja, varios a la vez: un crudo
 * 4K de 4 minutos no se decodifica entero, ni se escriben cientos de PNG de 4K para achicarlos
 * después.
 */
export async function hojasDeContacto(video, momentos, prefijo, { porHoja = 6, ancho = 240, fps = null, paralelo = PARALELO } = {}) {
  const tareas = momentos.map((m, i) => async () => {
    const temp = temporal(`-cuadro${String(i).padStart(4, "0")}.png`);
    await extraerCuadro(video, m.segundos, temp, { fps, ancho });
    return existsSync(temp) ? { ruta: temp, etiqueta: m.etiqueta } : null;
  });
  const piezas = (await enParalelo(tareas, paralelo)).filter(Boolean);
  if (piezas.length === 0) return [];

  const hojas = [];
  // El prefijo suele venir ya con extensión (hoja.png): si se deja, los nombres
  // salen como hoja.png0.png.
  const base = prefijo.replace(/\.png$/i, "");
  for (let k = 0; k < piezas.length; k += porHoja) {
    const grupo = piezas.slice(k, k + porHoja);
    const salida = `${base}${Math.floor(k / porHoja)}.png`;
    await armarTira(grupo, salida, { ancho });
    hojas.push({ ruta: salida, etiquetas: grupo.map((g) => g.etiqueta) });
  }
  for (const pieza of piezas) rmSync(pieza.ruta, { force: true });
  return hojas;
}

export function contarHojas(hojas) {
  for (const hoja of hojas) {
    console.log(`  ${corta(hoja.ruta)}  ->  ${hoja.etiquetas.join("  ")}`);
  }
}
