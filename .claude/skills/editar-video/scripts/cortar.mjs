/**
 * Fase 2 — sacar las pausas de una grabación y dejarla en 1080x1920 (o --tamano) a 30 fps.
 *
 * Además del video deja un mapa de tramos: los inicios de cada tramo son los jump cuts,
 * y de ahí sale el zoom alterno del estilo visual.
 */
import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  sondear,
  detectarSilencios,
  leerPcm,
  rms,
  aDb,
  escribirJson,
  corta,
  fijo,
  cuadroDe,
} from "./_comun.mjs";
import { empalmar, leerTamano } from "./_empalmar.mjs";
import { medirTramas, detectarPausas, pausasInternas } from "./_pausas.mjs";

const AYUDA = `
cortar.mjs — corta los silencios y deja el video listo para componer

  node .claude/skills/editar-video/scripts/cortar.mjs <entrada> <salida.mp4> <tramos.json> \\
       [--umbral -36] [--minimo 0.28] [--antes 0.08] [--tras 0.14] [--cola 1.2] \\
       [--tramo-minimo 0.25] [--tamano 1080x1920]

Recibe: la grabación (o el montaje de tomas, si la grabación era cruda).
Devuelve: <salida.mp4> a 30 fps y 1080x1920 (o --tamano), y <tramos.json> con cada tramo
          que quedó: sus segundos en el original, dónde cae en la salida y en qué cuadro
          empieza. Esos cuadros son los CORTES: los jump cuts del zoom alterno.

  --umbral   decibeles por debajo de los cuales es silencio (más alto corta más)
  --minimo   cuánto tiene que durar un silencio para que valga la pena sacarlo
  --antes    cuánto se deja antes de cada frase
  --tras     cuánto se deja después de cada frase. La cola de una "s" final tiene poca
             energía, ffmpeg la cuenta como silencio, y con menos de 0.14 se oye mocha
  --aire X   el atajo de antes: equivale a --antes X --tras max(X, 0.14)
  --cola     cuánta toma real se deja después de la última palabra (si la grabación la
             tiene). Así el video no termina pegado a la sílaba y el cierre entra sobre la
             persona mirando o sonriendo, no sobre un cuadro congelado. 0 la saca.
  --tramo-minimo
             cuánta voz tiene que tener un sonido para quedarse, en segundos. Se cuenta
             la energía entre 100 Hz y 1 kHz, donde viven las vocales. Con menos es un
             clic, una moneda o una respiración, y se tira; salvo que tenga una sílaba
             sostenida (0.08 s seguidos con voz, sin caer más de 10 dB), que es una
             palabra corta y se queda. Un golpe en la mesa se apaga en una trama.
             Los que se tiran quedan anotados en <tramos.json>, en "descartados".
  --tamano   ANCHOxALTO de la salida. Con una grabación en 4K, 1440x2560 deja margen para
             que los acercamientos del zoom sigan nítidos.

La entrada y la salida pueden ser el mismo archivo: se escribe aparte y recién al final
se reemplaza.

Verificación: al terminar lista las pausas internas de más de 0,35 s que quedaron en la salida
(segundo y duración; también en <tramos.json>, en "pausasInternas"). El ruido de sala de un
teléfono queda por debajo de este corte y esas respiraciones siguen ahí: las saca apretar.mjs.
Si quedan muchas y largas, hay ruido de sala por encima del umbral: subirlo de a 2 dB y volver
a cortar. Nunca bajar --minimo por debajo de 0.20: se come los finales suaves.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [entrada, salidaPedida, mapaJson] = libres;
if (!entrada || !salidaPedida || !mapaJson) morir("Faltan argumentos. Probá con --ayuda.");

const umbral = numero(opciones.umbral, -36);
const minimo = numero(opciones.minimo, 0.28);
// --aire es el atajo viejo: el mismo valor a los dos lados, pero después de la palabra nunca
// menos de 0.14 s, que es donde vive la cola de una "s" final.
const aire = opciones.aire === undefined ? null : numero(opciones.aire, 0.08);
const antes = numero(opciones.antes, aire ?? 0.08);
const tras = numero(opciones.tras, Math.max(aire ?? 0, 0.14));
const tramoMinimo = numero(opciones["tramo-minimo"], 0.25);
const cola = numero(opciones.cola, 1.2);
const tamano = leerTamano(opciones.tamano);

const info = await sondear(entrada);
if (!info.audio) morir("La entrada no tiene audio: no hay silencios que detectar.");
const duracion = info.duracion;

const silencios = await detectarSilencios(entrada, { umbral, minimo, duracion });

// Los sonidos son los huecos entre silencios. ffmpeg decide por el pico de cada muestra, así
// que un clic, una moneda o una respiración también cuentan como sonido.
const sonidos = [];
let t = 0;
for (const [inicio, fin] of silencios) {
  if (inicio > t) sonidos.push([t, inicio]);
  t = fin;
}
// Lo que queda después del último silencio cuenta si dura algo: cuando el audio termina un
// poco antes que el video, ffmpeg deja un resto de milisegundos que no es sonido.
if (duracion - t > 0.01) sonidos.push([t, duracion]);

// Qué sonido es voz: la energía en la banda de las vocales (100 Hz a 1 kHz), en tramas de 20 ms.
// Un clic o una moneda tienen el pico alto pero casi nada ahí; una palabra, aunque sea corta,
// tiene una vocal sostenida.
const PASO = 0.02;
const muestreoVoz = 16000;
const bandaVoz = await leerPcm(entrada, muestreoVoz, { filtro: "highpass=f=100,lowpass=f=1000" });
const salto = Math.round(PASO * muestreoVoz);
const nivelVoz = [];
for (let i = 0; i + salto <= bandaVoz.length; i += salto) nivelVoz.push(aDb(rms(bandaVoz, i, i + salto)));

// La sílaba sostenida es una racha de tramas con voz que no cae más de 10 dB desde su máximo:
// una vocal mantiene el nivel, un golpe en la mesa se apaga en una trama.
function medirVoz(a, b) {
  let total = 0;
  let racha = 0;
  let maximo = -Infinity;
  let sostenida = 0;
  for (let i = Math.floor(a / PASO); i < Math.min(nivelVoz.length, Math.ceil(b / PASO)); i++) {
    const nivel = nivelVoz[i];
    if (nivel < umbral) {
      racha = 0;
      maximo = -Infinity;
      continue;
    }
    total += 1;
    if (nivel < maximo - 10) {
      racha = 0;
      maximo = -Infinity;
    }
    racha += 1;
    maximo = Math.max(maximo, nivel);
    sostenida = Math.max(sostenida, racha);
  }
  return { conVoz: total * PASO, sostenida: sostenida * PASO };
}

// Un sonido con menos voz que --tramo-minimo es un clic, una moneda o una respiración: si se
// queda, es un parpadeo y un jump cut falso. La excepción es una sílaba sostenida de 0,08 s: eso
// es una palabra corta, y una palabra no se tira.
const SILABA = 0.08;
const conVoz = [];
const descartados = [];
for (const [a, b] of sonidos) {
  const { conVoz: tiempo, sostenida } = medirVoz(a, b);
  if (tiempo >= tramoMinimo || sostenida >= SILABA) conVoz.push([a, b]);
  else descartados.push({ inicio: Number(a.toFixed(3)), fin: Number(b.toFixed(3)) });
}
if (conVoz.length === 0) morir("No quedó ningún tramo con voz. Revisá el umbral.");

// Después de la última palabra se deja --cola de toma real: la persona se queda mirando o
// sonríe, y el cierre entra sobre eso. Cortado ahí, el video termina pegado a la sílaba.
const bruto = conVoz.map(([a, b], i) => {
  const despues = i === conVoz.length - 1 ? Math.max(tras, cola) : tras;
  return [Math.max(0, a - antes), Math.min(duracion, b + despues)];
});

// Dos tramos casi pegados son un tramo: cortar ahí solo mete un click.
const tramos = [];
for (const [a, b] of bruto) {
  if (tramos.length && a - tramos[tramos.length - 1][1] < 0.12) {
    tramos[tramos.length - 1][1] = Math.max(tramos[tramos.length - 1][1], b);
  } else {
    tramos.push([a, b]);
  }
}

await empalmar(entrada, salidaPedida, tramos, { tamano });

let acumulado = 0;
const tabla = tramos.map(([a, b]) => {
  const fila = {
    inicioOrigen: Number(a.toFixed(3)),
    finOrigen: Number(b.toFixed(3)),
    inicioSalida: Number(acumulado.toFixed(3)),
    cuadro: cuadroDe(acumulado),
  };
  acumulado += b - a;
  return fila;
});

// Lo que queda para la segunda pasada: pausas que ffmpeg no ve porque el ruido de sala está por
// encima del umbral de pico, pero que se oyen como huecos.
const finalInfo = await sondear(salidaPedida);
const pausas = pausasInternas(detectarPausas(await medirTramas(salidaPedida)), finalInfo.duracion);

escribirJson(mapaJson, {
  origen: entrada,
  duracionOrigen: Number(duracion.toFixed(3)),
  duracionSalida: Number(finalInfo.duracion.toFixed(3)),
  umbral,
  minimo,
  antes,
  tras,
  tramoMinimo,
  cola,
  tamano: `${tamano.ancho}x${tamano.alto}`,
  cortes: tabla.map((f) => f.cuadro),
  tramos: tabla,
  descartados,
  pausasInternas: pausas,
});

console.log(`${tramos.length} tramos: ${fijo(duracion)} s -> ${fijo(finalInfo.duracion)} s (${fijo(100 * (1 - finalInfo.duracion / duracion), 1)} % recortado)`);
console.log(`video en ${corta(salidaPedida)}`);
console.log(`tramos y CORTES en ${corta(mapaJson)}`);
if (descartados.length) {
  const lista = descartados.map((d) => `${fijo(d.inicio)} s (${fijo(d.fin - d.inicio)} s)`).join(", ");
  console.log(`${descartados.length} sonidos sin voz descartados (clics, monedas, respiraciones): ${lista}`);
}
if (pausas.length === 0) {
  console.log("no quedan pausas internas de más de 0,35 s");
} else {
  const lista = pausas.map((p) => `${fijo(p.inicio)} s (${fijo(p.duracion)} s)`).join(", ");
  console.log(`quedan ${pausas.length} pausas internas de más de 0,35 s: ${lista}`);
  console.log("       Las saca apretar.mjs, la segunda pasada.");
}
