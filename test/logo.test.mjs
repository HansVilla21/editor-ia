/**
 * logo.mjs baja el logo real de una marca desde Simple Icons y lo anota en public/logos/catalogo.json.
 *
 * Lo que se cuida: que el nombre del ícono salga con las reglas de Simple Icons, que lo que ya
 * está no se baje dos veces, que la licencia anotada sea la del ícono, y que si Simple Icons no
 * tiene la marca no se guarde nada y se explique cómo conseguir el archivo oficial.
 *
 * Nada sale a la red: la CDN es de mentira y todo se escribe en carpetas temporales.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { buscarIcono, slugDeMarca, sugerencias, svgBlanco } from "../.claude/skills/editar-video/scripts/_logos.mjs";
import { conseguirLogo, explicarQueFalta, importarLogo } from "../.claude/skills/editar-video/scripts/logo.mjs";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/logo.mjs", import.meta.url));
const FECHA = "2026-09-23";
const SVG = '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>GitHub</title><path d="M12 .3a12 12 0 0 0-3.8 23.4"/></svg>';

/** Un pedazo de data/simple-icons.json, con la misma forma. */
const DATOS = [
  { title: "GitHub", slug: "github", hex: "181717", source: "https://github.com/logos" },
  { title: "Google Gemini", slug: "googlegemini", hex: "8E75B2", source: "https://gemini.google.com", aliases: { old: ["Google Bard"] } },
  { title: "X", slug: "x", hex: "000000", source: "https://x.com", aliases: { aka: ["Twitter"] } },
  { title: "Spring", slug: "spring", hex: "6DB33F", source: "https://spring.io" },
  { title: "Spring", slug: "spring_creators", hex: "000000", source: "https://spring.com" },
  {
    title: "Marca Con Licencia",
    slug: "marcaconlicencia",
    hex: "FF0000",
    source: "https://ejemplo.com",
    guidelines: "https://ejemplo.com/pautas",
    license: { type: "CC-BY-4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
  },
];

/** Una CDN de mentira: anota cada pedido y responde como jsDelivr. */
function cdnFalsa({ iconos = { github: SVG }, datosCaidos = false, version = "16.32.0" } = {}) {
  const pedidos = [];
  const fetch = async (url) => {
    const u = String(url);
    pedidos.push(u);
    if (u.endsWith("/data/simple-icons.json")) {
      if (datosCaidos) return new Response("caído", { status: 503 });
      return new Response(JSON.stringify(DATOS), { status: 200, headers: { "x-jsd-version": version } });
    }
    const slug = u.match(/\/icons\/([^/]+)\.svg$/)?.[1];
    if (slug && iconos[slug]) return new Response(iconos[slug], { status: 200 });
    return new Response("Couldn't find the requested file", { status: 404 });
  };
  return { fetch, pedidos };
}

const sinRed = async (url) => assert.fail(`no tenía que salir a la red: ${url}`);

const raizDePrueba = () => mkdtempSync(join(tmpdir(), "logo-"));
const logos = (raiz) => join(raiz, "public", "logos");
const catalogo = (raiz) => JSON.parse(readFileSync(join(logos(raiz), "catalogo.json"), "utf8"));

// ---------------------------------------------------------------- nombres

test("slugDeMarca sigue las reglas de Simple Icons", () => {
  assert.equal(slugDeMarca("GitHub"), "github");
  assert.equal(slugDeMarca("Google Gemini"), "googlegemini");
  assert.equal(slugDeMarca(".NET"), "dotnet");
  assert.equal(slugDeMarca("C++"), "cplusplus");
  assert.equal(slugDeMarca("AT&T"), "atandt");
  assert.equal(slugDeMarca("Nestlé"), "nestle");
  assert.equal(slugDeMarca("Ørsted"), "orsted");
  assert.equal(slugDeMarca("n8n"), "n8n");
  assert.equal(slugDeMarca("Hugging Face"), "huggingface");
});

test("buscarIcono encuentra por nombre, por alias y por --slug", () => {
  assert.equal(buscarIcono(DATOS, { marca: "github" }).icono.slug, "github");
  assert.equal(buscarIcono(DATOS, { marca: "Twitter" }).icono.slug, "x");
  assert.equal(buscarIcono(DATOS, { marca: "lo que sea", slug: "googlegemini" }).icono.title, "Google Gemini");
  assert.equal(buscarIcono(DATOS, { marca: "Canva" }), null);
  assert.equal(buscarIcono(DATOS, { marca: "Canva", slug: "canva" }), null);
});

test("con dos íconos del mismo nombre elige el del slug de la regla y nombra el otro", () => {
  const r = buscarIcono(DATOS, { marca: "Spring" });
  assert.equal(r.icono.slug, "spring");
  assert.deepEqual(r.otros.map((i) => i.slug), ["spring_creators"]);
});

test("sugerencias propone nombres parecidos y los nombres viejos", () => {
  assert.ok(sugerencias(DATOS, "Gemini").some((s) => s.slug === "googlegemini"));
  assert.ok(sugerencias(DATOS, "Google Bard").some((s) => s.slug === "googlegemini"));
  assert.deepEqual(sugerencias(DATOS, "Canva"), []);
});

test("svgBlanco pinta de blanco el SVG entero sin tocar el dibujo", () => {
  const blanco = svgBlanco(SVG);
  assert.match(blanco, /^<svg [^>]*fill="#FFFFFF"/);
  assert.ok(blanco.includes('<path d="M12 .3a12 12 0 0 0-3.8 23.4"/>'));
  assert.equal((svgBlanco('<svg fill="#000" viewBox="0 0 24 24"><path d="M0 0"/></svg>').match(/fill=/g) ?? []).length, 1);
});

// ---------------------------------------------------------------- bajar

test("baja el SVG a public/logos/<slug>.svg y lo anota en el catálogo", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa();
  const r = await conseguirLogo({ marca: "GitHub", raiz, fetch: cdn.fetch, fecha: FECHA });
  assert.equal(r.estado, "bajado");
  assert.equal(readFileSync(join(logos(raiz), "github.svg"), "utf8"), SVG);
  // Los datos primero, y el ícono de esa misma versión.
  assert.deepEqual(cdn.pedidos, [
    "https://cdn.jsdelivr.net/npm/simple-icons@latest/data/simple-icons.json",
    "https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/github.svg",
  ]);
  assert.deepEqual(catalogo(raiz).logos, [
    {
      slug: "github",
      nombre: "GitHub",
      archivo: "github.svg",
      fuente: "https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/github.svg",
      licencia: "CC0 1.0 (Simple Icons)",
      color: "#181717",
      fecha: FECHA,
    },
  ]);
});

