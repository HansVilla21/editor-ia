/**
 * Lo que comparten todas las herramientas de la skill: los binarios, los argumentos,
 * la lectura de audio y los formatos de salida.
 *
 * Regla del proyecto: ffmpeg y ffprobe salen SIEMPRE de node_modules. Nunca del PATH:
 * la persona que instala el repo no los instaló a mano, y ese es el punto.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";

import ffmpegStatic from "ffmpeg-static";
import { path as ffprobeStatic } from "@ffprobe-installer/ffprobe";

export const FPS = 30;
export const ANCHO = 1080;
export const ALTO = 1920;

export const FFMPEG = ffmpegStatic;
export const FFPROBE = ffprobeStatic;

/** f = round(segundos · 30). El redondeo compartido de todo el proyecto. */
export const cuadroDe = (segundos) => Math.round(Number(segundos) * FPS);
export const segundosDe = (cuadro) => Number(cuadro) / FPS;

export function morir(mensaje) {
  console.error(mensaje);
  process.exit(1);
}

if (!FFMPEG || !existsSync(FFMPEG)) {
  morir("No encuentro ffmpeg en node_modules. Corré npm install en la carpeta del proyecto.");
}

// ---------------------------------------------------------------- procesos

/**
 * Corre un binario con los argumentos en arreglo: nunca se arma una línea de shell,
 * así las rutas con espacios funcionan igual en Windows, Mac y Linux.
 */
export function correr(bin, args, { entrada = null } = {}) {
  return new Promise((cumplir, fallar) => {
    const proc = spawn(bin, args, { windowsHide: true });
    const salida = [];
    const error = [];
    proc.stdout.on("data", (b) => salida.push(b));
    proc.stderr.on("data", (b) => error.push(b));
    proc.on("error", fallar);
    proc.on("close", (codigo) =>
      cumplir({
        codigo,
        salida: Buffer.concat(salida),
        texto: Buffer.concat(salida).toString("utf8"),
        error: Buffer.concat(error).toString("utf8"),
      }),
    );
    if (entrada !== null) {
      proc.stdin.end(entrada);
    }
  });
}

export async function ffmpeg(args, { tolerar = false } = {}) {
  const r = await correr(FFMPEG, ["-hide_banner", ...args]);
  if (r.codigo !== 0 && !tolerar) {
    morir(`ffmpeg falló (${r.codigo}):\n${ultimasLineas(r.error, 12)}`);
  }
  return r;
}

export async function ffprobe(args) {
  const r = await correr(FFPROBE, ["-hide_banner", "-v", "error", ...args]);
  if (r.codigo !== 0) morir(`ffprobe falló (${r.codigo}):\n${ultimasLineas(r.error, 8)}`);
  return r.texto;
}

export const ultimasLineas = (texto, n) => texto.trim().split(/\r?\n/).slice(-n).join("\n");

// ---------------------------------------------------------------- argumentos

/**
 * Parser mínimo. Una opción es `--nombre valor`; las banderas declaradas no llevan valor.
 * Un valor puede empezar con un guion (`--umbral -36`), que es el caso de los decibeles.
 */
export function leerArgumentos(argv, { banderas = [] } = {}) {
  const libres = [];
  const opciones = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith("--")) {
      const nombre = t.slice(2);
      if (banderas.includes(nombre)) {
        opciones[nombre] = true;
      } else {
        opciones[nombre] = argv[i + 1];
        i++;
      }
    } else {
      libres.push(t);
    }
  }
  return { libres, opciones };
}

export function pedirAyuda(argv) {
  return argv.includes("--ayuda") || argv.includes("-h") || argv.includes("--help");
}

/** Si la persona pidió ayuda, la imprime y termina. Se llama al principio de cada script. */
export function ayuda(argv, texto) {
  if (pedirAyuda(argv)) {
    console.log(texto.trim());
    process.exit(0);
  }
}

export const numero = (valor, porDefecto) =>
  valor === undefined || valor === true || valor === "" ? porDefecto : Number(valor);

/** Acepta "90" (cuadros) o "3s" / "3.5s" (segundos). Devuelve cuadros. */
export function comoCuadros(valor, porDefecto) {
  if (valor === undefined || valor === true) return porDefecto;
  const texto = String(valor).trim();
  if (/s$/i.test(texto)) return cuadroDe(parseFloat(texto));
  return Math.round(Number(texto));
}

/** Corre el bloque principal solo cuando el archivo se ejecuta directo, no al importarlo. */
export const esPrincipal = (metaUrl) =>
  Boolean(process.argv[1]) && metaUrl === pathToFileURL(process.argv[1]).href;

// ---------------------------------------------------------------- archivos

export function asegurarCarpeta(rutaArchivo) {
  mkdirSync(dirname(resolve(rutaArchivo)), { recursive: true });
}

export function escribirJson(ruta, datos, { compacto = false } = {}) {
  asegurarCarpeta(ruta);
  writeFileSync(ruta, JSON.stringify(datos, null, compacto ? 0 : 1) + "\n", "utf8");
  return ruta;
}

/** Para los mensajes: una ruta corta, relativa a donde se corrió el comando. */
export function corta(ruta) {
  const r = relative(process.cwd(), resolve(ruta));
  return r && !r.startsWith("..") ? r.split("\\").join("/") : ruta;
}

