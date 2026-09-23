import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { asegurarMemoria } from "../scripts/memoria.mjs";

const proyecto = () => {
  const raiz = mkdtempSync(join(tmpdir(), "memoria-"));
  mkdirSync(join(raiz, "memory", "plantillas"), { recursive: true });
  writeFileSync(join(raiz, "memory", "plantillas", "preferencias.md"), "# Preferencias (plantilla)\n");
  writeFileSync(join(raiz, "memory", "plantillas", "reglas.md"), "# Reglas (plantilla)\n");
  return raiz;
};

test("la primera vez copia cada plantilla a memory/ y dice cuáles creó", () => {
  const raiz = proyecto();
  const creados = asegurarMemoria(raiz);
  assert.deepEqual(creados.sort(), ["preferencias.md", "reglas.md"]);
  assert.equal(readFileSync(join(raiz, "memory", "reglas.md"), "utf8"), "# Reglas (plantilla)\n");
});

test("nunca pisa lo que la persona ya escribió", () => {
  const raiz = proyecto();
  asegurarMemoria(raiz);
  writeFileSync(join(raiz, "memory", "preferencias.md"), "# Preferencias\n**Elegido:** de tú\n");
  const creados = asegurarMemoria(raiz);
  assert.deepEqual(creados, []);
  assert.match(readFileSync(join(raiz, "memory", "preferencias.md"), "utf8"), /de tú/);
});

test("sin carpeta de plantillas no hace nada ni falla", () => {
  const raiz = mkdtempSync(join(tmpdir(), "memoria-vacia-"));
  assert.deepEqual(asegurarMemoria(raiz), []);
  assert.equal(existsSync(join(raiz, "memory", "preferencias.md")), false);
});
