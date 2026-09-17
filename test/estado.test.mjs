import { test } from "node:test";
import assert from "node:assert/strict";
import { siguientePaso } from "../scripts/estado.mjs";

const todoOk = [
  { nombre: "node", ok: true },
  { nombre: "ffmpeg", ok: true },
  { nombre: "clave-gemini", ok: true },
];

test("si falta algo del entorno, eso va primero", () => {
  const revisiones = [...todoOk.slice(0, 2), { nombre: "clave-gemini", ok: false }];
  const paso = siguientePaso({ revisiones, estado: {} });
  assert.equal(paso.clave, "entorno-incompleto");
});

test("con el entorno listo pero sin estilo, pide referencias", () => {
  const paso = siguientePaso({ revisiones: todoOk, estado: { estiloEntrenado: false } });
  assert.equal(paso.clave, "falta-entrenar");
  assert.match(paso.mensaje, /referencias/);
});

test("con estilo entrenado y sin videos, propone el primero", () => {
  const paso = siguientePaso({
    revisiones: todoOk,
    estado: { estiloEntrenado: true, videosHechos: 0 },
  });
  assert.equal(paso.clave, "primer-video");
});

test("con todo hecho, no interrumpe", () => {
  const paso = siguientePaso({
    revisiones: todoOk,
    estado: { estiloEntrenado: true, videosHechos: 3 },
  });
  assert.equal(paso, null);
});
