#!/usr/bin/env node
/**
 * Corre cada vez que se abre el proyecto y dice lo único que conviene hacer ahora.
 * Si no hay nada pendiente, no dice nada.
 */
import { readFileSync } from "node:fs";
import { revisarEntorno } from "../../scripts/doctor.mjs";
import { siguientePaso } from "../../scripts/estado.mjs";

const leerEstado = () => {
  try {
    return JSON.parse(readFileSync(new URL("../../estado.json", import.meta.url), "utf8"));
  } catch {
    return {};
  }
};

const { default: ffmpeg } = await import("ffmpeg-static").catch(() => ({ default: null }));

const paso = siguientePaso({
  revisiones: revisarEntorno({
    env: process.env,
    versionNode: process.version,
    rutaFfmpeg: ffmpeg,
  }),
  estado: leerEstado(),
});

if (paso) console.log(paso.mensaje);
