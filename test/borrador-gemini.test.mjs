/**
 * borrador.mjs contra un Gemini de mentira, y su línea de comandos. Nada sale a la red: fetch se
 * reemplaza por uno que sube, contesta y borra como el de verdad, y anota cada pedido.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

import { pedirBorrador, principal } from "../.claude/skills/estudiar-referentes/scripts/borrador.mjs";

const SCRIPT = fileURLToPath(new URL("../.claude/skills/estudiar-referentes/scripts/borrador.mjs", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "borrador-"));
const clip = join(carpeta, "referencia.mp4");
const ENFOQUE = "me gusta cómo aparecen los textos de a una palabra";
const FICHA = { duracion: 34.5, fps: 30, ancho: 1080, alto: 1920 };
const DATOS = { tema: "cómo automatizar una planilla", dondeMirar: [{ t: 0.5, que: "el titular", porQue: "entra de abajo" }] };

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
