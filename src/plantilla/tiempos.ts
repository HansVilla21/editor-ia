/**
 * Los datos de datos.ts pasados a cuadros, con el redondeo compartido f = round(s · 30).
 *
 * El video dura exactamente VIDEO_CUADROS: termina en toma real, nunca en un cuadro congelado.
 */
import { BLOQUES, CORTES, CTA, VIDEO_CUADROS } from "./datos";
import type { Bloque } from "./tipos";

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;
/** Split: el video va de 0 a 960 y el panel de 960 a 1920. */
export const COSTURA = 960;

/** Segundos a cuadros. El mismo redondeo que palabras.mjs: si no, la costura muestra el subtítulo viejo. */
export const f = (s: number) => Math.round(s * FPS);

export const DURACION = Math.max(1, Math.floor(VIDEO_CUADROS));

export type BloqueEnCuadros = Bloque & {
  indice: number;
  desdeF: number;
  hastaF: number;
  /** Lleva transición de entrada: el bloque anterior es de otro tipo. */
  entrada: boolean;
  /** Lleva transición de salida: el bloque siguiente es de otro tipo. */
  salida: boolean;
};

const enOrden: Bloque[] = [...BLOQUES].sort((a, b) => a.desde - b.desde).filter((b) => f(b.desde) < DURACION);
const base: Bloque[] = enOrden.length ? enOrden : [{ desde: 0, hasta: DURACION / FPS, tipo: "full" }];

/**
 * Los bloques quedan pegados: cada uno termina donde empieza el siguiente, el primero arranca
 * en el cuadro 0 y el último se estira hasta el final del video.
 */
export const BLOQUES_F: BloqueEnCuadros[] = base.map((b, i) => {
  const antes = base[i - 1];
  const despues = base[i + 1];
  return {
    ...b,
    indice: i,
    desdeF: i === 0 ? 0 : f(b.desde),
    hastaF: despues ? f(despues.desde) : DURACION,
    entrada: Boolean(antes) && antes.tipo !== b.tipo,
    salida: Boolean(despues) && despues.tipo !== b.tipo,
  };
});

export const indiceDeBloque = (cuadro: number) => {
  let i = 0;
  for (let k = 0; k < BLOQUES_F.length; k++) if (BLOQUES_F[k].desdeF <= cuadro) i = k;
  return i;
};

export const bloqueEn = (cuadro: number) => BLOQUES_F[indiceDeBloque(cuadro)];

/** Los jump cuts en cuadros, ordenados. */
export const CORTES_F = CORTES.map(f).sort((a, b) => a - b);

/** Cuántos jump cuts pasaron: el zoom alterna con la paridad de este número. */
export const tramoEn = (cuadro: number) => CORTES_F.filter((c) => c > 0 && c <= cuadro).length;

/** Desde acá se ve el cierre y se ocultan los subtítulos. */
export const CTA_F = Math.min(DURACION, Math.max(0, f(CTA.desde)));
