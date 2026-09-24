/**
 * tomas.mjs no puede llamar "trabado" a un intento que solo tuvo silencios: el corte de
 * silencios los saca, y esa toma sirve. Trabado es otra cosa: repetir, corregirse, cortar la frase.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { marcasDelIntento, instruccionDeTomas } from "../.claude/skills/editar-video/scripts/_tomas.mjs";

test("un intento que solo hizo pausas sale como fluido con pausas, no como trabado", () => {
  assert.equal(marcasDelIntento({ completo: true, fluido: true, pausas: true }), "completo fluido, con pausas");
  assert.equal(marcasDelIntento({ completo: true, fluido: true, pausas: false }), "completo fluido");
});

test("trabado queda para cuando se trabó de verdad", () => {
  assert.equal(marcasDelIntento({ completo: false, fluido: false }), "PARCIAL TRABADO");
  assert.equal(marcasDelIntento({ completo: true, fluido: false, pausas: true }), "completo TRABADO, con pausas");
});

test("un tomas.json viejo, sin el campo pausas, se muestra como antes", () => {
  assert.equal(marcasDelIntento({ completo: true, fluido: true }), "completo fluido");
  assert.equal(marcasDelIntento({ completo: true, fluido: false }), "completo TRABADO");
});

test("el pedido a Gemini separa trabarse de hacer pausas y pide el campo nuevo sin tocar los viejos", () => {
  const texto = instruccionDeTomas(["Primera frase.", "Segunda frase."], 42.5);
  assert.match(texto, /1\. Primera frase\./);
  assert.match(texto, /2\. Segunda frase\./);
  assert.match(texto, /42\.50 segundos/);
  assert.match(texto, /"fluido":true/);
  assert.match(texto, /"pausas":false/);
  // Las pausas no descalifican: el corte de silencios las saca.
  assert.match(texto, /pausas[^\n]*no (cuentan|descalifican)/i);
});
