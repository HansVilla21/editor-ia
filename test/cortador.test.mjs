/**
 * El cortador no puede dejar palabras mochas, ni clics sueltos, ni un final pegado a la última
 * palabra. Todo se prueba con clips sintéticos (ver _senales.mjs).
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  correr,
  leerJson,
  silencio,
  tono,
  banda,
  golpe,
  clic,
  juntar,
  crearClip,
  leerAudio,
  niveles,
  sondearVideo,
} from "./_senales.mjs";

const carpeta = mkdtempSync(join(tmpdir(), "cortador-"));

// ---------------------------------------------------------------- cortar

// Palabra con "s" final suave, silencio, clic, golpe, palabra corta, silencio, última palabra y 2 s.
// La "s" tiene el pico por debajo de −36 dB: ffmpeg la cuenta como silencio, igual que la cola de una
// "s" de verdad.
const PRINCIPAL = {
  finTono: 1.3,
  clic: [2.5, 2.62],
  golpe: [3.0, 3.1],
  corta: [3.6, 3.78],
  ultima: [4.6, 5.4],
};
let principal;

before(() => {
  const clip = crearClip(
    carpeta,
    "principal",
    juntar(
      silencio(0.5),
      tono(220, 0.3, 0.8),
      banda(0.2, 4200, 10800, { picoDb: -38 }),
      silencio(1.0),
      clic(),
      silencio(0.38),
      golpe(),
      silencio(0.5),
      tono(180, 0.3, 0.18),
      silencio(0.82),
      tono(260, 0.3, 0.8),
      silencio(2.0),
    ),
  );
  const video = join(carpeta, "principal-corte.mp4");
  const mapa = join(carpeta, "principal-tramos.json");
  const r = correr("cortar.mjs", [clip, video, mapa, "--cola", "1.2"]);
  assert.equal(r.status, 0, r.stderr);
  principal = { video, mapa: leerJson(mapa), audio: leerAudio(video) };
});

test("cortar conserva al menos 0,12 s de la 's' final después de la palabra", () => {
  const db = niveles(principal.audio);
  const inicioTono = db.findIndex((v) => v > -25);
  const finTono = db.findIndex((v, i) => i > inicioTono && v < -25);
  let fin = finTono;
  while (fin < db.length && db[fin] > -65) fin++;
  const ese = (fin - finTono) * 0.005;
  assert.ok(ese >= 0.12, `quedaron ${ese.toFixed(3)} s de la "s"`);
});

test("cortar descarta el clic aislado: no queda como tramo", () => {
  const [a, b] = PRINCIPAL.clic;
  const pisados = principal.mapa.tramos.filter((t) => t.finOrigen > a && t.inicioOrigen < b);
  assert.deepEqual(pisados, []);
});

test("cortar descarta un golpe grave que se apaga enseguida", () => {
  const [a, b] = PRINCIPAL.golpe;
  const pisados = principal.mapa.tramos.filter((t) => t.finOrigen > a && t.inicioOrigen < b);
  assert.deepEqual(pisados, []);
});

test("cortar conserva una palabra corta aislada", () => {
  const [a, b] = PRINCIPAL.corta;
  assert.ok(principal.mapa.tramos.some((t) => t.inicioOrigen <= a && t.finOrigen >= b));
});

test("cortar no deja tramos sin una palabra adentro", () => {
  const palabras = [[0.5, PRINCIPAL.finTono], PRINCIPAL.corta, PRINCIPAL.ultima];
  for (const t of principal.mapa.tramos) {
    const conPalabra = palabras.some(([a, b]) => t.finOrigen > a && t.inicioOrigen < b);
    assert.ok(conPalabra, `el tramo ${t.inicioOrigen}-${t.finOrigen} no tiene voz`);
  }
});

test("con --cola 1.2 el video sigue al menos 1,1 s de toma real después de la última palabra", () => {
  const db = niveles(principal.audio);
  let ultima = db.length - 1;
  while (ultima > 0 && db[ultima] < -30) ultima--;
  const finPalabra = (ultima + 1) * 0.005;
  const duracion = principal.audio.length / 48000;
  assert.ok(duracion - finPalabra >= 1.1, `termina ${(duracion - finPalabra).toFixed(2)} s después de la palabra`);
});

// Dos palabras con una pausa de 0,5 s en el medio. Con --minimo 0.6 esa pausa no se corta.
const SEGUNDO = { primera: [0.8, 1.5], pausa: [1.5, 2.0], segunda: [2.0, 3.0] };
let segundo;

before(() => {
  const clip = crearClip(
    carpeta,
    "segundo",
    juntar(silencio(0.8), tono(220, 0.3, 0.7), silencio(0.5), tono(260, 0.3, 1.0), silencio(0.8)),
  );
  const video = join(carpeta, "segundo-corte.mp4");
  const mapa = join(carpeta, "segundo-tramos.json");
  const r = correr("cortar.mjs", [
    clip, video, mapa, "--minimo", "0.6", "--aire", "0.05", "--cola", "0", "--tamano", "1440x2560",
  ]);
  assert.equal(r.status, 0, r.stderr);
  segundo = { clip, video, mapa: leerJson(mapa) };
});

test("--aire X sigue andando: X antes de la frase y nunca menos de 0,14 s después", () => {
  const [tramo] = segundo.mapa.tramos;
  assert.ok(Math.abs(tramo.inicioOrigen - (SEGUNDO.primera[0] - 0.05)) < 0.01, `empieza en ${tramo.inicioOrigen}`);
  assert.ok(Math.abs(tramo.finOrigen - (SEGUNDO.segunda[1] + 0.14)) < 0.01, `termina en ${tramo.finOrigen}`);
});

test("cortar con --tamano 1440x2560 sale a 1440x2560", () => {
  const { ancho, alto } = sondearVideo(segundo.video);
  assert.deepEqual([ancho, alto], [1440, 2560]);
});

test("montar con --tamano 1440x2560 sale a 1440x2560", () => {
  const edl = join(carpeta, "edl.json");
  writeFileSync(edl, JSON.stringify([{ desde: 0.7, hasta: 1.6 }, { desde: 1.9, hasta: 3.2 }]));
  const video = join(carpeta, "montado.mp4");
  const r = correr("montar.mjs", [segundo.clip, edl, video, join(carpeta, "montaje.json"), "--tamano", "1440x2560"]);
  assert.equal(r.status, 0, r.stderr);
  const { ancho, alto } = sondearVideo(video);
  assert.deepEqual([ancho, alto], [1440, 2560]);
});

test("cortar anota en tramos.json las pausas internas de más de 0,35 s que quedaron", () => {
  const pausas = segundo.mapa.pausasInternas;
  assert.equal(pausas?.length, 1, JSON.stringify(pausas));
  const salidaPausa = SEGUNDO.pausa[0] - (SEGUNDO.primera[0] - 0.05);
  assert.ok(Math.abs(pausas[0].inicio - salidaPausa) < 0.05, `empieza en ${pausas[0].inicio}`);
  assert.ok(Math.abs(pausas[0].duracion - 0.5) < 0.05, `dura ${pausas[0].duracion}`);
});

test("cortar no tira las palabras de una grabación baja", () => {
  // Voz a −37 dB: el pico pasa el umbral de −36, pero las vocales quedan por debajo.
  const clip = crearClip(
    carpeta,
    "baja",
    juntar(silencio(0.5), tono(220, 0.02, 0.8), silencio(0.8), tono(180, 0.02, 0.2), silencio(0.8)),
  );
  const mapa = join(carpeta, "baja-tramos.json");
  const r = correr("cortar.mjs", [clip, join(carpeta, "baja.mp4"), mapa, "--cola", "0"]);
  assert.equal(r.status, 0, r.stderr);
  const { tramos } = leerJson(mapa);
  for (const [a, b] of [[0.5, 1.3], [2.1, 2.3]]) {
    assert.ok(tramos.some((t) => t.inicioOrigen <= a && t.finOrigen >= b), `se perdió la palabra ${a}-${b}`);
  }
});
