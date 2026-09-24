/**
 * La plantilla avisa con "[revisión] …" en la consola del navegador. previa.mjs renderiza cada
 * cuadro en una pestaña nueva, y cada pestaña vuelve a avisar: con 15 cuadros salían 30 líneas
 * iguales. Cada aviso tiene que salir una sola vez por corrida.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { avisosUnaVez } from "../.claude/skills/editar-video/scripts/_consola.mjs";

function consolaFalsa() {
  const lineas = [];
  return {
    lineas,
    log: (...a) => lineas.push(a.join(" ")),
    warn: (...a) => lineas.push(a.join(" ")),
    error: (...a) => lineas.push(a.join(" ")),
  };
}

test("cada aviso de revisión sale una sola vez, aunque lo repitan varias pestañas", () => {
  const consola = consolaFalsa();
  avisosUnaVez(consola);
  consola.warn(" Tab 0, src/plantilla/revision.ts:49 ", "[revisión] Falta el video: se muestra el marcador.");
  consola.warn(" Tab 0, src/plantilla/revision.ts:49 ", "[revisión] Sin musica.m4a: el video va sin música.");
  consola.warn(" Tab 0, src/plantilla/revision.ts:49 ", "[revisión] Falta el video: se muestra el marcador.");
  consola.warn(" Tab 3, src/plantilla/revision.ts:49 ", "[revisión] Sin musica.m4a: el video va sin música.");
  assert.equal(consola.lineas.length, 2);
  assert.match(consola.lineas[0], /Falta el video/);
  assert.match(consola.lineas[1], /Sin musica/);
});

test("lo que no es un aviso de revisión pasa siempre, aunque se repita", () => {
  const consola = consolaFalsa();
  avisosUnaVez(consola);
  consola.log("  cuadro     0 (0.00 s) listo");
  consola.log("  cuadro     0 (0.00 s) listo");
  consola.error("algo se rompió");
  consola.error("algo se rompió");
  assert.equal(consola.lineas.length, 4);
});
