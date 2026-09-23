/**
 * Los avisos "[revisión] …" de la plantilla, una sola vez por corrida.
 *
 * La plantilla los imprime una vez por pestaña del navegador. `npx remotion render` solo avisa
 * desde la pestaña principal (revision.ts), pero previa.mjs renderiza cada cuadro en una pestaña
 * nueva y cada una vuelve a avisar: el filtro va del lado de Node.
 */
const MARCA = "[revisión]";

/** Envuelve log, warn y error de `consola` para que cada aviso de revisión salga una sola vez. */
export function avisosUnaVez(consola = console) {
  const vistos = new Set();
  for (const metodo of ["log", "warn", "error"]) {
    const original = consola[metodo].bind(consola);
    consola[metodo] = (...args) => {
      const texto = args.map(String).join(" ");
      const donde = texto.indexOf(MARCA);
      if (donde >= 0) {
        // Desde la marca en adelante: el prefijo ("Tab 3, revision.ts:49") cambia de pestaña en pestaña.
        const clave = texto.slice(donde);
        if (vistos.has(clave)) return;
        vistos.add(clave);
      }
      original(...args);
    };
  }
}
