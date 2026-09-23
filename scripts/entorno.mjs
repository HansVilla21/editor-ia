/**
 * El entorno del proyecto: las variables de la máquina más las del archivo .env de la raíz.
 *
 * No importa nada de node_modules, para que el diagnóstico y el instalador de Whisper lo puedan
 * usar aunque todavía no se haya corrido `npm install`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as util from "node:util";
import { fileURLToPath } from "node:url";

export const RAIZ = fileURLToPath(new URL("..", import.meta.url));

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
