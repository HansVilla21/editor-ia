/**
 * Fase 2 → 7 — los CORTES de datos.ts, en segundos del video FINAL.
 *
 * Los inicios de tramo de cortar.mjs están medidos antes de la segunda pasada y antes de
 * acelerar. Si se apretó o se aceleró, esos segundos ya no caen donde estaban: este script
 * los corre, para no hacer la cuenta a mano.
 */
import { readFileSync } from "node:fs";

import { ayuda, leerArgumentos, morir, corta, esPrincipal } from "./_comun.mjs";

const AYUDA = `
cortes.mjs — los CORTES para datos.ts, en segundos del video final

  node .claude/skills/editar-video/scripts/cortes.mjs <tramos.json> \\
       [--quitados <quitados.json>] [--velocidad 1.1]

Recibe: el tramos.json de cortar.mjs; si se corrió apretar.mjs, su quitados.json; y si se
        aceleró, la misma velocidad que se le pasó a acelerar.mjs.
Devuelve: en pantalla, la línea lista para copiar en datos.ts:  CORTES: [0, 2.31, …]

A cada corte se le resta lo que apretar quitó antes de él (si cae adentro de un tramo quitado,
va al inicio de ese tramo), y después se divide por la velocidad.
`;

const tres = (n) => Math.round(n * 1000) / 1000;

export function correrCortes(cortes, { quitados = [], velocidad = 1 } = {}) {
  const corridos = cortes.map((viejo) => {
    const antes = quitados.reduce((s, [a, b]) => s + Math.max(0, Math.min(b, viejo) - a), 0);
    return tres((viejo - antes) / velocidad);
  });
  return corridos.filter((c, i) => i === 0 || c !== corridos[i - 1]);
}

function leerJson(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    morir(`No pude leer ${corta(ruta)}: ${e.message}`);
  }
}

if (esPrincipal(import.meta.url)) {
  ayuda(process.argv, AYUDA);
  const { libres, opciones } = leerArgumentos(process.argv.slice(2));
  const [tramosJson] = libres;
  if (!tramosJson) morir("Falta el tramos.json de cortar.mjs. Probá con --ayuda.");

  const tramos = leerJson(tramosJson);
  const cortes = (tramos.tramos ?? []).map((t) => Number(t.inicioSalida));
  if (cortes.length === 0 || cortes.some((c) => !Number.isFinite(c))) {
    morir(`${corta(tramosJson)} no trae tramos con inicioSalida: ¿es el tramos.json de cortar.mjs?`);
  }
  const quitados = opciones.quitados ? leerJson(opciones.quitados).quitados ?? [] : [];
  const velocidad = Number(String(opciones.velocidad ?? "1").replace(",", "."));
  if (!(velocidad >= 0.5 && velocidad <= 2)) morir("La velocidad tiene que estar entre 0,5 y 2.");

  const finales = correrCortes(cortes, { quitados, velocidad });
  console.log(`CORTES: [${finales.join(", ")}]`);
  console.log(`${finales.length} cortes${quitados.length ? `, corridos por ${quitados.length} tramos quitados` : ""}${velocidad !== 1 ? `, divididos por ${velocidad}` : ""}.`);
}
