import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { correrCortes } from "../.claude/skills/editar-video/scripts/cortes.mjs";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/cortes.mjs", import.meta.url));

test("sin apretar ni acelerar, los cortes quedan como estaban", () => {
  assert.deepEqual(correrCortes([0, 2.5, 6], { quitados: [], velocidad: 1 }), [0, 2.5, 6]);
});

test("a cada corte se le resta lo que apretar quitó antes de él", () => {
  const quitados = [[1, 1.5], [4, 4.3]];
  assert.deepEqual(correrCortes([0, 2.5, 6], { quitados, velocidad: 1 }), [0, 2, 5.2]);
});

test("un corte que cae adentro de un tramo quitado va al inicio de ese tramo", () => {
  assert.deepEqual(correrCortes([3.2], { quitados: [[3, 3.5]], velocidad: 1 }), [3]);
});

test("después de apretar se divide por la velocidad", () => {
  assert.deepEqual(correrCortes([0, 2.2, 5.5], { quitados: [], velocidad: 1.1 }), [0, 2, 5]);
});

test("dos cortes que terminan en el mismo segundo quedan una sola vez", () => {
  assert.deepEqual(correrCortes([3, 3.4], { quitados: [[3, 3.5]], velocidad: 1 }), [3]);
});

test("desde la terminal imprime la línea lista para datos.ts", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "cortes-"));
  const tramos = join(carpeta, "tramos.json");
  const quitados = join(carpeta, "quitados.json");
  writeFileSync(tramos, JSON.stringify({ tramos: [{ inicioSalida: 0 }, { inicioSalida: 2.5 }, { inicioSalida: 6 }] }));
  writeFileSync(quitados, JSON.stringify({ quitados: [[1, 1.5]] }));
  const r = spawnSync(process.execPath, [SCRIPT, tramos, "--quitados", quitados, "--velocidad", "1,1"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CORTES: \[0, 1\.818, 5\]/);
});
