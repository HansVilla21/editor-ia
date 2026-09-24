/**
 * Quien ya tiene whisper.cpp instalado en otro lado lo indica una vez con WHISPER_DIR (en el
 * entorno o en .env) y no tiene que pasar --whisper en cada llamada. Sin eso, Whisper vive en
 * .whisper/, dentro del proyecto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CARPETA_WHISPER, carpetaWhisper, instalarWhisper } from "../scripts/whisper.mjs";
import { leerEntorno } from "../scripts/entorno.mjs";
import { revisarEntorno } from "../scripts/doctor.mjs";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));
const TRANSCRIBIR = join(RAIZ, ".claude/skills/editar-video/scripts/transcribir.mjs");

test("sin WHISPER_DIR, Whisper está en .whisper/ dentro del proyecto", () => {
  assert.equal(carpetaWhisper({}), CARPETA_WHISPER);
  assert.equal(carpetaWhisper({ WHISPER_DIR: "   " }), CARPETA_WHISPER);
});

test("con WHISPER_DIR, esa es la carpeta; una ruta relativa se toma desde la raíz del proyecto", () => {
  const propia = mkdtempSync(join(tmpdir(), "whisper-propio-"));
  assert.equal(carpetaWhisper({ WHISPER_DIR: propia }), resolve(propia));
  assert.equal(carpetaWhisper({ WHISPER_DIR: "../whisper.cpp" }), resolve(RAIZ, "../whisper.cpp"));
});

test("WHISPER_DIR se puede poner en el archivo .env", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "entorno-"));
  const propia = join(carpeta, "mi-whisper");
  writeFileSync(join(carpeta, ".env"), `GEMINI_API_KEY=x\nWHISPER_DIR=${propia}\n`, "utf8");
  assert.equal(carpetaWhisper(leerEntorno(carpeta, {})), resolve(propia));
});

test("no se baja nada a la carpeta de WHISPER_DIR: es una instalación ajena al proyecto", async () => {
  const propia = mkdtempSync(join(tmpdir(), "whisper-ajeno-"));
  await assert.rejects(
    instalarWhisper({ carpeta: propia, entorno: { WHISPER_DIR: propia } }),
    (error) => /WHISPER_DIR/.test(error.message) && error.message.includes(propia),
  );
  assert.deepEqual(readdirSync(propia), [], "no escribió nada ahí");
});

test("el diagnóstico, si WHISPER_DIR no tiene Whisper, dice que revise esa carpeta", () => {
  const revisiones = revisarEntorno({
    env: { GEMINI_API_KEY: "x", WHISPER_DIR: "D:\\whisper.cpp" },
    versionNode: "v22.3.0",
    rutaFfmpeg: "/ffmpeg",
    whisperListo: false,
    plataforma: "win32",
    rutaProyecto: "C:\\editor-ia",
  });
  const whisper = revisiones.find((r) => r.nombre === "whisper");
  assert.equal(whisper.ok, false);
  assert.match(whisper.comoResolver, /WHISPER_DIR/);
  assert.match(whisper.comoResolver, /D:\\whisper\.cpp/);
});

test("transcribir.mjs busca Whisper en WHISPER_DIR sin que haga falta --whisper", () => {
  const propia = mkdtempSync(join(tmpdir(), "whisper-vacio-"));
  const r = spawnSync(process.execPath, [TRANSCRIBIR, "no-importa.wav", join(propia, "salida.json")], {
    encoding: "utf8",
    env: { ...process.env, WHISPER_DIR: propia },
  });
  assert.notEqual(r.status, 0);
  assert.ok(r.stderr.includes(propia), `el aviso tiene que nombrar ${propia}:\n${r.stderr}`);
  assert.match(r.stderr, /WHISPER_DIR/);
});
