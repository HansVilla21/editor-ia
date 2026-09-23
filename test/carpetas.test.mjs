/**
 * Las herramientas que escriben un video o un audio tienen que crear su carpeta de salida:
 * en un proyecto recién clonado no existe ni `public/`, y fallar después de hacer todo el
 * trabajo es lo peor que le puede pasar a alguien que está probando por primera vez.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const SCRIPTS = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "carpetas-"));
const clip = join(carpeta, "clip.mp4");

const correr = (script, args) =>
  spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });

before(() => {
  // 3 s: tono, un segundo de silencio, tono. Chico para que la prueba sea rápida.
  const r = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "color=c=gray:s=320x240:r=30:d=3",
    "-f", "lavfi", "-i", "aevalsrc=if(between(t\\,1\\,2)\\,0\\,0.4*sin(2*PI*220*t)):s=48000:d=3",
    "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", clip,
  ]);
  assert.equal(r.status, 0, String(r.stderr));
});

test("cortar.mjs crea la carpeta del video cortado", () => {
  const salida = join(carpeta, "nueva-a", "sub", "video.mp4");
  const r = correr("cortar.mjs", [clip, salida, join(carpeta, "nueva-a", "sub", "tramos.json")]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(salida), true);
});

test("montar.mjs crea la carpeta del montaje", () => {
  const edl = join(carpeta, "edl.json");
  writeFileSync(edl, JSON.stringify([{ desde: 0, hasta: 1 }, { desde: 2, hasta: 3 }]));
  const salida = join(carpeta, "nueva-b", "sub", "montado.mp4");
  const r = correr("montar.mjs", [clip, edl, salida, join(carpeta, "nueva-b", "sub", "montaje.json")]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(salida), true);
});

test("nivelar.mjs crea la carpeta del archivo nivelado", () => {
  const salida = join(carpeta, "nueva-c", "sub", "voz.wav");
  const r = correr("nivelar.mjs", [clip, salida, "-19"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(existsSync(salida), true);
});
