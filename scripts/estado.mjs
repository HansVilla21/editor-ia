/**
 * Decide qué es lo único que le conviene hacer al usuario ahora.
 *
 * El orden es fijo, una cosa por vez: entorno → preferencias → estilo → primer video →
 * calibración. Devuelve null cuando no hay nada pendiente: el proyecto no interrumpe por
 * interrumpir.
 *
 * `estado` es lo que dice estado.json (puede faltar entero, en un clon recién bajado):
 *   preferencias     la ronda de preguntas de /arrancar ya se hizo (memory/preferencias.md)
 *   estiloEntrenado  /estudiar ya escribió un estilo propio
 *   videosHechos     cuántos videos se entregaron
 *   calibrado        /calibrar ya se hizo después del primer video
 */
export function siguientePaso({ revisiones, estado }) {
  const faltantes = revisiones.filter((r) => !r.ok);

  if (faltantes.length > 0) {
    return {
      clave: "entorno-incompleto",
      mensaje: `Falta resolver: ${faltantes.map((f) => f.nombre).join(", ")}. Corré /arrancar y lo dejamos listo.`,
    };
  }

  if (!estado.preferencias) {
    return {
      clave: "faltan-preferencias",
      mensaje:
        "Faltan unas preguntas cortas sobre cómo querés tus videos (dos minutos). Corré /arrancar: salta lo que ya está hecho y va directo a eso.",
    };
  }

  if (!estado.estiloEntrenado) {
    return {
      clave: "falta-entrenar",
      mensaje:
        "El estilo todavía es el neutro. Corré /estudiar con 2 o 3 referencias de videos que te gusten, y contame qué te gusta de cada uno.",
    };
  }

  if (!estado.videosHechos) {
    return {
      clave: "primer-video",
      mensaje: "Todo listo. Cuando tengas una grabación, corré /nuevo-video y la edito.",
    };
  }

  if (!estado.calibrado) {
    return {
      clave: "falta-calibrar",
      mensaje:
        "Ya hiciste tu primer video. Corré /calibrar: son unas preguntas cortas sobre cómo quedó, y el próximo sale más a tu medida.",
    };
  }

  return null;
}
