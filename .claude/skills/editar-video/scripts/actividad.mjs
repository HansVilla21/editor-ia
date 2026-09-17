/**
 * Fase 8 — la envolvente de voz, cuadro por cuadro, que alimenta el ducking de la música.
 *
 * Un valor por cuadro a 30 fps: 0 cuando hay pausa, 1 cuando habla. El ataque es rápido
 * (la música baja apenas arranca la frase) y el regreso lento (no sube entre palabra y palabra).
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
  FPS,
  escribirJson,
  asegurarCarpeta,
} from "./_comun.mjs";
import { writeFileSync } from "node:fs";

const AYUDA = `
actividad.mjs — envolvente de voz por cuadro, para el ducking de la música

  node .claude/skills/editar-video/scripts/actividad.mjs <voz.wav> <salida.ts|salida.json> \\
       [--margen 22] [--ataque 2] [--regreso 6]

Recibe: la voz ya nivelada (public/<slug>/voz.wav).
Devuelve: un valor por cuadro a 30 fps, entre 0 y 1.
          Si la salida termina en .ts, escribe "export const VOZ: number[] = [...]"
          listo para importar desde la composición; si termina en .json, un arreglo pelado.

  --margen   a cuántos dB por debajo del habla fuerte todavía se considera voz
  --ataque   en cuántos cuadros llega a 1 cuando arranca la frase
  --regreso  en cuántos cuadros vuelve a 0 cuando termina

En la mezcla: música 0.7 multiplicado por (1 - 0.35 * voz[cuadro]), que son unos -3.7 dB
mientras habla.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [vozRuta, salida] = libres;
if (!vozRuta || !salida) morir("Faltan argumentos: <voz.wav> <salida>. Probá con --ayuda.");

const margen = numero(opciones.margen, 22);
const ataque = Math.max(1, numero(opciones.ataque, 2));
const regreso = Math.max(1, numero(opciones.regreso, 6));

const muestreo = 48000;
const muestras = await leerPcm(vozRuta, muestreo);
if (muestras.length === 0) morir("El archivo no tiene audio.");

const salto = muestreo / FPS;
const cuadros = Math.floor(muestras.length / salto);
if (cuadros === 0) morir("El audio dura menos de un cuadro.");

const niveles = [];
for (let i = 0; i < cuadros; i++) {
  niveles.push(aDb(rms(muestras, Math.round(i * salto), Math.round((i + 1) * salto))));
}

const percentil = (valores, p) => {
  const orden = [...valores].sort((a, b) => a - b);
  const pos = (orden.length - 1) * (p / 100);
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  return orden[bajo] + (orden[alto] - orden[bajo]) * (pos - bajo);
};

// El umbral se calcula sobre este audio: cada grabación tiene su propio piso de ruido.
const umbral = percentil(niveles, 90) - margen;
const hablando = niveles.map((db) => (db > umbral ? 1 : 0));

const envolvente = [];
let actual = 0;
for (const v of hablando) {
  actual += (v - actual) * (v > actual ? 1 / ataque : 1 / regreso);
  envolvente.push(Number(actual.toFixed(3)));
}

if (salida.toLowerCase().endsWith(".ts")) {
  asegurarCarpeta(salida);
  writeFileSync(
    salida,
    [
      "// Envolvente de voz por cuadro (0 pausa, 1 hablando).",
      `// Generada por actividad.mjs desde ${corta(vozRuta)}. Alimenta el ducking de la música.`,
      `export const VOZ: number[] = ${JSON.stringify(envolvente)};`,
      "",
    ].join("\n"),
    "utf8",
  );
} else {
  escribirJson(salida, envolvente, { compacto: true });
}

const proporcion = hablando.reduce((a, b) => a + b, 0) / cuadros;
console.log(`${cuadros} cuadros (${fijo(cuadros / FPS)} s)`);
console.log(`umbral de voz  ${fijo(umbral, 1)} dB`);
console.log(`habla en el    ${fijo(100 * proporcion, 0)} % de los cuadros`);
console.log(`envolvente en  ${corta(salida)}`);

if (proporcion > 0.97) {
  console.log("aviso  Casi todos los cuadros dan 'hablando': el ducking no va a respirar. Probá --margen 16.");
}
if (proporcion < 0.3) {
  console.log("aviso  Muy pocos cuadros dan 'hablando'. Revisá que el archivo sea la voz ya nivelada.");
}
