/**
 * borrador.mjs: el borrador de Gemini sobre un video de referencia. Nada sale a la red: fetch
 * se reemplaza por un Gemini de mentira que anota cada pedido.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

import {
  armarPrompt,
  armarMarkdown,
  muestreoPara,
  rangoDeCuadros,
} from "../.claude/skills/estudiar-referentes/scripts/_borrador.mjs";
import { pedirBorrador, principal } from "../.claude/skills/estudiar-referentes/scripts/borrador.mjs";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/estudiar-referentes/scripts/borrador.mjs", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "borrador-"));
const clip = join(carpeta, "referencia.mp4");
const ENFOQUE = "me gusta cómo aparecen los textos de a una palabra";
const FICHA = { duracion: 34.5, fps: 30, ancho: 1080, alto: 1920 };

before(() => {
  // 1 s de video con sonido: alcanza para que ffprobe tenga algo que medir.
  const r = spawnSync(ffmpegStatic, [
    "-v", "error", "-y",
    "-f", "lavfi", "-i", "color=c=gray:s=108x192:r=30:d=1",
    "-f", "lavfi", "-i", "sine=frequency=220:sample_rate=48000:duration=1",
    "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", clip,
  ]);
  assert.equal(r.status, 0, String(r.stderr));
});

// ---------------------------------------------------------------- el pedido

test("el pedido lleva, textual, lo que le gusta a la persona, y manda a priorizarlo", () => {
  const prompt = armarPrompt({ enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 });
  assert.ok(prompt.includes(`«${ENFOQUE}»`));
  assert.match(prompt, /dondeMirar/);
  assert.match(prompt, /mitad/);
});

test("el pedido le pasa la ficha medida y le prohíbe dar valores finales", () => {
  const prompt = armarPrompt({ enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 });
  assert.match(prompt, /34,5 s/);
  assert.match(prompt, /1080×1920/);
  assert.match(prompt, /hexadecimal/);
  assert.match(prompt, /tipograf/);
  assert.match(prompt, /SOLO JSON/);
});

test("sin enfoque no hay pedido: el error lo dice en castellano", () => {
  assert.throws(() => armarPrompt({ enfoque: "  ", ficha: FICHA, muestreo: 5 }), /enfoque/);
  assert.throws(() => armarPrompt({ ficha: FICHA, muestreo: 5 }), /le gusta/);
});

// ---------------------------------------------------------------- cuántos cuadros mira

test("mira 5 cuadros por segundo salvo que se pida otra cosa, entre 1 y 24", () => {
  assert.deepEqual(muestreoPara(40), { fps: 5, recortado: false });
  assert.deepEqual(muestreoPara(40, 10), { fps: 10, recortado: false });
  assert.deepEqual(muestreoPara(10, 60), { fps: 24, recortado: true });
  assert.deepEqual(muestreoPara(10, 0.2), { fps: 1, recortado: true });
});

test("en un video largo baja el muestreo para no pasar de 600 cuadros", () => {
  assert.deepEqual(muestreoPara(300), { fps: 2, recortado: true });
  assert.deepEqual(muestreoPara(90, 8), { fps: 6, recortado: true });
  assert.deepEqual(muestreoPara(1200), { fps: 1, recortado: true });
});

// ---------------------------------------------------------------- dónde mirar

test("cada segundo se vuelve una tira de 24 cuadros consecutivos a los fps reales", () => {
  assert.deepEqual(rangoDeCuadros(3.2, 30), { desde: 88, hasta: 111 });
  assert.deepEqual(rangoDeCuadros(3.2, 60), { desde: 184, hasta: 207 });
  assert.deepEqual(rangoDeCuadros(0.1, 30), { desde: 0, hasta: 23 });
  assert.deepEqual(rangoDeCuadros(3.2, 30, 100), { desde: 76, hasta: 99 });
  assert.equal(rangoDeCuadros("no sé", 30), null);
});

// ---------------------------------------------------------------- el markdown

const DATOS = {
  tema: "cómo automatizar una planilla",
  enfoque: { queLoProduce: "cada palabra entra con un desenfoque corto", dondeSeVe: [{ t: 2, que: "la primera palabra" }] },
  gancho: { hasta: 2.5, tecnica: "resultado primero", dice: "Esto lo hizo una IA", porQueFunciona: "muestra el final" },
  estructura: [{ desde: 0, hasta: 2.5, funcion: "gancho", resumen: "muestra el resultado | antes de explicar" }],
  cortes: [{ t: 1.2, tipo: "corte seco" }, { t: 3.4, tipo: "zoom" }],
  transiciones: [{ t: 3.4, tipo: "zoom rápido", duracionAprox: 0.3, detalle: "acerca la cara" }],
  textoEnPantalla: [{ desde: 0, hasta: 2.5, rol: "titular", estilo: "blanca gruesa", animacion: "entra de abajo" }],
  graficos: [
    { desde: 5, hasta: 8, descripcion: "contador", comoParece: "codigo", pista: "números nítidos" },
    { desde: 9, hasta: 12, descripcion: "página web", comoParece: "captura", pista: "barra del navegador" },
    { desde: 13, hasta: 14, descripcion: "logo que se derrite", comoParece: "ia-3d-archivo", pista: "reflejos" },
  ],
  ritmo: { cambiosVisuales: 14, segundosPorPlano: 2.4, comentario: "rápido al principio" },
  sonido: { musica: "suave, sin voz", voz: "limpia", efectos: [{ t: 3.4, descripcion: "whoosh" }] },
  dondeMirar: [{ t: 3.2, que: "la entrada de la segunda palabra", porQue: "es lo que le gusta" }],
  dudas: "no estoy seguro del segundo 3",
};

const md = (datos = DATOS) =>
  armarMarkdown({
    video: "referencias/referencia.mp4",
    enfoque: ENFOQUE,
    ficha: FICHA,
    modelo: "gemini-pro-latest",
    muestreo: 5,
    fecha: "2026-09-23",
    datos,
  });

test("el markdown arranca marcado como BORRADOR sin verificar, con la regla del proyecto", () => {
  const texto = md();
  assert.match(texto.split("\n")[0], /^# BORRADOR sin verificar/);
  assert.match(texto, /Gemini propone, los cuadros deciden/);
  assert.ok(texto.includes(`«${ENFOQUE}»`));
  assert.match(texto, /gemini-pro-latest/);
  assert.match(texto, /2026-09-23/);
});

test("lo medido con ffprobe se separa de lo que dice el modelo", () => {
  assert.match(md(), /Medido con ffprobe:\*\* 34,5 s · 30 cuadros\/s · 1080×1920/);
});

test("cada punto dice qué mirar, en qué segundo aproximado y con qué cuadros verificarlo", () => {
  const texto = md();
  assert.match(texto, /## Qué mirar y en qué segundo/);
  assert.match(texto, /≈ 3,2 s\*\* \(cuadros 88–111\) — la entrada de la segunda palabra/);
  assert.match(texto, /## Cómo verificar/);
  assert.match(texto, /between\(n\\,<desde>\\,<hasta>\)/);
  assert.ok(texto.includes('"referencias/referencia.mp4"'));
});

test("los tiempos del modelo nunca salen como un valor final: siempre aproximados", () => {
  const texto = md();
  const cifrasSueltas = texto
    .split("\n")
    .filter((l) => /\d,\d s/.test(l) && !l.includes("Medido con ffprobe"))
    .filter((l) => !/≈ \d/.test(l));
  assert.deepEqual(cifrasSueltas, []);
});

test("los gráficos llevan su letra de fabricación, a confirmar", () => {
  const texto = md();
  assert.match(texto, /A · código \(a confirmar\)/);
  assert.match(texto, /B · captura \(a confirmar\)/);
  assert.match(texto, /C · IA, 3D o archivo \(a confirmar\)/);
});

test("si el modelo ya cerró la frase con punto, no queda un punto doble", () => {
  const texto = md({ dondeMirar: [{ t: 1, que: "Mirar la entrada.", porQue: "Es lo que le gusta." }] });
  assert.match(texto, /— Mirar la entrada\. Es lo que le gusta\.?$/m);
  assert.doesNotMatch(texto, /\w\.\./);
});

test("la letra de fabricación se deduce aunque el modelo no use las palabras pedidas", () => {
  const graficos = [
    { descripcion: "uno", comoParece: "Animación de código (HTML)" },
    { descripcion: "dos", comoParece: "grabación de pantalla" },
    { descripcion: "tres", comoParece: "render 3D" },
    { descripcion: "cuatro", comoParece: "vaya uno a saber" },
  ];
  const texto = md({ graficos });
  assert.match(texto, /uno \| A · código/);
  assert.match(texto, /dos \| B · captura/);
  assert.match(texto, /tres \| C · IA, 3D o archivo/);
  assert.match(texto, /cuatro \| sin letra: «vaya uno a saber»/);
});

test("una barra en lo que dijo el modelo no rompe las tablas", () => {
  assert.match(md(), /muestra el resultado \\\| antes de explicar/);
});

test("si el modelo devolvió poco o nada, el markdown sale igual y lo dice", () => {
  for (const datos of [null, {}, { dondeMirar: "no es una lista", estructura: [null] }]) {
    const texto = md(datos);
    assert.match(texto.split("\n")[0], /^# BORRADOR sin verificar/);
    assert.match(texto, /El modelo no marcó puntos/);
  }
});

// ---------------------------------------------------------------- Gemini de mentira

const LA_CLAVE = "clave-de-prueba-123";

/** Sube, pregunta y borra, como el Gemini de verdad. `caido` hace fallar todas las consultas. */
async function conGeminiFalso({ caido = false } = {}, cuerpo) {
  const pedidos = [];
  const antes = { fetch: globalThis.fetch, log: console.log, clave: process.env.GEMINI_API_KEY };
  process.env.GEMINI_API_KEY = LA_CLAVE;
  globalThis.fetch = async (url, opciones = {}) => {
    const u = String(url);
    pedidos.push({ url: u, metodo: opciones.method ?? "GET", encabezados: opciones.headers ?? {}, cuerpo: opciones.body });
    if (u.endsWith("/upload/v1beta/files")) {
      return new Response("{}", { status: 200, headers: { "x-goog-upload-url": "https://subida.falsa/1" } });
    }
    if (u === "https://subida.falsa/1") {
      const file = { name: "files/abc", uri: "https://archivos.falsos/files/abc", mimeType: "video/mp4", state: "ACTIVE" };
      return new Response(JSON.stringify({ file }), { status: 200 });
    }
    if (u.includes(":generateContent")) {
      if (caido) return new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 });
      const text = JSON.stringify(DATOS);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
    }
    if ((opciones.method ?? "GET") === "DELETE") return new Response("{}", { status: 200 });
    return new Response("{}", { status: 404 });
  };
  console.log = () => {};
  try {
    let resultado;
    let error;
    try {
      resultado = await cuerpo();
    } catch (e) {
      error = e;
    }
    return { resultado, error, pedidos };
  } finally {
    globalThis.fetch = antes.fetch;
    console.log = antes.log;
    if (antes.clave === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = antes.clave;
  }
}

