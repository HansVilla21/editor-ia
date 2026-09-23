/**
 * El vocabulario de movimiento, con los valores neutros de referencias/estilo-visual.md.
 * Una idea por gráfico, sincronizada con su palabra.
 */
import type React from "react";
import { Easing, interpolate } from "remotion";

const TOPE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const lerp = (cuadro: number, entrada: number[], salida: number[], easing?: (t: number) => number) =>
  interpolate(cuadro, entrada, salida, { ...TOPE, easing });

/** blurIn: blur 8→0, opacidad 0→1, sube 14 px, en 5 cuadros, ease-out cúbico. */
export const blurIn = (cuadro: number, f0: number, dura = 5, sube = 14): React.CSSProperties => {
  if (cuadro < f0) return { opacity: 0 };
  const t = lerp(cuadro, [f0, f0 + dura], [0, 1], Easing.out(Easing.cubic));
  return {
    opacity: t,
    filter: t < 1 ? `blur(${(8 * (1 - t)).toFixed(2)}px)` : undefined,
    transform: `translateY(${(sube * (1 - t)).toFixed(2)}px)`,
  };
};

/** pop: escala 0.6→1 lineal en 5 cuadros, opacidad en 2, sin rebote. */
export const pop = (cuadro: number, f0: number): React.CSSProperties => {
  if (cuadro < f0) return { opacity: 0, transform: "scale(0.6)" };
  return {
    opacity: lerp(cuadro, [f0, f0 + 2], [0, 1]),
    transform: `scale(${lerp(cuadro, [f0, f0 + 5], [0.6, 1])})`,
  };
};

/** countUp: ease-out cúbico desde la palabra que anuncia la cifra hasta el final del número. */
export const countUp = (cuadro: number, f0: number, f1: number, hasta: number) =>
  Math.round(lerp(cuadro, [f0, Math.max(f0 + 1, f1)], [0, hasta], Easing.out(Easing.cubic)));

/** Los cuadros de los ticks del contador: uno por paso, con el espaciado de la curva. */
export const ticksDeContador = (f0: number, f1: number, pasos = 9) =>
  Array.from({ length: pasos }, (_, i) => Math.round(f0 + (Math.max(f0 + 1, f1) - f0) * (1 - Math.cbrt(1 - i / pasos))));

/** typed: 1,2 caracteres por cuadro. */
export const VELOCIDAD_TIPEO = 1.2;
export const tipeado = (texto: string, cuadro: number, f0: number) =>
  texto.slice(0, Math.max(0, Math.floor((cuadro - f0) * VELOCIDAD_TIPEO)));
export const cuadrosDeTipeo = (texto: string) => Math.ceil(texto.length / VELOCIDAD_TIPEO);

/** El cursor parpadea cada 8 cuadros. */
export const cursorVisible = (cuadro: number) => Math.floor(cuadro / 8) % 2 === 0;

/** 1234567 → "1.234.567": las cifras con punto de miles, sin depender del idioma de la máquina. */
export const conMiles = (n: number) => {
  const signo = n < 0 ? "-" : "";
  return signo + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/** Para marcar palabras con el acento: sin tildes de puntuación y en minúsculas. */
export const normal = (palabra: string) => palabra.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");
