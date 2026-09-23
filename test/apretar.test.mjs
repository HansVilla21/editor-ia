/**
 * La segunda pasada saca las pausas que el corte deja (respiraciones, aire muerto), pero una
 * "s" final es voz aunque tenga poca energía, y los bordes del video no se tocan.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { correr, leerJson, silencio, tono, banda, juntar, mezclar, crearClip, sondearVideo } from "./_senales.mjs";

const carpeta = mkdtempSync(join(tmpdir(), "apretar-"));

// Ruido de sala por debajo de todo; una palabra con "s" final, una pausa de 0,6 s, otra palabra
// y 0,9 s de sala al final. La "s" queda entre el umbral hondo (−42) y el del borde (−33).
const DURACION = 3.3;
const FIN_S = 1.15;
const PAUSA = [1.15, 1.75];
let apretado;

before(() => {
  const voz = juntar(
    silencio(0.35),
    tono(220, 0.3, 0.65),
    banda(0.15, 4200, 10800, { rmsDb: -40 }),
    silencio(0.6),
    tono(330, 0.3, 0.65),
    silencio(0.9),
  );
  const clip = crearClip(carpeta, "apretar", mezclar(voz, banda(DURACION, 80, 300, { rmsDb: -50 })));
  const video = join(carpeta, "apretado.mp4");
  const mapa = join(carpeta, "quitados.json");
  const r = correr("apretar.mjs", [clip, video, mapa]);
  assert.equal(r.status, 0, r.stderr);
  apretado = { clip, video, mapa: leerJson(mapa) };
});

test("apretar saca la pausa de 0,6 s entre dos palabras", () => {
  const { quitados } = apretado.mapa;
  assert.equal(quitados.length, 1, JSON.stringify(quitados));
  const [a, b] = quitados[0];
  assert.ok(a > PAUSA[0] && b < PAUSA[1], `quitó ${a}-${b}`);
  assert.ok(b - a >= 0.35, `quitó solo ${(b - a).toFixed(2)} s`);
});

test("apretar no toca la 's' que cierra la palabra", () => {
  for (const [a] of apretado.mapa.quitados) assert.ok(a >= FIN_S + 0.05, `corta en ${a}, la "s" termina en ${FIN_S}`);
});

test("apretar no toca el primer 0,3 s ni los últimos 0,8 s", () => {
  for (const [a, b] of apretado.mapa.quitados) {
    assert.ok(a >= 0.3, `quitó desde ${a}`);
    assert.ok(b <= DURACION - 0.8, `quitó hasta ${b}`);
  }
});

test("el video apretado dura lo que dice quitados.json", () => {
  const { quitados, keep, duracionAntes, duracionDespues } = apretado.mapa;
  const quitado = quitados.reduce((s, [a, b]) => s + (b - a), 0);
  assert.ok(Math.abs(duracionAntes - quitado - duracionDespues) < 0.01);
  assert.ok(Math.abs(keep.reduce((s, [a, b]) => s + (b - a), 0) - duracionDespues) < 0.01);
  assert.ok(Math.abs(sondearVideo(apretado.video).duracion - duracionDespues) < 0.07);
});

test("apretar --solo-mapa lista las pausas sin escribir el video", () => {
  const video = join(carpeta, "no-debe-existir.mp4");
  const r = correr("apretar.mjs", [apretado.clip, video, join(carpeta, "mapa-solo.json"), "--solo-mapa"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /1 hueco/);
  assert.equal(existsSync(video), false);
});
