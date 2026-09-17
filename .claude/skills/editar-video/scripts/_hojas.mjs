/**
 * Hojas de contacto: sacar cuadros de un video y pegarlos en una tira para mirarlos.
 *
 * El proyecto no tiene librería de imágenes, así que el pegado lo hace el propio ffmpeg
 * (escalar, etiquetar y apilar). Si no aparece una tipografía en la máquina, la hoja sale
 * sin etiqueta encima y la correspondencia se imprime igual en pantalla.
 */
import { existsSync } from "node:fs";

import { ffmpeg, temporal, corta, asegurarCarpeta } from "./_comun.mjs";

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

/** Saca un cuadro suelto del video, a tamaño completo. */
export async function extraerCuadro(video, segundos, salida) {
  asegurarCarpeta(salida);
  await ffmpeg([
    "-v",
    "error",
    "-y",
    "-ss",
    String(Math.max(0, segundos)),
    "-i",
    video,
    "-frames:v",
    "1",
    "-update",
    "1",
    salida,
  ]);
  return salida;
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
 */
export async function hojasDeContacto(video, momentos, prefijo, { porHoja = 6, ancho = 240 } = {}) {
  const piezas = [];
  for (const [i, m] of momentos.entries()) {
    const temp = temporal(`-cuadro${String(i).padStart(4, "0")}.png`);
    await extraerCuadro(video, m.segundos, temp);
    if (existsSync(temp)) piezas.push({ ruta: temp, etiqueta: m.etiqueta });
  }
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
  return hojas;
}

export function contarHojas(hojas) {
  for (const hoja of hojas) {
    console.log(`  ${corta(hoja.ruta)}  ->  ${hoja.etiquetas.join("  ")}`);
  }
}
