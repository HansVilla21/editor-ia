/**
 * Acelerar el video terminado (por ejemplo a 1,1x) es decisión de quien graba. Si se hace, el
 * video tiene que seguir a 30 fps, con su tamaño, y durar lo que corresponde.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { correr, silencio, tono, juntar, crearClip, sondearVideo } from "./_senales.mjs";

const carpeta = mkdtempSync(join(tmpdir(), "acelerar-"));
let clip;

before(() => {
  clip = crearClip(carpeta, "acelerar", juntar(silencio(0.3), tono(220, 0.3, 2.4), silencio(0.3)));
});

test("acelerar a 1,1 dura entrada / 1,1 (±2 cuadros), a 30 fps y del mismo tamaño", () => {
  const salida = join(carpeta, "rapido.mp4");
  const r = correr("acelerar.mjs", [clip, salida, "1.1"]);
  assert.equal(r.status, 0, r.stderr);
  const antes = sondearVideo(clip);
  const despues = sondearVideo(salida);
  assert.ok(Math.abs(despues.duracion - antes.duracion / 1.1) <= 2 / 30, `dura ${despues.duracion}`);
  assert.ok(Math.abs(despues.fps - 30) < 0.01, `va a ${despues.fps} fps`);
  assert.deepEqual([despues.ancho, despues.alto], [antes.ancho, antes.alto]);
});

test("acelerar rechaza una velocidad fuera de 0,5 a 2", () => {
  const r = correr("acelerar.mjs", [clip, join(carpeta, "no.mp4"), "3"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /0[.,]5.*2/);
});
