/**
 * Arranca un video nuevo: copia la plantilla de composición a src/<slug>/, le arma su entrada
 * de Remotion y crea las carpetas donde van sus archivos y sus renders.
 *
 * Por qué un script y no copiar a mano: la copia tiene que quedar sin ninguna referencia a la
 * plantilla. Si queda una, el render no falla — renderiza el contenido de la plantilla, y eso
 * se descubre tarde.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE = "plantilla";
const RESERVADOS = new Set(["entries", "sfx", "logos"]);

const AYUDA = `
nuevo-video.mjs — arranca un video nuevo a partir de la plantilla

  npm run nuevo <slug>
  node scripts/nuevo-video.mjs <slug> [--fecha AAAA-MM-DD] [--raiz <carpeta>]

<slug>: el nombre corto del video, en minúsculas, números y guiones (por ejemplo "mi-video").

Crea:
  src/<slug>/                         la composición (lo único que se edita es datos.ts)
  src/entries/<slug>.tsx              la entrada, con los ids <Slug> y <Slug>Portada
  public/<slug>/                      los archivos del video (video.mp4, voz.wav, musica.m4a…)
  videos/<fecha>-<slug>/versiones/    los renders

  --fecha   la fecha de la carpeta de entrega (por defecto, hoy)
  --raiz    la carpeta del proyecto (por defecto, la de este script; sirve para las pruebas)

Si el slug ya existe no toca nada: elegí otro nombre o seguí trabajando en el que hay.
`;

/** "mi-video-2" → "MiVideo2". Es el id de la composición. */
export const aPascal = (slug) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");

/** Devuelve null si el slug sirve, o el motivo por el que no. */
export function validarSlug(slug) {
  if (typeof slug !== "string" || slug === "") return "Falta el slug: el nombre corto del video, como \"mi-video\".";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return `El slug "${slug}" no sirve: solo minúsculas sin tilde, números y guiones (por ejemplo "mi-video").`;
  }
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) {
    return `El slug "${slug}" no sirve: los guiones van entre palabras, de a uno (por ejemplo "mi-video").`;
  }
  if (slug.includes(BASE)) return `El slug no puede contener "${BASE}": es el nombre de la base que se copia.`;
  if (RESERVADOS.has(slug)) return `El slug "${slug}" está reservado por el proyecto. Elegí otro.`;
  return null;
}