test("lo que ya está en el catálogo no se vuelve a bajar", async () => {
  const raiz = raizDePrueba();
  await conseguirLogo({ marca: "GitHub", raiz, fetch: cdnFalsa().fetch, fecha: FECHA });
  const r = await conseguirLogo({ marca: "github", raiz, fetch: sinRed, fecha: "2026-10-01" });
  assert.equal(r.estado, "ya-estaba");
  assert.equal(catalogo(raiz).logos.length, 1);
  assert.equal(catalogo(raiz).logos[0].fecha, FECHA);
});

test("un logo nuevo se suma al catálogo sin pisar los otros", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa({ iconos: { github: SVG, x: SVG.replace("GitHub", "X") } });
  await conseguirLogo({ marca: "GitHub", raiz, fetch: cdn.fetch, fecha: FECHA });
  await conseguirLogo({ marca: "Twitter", raiz, fetch: cdn.fetch, fecha: FECHA });
  assert.deepEqual(catalogo(raiz).logos.map((l) => [l.slug, l.nombre]), [["github", "GitHub"], ["x", "X"]]);
});

test("--blanco guarda además la versión blanca, y la arma sin red si el logo ya estaba", async () => {
  const raiz = raizDePrueba();
  const r = await conseguirLogo({ marca: "GitHub", blanco: true, raiz, fetch: cdnFalsa().fetch, fecha: FECHA });
  assert.match(readFileSync(join(logos(raiz), "github-blanco.svg"), "utf8"), /fill="#FFFFFF"/);
  assert.equal(r.entrada.blanco, "github-blanco.svg");

  const otra = raizDePrueba();
  await conseguirLogo({ marca: "GitHub", raiz: otra, fetch: cdnFalsa().fetch, fecha: FECHA });
  const r2 = await conseguirLogo({ marca: "GitHub", blanco: true, raiz: otra, fetch: sinRed, fecha: FECHA });
  assert.equal(r2.estado, "ya-estaba");
  assert.ok(existsSync(join(logos(otra), "github-blanco.svg")));
  assert.equal(catalogo(otra).logos[0].blanco, "github-blanco.svg");
});

