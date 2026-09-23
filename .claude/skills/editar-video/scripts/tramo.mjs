/**
 * Fase 8 — cortar de la pista elegida el tramo que va debajo del video.
 *
 * El tramo arranca donde arranca el beat, dura lo que el video más un margen, y entra con un
 * fundido corto: cortar una pista a mitad de onda deja un click al principio.
 */
import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  ffmpeg,
  sondear,
  corta,
  fijo,
  asegurarCarpeta,
} from "./_comun.mjs";

const AYUDA = `
tramo.mjs — corta el tramo de música que va debajo del video, con fundido de entrada

  node .claude/skills/editar-video/scripts/tramo.mjs <pista> <salida.wav> --desde <s> --duracion <s> \\
       [--fundido 0.25]

Recibe: la pista elegida (mp3, wav, m4a…), el segundo desde el que arranca el tramo (el
        "arranqueRecomendado" de musica.mjs, confirmado de oído) y cuánto tiene que durar
        (la duración del video más 4 s).
Devuelve: <salida.wav> con el tramo, un fundido de entrada de --fundido segundos (0,25 por
          defecto) y uno de salida de 10 ms para que no termine en click.

Después, nivelarlo:
  nivelar.mjs <salida.wav> public/<slug>/musica.m4a -33
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [pista, salida] = libres;
if (!pista || !salida) morir("Faltan argumentos: <pista> <salida.wav>. Probá con --ayuda.");

const desde = numero(opciones.desde, 0);
const duracion = numero(opciones.duracion, NaN);
const fundido = numero(opciones.fundido, 0.25);
if (!Number.isFinite(desde) || desde < 0) morir("--desde tiene que ser un número de segundos, 0 o más.");
if (!Number.isFinite(duracion) || duracion <= 0) morir("Falta --duracion: la duración del video más 4 s.");

const info = await sondear(pista);
if (!info.audio) morir(`${corta(pista)} no tiene audio.`);
if (desde + duracion > info.duracion + 0.01) {
  morir(
    `La pista dura ${fijo(info.duracion, 1)} s y el tramo pedido termina en ${fijo(desde + duracion, 1)} s. ` +
      "Arrancá antes (--desde) o elegí una pista más larga.",
  );
}

const cola = 0.01;
asegurarCarpeta(salida);
await ffmpeg([
  "-v", "error", "-y",
  "-ss", String(desde), "-t", String(duracion), "-i", pista,
  "-vn",
  "-af", `afade=t=in:st=0:d=${fundido},afade=t=out:st=${fijo(duracion - cola, 3)}:d=${cola}`,
  "-c:a", "pcm_s16le",
  salida,
]);

console.log(`tramo  ${fijo(desde)} s → ${fijo(desde + duracion)} s de ${corta(pista)} (${fijo(duracion)} s, fundido de ${fijo(fundido)} s)`);
console.log(`en     ${corta(salida)}`);
console.log("");
console.log(`Ahora: nivelar.mjs ${corta(salida)} public/<slug>/musica.m4a -33`);
