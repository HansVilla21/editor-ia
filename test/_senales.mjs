/**
 * Señales sintéticas y mediciones para las pruebas del cortador. No tiene pruebas propias.
 *
 * Un tono es una palabra, una banda de 4 a 11 kHz es una "s", un ruido que se apaga es un clic
 * y un grave que se apaga es un golpe en la mesa. Todo repetible: la prueba da lo mismo cada vez.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";
import { path as ffprobeStatic } from "@ffprobe-installer/ffprobe";

export const SR = 48000;
const SCRIPTS = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/", import.meta.url));

export const correr = (script, args) =>
  spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });
export const leerJson = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

// ---------------------------------------------------------------- señales

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
export const silencio = (s) => new Float32Array(muestrasDe(s));

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

export function tono(f, amplitud, s) {
  const m = new Float32Array(muestrasDe(s));
  for (let i = 0; i < m.length; i++) m[i] = amplitud * Math.sin((2 * Math.PI * f * i) / SR);
  return suavizar(m);
}

/**
 * Suma de senos entre dos frecuencias, llevada a un nivel eficaz (rmsDb) o de pico (picoDb).
 * Las fases de Schroeder dejan el pico apenas 4 o 5 dB arriba del nivel eficaz, como una fricativa.
 */
export function banda(s, desde, hasta, { rmsDb, picoDb }) {
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
export function golpe(s = 0.1) {
  const m = new Float32Array(muestrasDe(s));
  for (let i = 0; i < m.length; i++) m[i] = 0.5 * Math.exp(-i / SR / 0.025) * Math.sin((2 * Math.PI * 150 * i) / SR);
  return m;
}

/** Un clic: ruido que arranca fuerte y se apaga, 0,12 s en total. */
export function clic(s = 0.12) {
  const m = new Float32Array(muestrasDe(s));
  const r = azar(7);
  for (let i = 0; i < m.length; i++) m[i] = 0.5 * Math.exp(-i / SR / 0.02) * (2 * r() - 1);
  return m;
}

export function juntar(...partes) {
  const total = new Float32Array(partes.reduce((s, p) => s + p.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}

/** Suma `otra` encima de `base` (el ruido de sala por debajo de todo). */
export function mezclar(base, otra) {
  const total = Float32Array.from(base);
  for (let i = 0; i < Math.min(base.length, otra.length); i++) total[i] += otra[i];
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
export function crearClip(carpeta, nombre, m) {
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

export function leerAudio(ruta) {
  const r = spawnSync(ffmpegStatic, ["-v", "error", "-i", ruta, "-vn", "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], {
    maxBuffer: 1 << 28,
  });
  assert.equal(r.status, 0, String(r.stderr));
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.length / 4));
}

/** Nivel en dB cada 5 ms. */
export function niveles(m, paso = 0.005) {
  const n = muestrasDe(paso);
  const db = [];
  for (let i = 0; i + n <= m.length; i += n) {
    let s = 0;
    for (let k = i; k < i + n; k++) s += m[k] * m[k];
    db.push(20 * Math.log10(Math.sqrt(s / n) + 1e-12));
  }
  return db;
}

/** Ancho, alto, cuadros por segundo y duración del video de un archivo. */
export function sondearVideo(ruta) {
  const r = spawnSync(ffprobeStatic, ["-v", "error", "-show_streams", "-show_format", "-of", "json", ruta], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  const datos = JSON.parse(r.stdout);
  const video = datos.streams.find((s) => s.codec_type === "video");
  const [a, b] = video.avg_frame_rate.split("/").map(Number);
  return { ancho: video.width, alto: video.height, fps: a / b, duracion: Number(datos.format.duration) };
}
