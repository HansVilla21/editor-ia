/**
 * Fase 9 — verificar la mezcla con números, no de oído.
 *
 * Se alinea la voz con el render, se le resta, y lo que queda es música + efectos.
 * Eso se compara contra la voz. Se corre sobre el render SIN normalizar, no sobre el master.
 */
import {
  ayuda,
  leerArgumentos,
  morir,
  leerPcm,
  rms,
  pico,
  aDb,
  corta,
  fijo,
  cuadroDe,
  escribirJson,
} from "./_comun.mjs";

const AYUDA = `
mezcla.mjs — mide cuánto suenan la música y los efectos debajo de la voz

  node .claude/skills/editar-video/scripts/mezcla.mjs <render.mp4> <voz.wav> [segundos…] \\
       [--json <salida.json>]

Recibe: el render de Remotion SIN normalizar (versiones/vN-….mp4), la misma voz que se usó
        en la mezcla, y los segundos de cada acento fuerte que se quiera revisar de cerca.
Devuelve: el nivel de la voz y el de música+efectos, en general y en cada segundo pedido.

Sano:
  música y efectos entre 12 y 20 dB por debajo de la voz
  los acentos (whoosh, impacto) pueden llegar hasta unos 6 dB por debajo
  nunca por encima de la voz

La escucha de un modelo no es una medición: devuelve casi la misma crítica genérica en cada
versión. Este número es lo que decide si se toca un nivel.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [render, vozRuta, ...acentos] = libres;
if (!render || !vozRuta) morir("Faltan argumentos: <render> <voz.wav>. Probá con --ayuda.");

const muestreo = 48000;
const mezclaCruda = await leerPcm(render, muestreo);
const vozCruda = await leerPcm(vozRuta, muestreo);
if (mezclaCruda.length === 0 || vozCruda.length === 0) morir("Alguno de los dos archivos no tiene audio.");

/**
 * Cuánto hay que correr la voz para que calce con la mezcla. Primero grueso, después fino:
 * buscar muestra por muestra en todo el rango sería innecesariamente lento.
 */
function buscarDesfase(mezcla, voz) {
  const ventana = Math.min(muestreo, voz.length, mezcla.length);
  const desde = Math.min(
    Math.floor(Math.min(voz.length, mezcla.length) / 2) - Math.floor(ventana / 2),
    Math.max(0, Math.min(voz.length, mezcla.length) - ventana - 3000),
  );
  const base = Math.max(3000, desde);

  const correlacion = (desplazamiento) => {
    let suma = 0;
    for (let i = 0; i < ventana; i++) {
      const j = base + i + desplazamiento;
      if (j < 0 || j >= mezcla.length) return -Infinity;
      suma += mezcla[j] * voz[base + i];
    }
    return suma;
  };

  let mejor = 0;
  let mejorValor = -Infinity;
  for (let d = -3000; d <= 3000; d += 16) {
    const v = correlacion(d);
    if (v > mejorValor) [mejorValor, mejor] = [v, d];
  }
  for (let d = mejor - 16; d <= mejor + 16; d++) {
    const v = correlacion(d);
    if (v > mejorValor) [mejorValor, mejor] = [v, d];
  }
  return mejor;
}

const desfase = buscarDesfase(mezclaCruda, vozCruda);
const inicio = Math.max(0, desfase);
const largo = Math.min(mezclaCruda.length - inicio, vozCruda.length);
const mezcla = mezclaCruda.subarray(inicio, inicio + largo);
const voz = vozCruda.subarray(0, largo);

// Cuánta voz hay dentro de la mezcla: la proyección de una sobre la otra.
let arriba = 0;
let abajo = 0;
for (let i = 0; i < largo; i++) {
  arriba += mezcla[i] * voz[i];
  abajo += voz[i] * voz[i];
}
const ganancia = abajo > 0 ? arriba / abajo : 0;

const resto = new Float32Array(largo);
for (let i = 0; i < largo; i++) resto[i] = mezcla[i] - ganancia * voz[i];

const vozEscalada = new Float32Array(largo);
for (let i = 0; i < largo; i++) vozEscalada[i] = ganancia * voz[i];

const vozDb = aDb(rms(vozEscalada));
const restoDb = aDb(rms(resto));

console.log(`desfase ${desfase} muestras (${fijo((1000 * desfase) / muestreo, 1)} ms), la voz entra a ${fijo(ganancia, 3)} de su nivel`);
console.log("");
console.log(`general   voz ${fijo(vozDb, 1)} dB   música+efectos ${fijo(restoDb, 1)} dB   diferencia ${fijo(vozDb - restoDb, 1)} dB   pico de la mezcla ${fijo(aDb(pico(mezcla)), 1)} dB`);

const filas = [];
for (const crudo of acentos) {
  const t = Number(crudo);
  if (!Number.isFinite(t)) continue;
  const a = Math.max(0, Math.round((t - 0.25) * muestreo));
  const b = Math.min(largo, Math.round((t + 0.25) * muestreo));
  if (b <= a) continue;
  const fila = {
    segundos: t,
    cuadro: cuadroDe(t),
    voz: Number(aDb(rms(vozEscalada, a, b)).toFixed(1)),
    efectos: Number(aDb(rms(resto, a, b)).toFixed(1)),
    picoEfectos: Number(aDb(pico(resto, a, b)).toFixed(1)),
    picoMezcla: Number(aDb(pico(mezcla, a, b)).toFixed(1)),
  };
  filas.push(fila);
  console.log(`t=${fijo(t).padStart(6)} s (cuadro ${String(fila.cuadro).padStart(5)})  voz ${fijo(fila.voz, 1).padStart(6)} dB   música+efectos ${fijo(fila.efectos, 1).padStart(6)} dB   pico ${fijo(fila.picoEfectos, 1).padStart(6)} dB   diferencia ${fijo(fila.voz - fila.efectos, 1).padStart(5)} dB`);
}

const diferencia = vozDb - restoDb;
console.log("");
if (diferencia < 6) {
  console.log("aviso  La música y los efectos están demasiado arriba. Sano es entre 12 y 20 dB por debajo de la voz.");
} else if (diferencia < 12) {
  console.log("aviso  Justo por encima del límite. Sano es entre 12 y 20 dB por debajo de la voz.");
} else if (diferencia > 24) {
  console.log("aviso  Casi no se escuchan. Sano es entre 12 y 20 dB por debajo de la voz.");
} else {
  console.log("La relación general está sana (entre 12 y 20 dB por debajo de la voz).");
}

if (opciones.json) {
  escribirJson(opciones.json, {
    render,
    voz: vozRuta,
    desfase,
    ganancia: Number(ganancia.toFixed(4)),
    vozDb: Number(vozDb.toFixed(1)),
    restoDb: Number(restoDb.toFixed(1)),
    diferencia: Number(diferencia.toFixed(1)),
    acentos: filas,
  });
  console.log(`medición en ${corta(opciones.json)}`);
}
