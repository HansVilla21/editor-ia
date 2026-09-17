/**
 * Fase 8 — filtrar las pistas candidatas antes de escucharlas una por una.
 *
 * Gemini descarta las que tienen voces o cambios caóticos y propone desde qué segundo arranca
 * el beat. Para los niveles de la mezcla no sirve: eso lo dice mezcla.mjs.
 */
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

import { ayuda, leerArgumentos, morir, escribirJson, corta, fijo, sondear } from "./_comun.mjs";
import { subirArchivo, borrarArchivo, preguntar, mimeDe, clave } from "./_gemini.mjs";

const AYUDA = `
musica.mjs — escucha las pistas candidatas y descarta las que no sirven

  node .claude/skills/editar-video/scripts/musica.mjs <carpeta con las pistas> [--salida <escucha.json>]

Recibe: una carpeta con los .mp3 / .wav / .m4a que se bajaron.
Devuelve: <carpeta>/escucha.json con la ficha de cada pista, y en pantalla el ranking:
          si es instrumental, género, BPM estimado, energía, si compite con la voz, desde qué
          segundo conviene cortar el tramo y qué tan bien encaja.

Criterio neutro de elección: instrumental, energía media-alta, entre 110 y 125 BPM, sin cambios
bruscos de sección.

Licencia primero. La fuente que trae el proyecto es Mixkit, con su Stock Music Free License.
Antes de bajar de cualquier otra fuente, preguntar.

Después de elegir: cortar un tramo de la duración del video más 4 s, fade-in de 0,25 s, y
  nivelar.mjs <tramo> public/<slug>/musica.m4a -33
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [carpeta] = libres;
if (!carpeta) morir("Falta la carpeta con las pistas. Probá con --ayuda.");
if (!existsSync(carpeta) || !statSync(carpeta).isDirectory()) morir(`${corta(carpeta)} no es una carpeta.`);

const EXTENSIONES = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"];
const pistas = readdirSync(carpeta)
  .filter((n) => EXTENSIONES.includes(extname(n).toLowerCase()))
  .sort();

if (pistas.length === 0) morir(`No hay pistas de audio en ${corta(carpeta)}.`);
clave(); // Antes de subir nada.

const salida = opciones.salida ?? join(carpeta, "escucha.json");

const instruccion = [
  "Escuchá esta pista completa. Va a ir MUY bajita de fondo, debajo de la voz de una persona",
  "que habla en español sobre herramientas técnicas, en un video vertical de 40 a 90 segundos.",
  "",
  "Devolvé SOLO JSON con estas claves:",
  '{"instrumental": boolean, "voces": "qué voces o samples vocales tiene, o ninguna",',
  ' "genero": string, "bpm": number, "energia": number (1 a 10), "animo": string,',
  ' "instrumentos": string, "compiteConLaVoz": "en qué rango de frecuencias molesta, o no molesta",',
  ' "arranqueRecomendado": number (segundo desde el que conviene cortar el tramo),',
  ' "motivoDelArranque": string, "cambiosBruscos": string,',
  ' "encaje": number (1 a 10), "porQue": string}',
].join("\n");

const fichas = {};
for (const nombre of pistas) {
  const ruta = join(carpeta, nombre);
  const info = await sondear(ruta);
  process.stdout.write(`${nombre} (${fijo(info.duracion)} s) … `);

  let archivo;
  try {
    archivo = await subirArchivo(ruta, mimeDe(ruta));
    const { datos } = await preguntar({
      partes: [
        { file_data: { file_uri: archivo.uri, mime_type: archivo.mimeType } },
        { text: instruccion },
      ],
    });
    fichas[nombre] = { ...datos, duracion: Number(info.duracion.toFixed(2)) };
    console.log(`encaje ${datos?.encaje ?? "?"}/10`);
  } catch (e) {
    console.log(`falló: ${String(e.message).slice(0, 120)}`);
    fichas[nombre] = { error: String(e.message).slice(0, 300) };
  } finally {
    await borrarArchivo(archivo);
  }
  escribirJson(salida, fichas);
}

const ranking = Object.entries(fichas)
  .filter(([, f]) => !f.error)
  .sort((a, b) => (Number(b[1].encaje) || 0) - (Number(a[1].encaje) || 0));

console.log("");
console.log("ranking");
for (const [nombre, f] of ranking) {
  const marcas = [];
  if (f.instrumental === false) marcas.push("TIENE VOCES");
  const bpm = Number(f.bpm);
  if (Number.isFinite(bpm) && (bpm < 110 || bpm > 125)) marcas.push(`BPM ${Math.round(bpm)} fuera de 110-125`);
  if (f.cambiosBruscos && !/^(no|ninguno|ninguna)/i.test(String(f.cambiosBruscos))) marcas.push("cambios de sección");

  console.log(
    `  ${String(f.encaje ?? "?").padStart(2)}/10  ${nombre.padEnd(40)} ` +
      `${String(f.genero ?? "").slice(0, 18).padEnd(18)} ` +
      `arranca en ${fijo(Number(f.arranqueRecomendado) || 0)} s  ${marcas.join(" · ")}`,
  );
}

console.log("");
console.log(`fichas en ${corta(salida)}`);
console.log("Esto descarta lo que no sirve. La que quede, escucharla antes de usarla, y anotarla en memory/ con su segundo de arranque.");
