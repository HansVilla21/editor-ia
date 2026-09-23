/**
 * Las pausas que quedan en un video ya cortado: respiraciones y aire muerto que el corte por
 * silencios no ve. apretar.mjs las saca; cortar.mjs avisa cuántas quedaron.
 *
 * El ruido de sala de un teléfono anda cerca de −45 dBFS, así que ffmpeg a −33 dB no encuentra
 * nada. Se detectan con dos umbrales (histéresis), que es lo que evita comerse habla:
 *   - una pausa necesita un NÚCLEO por debajo de `hondo` (−42 dBFS) de al menos `nucleo` segundos;
 *   - después crece hacia los lados mientras el nivel siga por debajo de `borde` (−33 dBFS).
 * Un umbral único no sirve: a −34 plano, los tramos se encadenan y se come frases enteras.
 *
 * Las sibilantes cuentan como voz. Una "s" final tiene poca energía total pero mucha entre 4 y
 * 11 kHz: una trama cuya banda alta esté a menos de 26 dB de la más aguda del archivo frena la
 * pausa, pero solo pegada a una palabra (0,16 s después o 0,08 s antes). Una respiración también
 * es aguda, y esa sí es aire muerto.
 */
import { leerPcm, rms, aDb } from "./_comun.mjs";

export const PASO = 0.02;
const MUESTREO = 32000;
// Cada filtro de ffmpeg cae 12 dB por octava; dos seguidos, 24. Con uno solo, las vocales fuertes
// (2 a 3 kHz) se cuelan en la banda y parecen una "s".
const BANDA_ALTA = "highpass=f=4000,highpass=f=4000,lowpass=f=11000,lowpass=f=11000";
const SIBILANTE = 26; // dB por debajo de la trama más aguda que todavía cuentan como "s"
const TRAS_VOZ = 8; // tramas (0,16 s) después de voz en las que una trama aguda es su consonante
const ANTES_VOZ = 4; // tramas (0,08 s) antes de voz
const VOCAL = 10; // dB que la banda alta de una vocal queda, como mínimo, por debajo del total

const r3 = (n) => Math.round(n * 1000) / 1000;

/** Nivel de cada trama de 20 ms: el total y el de la banda de 4 a 11 kHz, en dB. */
export async function medirTramas(ruta) {
  const ancha = await leerPcm(ruta, MUESTREO);
  const alta = await leerPcm(ruta, MUESTREO, { filtro: BANDA_ALTA });
  const salto = Math.round(PASO * MUESTREO);
  const n = Math.floor(ancha.length / salto);
  const db = new Float64Array(n);
  const agudo = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    db[i] = aDb(rms(ancha, i * salto, (i + 1) * salto));
    agudo[i] = aDb(rms(alta, i * salto, Math.min(alta.length, (i + 1) * salto)));
  }
  return { db, agudo };
}

/** Percentil con interpolación lineal entre los dos vecinos, el mismo que usa numpy. */
function percentil(valores, p) {
  const orden = Float64Array.from(valores).sort();
  if (orden.length === 0) return -Infinity;
  const pos = ((orden.length - 1) * p) / 100;
  const abajo = Math.floor(pos);
  const arriba = Math.min(orden.length - 1, abajo + 1);
  return orden[abajo] + (orden[arriba] - orden[abajo]) * (pos - abajo);
}

/** Las pausas, en segundos: [[desde, hasta], ...]. */
export function detectarPausas({ db, agudo }, { hondo = -42, borde = -33, nucleo = 0.06 } = {}) {
  const n = db.length;
  const tope = percentil(agudo, 99) - SIBILANTE;
  const esAgudo = (i) => agudo[i] > tope;
  // Voz es una trama fuerte cuya banda alta queda muy por debajo del total: una vocal. Medir
  // "no aguda" contra el tope del archivo no sirve para esto: las vocales fuertes tienen sus
  // agudos a menos de 26 dB de la "s" más fuerte, y la "s" final de la palabra se queda sin voz
  // al lado que la proteja (pasó con una grabación real de iPhone).
  const voz = Array.from({ length: n }, (_, i) => db[i] >= borde && agudo[i] <= db[i] - VOCAL);

  const sibilante = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (!esAgudo(i)) continue;
    for (let k = Math.max(0, i - TRAS_VOZ); k < i && !sibilante[i]; k++) sibilante[i] = voz[k];
    for (let k = i + 1; k <= Math.min(n - 1, i + ANTES_VOZ) && !sibilante[i]; k++) sibilante[i] = voz[k];
  }

  const callado = (i) => db[i] < borde && !sibilante[i];
  const hondoLibre = (i) => db[i] < hondo && !sibilante[i];
  const pausas = [];
  let i = 0;
  while (i < n) {
    if (!hondoLibre(i)) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < n && hondoLibre(j)) j += 1;
    if ((j - i) * PASO >= nucleo) {
      let a = i;
      let b = j;
      while (a > 0 && callado(a - 1)) a -= 1;
      while (b < n && callado(b)) b += 1;
      const ultima = pausas[pausas.length - 1];
      if (ultima && a <= ultima[1]) ultima[1] = Math.max(ultima[1], b);
      else pausas.push([a, b]);
    }
    i = j;
  }
  return pausas.map(([a, b]) => [a * PASO, b * PASO]);
}

/**
 * De cada pausa larga se saca el medio: queda `tras` después de la palabra (su decaimiento) y
 * `antes` antes de la siguiente. Nada en el primer `inicio` ni en la última `cola`: el gancho
 * arranca limpio y la última palabra termina.
 */
export function elegirQuitados(
  pausas,
  duracion,
  { minimo = 0.24, tras = 0.12, antes = 0.05, inicio = 0.3, cola = 0.8 } = {},
) {
  const quitar = [];
  for (const [ta, tb] of pausas) {
    if (ta < inicio || tb > duracion - cola) continue;
    if (tb - ta < minimo) continue;
    const c0 = r3(ta + tras);
    const c1 = r3(tb - antes);
    if (c1 - c0 > 0.06) quitar.push([c0, c1]);
  }
  return quitar;
}

/** Lo que queda entre los quitados, en segundos de la entrada. */
export function conservar(quitar, duracion) {
  const keep = [];
  let t = 0;
  for (const [a, b] of quitar) {
    if (a - t > 0.05) keep.push([r3(t), r3(a)]);
    t = b;
  }
  if (duracion - t > 0.05) keep.push([r3(t), r3(duracion)]);
  return keep;
}

/** Pausas de más de `largo` segundos lejos de los bordes: las que un oído nota como hueco. */
export const pausasInternas = (pausas, duracion, { largo = 0.35, inicio = 0.3, cola = 0.8 } = {}) =>
  pausas
    .filter(([a, b]) => a >= inicio && b <= duracion - cola && b - a > largo)
    .map(([a, b]) => ({ inicio: r3(a), duracion: r3(b - a) }));