/** La fecha local de hoy como AAAA-MM-DD (no la de UTC: a la noche serían mañana). */
export function fechaDeHoy(d = new Date()) {
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function archivos(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

/**
 * Hace el trabajo. Lanza un Error con un mensaje en español si algo no se puede: en ese caso
 * no escribió nada, porque todo se valida antes de copiar.
 */
export function nuevoVideo({ raiz, slug, fecha = fechaDeHoy() }) {
  const problema = validarSlug(slug);
  if (problema) throw new Error(problema);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error(`La fecha "${fecha}" no es AAAA-MM-DD.`);

  const src = join(raiz, "src");
  const base = join(src, BASE);
  const entradaBase = join(src, "entries", `${BASE}.tsx`);
  const destino = join(src, slug);
  const entrada = join(src, "entries", `${slug}.tsx`);

  if (!existsSync(base)) throw new Error(`No encuentro la plantilla en src/${BASE}/.`);
  if (!existsSync(entradaBase)) throw new Error(`No encuentro la entrada de la plantilla en src/entries/${BASE}.tsx.`);
  if (existsSync(destino)) throw new Error(`El video "${slug}" ya existe en src/${slug}/. Elegí otro slug o seguí en ese.`);
  if (existsSync(entrada)) throw new Error(`La entrada src/entries/${slug}.tsx ya existe. Elegí otro slug.`);

  const id = aPascal(slug);
  const idPortada = `${id}Portada`;

  // Todo lo que se va a escribir se prepara antes de tocar el disco.
  const datosBase = readFileSync(join(base, "datos.ts"), "utf8");
  const lineaDir = new RegExp(`export const DIR = "${BASE}";`);
  if (!lineaDir.test(datosBase)) {
    throw new Error(`src/${BASE}/datos.ts no tiene la línea export const DIR = "${BASE}"; y no sé dónde poner el slug.`);
  }
  const datos = datosBase.replace(lineaDir, `export const DIR = "${slug}";`);

  const textoEntrada = readFileSync(entradaBase, "utf8")
    .replaceAll(`../${BASE}/`, `../${slug}/`)
    .replaceAll('id="PlantillaPortada"', `id="${idPortada}"`)
    .replaceAll('id="Plantilla"', `id="${id}"`);
  if (/plantilla/i.test(textoEntrada)) {
    throw new Error(`src/entries/${BASE}.tsx tiene una referencia a la plantilla que no sé reemplazar.`);
  }

  cpSync(base, destino, { recursive: true });
  writeFileSync(join(destino, "datos.ts"), datos, "utf8");
  writeFileSync(entrada, textoEntrada, "utf8");

  const carpetaPublic = `public/${slug}`;
  const carpetaVideos = `videos/${fecha}-${slug}`;
  mkdirSync(join(raiz, carpetaPublic), { recursive: true });
  mkdirSync(join(raiz, carpetaVideos, "versiones"), { recursive: true });

  const quedan = archivos(destino).filter((ruta) => /plantilla/i.test(readFileSync(ruta, "utf8")));
  return {
    slug,
    id,
    idPortada,
    carpetaSrc: `src/${slug}`,
    entrada: `src/entries/${slug}.tsx`,
    carpetaPublic,
    carpetaVideos,
    quedan: quedan.map((r) => r.slice(raiz.length + 1).split("\\").join("/")),
  };
}

function pasos(r) {
  const s = ".claude/skills/editar-video/scripts";
  const filas = [
    [`${r.carpetaSrc}/`, "la composición: lo único que se edita es datos.ts"],
    [r.entrada, `la entrada, con los ids ${r.id} y ${r.idPortada}`],
    [`${r.carpetaPublic}/`, "acá van video.mp4, voz.wav, musica.m4a, portada.png y las capturas"],
    [`${r.carpetaVideos}/versiones/`, "acá van los renders"],
  ];
  const ancho = Math.max(...filas.map(([ruta]) => ruta.length)) + 3;
  return `
Listo: el video "${r.slug}" tiene su lugar.

${filas.map(([ruta, que]) => `  ${ruta.padEnd(ancho)}${que}`).join("\n")}

Qué sigue:
  1. Cortar:    node ${s}/cortar.mjs <grabación> ${r.carpetaPublic}/video.mp4 <scratch>/tramos.json
  2. Palabras:  transcribir.mjs ${r.carpetaPublic}/video.mp4 <scratch>/captions.json
                palabras.mjs <scratch>/captions.json ${r.carpetaSrc}/palabras.json
  3. Encuadre:  cara.mjs ${r.carpetaPublic}/video.mp4 ${r.carpetaSrc}/encuadre.json (y mirar guia.png)
  4. Datos:     llenar ${r.carpetaSrc}/datos.ts (VIDEO_CUADROS, BLOQUES, CORTES, ENCUADRE, TITULAR, CTA…)
  5. Revisar:   node ${s}/previa.mjs ${r.entrada} ${r.id} <scratch>/previa "0,…" --escala 0.35 --hoja 5
  6. Render:    npx remotion render ${r.entrada} ${r.id} ${r.carpetaVideos}/versiones/v1-primera.mp4
  7. Portada:   npx remotion still ${r.entrada} ${r.idPortada} ${r.carpetaVideos}/portada.png

Para verlo mientras se arma: npx remotion studio ${r.entrada}
`;
}

// ---------------------------------------------------------------- línea de comandos

const esPrincipal = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (esPrincipal) {
  const args = process.argv.slice(2);
  if (args.includes("--ayuda") || args.includes("-h") || args.includes("--help")) {
    console.log(AYUDA.trim());
    process.exit(0);
  }
  const libres = [];
  const opciones = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) opciones[args[i].slice(2)] = args[++i];
    else libres.push(args[i]);
  }
  const raiz = opciones.raiz ? resolve(opciones.raiz) : fileURLToPath(new URL("..", import.meta.url));
  try {
    const r = nuevoVideo({ raiz: raiz.replace(/[\\/]$/, ""), slug: libres[0], fecha: opciones.fecha ?? fechaDeHoy() });
    console.log(pasos(r).trimEnd());
    if (r.quedan.length) {
      console.log(`\naviso  Estos archivos todavía mencionan la plantilla y hay que revisarlos: ${r.quedan.join(", ")}`);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
