/**
 * Lo que musica.mjs necesita sin red: leer la ficha que devuelve Gemini y el rango de BPM.
 */

/** Gemini a veces devuelve la ficha dentro de una lista de un elemento: se toma igual. */
export function normalizarFicha(datos) {
  if (Array.isArray(datos)) return datos[0] && typeof datos[0] === "object" ? datos[0] : {};
  return datos && typeof datos === "object" ? datos : {};
}

/** "70-95" → [70, 95]. Sin valor, el rango neutro de 110 a 125. */
export function leerRangoBpm(texto) {
  if (texto === undefined || texto === true) return [110, 125];
  const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(String(texto));
  if (!m || Number(m[1]) >= Number(m[2])) {
    throw new Error(`--bpm tiene que ser un rango de BPM como 70-95 (llegó "${texto}").`);
  }
  return [Number(m[1]), Number(m[2])];
}
