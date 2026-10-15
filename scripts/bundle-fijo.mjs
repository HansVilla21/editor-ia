/**
 * Un bundle fijo por entrada de Remotion, en build/<entrada>/.
 *
 * Por qué existe: cada `npx remotion render <entrada>` (y cada bundle() sin carpeta fija) arma un bundle nuevo en la
 * carpeta temporal del sistema, con una copia entera de public/. Si el proceso se corta, esa carpeta queda para siempre,
 * y bundle() sin carpeta fija no la borra nunca. En una máquina de trabajo se juntaron cientos de carpetas y decenas de
 * GB, y se llenó el disco del sistema.
 *
 * Qué hace:
 * - un solo bundle por entrada, fuera de la carpeta temporal, que usan todos los renders, las portadas y las previas;
 * - se rehace solo cuando algún archivo de src/, public/ o la configuración es más nuevo que el bundle, y dice cuál
 *   (no hay que acordarse de rehacerlo);
 * - se arma al lado (build/<entrada>.nuevo-<pid>) y recién después reemplaza al anterior: nunca hay dos por entrada, y si
 *   el armado falla queda el bundle viejo;
 * - en cada corrida borra los bundles que llevan 7 días sin usarse y los que quedaron a medio armar;
 * - solo toca carpetas con su sello (.bundle-fijo.json). Nunca borra las remotion-* de la carpeta temporal: puede haber
 *   otro render usándolas.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SELLO = ".bundle-fijo.json"; // { entrada, creado, usado }; creado = cuándo EMPEZÓ el armado
const DIA = 24 * 60 * 60 * 1000;
const HORA = 60 * 60 * 1000;
// Lo que entra en un bundle: el código (cualquier archivo de src/ puede ser compartido), public/ entero y la configuración.
const FUENTES = ["src", "public", "remotion.config.ts", "package.json", "tsconfig.json"];

const leerSello = (dir) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, SELLO), "utf8"));
  } catch {
    return null;
  }
};

const carpetaBuild = (raiz) => path.join(raiz, "build");

/**
 * El cambio más nuevo dentro de las fuentes. Mira archivos y carpetas: borrar o renombrar algo cambia la fecha de su
 * carpeta, y eso también deja viejo al bundle (que tiene una copia de public/).
 */
export function ultimoCambio(raiz = RAIZ) {
  let max = 0;
  let cual = "";
  const ver = (p) => {
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      return;
    }
    if (st.mtimeMs > max) {
      max = st.mtimeMs;
      cual = p;
    }
    if (st.isDirectory()) for (const nombre of fs.readdirSync(p)) ver(path.join(p, nombre));
  };
  for (const f of FUENTES) ver(path.join(raiz, f));
  return { max, cual: path.relative(raiz, cual) };
}

/** Borra los bundles con sello que llevan `dias` sin usarse y los armados a medias de hace más de una hora. */
export function limpiarViejos({ raiz = RAIZ, dias = 7, ahora = Date.now(), avisar = console.log } = {}) {
  const build = carpetaBuild(raiz);
  const borrados = [];
  if (!fs.existsSync(build)) return borrados;
  for (const nombre of fs.readdirSync(build)) {
    const dir = path.join(build, nombre);
    if (/\.nuevo-\d+$/.test(nombre)) {
      if (ahora - fs.statSync(dir).mtimeMs > HORA) {
        fs.rmSync(dir, { recursive: true, force: true });
        borrados.push(nombre);
      }
      continue;
    }
    const sello = leerSello(dir);
    if (!sello) continue; // no la armó este script: no se toca
    if (ahora - Math.max(sello.creado, sello.usado ?? 0) > dias * DIA) {
      fs.rmSync(dir, { recursive: true, force: true });
      borrados.push(nombre);
      avisar(`bundle: borrado build/${nombre} (${dias} días sin uso)`);
    }
  }
  return borrados;
}

/**
 * Devuelve build/<entrada>/ al día para esta entrada: lo reutiliza si nada cambió desde que se armó, o lo rehace.
 * `armar` es la función que arma el bundle (por defecto, bundle() de @remotion/bundler); las pruebas pasan otra.
 */
export async function asegurarBundle(entrada, { raiz = RAIZ, armar, avisar = console.log } = {}) {
  limpiarViejos({ raiz, avisar });
  const abs = path.resolve(entrada);
  const nombre = path.basename(abs).replace(/\.(tsx?|jsx?|mjs)$/, "");
  const build = carpetaBuild(raiz);
  const dir = path.join(build, nombre);
  const sello = leerSello(dir);
  const cambio = ultimoCambio(raiz);
  if (sello && sello.entrada === abs && fs.existsSync(path.join(dir, "index.html")) && cambio.max <= sello.creado) {
    fs.writeFileSync(path.join(dir, SELLO), JSON.stringify({ ...sello, usado: Date.now() }));
    avisar(`bundle: build/${nombre} al día`);
    return dir;
  }
  avisar(sello ? `bundle: rehaciendo build/${nombre} (cambió ${cambio.cual})` : `bundle: armando build/${nombre}`);
  const armador = armar ?? (await import("@remotion/bundler")).bundle;
  const creado = Date.now();
  const nuevo = path.join(build, `${nombre}.nuevo-${process.pid}`);
  fs.rmSync(nuevo, { recursive: true, force: true });
  try {
    await armador({ entryPoint: abs, outDir: nuevo, onProgress: () => {} });
    fs.writeFileSync(path.join(nuevo, SELLO), JSON.stringify({ entrada: abs, creado, usado: Date.now() }));
    fs.rmSync(dir, { recursive: true, force: true }); // solo el bundle anterior de esta entrada
    fs.renameSync(nuevo, dir);
  } finally {
    fs.rmSync(nuevo, { recursive: true, force: true }); // un armado que falló a la mitad no queda tirado
  }
  return dir;
}

/** Cuando el video queda aprobado: se borra su bundle (siempre se puede volver a armar). */
export function borrarBundle(nombre, { raiz = RAIZ, avisar = console.log } = {}) {
  const dir = path.join(carpetaBuild(raiz), nombre);
  if (!leerSello(dir)) {
    avisar(`bundle: no hay build/${nombre}`);
    return false;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  avisar(`bundle: borrado build/${nombre}`);
  return true;
}

/** Solo avisa (nunca las borra: puede haber un render corriendo) si quedaron bundles temporales de llamadas directas. */
export function avisarTemporales({ avisar = console.log } = {}) {
  try {
    const n = fs.readdirSync(os.tmpdir()).filter((x) => x.startsWith("remotion-webpack-bundle-")).length;
    if (n) avisar(`aviso: hay ${n} carpeta(s) remotion-webpack-bundle-* en la carpeta temporal (no son de este flujo; no se tocan)`);
  } catch {
    // sin acceso a la carpeta temporal: nada que avisar
  }
}
