/**
 * Lo que logo.mjs necesita saber de Simple Icons, sin tocar el disco ni la red: cómo se llama
 * cada ícono, cómo se busca una marca en sus datos, qué licencia tiene y cómo se pasa a blanco.
 *
 * Simple Icons (https://simpleicons.org) publica los logos de miles de marcas en SVG monocromo,
 * con licencia CC0 1.0 salvo los que traen licencia propia en sus datos. Sus datos
 * (data/simple-icons.json) dicen el nombre de cada marca, su slug, su color y su licencia.
 */

export const CDN = "https://cdn.jsdelivr.net/npm/simple-icons";
export const urlDatos = (version = "latest") => `${CDN}@${version}/data/simple-icons.json`;
export const urlIcono = (slug, version = "latest") => `${CDN}@${version}/icons/${slug}.svg`;

export const LICENCIA_CC0 = "CC0 1.0 (Simple Icons)";
export const LICENCIA_SIN_VERIFICAR = "sin verificar: Simple Icons es CC0 1.0, pero algunos íconos tienen licencia propia";
export const LICENCIA_OFICIAL = "marca registrada: archivo oficial del kit de prensa, se usa según sus pautas";

/** Los slugs de Simple Icons: minúsculas, números y, para desempatar, guion bajo. */
export const SLUG_VALIDO = /^[a-z0-9_]+$/;

const REEMPLAZOS = { "+": "plus", ".": "dot", "&": "and", đ: "d", ħ: "h", ı: "i", ĸ: "k", ŀ: "l", ł: "l", ß: "ss", ŧ: "t", ø: "o" };

/**
 * El slug de una marca, con la regla de Simple Icons (titleToSlug): minúsculas, "+" → "plus",
 * "." → "dot", "&" → "and", sin tildes y sin nada que no sea letra o número.
 */
export const slugDeMarca = (marca) =>
  String(marca)
    .toLowerCase()
    .replace(/[+.&đħıĸŀłßŧø]/g, (c) => REEMPLAZOS[c])
    .normalize("NFD")
    .replace(/[^a-z\d]/g, "");

const slugDe = (icono) => icono.slug || slugDeMarca(icono.title);

/** Los otros nombres con que se conoce una marca ("Twitter" para X) y sus nombres traducidos. */
const alias = (icono) => [...(icono.aliases?.aka ?? []), ...Object.values(icono.aliases?.loc ?? {})];

/**
 * Busca la marca en los datos. Con `slug`, ese ícono exacto. Si no, por nombre o por alias; si
 * dos marcas se llaman igual, gana la del slug de la regla y la otra va en `otros`.
 * Devuelve { icono, otros } o null si Simple Icons no la tiene.
 */
export function buscarIcono(datos, { marca, slug }) {
  if (slug) {
    const icono = datos.find((i) => slugDe(i) === slug);
    return icono ? { icono, otros: [] } : null;
  }
  const buscado = slugDeMarca(marca);
  if (!buscado) return null;
  const hallados = datos.filter(
    (i) => slugDeMarca(i.title) === buscado || alias(i).some((a) => slugDeMarca(a) === buscado),
  );
  if (!hallados.length) return null;
  const icono = hallados.find((i) => slugDe(i) === buscado) ?? hallados[0];
  return { icono, otros: hallados.filter((i) => i !== icono) };
}

/**
 * Para cuando no está: las marcas que se llamaban así antes ("Google Bard") y las de nombre
 * parecido ("Gemini" → "Google Gemini"). Nunca se elige una sola: se le muestran a la persona.
 */
export function sugerencias(datos, marca, maximo = 5) {
  const buscado = slugDeMarca(marca);
  if (buscado.length < 3) return [];
  const viejos = datos
    .filter((i) => (i.aliases?.old ?? []).some((a) => slugDeMarca(a) === buscado))
    .map((i) => ({ nombre: i.title, slug: slugDe(i), antes: true }));
  const parecidos = datos
    .map((i) => ({ i, s: slugDeMarca(i.title) }))
    .filter(({ s }) => s !== buscado && (s.includes(buscado) || (s.length >= 4 && buscado.includes(s))))
    // Primero las que contienen lo que se escribió ("Gemini" → "Google Gemini"), y de esas las
    // de largo más parecido.
    .sort(
      (a, b) =>
        Number(!a.s.includes(buscado)) - Number(!b.s.includes(buscado)) ||
        Math.abs(a.s.length - buscado.length) - Math.abs(b.s.length - buscado.length),
    )
    .map(({ i }) => ({ nombre: i.title, slug: slugDe(i), antes: false }));
  const vistos = new Set();
  return [...viejos, ...parecidos].filter((s) => !vistos.has(s.slug) && vistos.add(s.slug)).slice(0, maximo);
}

/** La licencia del ícono según los datos. Sin datos, queda sin verificar. */
export function licenciaDe(icono) {
  if (!icono) return { licencia: LICENCIA_SIN_VERIFICAR, propia: false };
  const tipo = icono.license?.type;
  if (!tipo || tipo === "CC0-1.0") return { licencia: LICENCIA_CC0, propia: false };
  return { licencia: `${tipo} (según Simple Icons)`, licenciaUrl: icono.license.url, propia: true };
}

/** ¿Es un SVG? Una CDN puede responder 200 con una página de error. */
export const esSvg = (texto) =>
  /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(texto) && /<\/svg>\s*$/i.test(texto);

/**
 * La versión blanca, para fondos oscuros: el color va en la etiqueta <svg> y lo heredan los
 * trazos. Los de Simple Icons son un solo trazo sin color propio, así que queda blanco entero.
 */
export const svgBlanco = (svg) =>
  svg.replace(/<svg\b([^>]*)>/i, (_, atributos) => `<svg${atributos.replace(/\s+fill="[^"]*"/i, "")} fill="#FFFFFF">`);

/** Los archivos de un slug en public/logos/. La composición los busca con estos mismos nombres. */
export const archivos = {
  simple: (slug) => `${slug}.svg`,
  blanco: (slug) => `${slug}-blanco.svg`,
  oficial: (slug, extension) => `${slug}-oficial${extension}`,
};

/** Las entradas del catálogo de esa marca: con `slug`, solo ese; si no, por slug o por nombre. */
export const enCatalogo = (catalogo, { marca, slug }) =>
  catalogo.logos.filter((l) =>
    slug ? l.slug === slug : l.slug === slugDeMarca(marca) || slugDeMarca(l.nombre) === slugDeMarca(marca),
  );
