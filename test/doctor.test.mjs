import { test } from "node:test";
import assert from "node:assert/strict";
import { revisarEntorno } from "../scripts/doctor.mjs";

const entornoSano = {
  env: { GEMINI_API_KEY: "clave-de-prueba" },
  versionNode: "v22.3.0",
  rutaFfmpeg: "/ruta/a/ffmpeg",
};

test("con todo en su lugar, no reporta nada faltante", () => {
  const revisiones = revisarEntorno(entornoSano);
  assert.equal(
    revisiones.every((r) => r.ok),
    true,
  );
});

test("avisa cuando falta la clave de Gemini y dice dónde sacarla", () => {
  const revisiones = revisarEntorno({ ...entornoSano, env: {} });
  const gemini = revisiones.find((r) => r.nombre === "clave-gemini");
  assert.equal(gemini.ok, false);
  assert.match(gemini.comoResolver, /aistudio\.google\.com/);
});

test("rechaza versiones de Node por debajo de 20", () => {
  const revisiones = revisarEntorno({ ...entornoSano, versionNode: "v18.20.0" });
  const node = revisiones.find((r) => r.nombre === "node");
  assert.equal(node.ok, false);
});

test("avisa cuando ffmpeg no quedó instalado", () => {
  const revisiones = revisarEntorno({ ...entornoSano, rutaFfmpeg: null });
  const ffmpeg = revisiones.find((r) => r.nombre === "ffmpeg");
  assert.equal(ffmpeg.ok, false);
  assert.match(ffmpeg.comoResolver, /npm install/);
});
