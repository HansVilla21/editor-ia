/**
 * corregir.mjs aplica las correcciones de nombres propios (la segunda opinión de Gemini, o lo
 * que ve la persona) sobre palabras.json sin tocar los tiempos: los subtítulos siguen cayendo
 * en el mismo cuadro, solo cambia lo que dicen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { leerCorrecciones, aplicarCorrecciones } from "../.claude/skills/editar-video/scripts/_corregir.mjs";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/corregir.mjs", import.meta.url));

const palabra = (texto, inicio, fin) => ({
  texto,
  inicio,
  fin,
  cuadroInicio: Math.round(inicio * 30),
  cuadroFin: Math.round(fin * 30),
});

const frase = () => [
  palabra("Esto", 0.1, 0.3),
  palabra("me", 0.32, 0.4),
  palabra("volvió", 0.42, 0.8),
  palabra("la", 0.82, 0.9),
  palabra("día,", 0.92, 1.3),
  palabra("con", 1.4, 1.6),
  palabra("Claude", 1.62, 2.0),
  palabra("Codl.", 2.02, 2.5),
];

const corregir = (palabras, texto) => aplicarCorrecciones(palabras, leerCorrecciones(texto).correcciones);

test("con la misma cantidad de palabras, cambia el texto de cada una y conserva sus tiempos", () => {
  const original = frase();
  const { palabras } = corregir(original, "volvió la día => devolvió la IA\nCodl => Code");
  assert.deepEqual(
    palabras.map((p) => p.texto),
    ["Esto", "me", "devolvió", "la", "IA,", "con", "Claude", "Code."],
  );
  palabras.forEach((p, i) => {
    assert.equal(p.inicio, original[i].inicio);
    assert.equal(p.fin, original[i].fin);
    assert.equal(p.cuadroInicio, original[i].cuadroInicio);
    assert.equal(p.cuadroFin, original[i].cuadroFin);
  });
});

test("con otra cantidad, las palabras nuevas se reparten el tramo de las viejas según su largo", () => {
  const original = [palabra("Uso", 1, 1.5), palabra("cloudcode", 2, 2.9), palabra("siempre", 3, 3.4)];
  const { palabras } = corregir(original, "cloudcode => Claude Code");
  assert.deepEqual(palabras.map((p) => p.texto), ["Uso", "Claude", "Code", "siempre"]);
  // "Claude" tiene 6 letras y "Code" 4: el primero se lleva el 60 % de los 0,9 s.
  assert.deepEqual([palabras[1].inicio, palabras[1].fin], [2, 2.54]);
  assert.deepEqual([palabras[2].inicio, palabras[2].fin], [2.54, 2.9]);
  assert.deepEqual([palabras[1].cuadroInicio, palabras[1].cuadroFin], [60, 76]);
  assert.deepEqual([palabras[2].cuadroInicio, palabras[2].cuadroFin], [76, 87]);
  assert.deepEqual(palabras[3], original[2]);
});

test("varias palabras que pasan a ser una se quedan con todo el tramo y la puntuación de los bordes", () => {
  const original = [palabra("¿Remo", 1, 1.3), palabra("chon?", 1.35, 1.7)];
  const { palabras } = corregir(original, "remo chon => Remotion");
  assert.deepEqual(palabras, [palabra("¿Remotion?", 1, 1.7)]);
});

test("encuentra sin distinguir mayúsculas ni la puntuación de los bordes, en todas las apariciones", () => {
  const original = [palabra("¿Codl", 0, 0.4), palabra("o", 0.5, 0.6), palabra("CODL?", 0.7, 1)];
  const { palabras, resultados } = corregir(original, "codl => Code");
  assert.deepEqual(palabras.map((p) => p.texto), ["¿Code", "o", "Code?"]);
  assert.deepEqual(resultados[0].apariciones, [0, 0.7]);
});

test("las líneas se aplican en orden: cada una trabaja sobre lo que dejó la anterior", () => {
  const original = [palabra("Cloud", 0, 0.4), palabra("Codl", 0.5, 0.9)];
  const { palabras, resultados } = corregir(original, "Codl => Code\ncloud code => Claude Code");
  assert.deepEqual(palabras.map((p) => p.texto), ["Claude", "Code"]);
  assert.deepEqual(resultados.map((r) => r.apariciones.length), [1, 1]);
});

test("no vuelve a buscar dentro de lo que acaba de poner", () => {
  const { palabras, resultados } = corregir([palabra("IA", 0, 0.5)], "IA => la IA");
  assert.deepEqual(palabras.map((p) => p.texto), ["la", "IA"]);
  assert.equal(resultados[0].apariciones.length, 1);
});

test("una línea que no aparece en ninguna parte queda sin apariciones, y no cambia nada", () => {
  const original = frase();
  const { palabras, resultados } = corregir(original, "Remochon => Remotion");
  assert.deepEqual(palabras, original);
  assert.deepEqual(resultados[0].apariciones, []);
});

test("si palabras.json no trae los cuadros, las palabras nuevas tampoco", () => {
  const { palabras } = corregir([{ texto: "cloudcode", inicio: 2, fin: 2.9 }], "cloudcode => Claude Code");
  assert.deepEqual(palabras, [
    { texto: "Claude", inicio: 2, fin: 2.54 },
    { texto: "Code", inicio: 2.54, fin: 2.9 },
  ]);
});

test("el archivo de correcciones ignora líneas vacías y comentarios, y avisa las que no entiende", () => {
  const { correcciones, errores } = leerCorrecciones("# nombres propios\n\nCodl => Code\nesto no tiene flecha\n => IA\n");
  assert.equal(correcciones.length, 1);
  assert.deepEqual(correcciones[0].mal, ["codl"]);
  assert.deepEqual(correcciones[0].bien, ["Code"]);
  assert.equal(correcciones[0].numero, 3);
  assert.deepEqual(errores.map((e) => e.numero), [4, 5]);
});

test("un archivo guardado con BOM (el Bloc de notas lo pone) se lee igual", () => {
  const { correcciones, errores } = leerCorrecciones("﻿# nombres\nCodl => Code\n");
  assert.equal(correcciones.length, 1);
  assert.deepEqual(errores, []);
});

test("corregir.mjs escribe el resultado, cuenta lo que reemplazó y avisa lo que no encontró", () => {
  const carpeta = mkdtempSync(join(tmpdir(), "corregir-"));
  const entrada = join(carpeta, "palabras.json");
  const lista = join(carpeta, "correcciones.txt");
  const salida = join(carpeta, "corregidas.json");
  writeFileSync(entrada, JSON.stringify(frase()));
  writeFileSync(lista, "volvió la día => devolvió la IA\nRemochon => Remotion\n");

  const r = spawnSync(process.execPath, [SCRIPT, entrada, lista, "--salida", salida], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /devolvió la IA/);
  assert.match(r.stdout, /Remochon/);
  assert.match(r.stdout, /no (las? )?encontr/i);
  const escritas = JSON.parse(readFileSync(salida, "utf8"));
  assert.equal(escritas[4].texto, "IA,");
  assert.equal(JSON.parse(readFileSync(entrada, "utf8"))[4].texto, "día,", "con --salida no se toca la entrada");

  const enSuLugar = spawnSync(process.execPath, [SCRIPT, entrada, lista], { encoding: "utf8" });
  assert.equal(enSuLugar.status, 0, enSuLugar.stderr);
  assert.equal(JSON.parse(readFileSync(entrada, "utf8"))[2].texto, "devolvió");
});
