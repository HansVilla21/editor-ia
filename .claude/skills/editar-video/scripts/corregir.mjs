/**
 * Fase 3 — corregir palabras.json con una lista "mal => bien", sin editar el JSON a mano.
 *
 * Whisper escribe mal los nombres propios ("Codl" por "Code") y a veces una frase entera
 * ("volvió la día" por "devolvió la IA"). La segunda opinión de Gemini, o la persona, dice cómo
 * va; esto lo aplica y deja los tiempos donde estaban.
 */
import { readFileSync, existsSync } from "node:fs";

import { ayuda, leerArgumentos, morir, escribirJson, corta, fijo } from "./_comun.mjs";
import { leerCorrecciones, aplicarCorrecciones } from "./_corregir.mjs";

const AYUDA = `
corregir.mjs — aplica correcciones de texto a palabras.json, sin tocar los tiempos

  node .claude/skills/editar-video/scripts/corregir.mjs <palabras.json> <correcciones.txt> [--salida <otro.json>]

Recibe: palabras.json (de palabras.mjs) y un archivo de texto con una corrección por línea:

          Codl => Code
          volvió la día => devolvió la IA
          # las líneas que empiezan con # se ignoran

Devuelve: palabras.json corregido (o --salida, si se pasa) y en pantalla qué reemplazó y dónde.

Cómo busca: sin distinguir mayúsculas y sin la puntuación de los bordes ("¿Codl," cuenta como
"codl"), en todas las apariciones, y línea por línea en orden: cada una trabaja sobre lo que dejó
la anterior. El texto nuevo va tal cual lo escribiste; la puntuación de los bordes se conserva.

Los tiempos: si cambian tantas palabras como entran, cada una se queda con los suyos. Si cambia la
cantidad, las nuevas se reparten el tramo de las viejas según su largo. Los cuadros se recalculan
con el redondeo del proyecto, f = round(segundos * 30).

Avisa las líneas que no encontró en ninguna parte: suele ser una tilde o una palabra de más.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [entrada, lista] = libres;
if (!entrada || !lista) morir("Faltan argumentos: <palabras.json> <correcciones.txt>. Probá con --ayuda.");
if (!existsSync(lista)) morir(`No encuentro ${corta(lista)}.`);
const salida = opciones.salida && opciones.salida !== true ? opciones.salida : entrada;

let palabras;
try {
  palabras = JSON.parse(readFileSync(entrada, "utf8"));
} catch (e) {
  morir(`No pude leer ${corta(entrada)}: ${e.message}`);
}
if (!Array.isArray(palabras) || palabras.some((p) => typeof p?.texto !== "string")) {
  morir(`${corta(entrada)} no es un palabras.json: va una lista de {"texto", "inicio", "fin"}.`);
}

const { correcciones, errores } = leerCorrecciones(readFileSync(lista, "utf8"));
for (const e of errores) console.log(`aviso  línea ${e.numero} de ${corta(lista)}: ${e.motivo}  (${e.linea})`);
if (correcciones.length === 0) morir(`No hay ninguna corrección en ${corta(lista)}. Va una por línea: mal => bien`);

const { palabras: corregidas, resultados } = aplicarCorrecciones(palabras, correcciones);

let reemplazos = 0;
const sinEncontrar = [];
for (const r of resultados) {
  if (r.apariciones.length === 0) {
    sinEncontrar.push(r);
    continue;
  }
  reemplazos += r.apariciones.length;
  const veces = r.apariciones.length === 1 ? "1 vez" : `${r.apariciones.length} veces`;
  const donde = r.apariciones.map((s) => `${fijo(s)} s`).join(", ");
  console.log(`«${r.textoMal}» → «${r.textoBien}»  ${veces}: ${donde}`);
}

if (sinEncontrar.length) {
  console.log("");
  console.log("aviso  Estas líneas no las encontré en ninguna parte (¿una tilde, una palabra de más?):");
  for (const r of sinEncontrar) console.log(`  línea ${r.numero}: «${r.textoMal}»`);
}

escribirJson(salida, corregidas);
console.log("");
console.log(`${reemplazos} reemplazo(s); ${palabras.length} palabras antes, ${corregidas.length} ahora.`);
console.log(`palabras en ${corta(salida)}`);
