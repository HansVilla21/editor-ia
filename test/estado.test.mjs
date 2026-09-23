import { test } from "node:test";
import assert from "node:assert/strict";
import { siguientePaso } from "../scripts/estado.mjs";

const todoOk = [
  { nombre: "node", ok: true },
  { nombre: "ffmpeg", ok: true },
  { nombre: "clave-gemini", ok: true },
];

/** Un estado con todo hecho; cada prueba le saca una cosa. */
const completo = { preferencias: true, estiloEntrenado: true, videosHechos: 3, calibrado: true };

test("si falta algo del entorno, eso va primero, aunque falte todo lo demás", () => {
  const revisiones = [...todoOk.slice(0, 2), { nombre: "clave-gemini", ok: false }];
  const paso = siguientePaso({ revisiones, estado: {} });
  assert.equal(paso.clave, "entorno-incompleto");
  assert.match(paso.mensaje, /\/arrancar/);
});

test("sin estado.json (recién clonado) y con el entorno listo, pide las preferencias", () => {
  const paso = siguientePaso({ revisiones: todoOk, estado: {} });
  assert.equal(paso.clave, "faltan-preferencias");
  assert.match(paso.mensaje, /\/arrancar/);
});

test("las preferencias van antes que el estilo", () => {
  const paso = siguientePaso({ revisiones: todoOk, estado: { ...completo, preferencias: false } });
  assert.equal(paso.clave, "faltan-preferencias");
});

test("con las preferencias hechas pero sin estilo, pide referencias", () => {
  const paso = siguientePaso({ revisiones: todoOk, estado: { ...completo, estiloEntrenado: false } });
  assert.equal(paso.clave, "falta-entrenar");
  assert.match(paso.mensaje, /referencias/);
  assert.match(paso.mensaje, /\/estudiar/);
});

test("con estilo entrenado y sin videos, propone el primero", () => {
  const paso = siguientePaso({
    revisiones: todoOk,
    estado: { ...completo, videosHechos: 0, calibrado: false },
  });
  assert.equal(paso.clave, "primer-video");
  assert.match(paso.mensaje, /\/nuevo-video/);
});

test("con un video hecho y sin calibrar, propone calibrar", () => {
  const paso = siguientePaso({
    revisiones: todoOk,
    estado: { ...completo, videosHechos: 1, calibrado: false },
  });
  assert.equal(paso.clave, "falta-calibrar");
  assert.match(paso.mensaje, /\/calibrar/);
});

test("un estado viejo, sin la clave calibrado, también propone calibrar", () => {
  const { calibrado, ...viejo } = completo;
  const paso = siguientePaso({ revisiones: todoOk, estado: viejo });
  assert.equal(paso.clave, "falta-calibrar");
});

test("con todo hecho, no interrumpe", () => {
  const paso = siguientePaso({ revisiones: todoOk, estado: completo });
  assert.equal(paso, null);
});

test("cada aviso es corto y nombra un solo comando", () => {
  const estados = [
    {},
    { ...completo, estiloEntrenado: false },
    { ...completo, videosHechos: 0, calibrado: false },
    { ...completo, calibrado: false },
  ];
  for (const estado of estados) {
    const { mensaje } = siguientePaso({ revisiones: todoOk, estado });
    assert.ok(mensaje.length <= 200, `demasiado largo (${mensaje.length}): ${mensaje}`);
    assert.equal(mensaje.match(/\/[a-z-]+/g)?.length, 1, `tiene que nombrar un comando: ${mensaje}`);
  }
});
