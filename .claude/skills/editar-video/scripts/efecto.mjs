/**
 * Fase 8 — la forma de un efecto de sonido: dónde empieza, dónde pega y dónde termina.
 *
 * Los catálogos de efectos describen mal varios archivos: hay "whoosh" que son tic-tac.
 * Por eso el efecto se elige por nombre de archivo y se confirma acá, con la medición.
 */
import { basename, extname, join, dirname } from "node:path";

import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  leerPcm,
  rms,
  pico,
  aDb,
  corta,
  fijo,
  ffmpeg,
  cuadroDe,
  FPS,
} from "./_comun.mjs";

const AYUDA = `
efecto.mjs — mide un efecto de sonido antes de usarlo

  node .claude/skills/editar-video/scripts/efecto.mjs <archivo…> [--evento <cuadro>] \\
       [--suave 9000] [--pasaaltos 45]

Recibe: uno o varios archivos de public/sfx/.
Devuelve, para cada uno: duración, en qué segundo arranca, dónde está el pico, dónde termina,
          el brillo (centro del espectro, en Hz) y el pico en dBFS.

  --evento <cuadro>  además calcula desde qué cuadro hay que ponerlo para que su PICO caiga
                     exactamente en ese cuadro:  desde = evento - round(pico * 30)
  --suave <hz>       escribe al lado la variante filtrada, para no recalcularla cada vez
                     (whoosh 9000, barridos largos 8000, impactos 12000 con --pasaaltos 45)
  --pasaaltos <hz>   agrega un pasa-altos a la variante suave

Un "whoosh" con el pico a 0,05 s y brillo de 6000 Hz no es un whoosh: es un click.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
if (libres.length === 0) morir("Falta al menos un archivo. Probá con --ayuda.");

const MUESTREO = 22050;
const evento = opciones.evento === undefined ? null : Math.round(numero(opciones.evento, 0));

/** FFT iterativa radix-2, solo para sacar el centro del espectro. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let largo = 2; largo <= n; largo <<= 1) {
    const angulo = (-2 * Math.PI) / largo;
    const wRe = Math.cos(angulo);
    const wIm = Math.sin(angulo);
    for (let i = 0; i < n; i += largo) {
      let curRe = 1;
      let curIm = 0;
      for (let j = 0; j < largo / 2; j++) {
        const aRe = re[i + j];
        const aIm = im[i + j];
        const bRe = re[i + j + largo / 2] * curRe - im[i + j + largo / 2] * curIm;
        const bIm = re[i + j + largo / 2] * curIm + im[i + j + largo / 2] * curRe;
        re[i + j] = aRe + bRe;
        im[i + j] = aIm + bIm;
        re[i + j + largo / 2] = aRe - bRe;
        im[i + j + largo / 2] = aIm - bIm;
        const siguienteRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = siguienteRe;
      }
    }
  }
}

function brillo(muestras, desde, hasta) {
  const trozo = muestras.subarray(Math.max(0, desde), Math.min(muestras.length, hasta));
  if (trozo.length < 64) return null;
  let n = 1;
  while (n < trozo.length) n <<= 1;
  n = Math.min(n, 1 << 17);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < Math.min(n, trozo.length); i++) re[i] = trozo[i];
  fft(re, im);
  let suma = 0;
  let pesada = 0;
  for (let k = 0; k < n / 2; k++) {
    const magnitud = Math.hypot(re[k], im[k]);
    suma += magnitud;
    pesada += magnitud * ((k * MUESTREO) / n);
  }
  return suma > 0 ? pesada / suma : null;
}

for (const archivo of libres) {
  const muestras = await leerPcm(archivo, MUESTREO);
  if (muestras.length === 0) {
    console.log(`${basename(archivo)}  sin audio`);
    continue;
  }

  const salto = Math.round(MUESTREO / 100); // 10 ms
  const niveles = [];
  for (let i = 0; i + salto <= muestras.length; i += salto) niveles.push(rms(muestras, i, i + salto));
  const maximo = Math.max(...niveles);
  const relativos = niveles.map((v) => aDb(v / (maximo + 1e-12)));

  const indiceInicio = relativos.findIndex((v) => v > -30);
  const indicePico = relativos.indexOf(Math.max(...relativos));
  let indiceFin = relativos.length - 1;
  while (indiceFin > 0 && relativos[indiceFin] < -35) indiceFin--;

  const inicio = Math.max(0, indiceInicio) / 100;
  const picoSegundos = indicePico / 100;
  const fin = (indiceFin + 1) / 100;
  const centro = brillo(muestras, Math.round(inicio * MUESTREO), Math.round(fin * MUESTREO));

  console.log(
    `${basename(archivo).padEnd(44)} dur ${fijo(muestras.length / MUESTREO).padStart(5)} s  ` +
      `arranca ${fijo(inicio).padStart(5)}  pico ${fijo(picoSegundos).padStart(5)}  fin ${fijo(fin).padStart(5)}  ` +
      `brillo ${centro === null ? "  ?" : String(Math.round(centro)).padStart(5)} Hz  ` +
      `pico ${fijo(aDb(pico(muestras)), 1).padStart(6)} dBFS`,
  );

  if (evento !== null) {
    console.log(`    para que el pico caiga en el cuadro ${evento}: empieza en el cuadro ${evento - cuadroDe(picoSegundos)} (pico a ${cuadroDe(picoSegundos)} cuadros del inicio)`);
  }

  if (opciones.suave !== undefined) {
    const corteBajo = numero(opciones.suave, 9000);
    const corteAlto = opciones.pasaaltos === undefined ? null : numero(opciones.pasaaltos, 45);
    const filtros = [corteAlto ? `highpass=f=${corteAlto}` : null, `lowpass=f=${corteBajo}`]
      .filter(Boolean)
      .join(",");
    const ext = extname(archivo);
    const destino = join(dirname(archivo), `${basename(archivo, ext)}-suave${ext}`);
    await ffmpeg(["-v", "error", "-y", "-i", archivo, "-af", filtros, destino]);
    console.log(`    variante suave (${filtros}) en ${corta(destino)}`);
  }
}

console.log("");
console.log(`Para colocarlo: desde = cuadro_del_evento - round(pico * ${FPS}).`);
