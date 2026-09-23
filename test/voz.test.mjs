/**
 * voz.mjs deja la voz lista para la composición: limpia, a -19 LUFS con ganancia fija,
 * en WAV y sin pasar el techo del limitador.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/voz.mjs", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "voz-"));
const clip = join(carpeta, "clip.mp4");

const medir = (archivo) => {
  const r = spawnSync(ffmpegStatic, ["-hide_banner", "-i", archivo, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const resumen = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
  return {
    lufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(resumen)[1]),
    pico: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(resumen)[1]),
  };
};

before(() => {
  // Un video con una "voz" de prueba bajita (tono con vibrato y un poco de ruido): hay que subirla.
  const r = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "color=c=gray:s=320x240:r=30:d=4",
    "-f", "lavfi", "-i", "aevalsrc=0.05*sin(2*PI*(180+20*sin(2*PI*5*t))*t)+0.004*(random(0)-0.5):s=48000:d=4",
    "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", clip,
  ]);
  assert.equal(r.status, 0, String(r.stderr));
});

test("saca la voz del video, limpia y a -19 LUFS, en un WAV", () => {
  const salida = join(carpeta, "nueva", "voz.wav");
  const r = spawnSync(process.execPath, [SCRIPT, clip, salida], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(salida), true);
  const { lufs, pico } = medir(salida);
  assert.ok(Math.abs(lufs - -19) <= 0.7, `quedó en ${lufs} LUFS`);
  assert.ok(pico <= -2.9, `el pico quedó en ${pico} dBTP, por encima del limitador`);
});

test("sin argumentos explica qué recibe", () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr + r.stdout, /--ayuda/);
});
