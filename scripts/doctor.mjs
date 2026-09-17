import { pathToFileURL } from "node:url";

/**
 * Revisa qué le falta a esta máquina para que el editor funcione.
 *
 * Es una función pura: recibe el estado y devuelve el diagnóstico. Así se puede
 * probar sin depender de la máquina donde corre.
 */
export function revisarEntorno({ env, versionNode, rutaFfmpeg }) {
  const mayorDeNode = Number(String(versionNode).replace(/^v/, "").split(".")[0]);

  return [
    {
      nombre: "node",
      ok: Number.isFinite(mayorDeNode) && mayorDeNode >= 20,
      comoResolver: "Instalá Node 20 o superior desde https://nodejs.org",
    },
    {
      nombre: "ffmpeg",
      ok: Boolean(rutaFfmpeg),
      comoResolver: "Corré npm install en la carpeta del proyecto",
    },
    {
      nombre: "clave-gemini",
      ok: Boolean(env.GEMINI_API_KEY),
      comoResolver:
        "Sacá una clave gratis en https://aistudio.google.com/apikey y pegala en el archivo .env",
    },
  ];
}

// Cuando se corre directo (npm run doctor), lee la máquina de verdad e imprime el resultado.
// pathToFileURL es lo que hace que esta comparación funcione igual en Windows y en Mac.
const corridoDirecto =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (corridoDirecto) {
  const { default: ffmpeg } = await import("ffmpeg-static").catch(() => ({ default: null }));

  const revisiones = revisarEntorno({
    env: process.env,
    versionNode: process.version,
    rutaFfmpeg: ffmpeg,
  });

  for (const r of revisiones) {
    console.log(`${r.ok ? "OK    " : "FALTA "} ${r.nombre}`);
    if (!r.ok) console.log(`        ${r.comoResolver}`);
  }

  process.exit(revisiones.every((r) => r.ok) ? 0 : 1);
}
