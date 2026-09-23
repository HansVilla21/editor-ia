/**
 * Pegar pedazos de un mismo archivo en un video corrido. Lo usan cortar.mjs y apretar.mjs.
 *
 * Cada costura lleva un fundido de audio de 12 ms: sin eso queda un clic en cada corte.
 */
import { renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ffmpeg, temporal, mismoArchivo, vecinoTemporal, asegurarCarpeta, morir, ANCHO, ALTO } from "./_comun.mjs";

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

/**
 * Escribe <salida> con los pedazos [desde, hasta] (segundos de <entrada>) uno detrás del otro.
 * Con `tamano` además lo lleva a 30 fps y a ese tamaño; sin él, respeta el del archivo.
 * La entrada y la salida pueden ser el mismo archivo: se escribe aparte y se reemplaza al final.
 */
export async function empalmar(entrada, salidaPedida, pedazos, { tamano = null } = {}) {
  const partes = [];
  const uniones = [];
  pedazos.forEach(([a, b], i) => {
    const fundido = Math.min(0.012, (b - a) / 4);
    const video = tamano ? `,fps=30,${encuadrar(tamano)}` : "";
    partes.push(`[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS${video}[v${i}]`);
    partes.push(
      `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,aresample=48000,` +
        `afade=t=in:d=${fundido},afade=t=out:st=${(b - a - fundido).toFixed(4)}:d=${fundido}[a${i}]`,
    );
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
}
