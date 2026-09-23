import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CARPETA_WHISPER, whisperInstalado, comandoDescomprimir } from "../scripts/whisper.mjs";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));

test("Whisper se instala dentro del proyecto, no en la carpeta del usuario", () => {
  assert.equal(resolve(CARPETA_WHISPER), join(RAIZ, ".whisper"));
});

test("sin programa ni modelo, Whisper no cuenta como instalado", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "whisper-"));
  assert.equal(whisperInstalado(carpeta, "small"), false);
  assert.equal(whisperInstalado(join(carpeta, "no-existe"), "small"), false);
});

test("con el programa y el modelo pedido, cuenta como instalado", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "whisper-"));
  writeFileSync(join(carpeta, "main.exe"), "");
  writeFileSync(join(carpeta, "ggml-small.bin"), "");
  assert.equal(whisperInstalado(carpeta, "small"), true);
  assert.equal(whisperInstalado(carpeta, "medium"), false);
});

test("el programa compilado en Mac o Linux, sin .exe, también cuenta", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "whisper-"));
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, "main"), "");
  writeFileSync(join(carpeta, "ggml-tiny.bin"), "");
  assert.equal(whisperInstalado(carpeta, "tiny"), true);
});

test("descomprimir en Windows funciona con espacios y apóstrofos en la ruta", () => {
  const comando = comandoDescomprimir("C:\\Mis Videos\\O'Brien\\w.zip", "C:\\Mis Videos\\O'Brien\\.whisper");
  assert.match(comando, /-LiteralPath 'C:\\Mis Videos\\O''Brien\\w\.zip'/);
  assert.match(comando, /-DestinationPath 'C:\\Mis Videos\\O''Brien\\\.whisper'/);
  assert.match(comando, /-Force/);
});
