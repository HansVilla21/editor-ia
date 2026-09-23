import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarFicha, leerRangoBpm } from "../.claude/skills/editar-video/scripts/_musica.mjs";
import { avisosFueraDeGuion } from "../.claude/skills/editar-video/scripts/_tomas.mjs";

test("una ficha que Gemini devolvió como lista se toma igual", () => {
  assert.deepEqual(normalizarFicha([{ encaje: 7, bpm: 90 }]), { encaje: 7, bpm: 90 });
  assert.deepEqual(normalizarFicha({ encaje: 8 }), { encaje: 8 });
  assert.deepEqual(normalizarFicha(null), {});
});

test("el rango de BPM sale de lo que pidió la persona, o del neutro", () => {
  assert.deepEqual(leerRangoBpm(undefined), [110, 125]);
  assert.deepEqual(leerRangoBpm("70-95"), [70, 95]);
  assert.throws(() => leerRangoBpm("rápida"), /BPM/);
});

test("lo que se dijo fuera del guion se avisa en pantalla, con su segundo y su texto", () => {
  const avisos = avisosFueraDeGuion({ fueraDeGuion: [{ inicio: 181.2, fin: 185.9, texto: "Incluso le puede agregar animaciones" }] });
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /181\.20/);
  assert.match(avisos[0], /Incluso le puede agregar animaciones/);
  assert.deepEqual(avisosFueraDeGuion({ fueraDeGuion: [{ inicio: 0, fin: 0, texto: "" }] }), []);
  assert.deepEqual(avisosFueraDeGuion({}), []);
});
