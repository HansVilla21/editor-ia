/**
 * Decide qué es lo único que le conviene hacer al usuario ahora.
 *
 * Devuelve null cuando no hay nada pendiente: el proyecto no interrumpe por interrumpir.
 */
export function siguientePaso({ revisiones, estado }) {
  const faltantes = revisiones.filter((r) => !r.ok);

  if (faltantes.length > 0) {
    return {
      clave: "entorno-incompleto",
      mensaje: `Falta resolver: ${faltantes.map((f) => f.nombre).join(", ")}. Corré /arrancar y lo dejamos listo.`,
    };
  }

  if (!estado.estiloEntrenado) {
    return {
      clave: "falta-entrenar",
      mensaje:
        "El estilo todavía es el neutro. Pasame 2 o 3 referencias de videos que te gusten, y contame qué te gusta de cada uno, para armar el tuyo.",
    };
  }

  if (!estado.videosHechos) {
    return {
      clave: "primer-video",
      mensaje: "Todo listo. Cuando tengas una grabación, pasámela y la edito.",
    };
  }

  return null;
}
