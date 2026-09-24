/**
 * Lo que tomas.mjs arma y muestra sin red: el pedido a Gemini, cómo se marca cada intento y los
 * tramos que se dijeron y no están en el guion.
 */
import { fijo } from "./_comun.mjs";

/**
 * El pedido a Gemini. "Trabado" y "con pausas" van separados: un silencio largo a mitad de la
 * línea no arruina la toma, porque el corte de silencios lo saca. `fluido` conserva su nombre
 * (los tomas.json viejos lo usan) y `pausas` es el campo nuevo.
 */
export function instruccionDeTomas(lineas, duracion) {
  return [
    "Esta es la grabación CRUDA de una persona leyendo un guion para un video corto, en español.",
    "Cuando se equivoca, se detiene y repite la frase; a veces repite varias veces. También hay",
    "silencios, muletillas y comentarios fuera de guion.",
    "",
    "GUION (una línea por frase):",
    ...lineas.map((l, i) => `${i + 1}. ${l}`),
    "",
    `La grabación dura ${fijo(duracion)} segundos. Escuchá TODO el audio con cuidado.`,
    "Para CADA intento de decir cada línea del guion, aunque sea parcial, devolvé una entrada.",
    "Tiempos en segundos con 0,1 de precisión: inicio es la primera sílaba, fin la última.",
    "",
    "  completo   dijo la línea entera (variaciones menores de palabras están bien)",
    "  fluido     no se trabó: sin repetir una palabra, sin corregirse a mitad, sin dejar la frase",
    "             cortada, sin alargar sílabas raro, sin comerse la última palabra",
    "  pausas     hizo silencios largos a mitad de la línea. Las pausas no cuentan como trabarse:",
    "             el corte de silencios las saca. Un intento con pausas y sin tropiezos es fluido",
    "  problema   qué falló, si no sirve",
    "  texto      lo que dijo, literal",
    "  lineas     si un intento cubre varias líneas seguidas, van todas",
    "",
    "Devolvé SOLO JSON:",
    '{"intentos":[{"lineas":[1],"inicio":0,"fin":0,"completo":true,"fluido":true,"pausas":false,"problema":"","texto":""}],',
    ' "fueraDeGuion":[{"inicio":0,"fin":0,"texto":""}],',
    ' "recomendacion":[{"linea":1,"inicio":0,"motivo":""}]}',
    "En recomendacion elegí para cada línea el MEJOR intento: normalmente el último completo y fluido.",
    "Las pausas no descalifican un intento.",
  ].join("\n");
}

/** "completo fluido", "PARCIAL TRABADO", "completo fluido, con pausas"… Un tomas.json viejo no trae pausas. */
export function marcasDelIntento(intento) {
  const marcas = `${intento.completo ? "completo" : "PARCIAL"} ${intento.fluido ? "fluido" : "TRABADO"}`;
  return intento.pausas ? `${marcas}, con pausas` : marcas;
}

/**
 * Una línea por cada cosa dicha fuera del guion. No se decide sola: puede ser una frase que la
 * persona agregó a propósito o un comentario suelto, y eso se le pregunta.
 */
export function avisosFueraDeGuion(datos) {
  return (datos?.fueraDeGuion ?? [])
    .filter((t) => String(t.texto ?? "").trim() && Number(t.fin) > Number(t.inicio))
    .map((t) => `  ${fijo(Number(t.inicio)).padStart(7)} - ${fijo(Number(t.fin)).padStart(7)} s   «${String(t.texto).trim()}»`);
}
