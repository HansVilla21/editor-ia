/**
 * Pegar pedazos de un mismo archivo en un video corrido. Lo usan cortar.mjs y apretar.mjs.
 *
 * Cada costura lleva un fundido de audio de 12 ms: sin eso queda un clic en cada corte.
 */
import { renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ffmpeg, temporal, mismoArchivo, vecinoTemporal, asegurarCarpeta, morir, ANCHO, ALTO, FPS } from "./_comun.mjs";

/**
 * "1440x2560" -> {ancho: 1440, alto: 2560}. Sin valor, el formato del proyecto (1080x1920).
 * Una grabación en 4K se puede cortar a 1440x2560 para que los acercamientos sigan nítidos.
 */
export function leerTamano(texto) {
  if (texto === undefined || texto === true) return { ancho: ANCHO, alto: ALTO };
  const m = /^(\d+)x(\d+)$/i.exec(String(texto).trim());
  const ancho = m ? Number(m[1]) : NaN;
  const alto = m ? Number(m[2]) : NaN;
  if (!m || ancho < 2 || alto < 2 || ancho % 2 || alto % 2) {
    morir(`--tamano tiene que ser ANCHOxALTO con números pares, por ejemplo 1440x2560 (llegó "${texto}").`);
  }
  return { ancho, alto };
}

/** Lleva cualquier cuadro al tamaño pedido: llena y recorta el sobrante, nunca deforma. */
export const encuadrar = ({ ancho, alto }) =>
  `scale=${ancho}:${alto}:force_original_aspect_ratio=increase,crop=${ancho}:${alto},setsar=1`;

/** Un segundo llevado al cuadro de 30 fps más cercano. */
export const alCuadro = (s) => Math.round(Number(s) * FPS) / FPS;

/**
 * Los pedazos con sus bordes en la grilla de 30 fps, sin los que quedan vacíos.
 * Con los bordes sueltos, cada pedazo sale un cuadro más largo de lo que dice el mapa, y al final
 * del video los CORTES caen 3 o 4 cuadros antes que el salto de la imagen.
 */
export const cuadricular = (pedazos) =>
  pedazos.map(([a, b]) => [alCuadro(a), alCuadro(b)]).filter(([a, b]) => Math.round((b - a) * FPS) >= 1);

/**
 * Los filtros de un pedazo: video a 30 fps con exactamente round((b − a) · 30) cuadros, y audio
 * de esa misma duración, con fundidos de 12 ms. `recortar: false` cuando el pedazo ya viene
 * recortado desde la lectura del archivo (montar.mjs).
 */
export function filtrosDePedazo(i, entrada, a, b, { tamano = null, recortar = true } = {}) {
  const cuadros = Math.round((b - a) * FPS);
  const dura = (cuadros / FPS).toFixed(4);
  const fundido = Math.min(0.012, cuadros / FPS / 4);
  const tv = recortar ? `trim=start=${a}:end=${b},` : "";
  const ta = recortar ? `atrim=start=${a}:end=${b},` : "";
  const forma = tamano ? `,${encuadrar(tamano)}` : "";
  return {
    cuadros,
    video:
      `[${entrada}:v]${tv}setpts=PTS-STARTPTS,fps=${FPS}${forma},` +
      `tpad=stop_mode=clone:stop=2,trim=end_frame=${cuadros},setpts=PTS-STARTPTS[v${i}]`,
    audio:
      `[${entrada}:a]${ta}asetpts=PTS-STARTPTS,aresample=48000,` +
      `afade=t=in:d=${fundido},afade=t=out:st=${(cuadros / FPS - fundido).toFixed(4)}:d=${fundido},` +
      `apad=whole_dur=${dura},atrim=end=${dura}[a${i}]`,
  };
}

/**
 * Escribe <salida> con los pedazos [desde, hasta] (segundos de <entrada>) uno detrás del otro,
 * siempre a 30 fps, con los bordes llevados a la grilla de cuadros. Con `tamano` además lo lleva
 * a ese tamaño; sin él, respeta el del archivo. Devuelve los pedazos tal como quedaron escritos:
 * los mapas se arman con esos, no con los pedidos.
 * La entrada y la salida pueden ser el mismo archivo: se escribe aparte y se reemplaza al final.
 */
export async function empalmar(entrada, salidaPedida, pedazosPedidos, { tamano = null } = {}) {
  const pedazos = cuadricular(pedazosPedidos);
  if (pedazos.length === 0) morir("No quedó ningún pedazo de al menos un cuadro para pegar.");
  const partes = [];
  const uniones = [];
  pedazos.forEach(([a, b], i) => {
    const { video, audio } = filtrosDePedazo(i, 0, a, b, { tamano });
    partes.push(video, audio);
    uniones.push(`[v${i}][a${i}]`);
  });
  const grafo = `${partes.join(";\n")};\n${uniones.join("")}concat=n=${pedazos.length}:v=1:a=1[v][a]`;

  // El grafo va por archivo: con muchos pedazos la línea de comando no da abasto.
  const archivoGrafo = temporal("-empalmar.txt");
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
  return pedazos;
}
