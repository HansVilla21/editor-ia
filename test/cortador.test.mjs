/**
 * El cortador no puede dejar palabras mochas, ni clics sueltos, ni un final pegado a la última
 * palabra. Todo se prueba con clips sintéticos: un tono es una palabra, un ruido de 4 a 11 kHz
 * es una "s" final, un ruido que decae en 0,12 s es un clic.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const SCRIPTS = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "cortador-"));
const SR = 48000;

const correr = (script, args) =>
  spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });
const leerJson = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

// ---------------------------------------------------------------- señales

/** Números al azar repetibles: la prueba tiene que dar lo mismo cada vez. */
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const muestrasDe = (s) => Math.round(s * SR);
const silencio = (s) => new Float32Array(muestrasDe(s));

/** Rampa de 5 ms en cada punta, para que los bordes no metan un clic propio. */
function suavizar(m) {
  const n = Math.min(muestrasDe(0.005), Math.floor(m.length / 2));
  for (let i = 0; i < n; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    m[i] *= g;
    m[m.length - 1 - i] *= g;
  }
  return m;
}

function tono(f, amplitud, s) {
  const m = new Float32Array(muestrasDe(s));
  for (let i = 0; i < m.length; i++) m[i] = amplitud * Math.sin((2 * Math.PI * f * i) / SR);
  return suavizar(m);
}

/**
 * Suma de senos entre dos frecuencias, llevada a un nivel eficaz (rmsDb) o de pico (picoDb).
 * Las fases de Schroeder dejan el pico apenas 4 o 5 dB arriba del nivel eficaz, como una fricativa.
 */
function banda(s, desde, hasta, { rmsDb, picoDb }) {
  const m = new Float32Array(muestrasDe(s));
  const k = 120;
  for (let j = 0; j < k; j++) {
    const f = desde + ((hasta - desde) * (j + 0.5)) / k;
    const fase = (-Math.PI * j * (j + 1)) / k;
    for (let i = 0; i < m.length; i++) m[i] += Math.sin((2 * Math.PI * f * i) / SR + fase);
  }
  let suma = 0;
  let maximo = 0;
  for (const v of m) {
    suma += v * v;
    maximo = Math.max(maximo, Math.abs(v));
  }
  const factor =
    rmsDb !== undefined ? 10 ** (rmsDb / 20) / Math.sqrt(suma / m.length) : 10 ** (picoDb / 20) / maximo;
  for (let i = 0; i < m.length; i++) m[i] *= factor;
  return suavizar(m);
}

/** Un golpe en la mesa: grave, fuerte, y se apaga en unas pocas tramas. */
function golpe(s = 0.1) {
  const m = new Float32Array(muestrasDe(s));
  for (let i = 0; i < m.length; i++) m[i] = 0.5 * Math.exp(-i / SR / 0.025) * Math.sin((2 * Math.PI * 150 * i) / SR);
  return m;
}

/** Un clic: ruido que arranca fuerte y se apaga, 0,12 s en total. */
function clic(s = 0.12) {
  const m = new Float32Array(muestrasDe(s));
  const r = azar(7);
  for (let i = 0; i < m.length; i++) m[i] = 0.5 * Math.exp(-i / SR / 0.02) * (2 * r() - 1);
  return m;
}

function juntar(...partes) {
  const total = new Float32Array(partes.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}

function escribirWav(ruta, m) {
  const datos = Buffer.alloc(m.length * 2);
  for (let i = 0; i < m.length; i++) datos.writeInt16LE(Math.round(Math.max(-1, Math.min(1, m[i])) * 32767), i * 2);
  const cabecera = Buffer.alloc(44);
  cabecera.write("RIFF", 0);
  cabecera.writeUInt32LE(36 + datos.length, 4);
  cabecera.write("WAVEfmt ", 8);
  cabecera.writeUInt32LE(16, 16);
  cabecera.writeUInt16LE(1, 20);
  cabecera.writeUInt16LE(1, 22);
  cabecera.writeUInt32LE(SR, 24);
  cabecera.writeUInt32LE(SR * 2, 28);
  cabecera.writeUInt16LE(2, 32);
  cabecera.writeUInt16LE(16, 34);
  cabecera.write("data", 36);
  cabecera.writeUInt32LE(datos.length, 40);
  writeFileSync(ruta, Buffer.concat([cabecera, datos]));
}

/** Video gris chico con ese audio, en PCM para que la entrada no traiga artefactos de AAC. */
function crearClip(nombre, m) {
  const wav = join(carpeta, `${nombre}.wav`);
  const salida = join(carpeta, `${nombre}.mkv`);
  escribirWav(wav, m);
  const d = (m.length / SR).toFixed(4);
  const r = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", `color=c=gray:s=160x284:r=30:d=${d}`,
    "-i", wav, "-t", d,
    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", salida,
  ]);
  assert.equal(r.status, 0, String(r.stderr));
  return salida;
}

// ---------------------------------------------------------------- mediciones

function leerAudio(ruta) {
  const r = spawnSync(ffmpegStatic, ["-v", "error", "-i", ruta, "-vn", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], {
    maxBuffer: 1 << 28,
  });
  assert.equal(r.status, 0, String(r.stderr));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}

/** Nivel en dB cada 5 ms. */
function niveles(m, paso = 0.005) {
  const n = muestrasDe(paso);
  const db = [];
  for (let i = 0; i + n <= m.length; i += n) {
    let s = 0;
    for (let k = i; k < i + n; k++) s += m[k] * m[k];
    db.push(20 * Math.log10(Math.sqrt(s / n) + 1e-12));
  }
  return db;
}

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
