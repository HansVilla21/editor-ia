/**
 * Fase 8 — los efectos de sonido del catálogo: bajarlos de Mixkit, dejarlos listos y medirlos.
 *
 * El catálogo (referencias/efectos.json) es la fuente única: dice de dónde sale cada efecto,
 * qué filtro lleva, dónde pega y a qué volumen entra. Los archivos NO viajan en el repo —la
 * licencia de Mixkit no deja redistribuirlos—: cada persona los baja una vez a public/sfx/.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ayuda, leerArgumentos, morir, ffmpeg, corta, fijo, vecinoTemporal, ultimasLineas, esPrincipal } from "./_comun.mjs";
import { medirEfecto, avisoSaturacion, picosPorCanal } from "./efecto.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "../../../..");
export const CATALOGO = resolve(AQUI, "../referencias/efectos.json");
const SCRIPT = ".claude/skills/editar-video/scripts/efectos.mjs";

/** Las claves que usa la plantilla. Una por evento del estilo neutro. */
export const CLAVES = [
  "whooshIn", "whooshOut", "swish", "sweep", "pop", "snap", "click", "tick",
  "bleep", "ok", "error", "wrong", "scan", "impact", "typing",
];

/** Si el catálogo dice más de esto de diferencia con el pico medido, el efecto cae corrido. */
const TOLERANCIA = 0.05;

const AYUDA = `
efectos.mjs — baja los efectos de sonido del catálogo y revisa que estén

  node ${SCRIPT} --bajar [--forzar]        (o: npm run efectos)
  node ${SCRIPT} --revisar
  node ${SCRIPT} --importar <clave> <archivo bajado a mano>

Lee el catálogo referencias/efectos.json (otro con --catalogo <ruta>).

  --bajar     baja de Mixkit cada efecto que falte en public/sfx/, lo pasa a WAV, le aplica su
              filtro y mide dónde pega. Si el pico medido difiere más de ${TOLERANCIA} s del
              catálogo, lo avisa. Lo que ya está no se vuelve a bajar.
  --forzar    con --bajar: los baja todos de nuevo, aunque ya estén.
  --revisar   lista qué efectos faltan en public/sfx/. No baja nada.
  --importar  para cuando la descarga falla: toma el archivo que la persona bajó a mano desde la
              página del efecto y lo deja en public/sfx/ igual que --bajar (WAV, filtro, medición).
              El archivo bajado no se toca.

Antes de --bajar, pedí el OK: descarga de internet (15 archivos, unos 7 MB en total).
Los efectos son de Mixkit (Mixkit Sound Effects Free License): se pueden usar gratis en los
videos, sin atribución, pero los archivos no se redistribuyen. Por eso no viajan en el repo.

Para agregar o cambiar un efecto: editá su entrada en el catálogo (mixkit, nombre, pagina,
descarga, filtro, vol), corré  node ${SCRIPT} --bajar --forzar  y pasá al catálogo el pico
y la duración que mide.
`;

export const leerCatalogo = (ruta = CATALOGO) => JSON.parse(readFileSync(ruta, "utf8"));

const texto = (v) => typeof v === "string" && v.trim() !== "";

