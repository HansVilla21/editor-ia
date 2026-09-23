/**
 * Lo que tomas.mjs muestra sin red: los tramos que se dijeron y no están en el guion.
 */
import { fijo } from "./_comun.mjs";

/**
 * Una línea por cada cosa dicha fuera del guion. No se decide sola: puede ser una frase que la
 * persona agregó a propósito o un comentario suelto, y eso se le pregunta.
 */
export function avisosFueraDeGuion(datos) {
  return (datos?.fueraDeGuion ?? [])
    .filter((t) => String(t.texto ?? "").trim() && Number(t.fin) > Number(t.inicio))
    .map((t) => `  ${fijo(Number(t.inicio)).padStart(7)} - ${fijo(Number(t.fin)).padStart(7)} s   «${String(t.texto).trim()}»`);
}