test("si Simple Icons no tiene la marca no guarda nada y explica cómo conseguir el oficial", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa();
  const r = await conseguirLogo({ marca: "Canva", raiz, fetch: cdn.fetch, fecha: FECHA });
  assert.equal(r.estado, "no-esta");
  assert.equal(cdn.pedidos.length, 1, "con los datos alcanza: no se pide el ícono");
  assert.equal(existsSync(join(logos(raiz), "canva.svg")), false);
  const texto = explicarQueFalta(r);
  assert.match(texto, /Simple Icons no tiene "Canva"/);
  assert.match(texto, /kit de prensa/);
  assert.match(texto, /--importar/);
  assert.match(texto, /no se dibuja/i);
});

test("si no está, sugiere el nombre que Simple Icons sí tiene", async () => {
  const r = await conseguirLogo({ marca: "Gemini", raiz: raizDePrueba(), fetch: cdnFalsa().fetch, fecha: FECHA });
  assert.equal(r.estado, "no-esta");
  assert.match(explicarQueFalta(r), /Google Gemini.*--slug googlegemini/);
});

test("sin los datos de Simple Icons igual baja con el slug de la regla, sin color", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa({ datosCaidos: true });
  const r = await conseguirLogo({ marca: "GitHub", raiz, fetch: cdn.fetch, fecha: FECHA });
  assert.equal(r.estado, "bajado");
  assert.equal(cdn.pedidos[1], "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/github.svg");
  assert.equal(r.entrada.color, null);
  assert.match(r.entrada.licencia, /sin verificar/);
  assert.ok(r.avisos.some((a) => /datos de Simple Icons/.test(a)));
});

test("sin los datos y con un 404, dice que no está", async () => {
  const r = await conseguirLogo({ marca: "Canva", raiz: raizDePrueba(), fetch: cdnFalsa({ datosCaidos: true }).fetch, fecha: FECHA });
  assert.equal(r.estado, "no-esta");
  assert.equal(r.slug, "canva");
});

test("un ícono con licencia propia la anota y avisa", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa({ iconos: { marcaconlicencia: SVG } });
  const r = await conseguirLogo({ marca: "Marca con licencia", raiz, fetch: cdn.fetch, fecha: FECHA });
  assert.equal(r.entrada.licencia, "CC-BY-4.0 (según Simple Icons)");
  assert.equal(r.entrada.licenciaUrl, "https://creativecommons.org/licenses/by/4.0/");
  assert.equal(r.entrada.pautas, "https://ejemplo.com/pautas");
  assert.ok(r.avisos.some((a) => /CC-BY-4\.0/.test(a)));
});

test("una respuesta que no es un SVG no se guarda", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa({ iconos: { github: "<html><body>error</body></html>" } });
  await assert.rejects(conseguirLogo({ marca: "GitHub", raiz, fetch: cdn.fetch, fecha: FECHA }), /no es un SVG/);
  assert.equal(existsSync(join(logos(raiz), "github.svg")), false);
});