/** Lista de problemas del catálogo, en castellano. Vacía si está sano. */
export function validarCatalogo(catalogo) {
  const problemas = [];
  for (const campo of ["licencia", "licenciaUrl", "carpeta"]) {
    if (!texto(catalogo?.[campo])) problemas.push(`catálogo: falta "${campo}"`);
  }
  if (!(typeof catalogo?.bus === "number" && catalogo.bus > 0)) problemas.push(`catálogo: "bus" tiene que ser un número mayor que 0`);
  const efectos = catalogo?.efectos;
  if (!efectos || typeof efectos !== "object") return [...problemas, `catálogo: falta "efectos"`];

  for (const [clave, e] of Object.entries(efectos)) {
    const mal = (campo, como) => problemas.push(`${clave}: "${campo}" ${como}`);
    if (!texto(e.archivo) || !/\.wav$/i.test(e.archivo)) mal("archivo", "tiene que ser un nombre de archivo .wav");
    if (!texto(e.nombre)) mal("nombre", "falta: es el título del efecto en Mixkit");
    if (!Number.isInteger(e.mixkit) || e.mixkit <= 0) mal("mixkit", "tiene que ser el número del efecto en Mixkit");
    if (!texto(e.pagina) || !/^https:\/\//.test(e.pagina)) mal("pagina", "tiene que ser una dirección https://");
    if (!texto(e.descarga) || !/^https?:\/\//.test(e.descarga)) mal("descarga", "tiene que ser la dirección directa del archivo");
    if (typeof e.pico !== "number" || !(e.pico >= 0)) mal("pico", "tiene que ser un número de segundos, 0 o más");
    if (typeof e.vol !== "number" || !(e.vol > 0 && e.vol <= 1)) mal("vol", "tiene que ser un número mayor que 0 y hasta 1");
    if (e.filtro !== null && !texto(e.filtro)) mal("filtro", "tiene que ser un filtro de ffmpeg, o null");
    if (!texto(e.evento)) mal("evento", "falta: cuándo se usa");
    if (e.medir !== undefined && !["pico", "inicio"].includes(e.medir)) mal("medir", `tiene que ser "pico" o "inicio"`);
    if (e.duracion !== undefined && !(typeof e.duracion === "number" && e.duracion > 0)) mal("duracion", "tiene que ser un número de segundos");
  }
  return problemas;
}

const carpetaDe = (catalogo) => resolve(RAIZ, catalogo.carpeta);

/**
 * Crudo → WAV de 16 bits con el filtro del catálogo, medido. Devuelve la medición o un motivo
 * de falla. El filtro corre en coma flotante y el pico se mide ANTES de pasar a 16 bits: después
 * ya está recortado y solo diría "toca 0 dBFS", sin cuánto se pasó.
 */
async function instalar(clave, e, crudo, destino) {
  const flotante = vecinoTemporal(destino);
  const parcial = vecinoTemporal(destino);
  let picoReal;
  try {
    const filtro = ["aformat=sample_fmts=fltp", e.filtro].filter(Boolean).join(",");
    const r = await ffmpeg(["-v", "error", "-y", "-i", crudo, "-vn", "-af", filtro, "-c:a", "pcm_f32le", flotante], { tolerar: true });
    if (r.codigo !== 0) return { motivo: `el archivo no se pudo convertir a WAV: ${ultimasLineas(r.error, 2)}` };
    picoReal = (await picosPorCanal(flotante)).maximo;
    await ffmpeg(["-v", "error", "-y", "-i", flotante, "-c:a", "pcm_s16le", parcial]);
    renameSync(parcial, destino);
  } finally {
    rmSync(flotante, { force: true });
    rmSync(parcial, { force: true });
  }

  const m = await medirEfecto(destino);
  const medir = e.medir ?? "pico";
  const medido = medir === "inicio" ? m.inicio : m.pico;
  console.log(
    `${clave.padEnd(10)} listo    ${e.archivo.padEnd(16)} ${medir} ${fijo(medido)} s (catálogo ${fijo(e.pico)})  ` +
      `dur ${fijo(m.duracion)} s  brillo ${Math.round(m.brillo ?? 0)} Hz  pico ${fijo(picoReal, 1)} dBFS`,
  );
  if (Math.abs(medido - e.pico) > TOLERANCIA) {
    console.log(
      `           aviso: el ${medir} medido (${fijo(medido)} s) difiere del catálogo (${fijo(e.pico)} s). ` +
        `Escuchalo, confirmalo con efecto.mjs y corregí "pico" en el catálogo: si no, cae corrido del evento.`,
    );
  }
  const saturacion = avisoSaturacion(picoReal);
  if (saturacion) console.log(`           aviso: ${saturacion} Sumá esa ganancia al final del "filtro" en el catálogo.`);
  return { medicion: m };
}

async function bajarUno(clave, e, destino) {
  const crudo = vecinoTemporal(destino);
  try {
    try {
      const r = await fetch(e.descarga, { headers: { "User-Agent": "Mozilla/5.0 (editor-ia; efectos.mjs)" } });
      if (!r.ok) return { motivo: `Mixkit respondió ${r.status}` };
      writeFileSync(crudo, Buffer.from(await r.arrayBuffer()));
    } catch (error) {
      return { motivo: `se cortó la conexión (${error.cause?.code ?? error.message})` };
    }
    return await instalar(clave, e, crudo, destino);
  } finally {
    rmSync(crudo, { force: true });
  }
}

function explicarFalla(clave, e, destino, motivo) {
  console.error("");
  console.error(`No pude bajar "${clave}": ${motivo}.`);
  console.error(`  Si fue un corte de red, volvé a correr npm run efectos: lo que ya bajó no se baja de nuevo.`);
  console.error(`  Si sigue fallando, Mixkit pudo haber cambiado la dirección. Bajalo a mano:`);
  console.error(`    1. Abrí ${e.pagina}`);
  console.error(`    2. Buscá "${e.nombre}" (número ${e.mixkit}) y tocá Download.`);
  console.error(`    3. Dejalo listo en ${corta(destino)} con:`);
  console.error(`       node ${SCRIPT} --importar ${clave} <ruta del archivo que bajaste>`);
}

function imprimirLicencia(catalogo) {
  console.log("");
  console.log(`Licencia: ${catalogo.licencia} — ${catalogo.licenciaUrl}`);
  console.log("Se usan gratis en los videos y sin atribución. Los archivos no se redistribuyen: por eso no van al repo.");
}

async function bajar(catalogo, { forzar }) {
  const carpeta = carpetaDe(catalogo);
  mkdirSync(carpeta, { recursive: true });
  const fallas = [];
  for (const [clave, e] of Object.entries(catalogo.efectos)) {
    const destino = join(carpeta, e.archivo);
    if (existsSync(destino) && !forzar) {
      console.log(`${clave.padEnd(10)} ya está  ${corta(destino)}`);
      continue;
    }
    const { motivo } = await bajarUno(clave, e, destino);
    if (motivo) fallas.push([clave, e, destino, motivo]);
  }
  for (const falla of fallas) explicarFalla(...falla);
  imprimirLicencia(catalogo);
  if (fallas.length) morir(`\nFaltan ${fallas.length} efecto(s): ${fallas.map(([c]) => c).join(", ")}.`);
}

function revisar(catalogo) {
  const carpeta = carpetaDe(catalogo);
  const entradas = Object.entries(catalogo.efectos);
  const faltan = entradas.filter(([, e]) => !existsSync(join(carpeta, e.archivo)));
  for (const [clave, e] of entradas) {
    const esta = existsSync(join(carpeta, e.archivo));
    console.log(`${esta ? "está " : "falta"}  ${clave.padEnd(10)} ${corta(join(carpeta, e.archivo))}`);
  }
  console.log("");
  console.log(
    faltan.length
      ? `Faltan ${faltan.length} de ${entradas.length}. Se bajan con npm run efectos (antes, pedí el OK: baja de internet).`
      : `Están los ${entradas.length} efectos del catálogo.`,
  );
}

async function importar(catalogo, clave, archivo) {
  const e = catalogo.efectos[clave];
  if (!e) morir(`"${clave}" no está en el catálogo. Claves: ${Object.keys(catalogo.efectos).join(", ")}.`);
  if (!archivo || !existsSync(archivo)) morir(`No encuentro el archivo bajado: ${archivo ?? "(falta la ruta)"}.`);
  const destino = join(carpetaDe(catalogo), e.archivo);
  mkdirSync(dirname(destino), { recursive: true });
  const { motivo } = await instalar(clave, e, archivo, destino);
  if (motivo) morir(`No pude importar "${clave}": ${motivo}.`);
}

async function principal() {
  ayuda(process.argv, AYUDA);
  const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["bajar", "forzar", "revisar"] });
  const catalogo = leerCatalogo(opciones.catalogo ?? CATALOGO);
  const problemas = validarCatalogo(catalogo);
  if (problemas.length) morir(`El catálogo tiene problemas:\n  ${problemas.join("\n  ")}`);

  if (opciones.bajar) await bajar(catalogo, { forzar: Boolean(opciones.forzar) });
  else if (opciones.revisar) revisar(catalogo);
  else if (opciones.importar) await importar(catalogo, opciones.importar, libres[0]);
  else morir("Falta qué hacer: --bajar, --revisar o --importar. Probá con --ayuda.");
}

if (esPrincipal(import.meta.url)) await principal();
