/**
 * Fase 3 — de los tokens de Whisper a palabras enteras, con su cuadro.
 *
 * El cuadro se calcula acá, con el redondeo compartido f = round(s · 30), para que los
 * subtítulos y los bloques no queden con distinto redondeo: cuando pasa, un cuadro sale con
 * el subtítulo viejo justo en la costura.
 */
import { readFileSync } from "node:fs";

import {
  ayuda,
  leerArgumentos,
  morir,
  escribirJson,
  corta,
  fijo,
  cuadroDe,
} from "./_comun.mjs";
import { juntarPalabras, imprimirPalabras } from "./_voz.mjs";

const AYUDA = `
palabras.mjs — junta los tokens de la transcripción en palabras, con su cuadro

  node .claude/skills/editar-video/scripts/palabras.mjs <captions.json> <palabras.json>

Recibe: la salida de transcribir.mjs (los tokens de Whisper, con sus milisegundos).
Devuelve: <palabras.json> con una entrada por palabra:
          {"texto", "inicio", "fin", "cuadroInicio", "cuadroFin"}
          y en pantalla el texto corrido con el segundo de cada palabra, para leerlo.

Los cuadros salen del redondeo compartido del proyecto: f = round(segundos * 30).
Los bloques de la composición tienen que usar el mismo, o la costura muestra el subtítulo viejo.

El texto final es lo que dijo, con los nombres propios corregidos contra la segunda opinión
de Gemini (transcribir.mjs --motor gemini).
`;

ayuda(process.argv, AYUDA);
const { libres } = leerArgumentos(process.argv.slice(2));
const [entrada, salida] = libres;
if (!entrada || !salida) morir("Faltan argumentos: <captions.json> <palabras.json>. Probá con --ayuda.");

let tokens;
try {
  tokens = JSON.parse(readFileSync(entrada, "utf8"));
} catch (e) {
  morir(`No pude leer ${corta(entrada)}: ${e.message}`);
}
if (Array.isArray(tokens.captions)) tokens = tokens.captions;
if (!Array.isArray(tokens)) morir(`${corta(entrada)} no es la lista de tokens que devuelve transcribir.mjs.`);
if (tokens.length === 0) morir(`${corta(entrada)} está vacío: no hay nada que juntar.`);
if (tokens[0].startMs === undefined) {
  morir(`${corta(entrada)} no tiene tiempos en milisegundos. ¿Es la salida de transcribir.mjs sin --motor?`);
}

const palabras = juntarPalabras(tokens).map((p) => ({
  ...p,
  cuadroInicio: cuadroDe(p.inicio),
  cuadroFin: cuadroDe(p.fin),
}));

if (palabras.length === 0) morir("No quedó ninguna palabra. Revisá la transcripción.");

escribirJson(salida, palabras);
imprimirPalabras(palabras);

const ultima = palabras[palabras.length - 1];
console.log("");
console.log(`${palabras.length} palabras, hasta el segundo ${fijo(ultima.fin)} (cuadro ${ultima.cuadroFin})`);
console.log(`palabras en ${corta(salida)}`);
