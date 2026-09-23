/**
 * Fase 4 — el logo real de una marca: lo baja de Simple Icons a public/logos/ y lo anota en
 * public/logos/catalogo.json (fuente, licencia, color, fecha). Si Simple Icons no la tiene,
 * explica cómo conseguir el archivo oficial y lo registra con --importar. Nunca dibuja uno.
 *
 * Los logos no viajan en el repo: cada persona los baja, con permiso, a su public/logos/.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ayuda, esPrincipal, leerArgumentos } from "./_comun.mjs";
import {
  archivos, buscarIcono, enCatalogo, esSvg, LICENCIA_OFICIAL, licenciaDe, slugDeMarca, SLUG_VALIDO,
  sugerencias, svgBlanco, urlDatos, urlIcono,
} from "./_logos.mjs";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const SCRIPT = ".claude/skills/editar-video/scripts/logo.mjs";

const AYUDA = `
logo.mjs — el logo real de una marca, para el panel, el titular o la portada

  node ${SCRIPT} <marca> [--slug <slug>] [--blanco]
  node ${SCRIPT} <marca> --importar <archivo oficial> --fuente <página de donde salió>

<marca>: el nombre como lo escribe la marca: "GitHub", "Google Gemini", "n8n".

Lo baja de Simple Icons (SVG de una sola tinta) a public/logos/<slug>.svg y lo anota en
public/logos/catalogo.json con su fuente, su licencia, el color de la marca y la fecha. Busca
primero en el catálogo: lo que ya está no se vuelve a bajar. En datos.ts se usa el slug que
imprime: logo: "<slug>".

  --slug      el nombre del ícono en Simple Icons, si el que sale del nombre no es el que querés
              (lo muestra simpleicons.org, o te lo sugiere este script)
  --blanco    además, public/logos/<slug>-blanco.svg, para usar el logo fuera de la composición
              (la composición ya lo pone blanco sola sobre fondo oscuro)
  --importar  cuando Simple Icons no tiene la marca: el archivo oficial que bajaste del kit de
              prensa de la marca (.svg, o .png con fondo transparente). Queda en
              public/logos/<slug>-oficial.<ext> y se muestra tal cual, con sus colores
  --fuente    con --importar: la página del kit de donde lo bajaste. Va al catálogo
  --raiz      la carpeta del proyecto (por defecto, la de este script; sirve para las pruebas)

El permiso NO lo pide este script: lo pide la conversación ANTES de correrlo, según lo que la
persona eligió en memory/preferencias.md, campo "logos" (permiso para siempre, preguntar cada
vez, o nunca). Si eligió "nunca", o si no contestó y no dio el OK para este, no se corre.

Licencia: Simple Icons publica sus íconos como CC0 1.0, salvo los que tienen licencia propia en
sus datos; el script anota la que corresponde y avisa si no es CC0. Un logo sigue siendo una
marca registrada: sirve para nombrar la herramienta de la que se habla, sin deformarlo, sin
recolorearlo (salvo blanco o negro por contraste) y sin sugerir un patrocinio que no existe.
`;

/** La fecha local de hoy como AAAA-MM-DD. */
export function fechaDeHoy(d = new Date()) {
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

const carpetaDe = (raiz) => join(raiz, "public", "logos");
const rutaCatalogo = (raiz) => join(carpetaDe(raiz), "catalogo.json");

const DESCRIPCION =
  "Logos de marcas de este proyecto, bajados con logo.mjs o importados del kit de prensa de la marca. " +
  "slug = lo que va en datos.ts (logo: \"<slug>\"). No van al repo: cada persona los baja con permiso.";

export function leerCatalogo(raiz) {
  const ruta = rutaCatalogo(raiz);
  if (!existsSync(ruta)) return { descripcion: DESCRIPCION, logos: [] };
  try {
    const catalogo = JSON.parse(readFileSync(ruta, "utf8"));
    if (!Array.isArray(catalogo.logos)) throw new Error('falta la lista "logos"');
    return catalogo;
  } catch (e) {
    throw new Error(`public/logos/catalogo.json no se puede leer (${e.message}). Arreglalo a mano: no lo piso.`);
  }
}

function anotar(raiz, catalogo, entrada) {
  const i = catalogo.logos.findIndex((l) => l.archivo === entrada.archivo);
  if (i >= 0) catalogo.logos[i] = entrada;
  else catalogo.logos.push(entrada);
  mkdirSync(carpetaDe(raiz), { recursive: true });
  writeFileSync(rutaCatalogo(raiz), JSON.stringify(catalogo, null, 1) + "\n", "utf8");
}

function validarPedido(marca, slug) {
  if (typeof marca !== "string" || !marca.trim()) throw new Error('Falta la marca: el nombre como lo escribe ella, por ejemplo "GitHub".');
  if (slug !== undefined && !SLUG_VALIDO.test(slug)) {
    throw new Error(`El --slug "${slug}" no es de Simple Icons: son minúsculas, números y guion bajo (por ejemplo "googlegemini").`);
  }
}

/** Si el logo ya está en public/logos/, lo devuelve (y arma la versión blanca si se pidió). */
function siYaEsta(raiz, catalogo, pedido, blanco) {
  const carpeta = carpetaDe(raiz);
  const entrada = enCatalogo(catalogo, pedido).find((l) => existsSync(join(carpeta, l.archivo)));
  if (entrada) {
    const avisos = [];
    if (blanco && !entrada.archivo.includes("-oficial")) {
      const blancoArchivo = archivos.blanco(entrada.slug);
      if (!existsSync(join(carpeta, blancoArchivo))) {
        writeFileSync(join(carpeta, blancoArchivo), svgBlanco(readFileSync(join(carpeta, entrada.archivo), "utf8")), "utf8");
        anotar(raiz, catalogo, { ...entrada, blanco: blancoArchivo });
      }
      entrada.blanco = blancoArchivo;
    } else if (blanco) {
      avisos.push("Es el archivo oficial: la versión para fondo oscuro se baja del mismo kit de prensa.");
    }
    return { estado: "ya-estaba", marca: pedido.marca, slug: entrada.slug, entrada, avisos };
  }
  const slug = pedido.slug ?? slugDeMarca(pedido.marca);
  if (existsSync(join(carpeta, archivos.simple(slug)))) {
    return {
      estado: "ya-estaba",
      marca: pedido.marca,
      slug,
      entrada: null,
      avisos: [`public/logos/${archivos.simple(slug)} ya existe pero no está en el catálogo: no lo piso. Si es oficial, registralo con --importar.`],
    };
  }
  return null;
}

async function leerDatos(fetch) {
  try {
    const r = await fetch(urlDatos(), { signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    return { datos: await r.json(), version: r.headers.get("x-jsd-version") ?? "latest" };
  } catch {
    return null;
  }
}

/**
 * Consigue el logo de una marca. Devuelve { estado: "bajado" | "ya-estaba" | "no-esta", marca,
 * slug, entrada, avisos, sugerencias }. Lanza un Error en castellano si algo falla a mitad de
 * camino; en ese caso no escribió nada.
 */
export async function conseguirLogo({ marca, slug, blanco = false, raiz = RAIZ, fetch = globalThis.fetch, fecha = fechaDeHoy() }) {
  validarPedido(marca, slug);
  const catalogo = leerCatalogo(raiz);
  const antes = siYaEsta(raiz, catalogo, { marca, slug }, blanco);
  if (antes) return antes;

  const avisos = [];
  const leidos = await leerDatos(fetch);
  const version = leidos?.version ?? "latest";
  let icono = null;
  if (leidos) {
    const hallado = buscarIcono(leidos.datos, { marca, slug });
    if (!hallado) {
      return { estado: "no-esta", marca, slug: slug ?? slugDeMarca(marca), sugerencias: sugerencias(leidos.datos, marca), avisos };
    }
    icono = hallado.icono;
    for (const otro of hallado.otros) avisos.push(`Hay otro ícono que se llama igual: "${otro.title}" (--slug ${otro.slug}). Si era ese, bajalo con --slug.`);
  } else {
    avisos.push("No pude leer los datos de Simple Icons: el color queda en null y la licencia sin verificar.");
  }

  const elSlug = icono?.slug ?? slug ?? slugDeMarca(marca);
  const yaEstaba = siYaEsta(raiz, catalogo, { marca, slug: elSlug }, blanco);
  if (yaEstaba) return { ...yaEstaba, avisos: [...avisos, ...yaEstaba.avisos] };

  const url = urlIcono(elSlug, version);
  let respuesta;
  try {
    respuesta = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch (e) {
    throw new Error(`No pude bajar el logo: se cortó la conexión (${e.cause?.code ?? e.message}). Probá de nuevo.`);
  }
  if (respuesta.status === 404) return { estado: "no-esta", marca, slug: elSlug, sugerencias: [], avisos };
  if (!respuesta.ok) throw new Error(`Simple Icons respondió ${respuesta.status} al pedir ${url}. Probá de nuevo en un rato.`);
  const svg = await respuesta.text();
  if (!esSvg(svg)) throw new Error(`Lo que llegó de ${url} no es un SVG. No guardé nada.`);

  const carpeta = carpetaDe(raiz);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(join(carpeta, archivos.simple(elSlug)), svg, "utf8");
  const { licencia, licenciaUrl, propia } = licenciaDe(icono);
  const entrada = {
    slug: elSlug,
    nombre: icono?.title ?? marca.trim(),
    archivo: archivos.simple(elSlug),
    fuente: url,
    licencia,
    ...(licenciaUrl ? { licenciaUrl } : {}),
    ...(icono?.guidelines ? { pautas: icono.guidelines } : {}),
    color: icono?.hex ? `#${icono.hex}` : null,
    fecha,
  };
  if (blanco) {
    writeFileSync(join(carpeta, archivos.blanco(elSlug)), svgBlanco(svg), "utf8");
    entrada.blanco = archivos.blanco(elSlug);
  }
  anotar(raiz, catalogo, entrada);
  if (propia) avisos.push(`La licencia de este ícono no es CC0: es ${licencia}${licenciaUrl ? ` (${licenciaUrl})` : ""}. Leela antes de publicar.`);
  return { estado: "bajado", marca, slug: elSlug, entrada, avisos };
}

/**
 * Registra el archivo oficial que la persona bajó del kit de prensa de la marca. Lo copia a
 * public/logos/<slug>-oficial.<ext>, sin pisar nada, y lo anota en el catálogo con su fuente.
 */
export function importarLogo({ marca, slug, archivo, fuente, raiz = RAIZ, fecha = fechaDeHoy() }) {
  validarPedido(marca, slug);
  const elSlug = slug ?? slugDeMarca(marca);
  const extension = extname(String(archivo ?? "")).toLowerCase();
  if (!archivo || !existsSync(archivo)) throw new Error(`No encuentro el archivo oficial: ${archivo ?? "(falta la ruta después de --importar)"}.`);
  if (![".svg", ".png"].includes(extension)) throw new Error("El archivo oficial tiene que ser .svg o .png (con fondo transparente).");
  if (extension === ".svg" && !esSvg(readFileSync(archivo, "utf8"))) throw new Error(`${archivo} no es un SVG.`);
  if (!/^https?:\/\//.test(fuente ?? "")) throw new Error("Falta --fuente: la página del kit de prensa de donde lo bajaste (https://…).");
  const carpeta = carpetaDe(raiz);
  const destino = archivos.oficial(elSlug, extension);
  if (existsSync(join(carpeta, destino))) throw new Error(`Ya hay un public/logos/${destino}: no lo piso. Movelo a otro lado si lo querés reemplazar.`);
  const catalogo = leerCatalogo(raiz);
  mkdirSync(carpeta, { recursive: true });
  copyFileSync(archivo, join(carpeta, destino));
  const entrada = { slug: elSlug, nombre: marca.trim(), archivo: destino, fuente, licencia: LICENCIA_OFICIAL, color: null, fecha };
  anotar(raiz, catalogo, entrada);
  return { estado: "importado", marca, slug: elSlug, entrada, avisos: [] };
}

/** Qué decirle a la persona cuando Simple Icons no tiene la marca. */
export function explicarQueFalta({ marca, slug, sugerencias: parecidas = [] }) {
  const lineas = [`Simple Icons no tiene "${marca}" (busqué el ícono "${slug}").`];
  if (parecidas.length) {
    lineas.push("", "¿Era alguno de estos? Si es la misma marca, corré de nuevo con su --slug:");
    for (const s of parecidas) lineas.push(`  ${s.nombre}  (--slug ${s.slug})${s.antes ? `  — antes se llamaba "${marca}"` : ""}`);
  }
  lineas.push(
    "",
    "No se dibuja ni se inventa un logo parecido. Para usar el oficial:",
    '  1. Buscá el kit de prensa de la marca en su web: suele estar en el pie de página como "Brand",',
    '     "Press", "Media kit", "Newsroom" o "Marca". Leé sus pautas de uso.',
    "  2. Bajá la versión para fondo oscuro (blanca o a color), en SVG o, si no hay, en PNG con fondo",
    "     transparente.",
    `  3. Registralo: node ${SCRIPT} "${marca}" --importar <archivo> --fuente <página del kit>`,
    `     Queda en public/logos/${slug}-oficial.svg (o .png) y en datos.ts va logo: "${slug}".`,
    "Si la marca no publica su logo, se la nombra con texto, sin logo.",
  );
  return lineas.join("\n");
}

function informar(r) {
  if (r.estado === "no-esta") {
    console.error(explicarQueFalta(r));
    return 1;
  }
  const e = r.entrada;
  if (r.estado === "bajado") console.log(`Listo: ${e.nombre} → public/logos/${e.archivo}  (${e.licencia}, color ${e.color ?? "sin dato"})`);
  else if (r.estado === "importado") console.log(`Listo: ${e.nombre} → public/logos/${e.archivo}  (oficial, de ${e.fuente})`);
  else if (e) console.log(`${e.nombre} ya está en public/logos/${e.archivo} (catálogo, del ${e.fecha}). No se baja de nuevo.`);
  if (e?.blanco) console.log(`Versión blanca: public/logos/${e.blanco}`);
  for (const a of r.avisos) console.log(`aviso  ${a}`);
  console.log(`En datos.ts: logo: "${r.slug}"`);
  return 0;
}

async function principal() {
  ayuda(process.argv, AYUDA);
  const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["blanco"] });
  const raiz = opciones.raiz ? resolve(opciones.raiz) : RAIZ;
  const marca = libres.join(" ");
  try {
    const r = "importar" in opciones
      ? importarLogo({ marca, slug: opciones.slug, archivo: opciones.importar, fuente: opciones.fuente, raiz })
      : await conseguirLogo({ marca, slug: opciones.slug, blanco: Boolean(opciones.blanco), raiz });
    process.exitCode = informar(r);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}

if (esPrincipal(import.meta.url)) await principal();
