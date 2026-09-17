/**
 * Cliente mínimo de Gemini sobre la API REST, con fetch de Node.
 *
 * No hay SDK: el proyecto no suma dependencias. La clave se lee de GEMINI_API_KEY
 * —del entorno o del archivo .env— y viaja en el encabezado, nunca en la URL ni en pantalla.
 */
import { readFileSync, statSync } from "node:fs";
import { basename, extname } from "node:path";

import { morir } from "./_comun.mjs";

const BASE = "https://generativelanguage.googleapis.com";
export const MODELOS = ["gemini-2.5-pro", "gemini-2.5-flash"];

const AYUDA_CLAVE = [
  "Falta la clave de Gemini.",
  "",
  "Se saca gratis en https://aistudio.google.com/apikey",
  "y se pega en el archivo .env de la raíz del proyecto, así:",
  "",
  "  GEMINI_API_KEY=la-clave-que-te-dieron",
  "",
  "El archivo .env no se commitea nunca: ya está en .gitignore.",
].join("\n");

let claveCache;
export function clave() {
  if (claveCache) return claveCache;
  if (!process.env.GEMINI_API_KEY && typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(".env");
    } catch {
      // Sin .env no pasa nada: puede venir del entorno.
    }
  }
  const valor = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!valor) morir(AYUDA_CLAVE);
  claveCache = valor;
  return claveCache;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** El cuerpo del error trae un JSON largo; lo único que se lee es el mensaje. */
async function motivo(resp) {
  const cuerpo = await resp.text().catch(() => "");
  try {
    return JSON.parse(cuerpo).error?.message ?? cuerpo.slice(0, 200);
  } catch {
    return cuerpo.slice(0, 200);
  }
}

/** Reintenta ante 429 y 503, que es lo que devuelve la cuota gratuita cuando está ocupada. */
async function pedir(url, opciones, { intentos = 5 } = {}) {
  let espera = 4000;
  for (let i = 1; i <= intentos; i++) {
    const resp = await fetch(url, opciones);
    if (resp.ok) return resp;
    if ((resp.status === 429 || resp.status === 503) && i < intentos) {
      console.log(`  Gemini está ocupado (${resp.status}). Reintento en ${espera / 1000} s…`);
      await dormir(espera);
      espera = Math.min(espera * 2, 60000);
      continue;
    }
    const error = new Error(`Gemini respondió ${resp.status}: ${await motivo(resp)}`);
    error.estado = resp.status;
    throw error;
  }
  throw new Error("Gemini no respondió después de varios reintentos.");
}

const MIMES = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export const mimeDe = (ruta) => MIMES[extname(ruta).toLowerCase()] ?? "application/octet-stream";

/** Sube un archivo por el protocolo reanudable y espera a que quede listo para usar. */
export async function subirArchivo(ruta, mime = mimeDe(ruta)) {
  const bytes = readFileSync(ruta);
  const inicio = await pedir(`${BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": clave(),
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(statSync(ruta).size),
      "X-Goog-Upload-Header-Content-Type": mime,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: basename(ruta) } }),
  });

  const destino = inicio.headers.get("x-goog-upload-url");
  if (!destino) throw new Error("Gemini no devolvió la URL de subida.");

  const subida = await pedir(destino, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });

  let archivo = (await subida.json()).file;
  while (archivo.state === "PROCESSING") {
    await dormir(2500);
    const resp = await pedir(`${BASE}/v1beta/${archivo.name}`, {
      headers: { "x-goog-api-key": clave() },
    });
    archivo = await resp.json();
  }
  if (archivo.state === "FAILED") throw new Error(`Gemini no pudo procesar ${basename(ruta)}.`);
  return archivo;
}

export async function borrarArchivo(archivo) {
  if (!archivo?.name) return;
  await pedir(`${BASE}/v1beta/${archivo.name}`, {
    method: "DELETE",
    headers: { "x-goog-api-key": clave() },
  }).catch(() => {});
}

/**
 * Una consulta con las partes ya armadas. Si `json` es true pide la respuesta en JSON
 * y la devuelve parseada. Prueba los modelos en orden hasta que uno conteste.
 */
export async function preguntar({ partes, json = true, modelos = MODELOS }) {
  const cuerpo = {
    contents: [{ role: "user", parts: partes }],
    generationConfig: json ? { responseMimeType: "application/json" } : {},
  };

  let ultimo;
  for (const modelo of modelos) {
    try {
      const resp = await pedir(`${BASE}/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": clave(), "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await resp.json();
      const texto = (datos.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!texto) throw new Error("Gemini devolvió una respuesta vacía.");
      return { modelo, texto, datos: json ? recortarJson(texto) : null };
    } catch (e) {
      ultimo = e;
      console.log(`  ${modelo}: ${String(e.message).slice(0, 160)}`);
    }
  }
  throw ultimo ?? new Error("Ningún modelo de Gemini contestó.");
}

/** A veces envuelve el JSON en un bloque de código aunque se le pida que no. */
export function recortarJson(texto) {
  const limpio = texto.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const desde = limpio.search(/[[{]/);
    const hasta = Math.max(limpio.lastIndexOf("}"), limpio.lastIndexOf("]"));
    if (desde >= 0 && hasta > desde) return JSON.parse(limpio.slice(desde, hasta + 1));
    throw new Error("Gemini no devolvió JSON válido.");
  }
}

export const enBase64 = (ruta) => readFileSync(ruta).toString("base64");
