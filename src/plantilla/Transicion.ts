/**
 * La transición entre full y split, con los valores neutros de referencias/estilo-visual.md.
 *
 * Se aplica al plano completo —video y panel juntos—, con origen en el centro del cuadro.
 * Los subtítulos NO se transforman: si se mueven con el plano, el ojo pierde la línea de lectura.
 * Dos bloques seguidos del mismo tipo no llevan transición: son un corte seco.
 */
import type React from "react";
import type { BloqueEnCuadros } from "./tiempos";

/** 6 cuadros antes del corte: el plano sube, crece y se desenfoca. */
export const SALIDA = {
  dy: [0, -12, -30, -54, -84, -120],
  s: [1, 1.01, 1.04, 1.09, 1.16, 1.25],
  blur: [0, 0.6, 1.2, 1.8, 2.4, 3.0],
};

/** 10 cuadros desde el corte: el plano nuevo aterriza desde un poco más grande. */
export const ENTRADA = {
  s: [1.14, 1.1, 1.07, 1.045, 1.028, 1.016, 1.008, 1.003, 1.001, 1],
  dy: [10, 26, 34, 28, 18, 10, 4, 0, -2, 0],
  blur: [2.0, 1.6, 1.2, 0.9, 0.6, 0.4, 0.2, 0, 0, 0],
};

const valor = (tabla: number[], i: number) => tabla[Math.max(0, Math.min(tabla.length - 1, i))];

export const transicion = (cuadro: number, bloque: BloqueEnCuadros): React.CSSProperties => {
  let dy = 0;
  let s = 1;
  let blur = 0;
  const desdeInicio = cuadro - bloque.desdeF;
  const antesDelFin = bloque.hastaF - SALIDA.s.length;
  if (bloque.entrada && desdeInicio < ENTRADA.s.length) {
    dy = valor(ENTRADA.dy, desdeInicio);
    s = valor(ENTRADA.s, desdeInicio);
    blur = valor(ENTRADA.blur, desdeInicio);
  } else if (bloque.salida && cuadro >= antesDelFin) {
    const i = cuadro - antesDelFin;
    dy = valor(SALIDA.dy, i);
    s = valor(SALIDA.s, i);
    blur = valor(SALIDA.blur, i);
  }
  if (dy === 0 && s === 1 && blur === 0) return {};
  return {
    transform: `translateY(${dy}px) scale(${s})`,
    transformOrigin: "540px 960px",
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
  };
};
