/**
 * La energía del audio cada 20 ms dentro de una ventana, para encontrar dónde cortar.
 *
 * Sirve para dos cosas: buscar la micro-pausa entre dos palabras cuando una toma buena
 * trae un error pegado al principio, y comparar la onda del crudo con la del corte cuando
 * la transcripción dice algo raro.
 */
import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  leerPcm,
  rms,
  aDb,
  corta,
  fijo,
  escribirJson,
  cuadroDe,
} from "./_comun.mjs";

const AYUDA = `
energia.mjs — la energía del audio cada 20 ms, y el punto más callado de la ventana

  node .claude/skills/editar-video/scripts/energia.mjs <audio o video> <desde> <hasta> \\
       [--paso 0.02] [--json <salida.json>]

Recibe: un archivo con audio y dos tiempos en segundos.
Devuelve: una barra por paso con su nivel en dB, y al final el instante más callado,
          que es el mejor lugar para cortar entre dos palabras.

En habla corrida no siempre hay una pausa clara. Cuando no la hay: probar 4 o 5 puntos de
entrada, transcribir cada uno, y quedarse con el primero cuya transcripción arranca en la
palabra correcta. La diferencia suele ser de 0,1 a 0,3 s.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [archivo, desdeCrudo, hastaCrudo] = libres;
if (!archivo || desdeCrudo === undefined || hastaCrudo === undefined) {
  morir("Faltan argumentos: <archivo> <desde> <hasta>. Probá con --ayuda.");
}

const desde = Number(desdeCrudo);
const hasta = Number(hastaCrudo);
if (!Number.isFinite(desde) || !Number.isFinite(hasta) || hasta <= desde) {
  morir("Los tiempos tienen que ser números en segundos, con punto decimal, y hasta > desde.");
}

const paso = numero(opciones.paso, 0.02);
const muestreo = 16000;
const muestras = await leerPcm(archivo, muestreo, { desde, hasta });
if (muestras.length === 0) morir("Esa ventana no tiene audio. Revisá los tiempos.");

const salto = Math.max(1, Math.round(paso * muestreo));
const pasos = [];
for (let i = 0; i + salto <= muestras.length; i += salto) {
  pasos.push({
    segundos: Number((desde + (i / muestreo)).toFixed(3)),
    db: Number(aDb(rms(muestras, i, i + salto)).toFixed(1)),
  });
}
if (pasos.length === 0) morir("La ventana es más corta que un paso. Ampliala.");

const maximo = Math.max(...pasos.map((p) => p.db));

for (const p of pasos) {
  const largo = Math.max(0, Math.round((p.db - (maximo - 50)) / 2));
  console.log(`${fijo(p.segundos, 2).padStart(8)}  cuadro ${String(cuadroDe(p.segundos)).padStart(5)}  ${fijo(p.db, 1).padStart(6)} dB  ${"#".repeat(largo)}`);
}

const masCallado = pasos.reduce((a, b) => (b.db < a.db ? b : a));
const corte = Number((masCallado.segundos + paso / 2).toFixed(3));

console.log("");
console.log(`pico de la ventana   ${fijo(maximo, 1)} dB`);
console.log(`punto más callado    ${fijo(corte, 3)} s (cuadro ${cuadroDe(corte)}), a ${fijo(masCallado.db - maximo, 1)} dB del pico`);

if (masCallado.db - maximo > -20) {
  console.log("aviso  No hay una pausa clara: es habla corrida. Probá varios puntos de entrada y transcribí cada uno.");
}

if (opciones.json) {
  escribirJson(opciones.json, { archivo, desde, hasta, paso, pico: maximo, corte, pasos });
  console.log(`\nDatos en ${corta(opciones.json)}`);
}
