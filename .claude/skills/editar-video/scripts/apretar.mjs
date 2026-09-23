/**
 * Fase 2 (segunda pasada) — sacar las pausas que el corte por silencios deja: respiraciones y
 * aire muerto entre frases, de 0,3 a 0,7 s, que se sienten como huecos.
 *
 * La detección está en _pausas.mjs. Acá se decide qué sacar, se escribe el video y el mapa.
 */
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  sondear,
  escribirJson,
  asegurarCarpeta,
  mismoArchivo,
  corta,
  fijo,
} from "./_comun.mjs";
import { medirTramas, detectarPausas, elegirQuitados, conservar } from "./_pausas.mjs";
import { empalmar } from "./_empalmar.mjs";

const AYUDA = `
apretar.mjs — segunda pasada: saca las pausas que el corte deja (respiraciones, aire muerto)

  node .claude/skills/editar-video/scripts/apretar.mjs <entrada> <salida.mp4> <quitados.json> \\
       [--hondo -42] [--borde -33] [--nucleo 0.06] [--minimo 0.24] [--tras 0.12] [--antes 0.05] \\
       [--solo-mapa]

Recibe: el video que dejó cortar.mjs.
Devuelve: <salida.mp4> sin esas pausas, con el mismo tamaño y los mismos cuadros por segundo,
          y <quitados.json> = {quitados: [[desde, hasta], ...], keep: [[desde, hasta], ...],
          duracionAntes, duracionDespues}, en segundos de la entrada.

Por qué hace falta: el ruido de sala de un teléfono anda cerca de −45 dB. El corte por silencios
a −33 dB no lo ve, y quedan respiraciones de 0,3 a 0,7 s entre frases.

Cómo decide, con dos umbrales:
  --hondo    una pausa necesita un núcleo por debajo de este nivel (dBFS)...
  --nucleo   ...que dure al menos esto (segundos)...
  --borde    ...y crece hacia los lados mientras el nivel siga por debajo de este
  --minimo   una pausa más corta que esto se deja
  --tras     aire que queda después de la palabra: su decaimiento
  --antes    aire que queda antes de la palabra siguiente
  --solo-mapa  muestra las pausas que sacaría, sin escribir nada

Lo que cuida solo:
  - Una "s" final: poca energía total, mucha entre 4 y 11 kHz. Pegada a una palabra (0,16 s
    después o 0,08 s antes) cuenta como voz y la pausa no la pisa. Una respiración también es
    aguda, pero está lejos de la voz, y esa sí se saca.
  - Los bordes: nada en el primer 0,3 s ni en los últimos 0,8 s. El gancho arranca limpio y
    la última palabra termina.

No bajes los umbrales para ganar segundos: con valores más agresivos se come las "s" finales y
el final de la última palabra. Un umbral único tampoco sirve: a −34 plano se come frases
enteras. Revisá siempre el total que imprime.

Los cortes de acá NO van a CORTES (los jump cuts del zoom alterno): caen en momentos quietos
entre frases, el salto no se ve, y un cambio de zoom por segundo pone la toma nerviosa.
Los tiempos cambian: transcribí el video que sale de acá, nunca reuses los de antes.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["solo-mapa"] });
const [entrada, salida, mapaJson] = libres;
const soloMapa = Boolean(opciones["solo-mapa"]);
if (!entrada || (!soloMapa && (!salida || !mapaJson))) morir("Faltan argumentos. Probá con --ayuda.");

const hondo = numero(opciones.hondo, -42);
const borde = numero(opciones.borde, -33);
const nucleo = numero(opciones.nucleo, 0.06);
const minimo = numero(opciones.minimo, 0.24);
const tras = numero(opciones.tras, 0.12);
const antes = numero(opciones.antes, 0.05);

const info = await sondear(entrada);
if (!info.audio) morir("La entrada no tiene audio: no hay pausas que medir.");
const duracion = info.duracion;

const pausas = detectarPausas(await medirTramas(entrada), { hondo, borde, nucleo });
const quitados = elegirQuitados(pausas, duracion, { minimo, tras, antes });
const quitado = quitados.reduce((s, [a, b]) => s + (b - a), 0);

for (const [a, b] of quitados) console.log(`  ${fijo(a).padStart(6)} - ${fijo(b).padStart(6)}   -${fijo(b - a)} s`);
console.log(`${quitados.length} ${quitados.length === 1 ? "hueco" : "huecos"}, -${fijo(quitado)} s -> ${fijo(duracion - quitado)} s`);
if (soloMapa) process.exit(0);

const keep = conservar(quitados, duracion);
if (quitados.length === 0) {
  // Nada que sacar: el video queda como estaba, sin volver a comprimirlo.
  asegurarCarpeta(salida);
  if (!mismoArchivo(entrada, salida)) copyFileSync(resolve(entrada), resolve(salida));
} else {
  await empalmar(entrada, salida, keep);
}

escribirJson(mapaJson, {
  origen: entrada,
  hondo,
  borde,
  quitados,
  keep,
  duracionAntes: Number(duracion.toFixed(3)),
  duracionDespues: Number((duracion - quitado).toFixed(3)),
});

console.log(`video en ${corta(salida)}`);
console.log(`quitados en ${corta(mapaJson)}`);