test("un corte de red al bajar el ícono se explica y no deja nada", async () => {
  const raiz = raizDePrueba();
  const cdn = cdnFalsa();
  const fetch = async (url) => {
    if (String(url).includes("/icons/")) throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNRESET" } });
    return cdn.fetch(url);
  };
  await assert.rejects(conseguirLogo({ marca: "GitHub", raiz, fetch, fecha: FECHA }), /conexión/);
  assert.equal(existsSync(join(logos(raiz), "github.svg")), false);
});

test("no pisa un archivo que alguien puso a mano", async () => {
  const raiz = raizDePrueba();
  mkdirSync(logos(raiz), { recursive: true });
  writeFileSync(join(logos(raiz), "github.svg"), "<svg>el mío</svg>");
  const r = await conseguirLogo({ marca: "GitHub", raiz, fetch: cdnFalsa().fetch, fecha: FECHA });
  assert.equal(r.estado, "ya-estaba");
  assert.equal(readFileSync(join(logos(raiz), "github.svg"), "utf8"), "<svg>el mío</svg>");
  assert.ok(r.avisos.some((a) => /no está en el catálogo/.test(a)));
});

test("rechaza un --slug que no es de Simple Icons", async () => {
  await assert.rejects(conseguirLogo({ marca: "X", slug: "../fuera", raiz: raizDePrueba(), fetch: sinRed }), /slug/);
});

// ---------------------------------------------------------------- importar el oficial

test("importarLogo copia el archivo oficial a <slug>-oficial.<ext> y lo anota con su fuente", () => {
  const raiz = raizDePrueba();
  const archivo = join(raiz, "bajado.png");
  writeFileSync(archivo, "png de mentira");
  const r = importarLogo({ marca: "Canva", archivo, fuente: "https://www.canva.com/newsroom/", raiz, fecha: FECHA });
  assert.equal(r.slug, "canva");
  assert.equal(readFileSync(join(logos(raiz), "canva-oficial.png"), "utf8"), "png de mentira");
  const entrada = catalogo(raiz).logos[0];
  assert.equal(entrada.archivo, "canva-oficial.png");
  assert.equal(entrada.fuente, "https://www.canva.com/newsroom/");
  assert.match(entrada.licencia, /kit de prensa/);
});

test("importarLogo pide la fuente y un .svg o .png, y no pisa nada", () => {
  const raiz = raizDePrueba();
  const png = join(raiz, "logo.png");
  const jpg = join(raiz, "logo.jpg");
  writeFileSync(png, "png");
  writeFileSync(jpg, "jpg");
  assert.throws(() => importarLogo({ marca: "Canva", archivo: png, raiz, fecha: FECHA }), /--fuente/);
  assert.throws(() => importarLogo({ marca: "Canva", archivo: jpg, fuente: "https://canva.com", raiz, fecha: FECHA }), /\.svg o \.png/);
  importarLogo({ marca: "Canva", archivo: png, fuente: "https://canva.com", raiz, fecha: FECHA });
  assert.throws(() => importarLogo({ marca: "Canva", archivo: png, fuente: "https://canva.com", raiz, fecha: FECHA }), /Ya hay/);
});

// ---------------------------------------------------------------- línea de comandos

const correr = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });

test("la ayuda dice que el permiso lo pide la conversación, según las preferencias", () => {
  const r = correr("--ayuda");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /permiso/i);
  assert.match(r.stdout, /memory\/preferencias\.md/);
  assert.match(r.stdout, /CC0/);
});

test("sin marca sale con error y explica qué falta", () => {
  const r = correr("--raiz", raizDePrueba());
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /marca/);
});

test("con el logo ya en el catálogo, la línea de comandos no sale a la red", async () => {
  const raiz = raizDePrueba();
  await conseguirLogo({ marca: "GitHub", raiz, fetch: cdnFalsa().fetch, fecha: FECHA });
  const r = correr("GitHub", "--raiz", raiz);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /ya está/);
  assert.match(r.stdout, /logo: "github"/);
  assert.deepEqual(readdirSync(logos(raiz)).sort(), ["catalogo.json", "github.svg"]);
});
