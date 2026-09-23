/**
 * Fase 2b — el mapa de intentos de una grabación cruda.
 *
 * Cuando la persona lee frase por frase y repite cuando se traba, primero hay que saber
 * qué intentos hay. Los tiempos que devuelve son APROXIMADOS y a veces confunde una pausa a
 * mitad de frase con un intento cortado: sirve para saber qué buscar, no para cortar.
 * Los límites reales salen de tramos.mjs.
 */
import { readFileSync, existsSync } from "node:fs";

import { ayuda, leerArgumentos, morir, escribirJson, corta, fijo, sondear } from "./_comun.mjs";
import { subirArchivo, borrarArchivo, preguntar, mimeDe, clave } from "./_gemini.mjs";
import { prepararMp3 } from "./_voz.mjs";
import { avisosFueraDeGuion, instruccionDeTomas, marcasDelIntento } from "./_tomas.mjs";

const AYUDA = `
tomas.mjs — lista cada intento de cada línea del guion en una grabación cruda

  node .claude/skills/editar-video/scripts/tomas.mjs <grabación> <guion.txt> <tomas.json>

Recibe: la grabación cruda (audio o video; si es video le saca el audio solo) y el guion con
        una frase por línea.
Devuelve: <tomas.json> con cada intento —qué líneas cubre, si está completo, si es fluido, si
          hizo pausas, qué falló y qué se dijo—, los tramos fuera de guion, y una recomendación
          por línea.

  TRABADO     se trabó: repitió una palabra, se corrigió a mitad o dejó la frase cortada.
  con pausas  solo hizo silencios largos. La toma sirve igual: el corte de silencios los saca.

Los tiempos son aproximados. El flujo completo está en referencias/tomas.md:
  1. sondear.mjs      qué es el archivo
  2. tomas.mjs        qué intentos hay (esto)
  3. tramos.mjs       los límites reales, medidos sobre la onda
  4. transcribir.mjs --tramos   el texto de cada tramo
  5. armar edl.json   la última toma completa y fluida de cada línea
  6. montar.mjs       pegarlas
  7. cortar.mjs       sacar las pausas del montaje
`;

ayuda(process.argv, AYUDA);
const { libres } = leerArgumentos(process.argv.slice(2));
const [grabacion, guionRuta, salida] = libres;
if (!grabacion || !guionRuta || !salida) morir("Faltan argumentos: <grabación> <guion.txt> <tomas.json>. Probá con --ayuda.");
if (!existsSync(guionRuta)) morir(`No encuentro ${corta(guionRuta)}.`);

const lineas = readFileSync(guionRuta, "utf8")
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);
if (lineas.length === 0) morir("El guion está vacío. Va una frase por línea.");

clave(); // Antes de convertir el audio: si falta la clave, no tiene sentido trabajar.

const info = await sondear(grabacion);
if (!info.audio) morir("La grabación no tiene audio.");

// Siempre se sube un mp3 liviano: subir el video entero tarda muchísimo y no aporta nada.
const audio = await prepararMp3(grabacion);

const instruccion = instruccionDeTomas(lineas, info.duracion);

console.log(`Subiendo ${fijo(info.duracion)} s de audio a Gemini…`);
let archivo;
try {
  archivo = await subirArchivo(audio, mimeDe(audio));
  const { modelo, datos } = await preguntar({
    partes: [
      { file_data: { file_uri: archivo.uri, mime_type: archivo.mimeType } },
      { text: instruccion },
    ],
  });

  escribirJson(salida, { grabacion, guion: guionRuta, modelo, ...datos });

  const intentos = datos?.intentos ?? [];
  for (const intento of intentos) {
    console.log(
      `${fijo(Number(intento.inicio) || 0).padStart(7)} - ${fijo(Number(intento.fin) || 0).padStart(7)}  ` +
        `línea ${String((intento.lineas ?? []).join(",")).padEnd(6)} ${marcasDelIntento(intento).padEnd(28)} ${intento.texto ?? ""}`,
    );
    if (intento.problema) console.log(`${" ".repeat(19)}problema: ${intento.problema}`);
  }

  const recomendacion = datos?.recomendacion ?? [];
  if (recomendacion.length) {
    console.log("");
    console.log("recomendación por línea");
    for (const r of recomendacion) {
      console.log(`  línea ${String(r.linea).padStart(3)}  desde ${fijo(Number(r.inicio) || 0).padStart(7)} s   ${r.motivo ?? ""}`);
    }
  }

  const sinCubrir = lineas
    .map((_, i) => i + 1)
    .filter((n) => !intentos.some((t) => (t.lineas ?? []).includes(n)));
  if (sinCubrir.length) {
    console.log("");
    console.log(`aviso  Estas líneas no aparecen en ningún intento: ${sinCubrir.join(", ")}`);
    console.log("       Preguntale a la persona si van igual (hay que grabarlas) o se sacan del guion.");
  }

  const fuera = avisosFueraDeGuion(datos);
  if (fuera.length) {
    console.log("");
    console.log("aviso  Se dijo esto y no está en el guion. Preguntale si va en el video o se saca:");
    for (const linea of fuera) console.log(linea);
  }

  console.log("");
  console.log(`${intentos.length} intentos en ${corta(salida)} (${modelo})`);
  console.log("Los tiempos son aproximados. Para cortar, usar tramos.mjs sobre la onda.");
} catch (e) {
  morir(`\nNo pude consultar a Gemini.\n${e.message}`);
} finally {
  await borrarArchivo(archivo);
}
