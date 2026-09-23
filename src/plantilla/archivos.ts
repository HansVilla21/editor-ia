/**
 * Qué archivos del usuario hay en public/. Todo lo que el video usa se busca acá antes de
 * ponerlo: si falta el video se muestra un marcador, si falta un audio se omite. Así el
 * proyecto renderiza en un clon recién bajado, sin ningún archivo propio.
 */
import { getStaticFiles, staticFile } from "remotion";
import { DIR } from "./datos";

let ultimaLista: unknown = null;
let nombres = new Set<string>();

/** ¿Existe este archivo en public/? El nombre es relativo a public/, con barras normales. */
export const hay = (nombre: string) => {
  const lista = getStaticFiles();
  if (lista !== ultimaLista) {
    ultimaLista = lista;
    nombres = new Set(lista.map((a) => a.name));
  }
  return nombres.has(nombre);
};

/** Ruta, relativa a public/, de un archivo de este video. */
export const delVideo = (archivo: string) => `${DIR}/${archivo}`;

export const hayDelVideo = (archivo: string) => hay(delVideo(archivo));

export const srcDelVideo = (archivo: string) => staticFile(delVideo(archivo));

export const VIDEO = "video.mp4";
export const VOZ = "voz.wav";
export const MUSICA = "musica.m4a";
export const PORTADA = "portada.png";
