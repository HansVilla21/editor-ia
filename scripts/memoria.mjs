/**
 * La memoria de cada persona: sus preferencias, sus reglas y la historia de sus videos.
 *
 * En el repo viajan solo las plantillas (`memory/plantillas/`). La primera vez se copian a
 * `memory/`, y desde ahí lo que la persona responde es suyo: no aparece en git ni choca con una
 * actualización del proyecto. Nunca se pisa un archivo que ya existe.
 *
 * Lo corre solo el aviso al abrir el proyecto; también se puede correr a mano:
 *   node scripts/memoria.mjs
 */
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

export function asegurarMemoria(raiz = RAIZ) {
  const plantillas = join(raiz, "memory", "plantillas");
  if (!existsSync(plantillas)) return [];
  const creados = [];
  for (const nombre of readdirSync(plantillas).filter((n) => n.endsWith(".md"))) {
    const destino = join(raiz, "memory", nombre);
    if (existsSync(destino)) continue;
    copyFileSync(join(plantillas, nombre), destino);
    creados.push(nombre);
  }
  return creados;
}

const corridoDirecto = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (corridoDirecto) {
  const creados = asegurarMemoria();
  console.log(creados.length ? `Listo: memory/${creados.join(", memory/")}` : "La memoria ya estaba armada.");
}
