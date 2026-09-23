/**
 * Fase 3 → 7 — los CORTES de datos.ts, en segundos del video FINAL.
 *
 * Un corte es un salto de imagen: el inicio de cada tramo de cortar.mjs y, en una grabación
 * cruda, cada costura entre tomas de montar.mjs. Si se apretó o se aceleró, esos segundos ya no
 * caen donde estaban: este script los corre. Con --video, además, los lleva al cuadro donde la
 * imagen salta de verdad, para que el zoom y el salto caigan juntos.
 */
import { readFileSync } from "node:fs";

import { ayuda, leerArgumentos, morir, corta, esPrincipal, ffmpeg } from "./_comun.mjs";

const AYUDA = `
cortes.mjs — los CORTES para datos.ts, en segundos del video final

  node .claude/skills/editar-video/scripts/cortes.mjs <tramos.json> \\
       [--montaje <montaje.json>] [--quitados <quitados.json>] [--velocidad 1.1] \\
       [--video public/<slug>/video.mp4]

Recibe: el tramos.json de cortar.mjs; si la grabación era cruda, el montaje.json de montar.mjs
        (sus costuras entre tomas también son saltos); si se corrió apretar.mjs, su
        quitados.json; si se aceleró, la misma velocidad que se le pasó a acelerar.mjs; y el
        video final, para ajustar cada corte al salto real de la imagen.
Devuelve: en pantalla, la línea lista para copiar en datos.ts:  CORTES: [0, 2.31, …]

A cada corte se le resta lo que apretar quitó antes de él (si cae adentro de un tramo quitado,
va al inicio de ese tramo) y se divide por la velocidad. Con --video, un corte que tenga un
salto de imagen a 3 cuadros o menos se mueve a ese salto; los que no tienen salto cerca se
listan (una costura entre dos tomas casi iguales puede no verse, y está bien).
`;

const cuatro = (n) => Math.round(n * 10000) / 10000;
const CUADRO = 1 / 30;

export function correrCortes(cortes, { quitados = [], velocidad = 1 } = {}) {
  const corridos = cortes.map((viejo) => {
    const antes = quitados.reduce((s, [a, b]) => s + Math.max(0, Math.min(b, viejo) - a), 0);
    return Math.round(((viejo - antes) / velocidad) * 1000) / 1000;
  });
  return corridos.filter((c, i) => i === 0 || c !== corridos[i - 1]);
}

/**
 * Las costuras entre tomas (segundos del montaje) llevadas al video que salió de cortar.mjs.
 * Una costura que cayó en un hueco que cortar sacó no suma nada: el tramo siguiente ya es corte.
 */
export function costurasDelMontaje(tomas, tramos) {
  const costuras = [];
  for (const toma of tomas.slice(1)) {
    const t = Number(toma.inicioSalida);
    const tramo = tramos.find((x) => t >= x.inicioOrigen - 1e-6 && t < x.finOrigen - 1e-6);
    if (!tramo) continue;
    const enCorte = cuatro(tramo.inicioSalida + (t - tramo.inicioOrigen));
    if (Math.abs(enCorte - tramo.inicioSalida) > CUADRO / 2) costuras.push(enCorte);
  }
  return costuras;
}

/** Lleva cada corte al salto de imagen más cercano, si está a 3 cuadros o menos. */
export function ajustarAEscenas(cortes, escenas, { margen = 3 * CUADRO } = {}) {
  let movidos = 0;
  const sinSalto = [];
  const ajustados = cortes.map((c) => {
    if (c < CUADRO) return c; // el primer cuadro no tiene salto que buscar
    const cerca = escenas.reduce((m, e) => (Math.abs(e - c) < Math.abs(m - c) ? e : m), Infinity);
    if (Math.abs(cerca - c) <= margen + 1e-6) {
      const nuevo = cuatro(cerca);
      if (nuevo !== c) movidos += 1;
      return nuevo;
    }
    sinSalto.push(c);
    return c;
  });
  return { cortes: ajustados.filter((c, i) => i === 0 || c !== ajustados[i - 1]), movidos, sinSalto };
}

/** Los segundos donde la imagen del video salta (detección de escena de ffmpeg). */
async function saltosDeImagen(video) {
  const r = await ffmpeg(
    ["-i", video, "-an", "-vf", "select='gt(scene,0.02)',showinfo", "-f", "null", "-"],
    { tolerar: true },
  );
  return [...String(r.error).matchAll(/pts_time:\s*([\d.]+)/g)].map((m) => Number(m[1]));
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

  const tramos = leerJson(tramosJson).tramos ?? [];
  const deTramos = tramos.map((t) => Number(t.inicioSalida));
  if (deTramos.length === 0 || deTramos.some((c) => !Number.isFinite(c))) {
    morir(`${corta(tramosJson)} no trae tramos con inicioSalida: ¿es el tramos.json de cortar.mjs?`);
  }
  const costuras = opciones.montaje ? costurasDelMontaje(leerJson(opciones.montaje).tomas ?? [], tramos) : [];
  const cortes = [...deTramos, ...costuras].sort((a, b) => a - b);

  const quitados = opciones.quitados ? leerJson(opciones.quitados).quitados ?? [] : [];
  const velocidad = Number(String(opciones.velocidad ?? "1").replace(",", "."));
  if (!(velocidad >= 0.5 && velocidad <= 2)) morir("La velocidad tiene que estar entre 0,5 y 2.");

  let finales = correrCortes(cortes, { quitados, velocidad });
  let nota = "";
  if (opciones.video) {
    const ajuste = ajustarAEscenas(finales, await saltosDeImagen(opciones.video));
    finales = ajuste.cortes;
    nota = `\n${ajuste.movidos} ajustados al salto real de la imagen.`;
    if (ajuste.sinSalto.length) nota += ` Sin salto visible cerca: ${ajuste.sinSalto.join(", ")} (mirarlos con cuadros.mjs).`;
  }

  console.log(`CORTES: [${finales.join(", ")}]`);
  console.log(
    `${finales.length} cortes (${deTramos.length} de tramos, ${costuras.length} de costuras entre tomas)` +
      `${quitados.length ? `, corridos por ${quitados.length} tramos quitados` : ""}` +
      `${velocidad !== 1 ? `, divididos por ${velocidad}` : ""}.${nota}`,
  );
}
