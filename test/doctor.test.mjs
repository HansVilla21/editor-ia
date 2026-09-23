import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { revisarEntorno, leerEntorno } from "../scripts/doctor.mjs";

const entornoSano = {
  env: { GEMINI_API_KEY: "clave-de-prueba" },
  versionNode: "v22.3.0",
  rutaFfmpeg: "/ruta/a/ffmpeg",
  whisperListo: true,
  plataforma: "win32",
  rutaProyecto: "C:\\Users\\ana\\editor-ia",
};

const buscar = (revisiones, nombre) => revisiones.find((r) => r.nombre === nombre);

test("con todo en su lugar, no reporta nada faltante", () => {
  const revisiones = revisarEntorno(entornoSano);
  assert.equal(
    revisiones.every((r) => r.ok),
    true,
  );
});

test("avisa cuando falta la clave de Gemini y dice dónde sacarla", () => {
  const revisiones = revisarEntorno({ ...entornoSano, env: {} });
  const gemini = buscar(revisiones, "clave-gemini");
  assert.equal(gemini.ok, false);
  assert.match(gemini.comoResolver, /aistudio\.google\.com/);
});

test("rechaza versiones de Node por debajo de 20", () => {
  const revisiones = revisarEntorno({ ...entornoSano, versionNode: "v18.20.0" });
  assert.equal(buscar(revisiones, "node").ok, false);
});

test("rechaza Node 20 anterior a 20.12, que no sabe leer el archivo .env", () => {
  const viejo = revisarEntorno({ ...entornoSano, versionNode: "v20.11.1" });
  const justo = revisarEntorno({ ...entornoSano, versionNode: "v20.12.0" });
  assert.equal(buscar(viejo, "node").ok, false);
  assert.equal(buscar(justo, "node").ok, true);
});

test("avisa cuando ffmpeg no quedó instalado", () => {
  const revisiones = revisarEntorno({ ...entornoSano, rutaFfmpeg: null });
  const ffmpeg = buscar(revisiones, "ffmpeg");
  assert.equal(ffmpeg.ok, false);
  assert.match(ffmpeg.comoResolver, /npm install/);
});

test("avisa cuando falta Whisper y dice cómo bajarlo", () => {
  const revisiones = revisarEntorno({ ...entornoSano, whisperListo: false });
  const whisper = buscar(revisiones, "whisper");
  assert.equal(whisper.ok, false);
  assert.match(whisper.comoResolver, /npm run whisper/);
});

test("en Windows, avisa si la carpeta del proyecto tiene una ruta demasiado larga", () => {
  const larga = "C:\\Users\\ana\\OneDrive - Empresa\\" + "carpeta\\".repeat(16) + "editor-ia";
  const revisiones = revisarEntorno({ ...entornoSano, rutaProyecto: larga });
  const ruta = buscar(revisiones, "ruta-del-proyecto");
  assert.equal(ruta.ok, false);
  assert.match(ruta.comoResolver, /C:\\editor-ia/);
});

test("fuera de Windows, la ruta larga no es un problema", () => {
  const larga = "/Users/ana/" + "carpeta/".repeat(20) + "editor-ia";
  const revisiones = revisarEntorno({ ...entornoSano, plataforma: "darwin", rutaProyecto: larga });
  assert.equal(buscar(revisiones, "ruta-del-proyecto").ok, true);
});

test("la clave pegada en el archivo .env cuenta como puesta", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "doctor-"));
  writeFileSync(join(carpeta, ".env"), "# comentario\nGEMINI_API_KEY=la-del-archivo\n", "utf8");
  const env = leerEntorno(carpeta, {});
  assert.equal(env.GEMINI_API_KEY, "la-del-archivo");
  const revisiones = revisarEntorno({ ...entornoSano, env });
  assert.equal(buscar(revisiones, "clave-gemini").ok, true);
});

test("sin archivo .env, el entorno queda como estaba", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "doctor-"));
  const env = leerEntorno(carpeta, { OTRA: "x" });
  assert.deepEqual(env, { OTRA: "x" });
});

test("una clave del entorno gana sobre la del archivo", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "doctor-"));
  writeFileSync(join(carpeta, ".env"), "GEMINI_API_KEY=la-del-archivo\n", "utf8");
  const env = leerEntorno(carpeta, { GEMINI_API_KEY: "la-del-entorno" });
  assert.equal(env.GEMINI_API_KEY, "la-del-entorno");
});