let contadorTemporales = 0;
export function temporal(sufijo) {
  const carpeta = join(tmpdir(), `editor-ia-${process.pid}`);
  mkdirSync(carpeta, { recursive: true });
  contadorTemporales += 1;
  return join(carpeta, `t${contadorTemporales}${sufijo}`);
}

export const mismoArchivo = (a, b) =>
  resolve(a).toLowerCase() === resolve(b).toLowerCase();

/**
 * Un temporal AL LADO del destino, no en la carpeta de temporales del sistema.
 * Cuando el proyecto vive en otro disco, mover desde el temporal del sistema falla.
 */
export function vecinoTemporal(destino) {
  const completo = resolve(destino);
  const ext = completo.slice(completo.lastIndexOf("."));
  contadorTemporales += 1;
  return `${completo.slice(0, completo.length - ext.length)}.parcial${contadorTemporales}${ext}`;
}

// ---------------------------------------------------------------- medios

/** fps, rotación, duración, resolución y espacio de color de un archivo. */
export async function sondear(ruta) {
  const crudo = await ffprobe([
    "-show_entries",
    "format=duration,format_name,bit_rate",
    "-show_streams",
    "-of",
    "json",
    ruta,
  ]);
  const datos = JSON.parse(crudo);
  const video = (datos.streams ?? []).find((s) => s.codec_type === "video");
  const audio = (datos.streams ?? []).find((s) => s.codec_type === "audio");

  let rotacion = 0;
  if (video) {
    const lado = (video.side_data_list ?? []).find((s) => s.rotation !== undefined);
    if (lado) rotacion = Number(lado.rotation);
    else if (video.tags?.rotate) rotacion = Number(video.tags.rotate);
  }

  const fps = video ? evaluarFraccion(video.avg_frame_rate || video.r_frame_rate) : null;
  const giroVertical = Math.abs(rotacion) === 90 || Math.abs(rotacion) === 270;

  return {
    ruta,
    duracion: Number(datos.format?.duration ?? 0),
    contenedor: datos.format?.format_name ?? null,
    video: video
      ? {
          codec: video.codec_name,
          ancho: video.width,
          alto: video.height,
          anchoMostrado: giroVertical ? video.height : video.width,
          altoMostrado: giroVertical ? video.width : video.height,
          fps,
          cuadros: video.nb_frames ? Number(video.nb_frames) : null,
          rotacion,
          pixel: video.pix_fmt ?? null,
          colores: video.color_space ?? null,
          primarios: video.color_primaries ?? null,
          transferencia: video.color_transfer ?? null,
        }
      : null,
    audio: audio
      ? {
          codec: audio.codec_name,
          canales: audio.channels,
          muestreo: Number(audio.sample_rate),
        }
      : null,
  };
}

function evaluarFraccion(texto) {
  if (!texto) return null;
  const [a, b] = String(texto).split("/").map(Number);
  if (!b) return a || null;
  return Number((a / b).toFixed(6));
}

/**
 * Decodifica cualquier archivo a mono f32 y devuelve las muestras.
 * Con `filtro` (una cadena de filtros de audio de ffmpeg) se lee solo una banda.
 */
export async function leerPcm(ruta, muestreo = 48000, { desde = null, hasta = null, filtro = null } = {}) {
  const args = ["-v", "error"];
  if (desde !== null) args.push("-ss", String(desde));
  if (hasta !== null) args.push("-to", String(hasta));
  args.push("-i", ruta, "-vn", "-ac", "1", "-ar", String(muestreo));
  if (filtro) args.push("-af", filtro);
  args.push("-f", "f32le", "-");
  const r = await correr(FFMPEG, args);
  if (r.codigo !== 0) morir(`No pude leer el audio de ${corta(ruta)}:\n${ultimasLineas(r.error, 6)}`);
  const bytes = r.salida.length - (r.salida.length % 4);
  return new Float32Array(r.salida.buffer, r.salida.byteOffset, bytes / 4);
}

export function rms(muestras, desde = 0, hasta = muestras.length) {
  let suma = 0;
  for (let i = desde; i < hasta; i++) suma += muestras[i] * muestras[i];
  const n = Math.max(1, hasta - desde);
  return Math.sqrt(suma / n);
}

export const aDb = (valor) => 20 * Math.log10(valor + 1e-12);

export function pico(muestras, desde = 0, hasta = muestras.length) {
  let max = 0;
  for (let i = desde; i < hasta; i++) {
    const v = Math.abs(muestras[i]);
    if (v > max) max = v;
  }
  return max;
}

export function mediana(valores) {
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
}

/** Tramos de silencio que detecta ffmpeg, en segundos. */
export async function detectarSilencios(ruta, { umbral, minimo, duracion }) {
  const r = await ffmpeg(
    ["-i", ruta, "-af", `silencedetect=noise=${umbral}dB:d=${minimo}`, "-f", "null", "-"],
    { tolerar: true },
  );
  const registro = r.error;
  const inicios = [...registro.matchAll(/silence_start: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  const fines = [...registro.matchAll(/silence_end: (-?[\d.]+)/g)].map((m) => Number(m[1]));
  if (fines.length < inicios.length) fines.push(duracion);
  return inicios.map((inicio, i) => [Math.max(0, inicio), Math.min(duracion, fines[i])]);
}

export const fijo = (n, d = 2) => Number(n).toFixed(d);