const consultas = (pedidos) => pedidos.filter((p) => p.url.includes(":generateContent"));

test("el pedido que llega a Gemini lleva el video, el muestreo y el enfoque de la persona", async () => {
  const { resultado, error, pedidos } = await conGeminiFalso({}, () =>
    pedirBorrador({ video: clip, enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 }),
  );
  assert.equal(error, undefined);
  assert.equal(resultado.modelo, "gemini-pro-latest");
  assert.equal(resultado.datos.tema, DATOS.tema);

  const partes = JSON.parse(consultas(pedidos)[0].cuerpo).contents[0].parts;
  const video = partes.find((p) => p.file_data);
  assert.equal(video.file_data.file_uri, "https://archivos.falsos/files/abc");
  assert.equal(video.video_metadata.fps, 5);
  assert.ok(partes.some((p) => (p.text ?? "").includes(ENFOQUE)));
});

test("la clave va solo en el encabezado, y el video se borra de Gemini al terminar", async () => {
  const { pedidos } = await conGeminiFalso({}, () =>
    pedirBorrador({ video: clip, enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 }),
  );
  for (const p of pedidos) assert.ok(!p.url.includes(LA_CLAVE), "la clave no puede ir en la URL");
  assert.equal(consultas(pedidos)[0].encabezados["x-goog-api-key"], LA_CLAVE);
  assert.ok(pedidos.some((p) => p.metodo === "DELETE" && p.url.endsWith("/v1beta/files/abc")));
});

