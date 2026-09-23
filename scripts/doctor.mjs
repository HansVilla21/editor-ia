import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as util from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { whisperInstalado } from "./whisper.mjs";

export const RAIZ = fileURLToPath(new URL("..", import.meta.url));

// El Chrome con el que renderiza Remotion vive unos 106 caracteres más adentro del proyecto.
// Windows no abre rutas de más de 260: con el proyecto por encima de ~150, el render falla
// con un "ENOENT" que no explica nada.
const RUTA_MAXIMA_WINDOWS = 150;

/**
 * Revisa qué le falta a esta máquina para que el editor funcione.
 *
 * Es una función pura: recibe el estado y devuelve el diagnóstico. Así se puede
 * probar sin depender de la máquina donde corre.
 */
export function revisarEntorno({ env, versionNode, rutaFfmpeg, whisperListo, plataforma, rutaProyecto }) {
  const [mayor, menor] = String(versionNode).replace(/^v/, "").split(".").map(Number);
  // 20.12 es la primera que sabe leer el archivo .env por su cuenta.
  const nodeSirve = Number.isFinite(mayor) && (mayor > 20 || (mayor === 20 && menor >= 12));

  return [
    {
      nombre: "node",
      ok: nodeSirve,
      comoResolver: "Instalá la versión LTS de Node (20.12 o más nueva) desde https://nodejs.org",
    },
    {
      nombre: "ruta-del-proyecto",
      ok: plataforma !== "win32" || String(rutaProyecto ?? "").length <= RUTA_MAXIMA_WINDOWS,
      comoResolver:
        "La carpeta del proyecto está demasiado adentro y Windows no maneja rutas tan largas: el render falla. " +
        "Mové la carpeta a una ruta corta, por ejemplo C:\\editor-ia, y abrí Claude Code ahí.",
    },
    {
      nombre: "ffmpeg",
      ok: Boolean(rutaFfmpeg),
      comoResolver: "Corré npm install en la carpeta del proyecto",
    },
    {
      nombre: "whisper",
      ok: Boolean(whisperListo),
      comoResolver:
        "Corré npm run whisper: baja el programa y el modelo que saca las palabras (unos 490 MB, una sola vez, dentro del proyecto)",
    },
    {
      nombre: "clave-gemini",
      ok: Boolean(env.GEMINI_API_KEY),
      comoResolver:
        "Sacá una clave gratis en https://aistudio.google.com/apikey y pegala en el archivo .env",
    },
  ];
}

/**
 * El entorno con lo que haya en el archivo .env de la carpeta. Lo que ya estaba en el
 * entorno gana, igual que cuando Node carga el archivo solo.
 */
export function leerEntorno(carpeta = RAIZ, base = process.env) {
  const archivo = join(carpeta, ".env");
  // Con un Node anterior a 20.12 no hay parseEnv: el diagnóstico de Node ya avisa de eso.
  if (!existsSync(archivo) || !util.parseEnv) return { ...base };
  return { ...util.parseEnv(readFileSync(archivo, "utf8")), ...base };
}

/** Junta los datos reales de esta máquina y los revisa. */
export async function revisarMaquina() {
  const { default: ffmpeg } = await import("ffmpeg-static").catch(() => ({ default: null }));
  return revisarEntorno({
    env: leerEntorno(),
    versionNode: process.version,
    rutaFfmpeg: ffmpeg,
    whisperListo: whisperInstalado(),
    plataforma: process.platform,
    rutaProyecto: RAIZ,
  });
}

// Cuando se corre directo (npm run doctor), lee la máquina de verdad e imprime el resultado.
// pathToFileURL es lo que hace que esta comparación funcione igual en Windows y en Mac.
const corridoDirecto =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (corridoDirecto) {
  const revisiones = await revisarMaquina();

  for (const r of revisiones) {
    console.log(`${r.ok ? "OK    " : "FALTA "} ${r.nombre}`);
    if (!r.ok) console.log(`        ${r.comoResolver}`);
  }

  process.exit(revisiones.every((r) => r.ok) ? 0 : 1);
}
