import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { correrCortes, costurasDelMontaje, ajustarAEscenas } from "../.claude/skills/editar-video/scripts/cortes.mjs";
import ffmpegStatic from "ffmpeg-static";

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

test("las costuras entre tomas del montaje también son cortes, llevadas al video cortado", () => {
  // montaje: tomas que arrancan en 0, 2 y 5 s del montaje. cortar sacó el hueco de 3 a 3,5.
  const tomas = [{ inicioSalida: 0 }, { inicioSalida: 2 }, { inicioSalida: 5 }];
  const tramos = [
    { inicioOrigen: 0, finOrigen: 3, inicioSalida: 0 },
    { inicioOrigen: 3.5, finOrigen: 8, inicioSalida: 3 },
  ];
  // la costura de 2 s cae adentro del primer tramo; la de 5 s, en el segundo: 3 + (5 - 3,5).
  assert.deepEqual(costurasDelMontaje(tomas, tramos), [2, 4.5]);
});

test("una costura que cayó en un hueco quitado no agrega un corte: ya lo es el tramo siguiente", () => {
  const tomas = [{ inicioSalida: 0 }, { inicioSalida: 3.2 }];
  const tramos = [
    { inicioOrigen: 0, finOrigen: 3, inicioSalida: 0 },
    { inicioOrigen: 3.5, finOrigen: 8, inicioSalida: 3 },
  ];
  assert.deepEqual(costurasDelMontaje(tomas, tramos), []);
});

test("cada corte se lleva al salto de imagen que tenga a menos de 3 cuadros", () => {
  const cortes = [0, 2.9, 6, 9.5];
  const escenas = [3.0, 6.0, 12.0];
  assert.deepEqual(ajustarAEscenas(cortes, escenas), { cortes: [0, 3, 6, 9.5], movidos: 1, sinSalto: [9.5] });
});

test("con --video, el corte cae en el cuadro donde de verdad cambia la imagen", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "cortes-video-"));
  const video = join(carpeta, "dos-planos.mp4");
  const r0 = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "testsrc2=s=320x240:r=30:d=2",
    "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=30:d=2",
    "-filter_complex", "[0:v][1:v]concat=n=2:v=1[v]", "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", video,
  ]);
  assert.equal(r0.status, 0, String(r0.stderr));
  const tramos = join(carpeta, "tramos.json");
  writeFileSync(tramos, JSON.stringify({ tramos: [{ inicioSalida: 0 }, { inicioSalida: 1.93 }] }));
  const r = spawnSync(process.execPath, [SCRIPT, tramos, "--video", video], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CORTES: \[0, 2\]/);
});
