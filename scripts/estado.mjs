/**
 * Decide qué es lo único que le conviene hacer al usuario ahora.
 *
 * Una cosa por vez, en este orden: entorno → preferencias → estilo → primer video →
 * calibración. Con una excepción: si ya hay un video hecho y falta calibrar, la calibración
 * va antes que el estilo. Si no, quien edita sin entrenar un estilo nunca vería el aviso de
 * calibrar, que es lo que hace que el segundo video salga mejor que el primero.
 *
 * Devuelve null cuando no hay nada pendiente: el proyecto no interrumpe por interrumpir.
 *
 * `estado` es lo que dice estado.json (puede faltar entero, en un clon recién bajado):
 *   preferencias     la ronda de preguntas de /arrancar ya se hizo (memory/preferencias.md)
 *   estiloEntrenado  /estudiar ya escribió un estilo propio
 *   videosHechos     cuántos videos se entregaron
 *   calibrado        /calibrar ya se hizo después del primer video
 */

/** Cómo se llama cada revisión de doctor.mjs para quien no sabe qué es. */
const NOMBRES = {
  node: "Node",
  "ruta-del-proyecto": "la ruta de la carpeta, que es muy larga",
  ffmpeg: "las herramientas del editor",
  whisper: "Whisper",
  "clave-gemini": "la clave de Gemini",
};

const enLista = (nombres) =>
  nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : nombres[0];

export function siguientePaso({ revisiones, estado }) {
  const faltantes = revisiones.filter((r) => !r.ok).map((r) => NOMBRES[r.nombre] ?? r.nombre);

  if (faltantes.length > 0) {
    return {
      clave: "entorno-incompleto",
      mensaje: `Falta resolver: ${enLista(faltantes)}. Corré /arrancar y lo dejamos listo.`,
    };
  }

  if (!estado.preferencias) {
    return {
      clave: "faltan-preferencias",
      mensaje:
        "Faltan unas preguntas cortas sobre cómo querés tus videos (dos minutos). Corré /arrancar: salta lo que ya está hecho y va directo a eso.",
    };
  }

  const faltaCalibrar = estado.videosHechos >= 1 && !estado.calibrado;

  if (faltaCalibrar) {
    return {
      clave: "falta-calibrar",
      mensaje:
        "Ya hiciste tu primer video. Corré /calibrar: son unas preguntas cortas sobre cómo quedó, y el próximo sale más a tu medida.",
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

  return null;
}
