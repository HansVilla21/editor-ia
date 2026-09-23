/**
 * Sonido: el catálogo de efectos, la descarga desde Mixkit, y dos mediciones que mentían
 * (el pico de la mezcla y la saturación de un efecto) porque se medían sobre la mezcla mono.
 * Todo el audio de prueba se genera acá con el ffmpeg del proyecto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const SCRIPTS = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "sonido-"));

const generar = (salida, fuente, ...extra) => {
  const r = spawnSync(ffmpegStatic, ["-v", "error", "-y", "-f", "lavfi", "-i", fuente, ...extra, salida]);
  assert.equal(r.status, 0, String(r.stderr));
  return salida;
};

const correr = (script, args) =>
  spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });

const picoDb = (ruta) => {
  const r = spawnSync(ffmpegStatic, ["-hide_banner", "-i", ruta, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  return Number(r.stderr.match(/max_volume: (-?[\d.]+) dB/)[1]);
};

// ---------------------------------------------------------------- efecto.mjs

test("efecto.mjs avisa cuando el archivo pasa 0 dBFS y dice cuánto bajarlo", () => {
  // Un WAV de coma flotante puede guardar muestras por encima de 1: pico 1,5 = +3,5 dBFS.
  const ruta = generar(join(carpeta, "satura.wav"), "aevalsrc=1.5*sin(2*PI*440*t):s=48000:d=0.5", "-c:a", "pcm_f32le");
  const r = correr("efecto.mjs", [ruta]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /satura/i);
  assert.match(r.stdout, /\+3\.5 dBFS/);
  assert.match(r.stdout, /-4\.5 dB/); // lo que falta para quedar en -1 dBFS
});

test("efecto.mjs avisa cuando el archivo toca el techo de 0 dBFS", () => {
  const ruta = generar(join(carpeta, "techo.wav"), "aevalsrc=if(lt(mod(t*440\\,1)\\,0.5)\\,1\\,-1):s=48000:d=0.5", "-c:a", "pcm_s16le");
  const r = correr("efecto.mjs", [ruta]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 dBFS/);
  assert.match(r.stdout, /recortado/i);
});

test("efecto.mjs no confunde un estéreo sano con saturación", () => {
  // Cada canal a -0,9 dBFS y en fase: la mezcla mono de ffmpeg (0,707·(L+R)) daría +2,1 dBFS.
  const ruta = generar(join(carpeta, "estereo-sano.wav"), "aevalsrc=0.9*sin(2*PI*440*t)|0.9*sin(2*PI*440*t):s=48000:d=0.5", "-c:a", "pcm_f32le");
  const r = correr("efecto.mjs", [ruta]);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /satura|recortado/i);
  assert.match(r.stdout, /-0\.9 dBFS/);
});

// ---------------------------------------------------------------- mezcla.mjs

test("mezcla.mjs informa el pico del canal más fuerte, no el de la mezcla mono", () => {
  const voz = generar(join(carpeta, "voz.wav"), "aevalsrc=0.708*sin(2*PI*220*t):s=48000:d=3", "-c:a", "pcm_s16le");
  // L a -3 dB, R a -6 dB. La mezcla mono daría -1,4 dB; volumedetect dice -3,0.
  const render = generar(join(carpeta, "render.wav"), "aevalsrc=0.708*sin(2*PI*220*t)|0.5*sin(2*PI*220*t):s=48000:d=3", "-c:a", "pcm_s16le");
  assert.ok(Math.abs(picoDb(render) + 3.0) < 0.15);
  const json = join(carpeta, "mezcla.json");
  const r = correr("mezcla.mjs", [render, voz, "--json", json]);
  assert.equal(r.status, 0, r.stderr);
  const informado = Number(r.stdout.match(/pico de la mezcla[^-\d]*(-?[\d.]+) dB/)[1]);
  assert.ok(Math.abs(informado + 3.0) < 0.15, `informó ${informado} dB`);
  assert.ok(Math.abs(JSON.parse(readFileSync(json, "utf8")).picoMezcla + 3.0) < 0.15);
});
