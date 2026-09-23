import { test } from "node:test";
import assert from "node:assert/strict";
import { juntarPalabras } from "../.claude/skills/editar-video/scripts/_voz.mjs";
import { leerCorrecciones, aplicarCorrecciones } from "../.claude/skills/editar-video/scripts/_corregir.mjs";

test("las marcas de Whisper que no son palabras dichas no llegan a los subtítulos", () => {
  const tokens = [
    { text: " hola", startMs: 0, endMs: 300 },
    { text: " [", startMs: 300, endMs: 350 },
    { text: "MÚ", startMs: 350, endMs: 400 },
    { text: "SICA", startMs: 400, endMs: 450 },
    { text: "]", startMs: 450, endMs: 500 },
    { text: " (risas)", startMs: 500, endMs: 900 },
    { text: " mundo", startMs: 900, endMs: 1200 },
  ];
  assert.deepEqual(
    juntarPalabras(tokens).map((p) => p.texto),
    ["hola", "mundo"],
  );
});

test("una corrección con el lado derecho vacío borra la palabra", () => {
  const { correcciones, errores } = leerCorrecciones("eh =>\n");
  assert.deepEqual(errores, []);
  const palabras = [
    { texto: "Bueno,", inicio: 0, fin: 0.4 },
    { texto: "eh", inicio: 0.5, fin: 0.7 },
    { texto: "arrancamos.", inicio: 0.8, fin: 1.3 },
  ];
  const { palabras: nuevas, resultados } = aplicarCorrecciones(palabras, correcciones);
  assert.deepEqual(nuevas.map((p) => p.texto), ["Bueno,", "arrancamos."]);
  assert.deepEqual(resultados[0].apariciones, [0.5]);
});

test("sin nada a la izquierda sigue siendo un error", () => {
  const { correcciones, errores } = leerCorrecciones("=> algo\n");
  assert.equal(correcciones.length, 0);
  assert.equal(errores.length, 1);
});
