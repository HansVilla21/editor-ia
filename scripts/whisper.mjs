/**
 * Whisper, el que saca las palabras con sus tiempos para los subtítulos.
 *
 * Vive DENTRO del proyecto, en `.whisper/` (está en .gitignore): nada queda instalado en la
 * carpeta del usuario, y borrar el proyecto lo borra todo.
 *
 * Este archivo no importa nada de node_modules al cargarse, para que el diagnóstico pueda
 * usarlo aunque todavía no se haya corrido `npm install`.
 *
 * Correr directo (`npm run whisper`) lo instala: el programa y el modelo, una sola vez.
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { RAIZ, leerEntorno } from "./entorno.mjs";

export const CARPETA_WHISPER = fileURLToPath(new URL("../.whisper", import.meta.url));
export const MODELO_WHISPER = "small";
export const WHISPER_VERSION = "1.5.5";

/**
 * Dónde está Whisper. Quien ya tiene whisper.cpp 1.5 en otro lado (con `main` y el modelo en la
 * misma carpeta) lo indica una vez con WHISPER_DIR, en el entorno o en .env; una ruta relativa
 * se toma desde la raíz del proyecto. Si no, .whisper/ dentro del proyecto.
 */
export function carpetaWhisper(entorno = leerEntorno()) {
  const propia = String(entorno.WHISPER_DIR ?? "").trim();
  return propia ? resolve(RAIZ, propia) : CARPETA_WHISPER;
}

// El mismo paquete que baja @remotion/install-whisper-cpp para la versión 1.5.5 en Windows.
const PAQUETE_WINDOWS =
  "https://remotion-ffmpeg-binaries.s3.eu-central-1.amazonaws.com/whisper-bin-x64-1-5-5.zip";

const TAMANOS = { tiny: "unos 78 MB", base: "unos 148 MB", small: "unos 490 MB", medium: "1,5 GB", "large-v3": "3,1 GB" };

export function whisperInstalado(carpeta = carpetaWhisper(), modelo = MODELO_WHISPER) {
  if (!existsSync(carpeta)) return false;
  const archivos = readdirSync(carpeta);
  const hayPrograma = archivos.some((n) => /^(main|whisper-cli)(\.exe)?$/i.test(n));
  return hayPrograma && existsSync(join(carpeta, `ggml-${modelo}.bin`));
}

/**
 * El comando de PowerShell que descomprime el paquete en Windows.
 *
 * El instalador de Remotion lo arma sin comillas, y se rompe apenas la ruta tiene un
 * espacio ("Mis documentos", "OneDrive - Empresa"). Acá cada ruta va entre comillas
 * simples, y una comilla simple dentro de la ruta se duplica, que es como la escapa PowerShell.
 */
export function comandoDescomprimir(zip, destino) {
  const literal = (ruta) => `'${String(ruta).replace(/'/g, "''")}'`;
  return `Expand-Archive -LiteralPath ${literal(zip)} -DestinationPath ${literal(destino)} -Force`;
}

async function bajar(url, destino) {
  const respuesta = await fetch(url);
  if (!respuesta.ok || !respuesta.body) {
    throw new Error(`No pude bajar ${url} (respuesta ${respuesta.status}).`);
  }
  await pipeline(Readable.fromWeb(respuesta.body), createWriteStream(destino));
}

async function instalarPrograma(carpeta) {
  if (process.platform === "win32") {
    mkdirSync(carpeta, { recursive: true });
    const zip = join(carpeta, "whisper-bin-x64.zip");
    await bajar(PAQUETE_WINDOWS, zip);
    const r = spawnSync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", comandoDescomprimir(zip, carpeta)],
      { stdio: "inherit" },
    );
    rmSync(zip, { force: true });
    if (r.status !== 0) throw new Error("No pude descomprimir el paquete de Whisper.");
    return;
  }

  // Mac y Linux: se baja el código y se compila. Necesita git y un compilador.
  const { installWhisperCpp } = await import("@remotion/install-whisper-cpp");
  if (existsSync(carpeta) && readdirSync(carpeta).length === 0) rmSync(carpeta, { recursive: true });
  try {
    await installWhisperCpp({ to: carpeta, version: WHISPER_VERSION, printOutput: true });
  } catch (error) {
    throw new Error(
      [
        `No pude compilar Whisper: ${error.message}`,
        "",
        "En Mac hacen falta las herramientas de desarrollo:  xcode-select --install",
        "En Linux:  sudo apt install build-essential git  (o el equivalente de tu distribución)",
        `Después borrá la carpeta ${carpeta} y volvé a correr npm run whisper.`,
      ].join("\n"),
    );
  }
}

/** Lo que se dice cuando WHISPER_DIR apunta a una carpeta sin Whisper. */
export const AYUDA_WHISPER_DIR = (carpeta, modelo = MODELO_WHISPER) =>
  `WHISPER_DIR apunta a ${carpeta}, y ahí no encuentro el programa (main) y el modelo ` +
  `(ggml-${modelo}.bin) de whisper.cpp 1.5. Corregí la ruta, o borrá WHISPER_DIR y corré ` +
  "npm run whisper para instalarlo dentro del proyecto.";

export async function instalarWhisper({ carpeta = carpetaWhisper(), modelo = MODELO_WHISPER, entorno = leerEntorno() } = {}) {
  if (whisperInstalado(carpeta, modelo)) {
    console.log(`Whisper ya está instalado en ${carpeta}, con el modelo ${modelo}.`);
    return;
  }
  // La carpeta de WHISPER_DIR es una instalación de la persona, fuera del proyecto: ahí no se baja nada.
  if (String(entorno.WHISPER_DIR ?? "").trim() && resolve(carpeta) === carpetaWhisper(entorno)) {
    throw new Error(AYUDA_WHISPER_DIR(carpeta, modelo));
  }
  const hayPrograma =
    existsSync(carpeta) && readdirSync(carpeta).some((n) => /^(main|whisper-cli)(\.exe)?$/i.test(n));
  if (!hayPrograma) {
    console.log(`Bajando el programa de Whisper ${WHISPER_VERSION} a ${carpeta}…`);
    await instalarPrograma(carpeta);
  }
  console.log(`Bajando el modelo ${modelo} (${TAMANOS[modelo] ?? "varios cientos de MB"}). Tarda unos minutos…`);
  const { downloadWhisperModel } = await import("@remotion/install-whisper-cpp");
  await downloadWhisperModel({ model: modelo, folder: carpeta, printOutput: false });
  if (!whisperInstalado(carpeta, modelo)) throw new Error("La instalación terminó, pero no encuentro el programa o el modelo.");
  console.log(`Listo: Whisper quedó en ${carpeta}.`);
}

const corridoDirecto = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (corridoDirecto) {
  const i = process.argv.indexOf("--modelo");
  const modelo = i > -1 ? process.argv[i + 1] : MODELO_WHISPER;
  try {
    await instalarWhisper({ modelo });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
