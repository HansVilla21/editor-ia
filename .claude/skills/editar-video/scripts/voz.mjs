/**
 * Fase 8 — la pista de voz de la composición.
 *
 * Saca el audio del video ya cortado, lo limpia (graves de la sala, eses que pinchan, picos
 * sueltos) y lo deja a -19 LUFS con ganancia fija y limitador a -3 dB, en WAV. En Remotion el
 * video va silenciado y esta voz entra como pista aparte.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ayuda, leerArgumentos, morir, ffmpeg, temporal, corta, asegurarCarpeta } from "./_comun.mjs";

const AYUDA = `
voz.mjs — la voz limpia y nivelada para la composición

  node .claude/skills/editar-video/scripts/voz.mjs <video.mp4> <voz.wav>

Recibe: el video ya cortado (y apretado, y acelerado si se aceleró): public/<slug>/video.mp4.
Devuelve: <voz.wav>, normalmente public/<slug>/voz.wav, mono, a -19 LUFS con ganancia fija y
          un limitador a -3 dB. En pantalla, lo medido y la ganancia aplicada.

La limpieza, en este orden:
  highpass=f=80                  saca el retumbe de la sala y los golpes en la mesa
  deesser=i=0.5:m=0.5:f=0.5      baja las eses que pinchan
  acompressor 2,5:1 desde -24 dB empareja las frases fuertes y las suaves

La ganancia es fija y no dinámica a propósito: el loudnorm dinámico hace que la voz respire raro.
`;

export const CADENA = "highpass=f=80,deesser=i=0.5:m=0.5:f=0.5,acompressor=threshold=-24dB:ratio=2.5:attack=5:release=90";

ayuda(process.argv, AYUDA);
const { libres } = leerArgumentos(process.argv.slice(2));
const [entrada, salida] = libres;
if (!entrada || !salida) morir("Faltan argumentos: <video.mp4> <voz.wav>. Probá con --ayuda.");
if (!/\.wav$/i.test(salida)) morir("La voz se guarda en WAV (el AAC mete saturaciones que no estaban): usá una salida .wav.");

const limpia = temporal("-voz-limpia.wav");
await ffmpeg(["-v", "error", "-y", "-i", entrada, "-vn", "-ac", "1", "-ar", "48000", "-af", CADENA, "-c:a", "pcm_s24le", limpia]);
console.log(`Voz limpia: ${CADENA.split(",").map((f) => f.split("=")[0]).join(" + ")}.`);

asegurarCarpeta(salida);
const nivelar = fileURLToPath(new URL("./nivelar.mjs", import.meta.url));
const r = spawnSync(process.execPath, [nivelar, limpia, salida, "-19", "--fija", "--limite", "-3"], { stdio: "inherit" });
if (r.status !== 0) morir("No pude nivelar la voz.");
console.log(`voz en ${corta(salida)}`);
