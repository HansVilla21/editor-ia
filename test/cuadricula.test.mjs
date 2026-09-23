/**
 * Los mapas de montar, cortar y apretar tienen que coincidir cuadro a cuadro con el video que
 * escriben. Si cada pedazo sale un cuadro más largo de lo que dice el mapa, los CORTES se corren
 * 3 o 4 cuadros al final del video y el zoom salta antes que la imagen.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";

const SCRIPTS = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "cuadricula-"));
const fuente = join(carpeta, "fuente60.mp4");

const correr = (script, args) => spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });

const cuadros = (archivo) =>
  Number(
    spawnSync(ffprobe.path, ["-v", "error", "-select_streams", "v:0", "-count_frames", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", archivo], { encoding: "utf8" }).stdout.trim(),
  );

const duracionAudio = (archivo) =>
  Number(
    spawnSync(ffprobe.path, ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "csv=p=0", archivo], { encoding: "utf8" }).stdout.trim(),
  );

before(() => {
  // 12 s a 60 fps: tono de 1 s, 1 s de silencio, y así. Los silencios caen fuera de la grilla de 30.
  const r = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "testsrc2=s=320x240:r=60:d=12",
    "-f", "lavfi", "-i", "aevalsrc=if(lt(mod(t+0.013\\,2)\\,1)\\,0.4*sin(2*PI*220*t)\\,0):s=48000:d=12",
    "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", fuente,
  ]);
  assert.equal(r.status, 0, String(r.stderr));
});

test("montar: con tiempos fuera de la grilla, el video tiene los cuadros que dice el mapa", () => {
  const edl = join(carpeta, "edl.json");
  writeFileSync(edl, JSON.stringify([{ desde: 1.013, hasta: 2.027 }, { desde: 5.491, hasta: 6.502 }, { desde: 8.007, hasta: 9.019 }]));
  const salida = join(carpeta, "montado.mp4");
  const mapa = join(carpeta, "montaje.json");
  const r = correr("montar.mjs", [fuente, edl, salida, mapa]);
  assert.equal(r.status, 0, r.stderr);
  const filas = JSON.parse(readFileSync(mapa, "utf8")).tomas ?? JSON.parse(readFileSync(mapa, "utf8"));
  const total = cuadros(salida);
  // Cada toma arranca donde terminó la anterior, en cuadros enteros, y el video dura lo que suman.
  const largos = filas.map((f) => Math.round((f.crudoHasta - f.crudoDesde) * 30));
  const inicios = largos.map((_, i) => largos.slice(0, i).reduce((s, n) => s + n, 0));
  assert.deepEqual(filas.map((f) => f.cuadro), inicios);
  assert.equal(total, largos.reduce((s, n) => s + n, 0), "el video tiene los cuadros que suma el mapa");
  assert.ok(Math.abs(total - 90) <= 3, "tres tomas de ~1 s dan unos 90 cuadros");
  assert.ok(Math.abs(duracionAudio(salida) - total / 30) < 0.03, "el audio dura lo mismo que el video");
});

test("cortar: la suma de los tramos del mapa es exactamente el video que escribió", () => {
  const salida = join(carpeta, "cortado.mp4");
  const mapa = join(carpeta, "tramos.json");
  const r = correr("cortar.mjs", [fuente, salida, mapa, "--cola", "0.3"]);
  assert.equal(r.status, 0, r.stderr);
  const { tramos } = JSON.parse(readFileSync(mapa, "utf8"));
  const total = cuadros(salida);
  const ultimo = tramos[tramos.length - 1];
  const finDelUltimo = Math.round((ultimo.inicioSalida + (ultimo.finOrigen - ultimo.inicioOrigen)) * 30);
  assert.equal(finDelUltimo, total, "el último tramo del mapa termina en el último cuadro del video");
  for (const t of tramos) assert.equal(Math.round(t.inicioSalida * 30), t.cuadro);
  assert.ok(Math.abs(duracionAudio(salida) - total / 30) < 0.03, "el audio dura lo mismo que el video");
});

test("apretar: lo quitado según el mapa es exactamente lo que perdió el video, a 30 fps", () => {
  // Directo sobre la fuente: tiene pausas de 1 s, que apretar saca, con bordes fuera de la grilla.
  const salida = join(carpeta, "apretado.mp4");
  const mapa = join(carpeta, "quitados.json");
  const r = correr("apretar.mjs", [fuente, salida, mapa]);
  assert.equal(r.status, 0, r.stderr);
  const { quitados } = JSON.parse(readFileSync(mapa, "utf8"));
  assert.ok(quitados.length > 0, "tiene que haber quitado alguna pausa");
  for (const [a, b] of quitados) {
    assert.equal(Math.abs(a * 30 - Math.round(a * 30)) < 0.01 && Math.abs(b * 30 - Math.round(b * 30)) < 0.01, true, `[${a}, ${b}] cae fuera de la grilla de 30`);
  }
  const quitadoEnCuadros = quitados.reduce((s, [a, b]) => s + Math.round((b - a) * 30), 0);
  assert.equal(cuadros(salida), 12 * 30 - quitadoEnCuadros);
});
