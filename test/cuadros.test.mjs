/**
 * La hoja de contacto dice "t1.07 f32" arriba de cada cuadro: el cuadro de abajo tiene que ser
 * ese, no el siguiente. Y tiene que serlo aunque el cuadro caiga lejos de un cuadro clave, que es
 * donde la búsqueda rápida se equivoca si no decodifica desde el cuadro clave anterior.
 *
 * El video de prueba lleva su número de cuadro pintado en el color: rojo = N mod 32, verde = N / 32.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/cuadros.mjs", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "cuadros-"));
const video30 = join(carpeta, "numerado30.mp4");
const video60 = join(carpeta, "numerado60.mp4");

/** Un video vertical de 180x320 con el número de cuadro en el color y un cuadro clave cada 5 s. */
function numerado(salida, fps, segundos) {
  const r = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", `color=c=black:s=180x320:r=${fps}:d=${segundos}`,
    "-vf", "format=gbrp,geq=r='mod(N\\,32)*8':g='trunc(N/32)*8':b='128'",
    "-c:v", "libx264", "-g", String(fps * 5), "-keyint_min", String(fps * 5), "-sc_threshold", "0",
    "-pix_fmt", "yuv420p", salida,
  ], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
}

/** El número de cuadro que muestra una imagen en el punto (x, y). */
function cuadroEn(imagen, x, y) {
  const r = spawnSync(ffmpegStatic, ["-v", "error", "-i", imagen, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, String(r.stderr));
  const ancho = medidas(imagen).ancho;
  const i = (y * ancho + x) * 3;
  return Math.round(r.stdout[i] / 8) + 32 * Math.round(r.stdout[i + 1] / 8);
}

function medidas(imagen) {
  const r = spawnSync(ffmpegStatic, ["-hide_banner", "-i", imagen], { encoding: "utf8" });
  const [, ancho, alto] = r.stderr.match(/, (\d+)x(\d+)/);
  return { ancho: Number(ancho), alto: Number(alto) };
}

/** De la salida de cuadros.mjs: cada hoja con los cuadros que dice tener, de izquierda a derecha. */
function hojasDe(texto) {
  return texto
    .split(/\r?\n/)
    .map((l) => l.match(/^\s+(\S.*?\.png)\s+->\s+(.*)$/))
    .filter(Boolean)
    .map(([, ruta, resto]) => ({ ruta, cuadros: [...resto.matchAll(/t[\d.]+ f(\d+)/g)].map((m) => Number(m[1])) }));
}

const correr = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", cwd: carpeta });

before(() => {
  numerado(video30, 30, 34);
  numerado(video60, 60, 17);
});

test("cada cuadro de la hoja es el que dice su etiqueta, en todo el video", () => {
  const r = correr([video30, join(carpeta, "hoja"), "--cada", "32", "--hoja", "5", "--ancho", "90"]);
  assert.equal(r.status, 0, r.stderr);
  const hojas = hojasDe(r.stdout);
  assert.equal(hojas.length, 7, "32 cuadros pedidos de a 5 por hoja");
  assert.deepEqual(hojas.flatMap((h) => h.cuadros), Array.from({ length: 32 }, (_, k) => k * 32));
  for (const hoja of hojas) {
    const ruta = join(carpeta, hoja.ruta);
    assert.ok(existsSync(ruta), `falta ${hoja.ruta}`);
    assert.deepEqual(medidas(ruta), { ancho: 90 * hoja.cuadros.length, alto: 160 });
    // Abajo al centro de cada cuadro: la etiqueta va arriba a la izquierda.
    const vistos = hoja.cuadros.map((_, i) => cuadroEn(ruta, i * 90 + 45, 140));
    assert.deepEqual(vistos, hoja.cuadros, `${hoja.ruta}: la etiqueta no coincide con el cuadro`);
  }
});

test("con --tiempos sale el cuadro más cercano a cada segundo pedido", () => {
  const r = correr([video30, join(carpeta, "tiempos"), "--tiempos", "12.4,5.017,33.1,1.067", "--hoja", "4", "--ancho", "90"]);
  assert.equal(r.status, 0, r.stderr);
  const [hoja] = hojasDe(r.stdout);
  assert.deepEqual(hoja.cuadros, [372, 151, 993, 32]);
  const vistos = hoja.cuadros.map((_, i) => cuadroEn(join(carpeta, hoja.ruta), i * 90 + 45, 140));
  assert.deepEqual(vistos, [372, 151, 993, 32]);
});

test("un cuadro suelto de un video a 60 fps es el más cercano al segundo pedido", () => {
  const salida = join(carpeta, "suelto60.png");
  const r = correr([video60, salida, "--tiempos", "1.067", "--suelto"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(medidas(salida), { ancho: 180, alto: 320 });
  assert.equal(cuadroEn(salida, 90, 160), 64, "1,067 s a 60 fps es el cuadro 64");
});
