/**
 * Dónde queda la cara en cada layout, con las fórmulas de referencias/estilo-visual.md.
 *
 * Todo sale de los tres números medidos en ESTE video (ENCUADRE en datos.ts). El zoom alterno
 * tiene origen en la cara, así que el centro no se mueve y el pelo y el mentón se alejan.
 */
import { ENCUADRE } from "./datos";
import { ALTO, COSTURA } from "./tiempos";

export type Tipo = "full" | "split";

/** Segundo nivel del zoom alterno de los jump cuts. */
export const ZOOM: Record<Tipo, number> = { full: 1.08, split: 1.05 };

export const CX = ENCUADRE.cx ?? 540;
export const CY = ENCUADRE.cy;

/**
 * Split: el video a escala 1, subido para que el centro de la cara quede en y = 470 de la
 * mitad de arriba. Nunca corrimiento lateral. Acotado para que el video siempre cubra la mitad.
 */
export const CORRIMIENTO_SPLIT = Math.max(-(ALTO - COSTURA), Math.min(0, -(CY - 470)));

/** Un punto de la cara con el zoom aplicado alrededor del centro de la cara. */
const conZoom = (y: number, zoom: number) => CY + (y - CY) * zoom;

const desplazamiento = (tipo: Tipo) => (tipo === "split" ? CORRIMIENTO_SPLIT : 0);

/** Lo más alto que llega el pelo en pantalla (con el zoom mayor). */
export const peloEnPantalla = (tipo: Tipo) => conZoom(ENCUADRE.pelo, ZOOM[tipo]) + desplazamiento(tipo);

/** Lo más bajo que llega el mentón en pantalla (con el zoom mayor). */
export const mentonEnPantalla = (tipo: Tipo) => conZoom(ENCUADRE.menton, ZOOM[tipo]) + desplazamiento(tipo);

/**
 * Centro de los subtítulos en full: a la altura del pecho, calculado desde el mentón porque el
 * zoom tiene origen en la cara. Tope en 1560, arriba de la interfaz de la app.
 */
export const Y_SUBTITULOS_FULL = Math.round(Math.min(1560, CY + (ENCUADRE.menton - CY) * 1.25 + 120));

/** En split, los subtítulos van centrados sobre la costura. */
export const Y_SUBTITULOS_SPLIT = COSTURA;

/** Zona segura de la interfaz de Instagram, TikTok y Shorts: arriba y abajo no va nada importante. */
export const ZONA = { arriba: 240, abajo: 1680 };
