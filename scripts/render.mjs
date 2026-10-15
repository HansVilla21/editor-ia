/**
 * La única forma de renderizar en este proyecto: siempre por el bundle fijo de build/<entrada>/ (bundle-fijo.mjs), que
 * se rehace solo cuando algo cambió. Llamar `npx remotion render <entrada>` directo arma una copia nueva de public/ en la
 * carpeta temporal en cada llamada, y si el proceso se corta, queda ahí.
 *
 *   node scripts/render.mjs render <entrada.tsx> <Id> <salida.mp4> [opciones de remotion render]
 *   node scripts/render.mjs still  <entrada.tsx> <Id> <salida.png> [opciones de remotion still]
 *   node scripts/render.mjs bundle <entrada.tsx>      solo armar o poner al día el bundle
 *   node scripts/render.mjs borrar <entrada>           cuando el video queda aprobado
 *
 * Las opciones pasan tal cual a Remotion, sin consola de por medio (así --props '{"a":1}' llega como se escribió).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { asegurarBundle, avisarTemporales, borrarBundle, RAIZ } from "./bundle-fijo.mjs";

const [modo, entrada, ...resto] = process.argv.slice(2);
const MODOS = ["render", "still", "bundle", "borrar"];
if (!MODOS.includes(modo) || !entrada) {
  console.log("uso: node scripts/render.mjs render|still <entrada.tsx> <Id> <salida> [opciones] · bundle <entrada.tsx> · borrar <entrada>");
  process.exit(1);
}
if (modo === "borrar") {
  borrarBundle(entrada);
  process.exit(0);
}
const dir = await asegurarBundle(entrada);
avisarTemporales();
if (modo === "bundle") process.exit(0);

const cli = path.join(RAIZ, "node_modules/@remotion/cli/remotion-cli.js");
const r = spawnSync(process.execPath, [cli, modo, path.relative(process.cwd(), dir), ...resto], { stdio: "inherit" });
avisarTemporales();
process.exit(r.status ?? 1);