test("si Gemini no contesta, el error sube y el video igual se borra", async () => {
  const { error, pedidos } = await conGeminiFalso({ caido: true }, () =>
    pedirBorrador({ video: clip, enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 }),
  );
  assert.match(String(error?.message), /Gemini respondió 400/);
  assert.ok(pedidos.some((p) => p.metodo === "DELETE"));
});

test("de punta a punta: mide el video, pregunta y escribe el borrador en una carpeta nueva", async () => {
  const salida = join(carpeta, "estudio", "referencia", "borrador.md");
  const { error } = await conGeminiFalso({}, () => principal([clip, salida, "--enfoque", ENFOQUE]));
  assert.equal(error, undefined);
  const texto = readFileSync(salida, "utf8");
  assert.match(texto.split("\n")[0], /^# BORRADOR sin verificar/);
  assert.match(texto, /Medido con ffprobe:\*\* 1,0 s · 30 cuadros\/s · 108×192/);
  assert.ok(texto.includes(ENFOQUE));
});

// ---------------------------------------------------------------- la línea de comandos

/** Sin clave en el entorno y en una carpeta sin .env: así llega alguien que todavía no la sacó. */
const sinClave = (args) => {
  const entorno = { ...process.env };
  delete entorno.GEMINI_API_KEY;
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", cwd: carpeta, env: entorno });
};

test("sin la clave de Gemini, un error limpio en castellano que dice dónde sacarla", () => {
  const salida = join(carpeta, "sin-clave.md");
  const r = sinClave([clip, salida, "--enfoque", ENFOQUE]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Falta la clave de Gemini/);
  assert.match(r.stderr, /aistudio\.google\.com/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, "sin traza de Node");
  assert.equal(existsSync(salida), false);
});

test("sin --enfoque no arranca, y explica por qué hace falta", () => {
  const r = sinClave([clip, join(carpeta, "x.md")]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--enfoque/);
  assert.match(r.stderr, /le gusta/);
});

test("un video que no existe se dice con su nombre, antes de pedir la clave", () => {
  const r = sinClave([join(carpeta, "no-existe.mp4"), join(carpeta, "x.md"), "--enfoque", ENFOQUE]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /No encuentro/);
  assert.match(r.stderr, /no-existe\.mp4/);
});

test("--ayuda explica el uso en castellano", () => {
  const r = sinClave(["--ayuda"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /borrador\.mjs <video> <salida\.md> --enfoque/);
  assert.match(r.stdout, /BORRADOR/);
});

test("el borrador no pisa un archivo que ya existe con otra cosa adentro", () => {
  const salida = join(carpeta, "informe.md");
  writeFileSync(salida, "# Informe de verdad\n", "utf8");
  const r = sinClave([clip, salida, "--enfoque", ENFOQUE]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ya existe/);
  assert.equal(readFileSync(salida, "utf8"), "# Informe de verdad\n");
});
