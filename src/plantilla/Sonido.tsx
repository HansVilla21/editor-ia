/**
 * El sonido, con la cadena de referencias/sonido.md:
 *
 * - Voz: public/<DIR>/voz.wav, ya nivelada a −19 LUFS. Si todavía no está, suena el audio del
 *   video tal cual, para poder revisar; el render final va con voz.wav.
 * - Música: public/<DIR>/musica.m4a (nivelada a −33 LUFS), a 0,7 × (1 − 0,35 · voz[cuadro]),
 *   con fade de entrada de 0,6 a 1 en 8 cuadros y de salida en los últimos 24. La envolvente
 *   de voz sale de vozActividad.ts (actividad.mjs); vacía, la música no baja.
 * - Efectos: del catálogo referencias/efectos.json, cada uno con su pico en el cuadro del
 *   evento: desde = cuadro − round(pico · 30), por el bus del catálogo.
 *
 * Lo que falta en public/ se omite: sin archivos, el video renderiza mudo.
 */
import React from "react";
import { Html5Audio, interpolate, Sequence, staticFile } from "remotion";
import catalogo from "../../.claude/skills/editar-video/referencias/efectos.json";
import { hay, hayDelVideo, MUSICA, srcDelVideo, VIDEO, VOZ } from "./archivos";
import { type CueEnCuadros, TODOS_LOS_CUES } from "./cues";
import { DURACION, FPS } from "./tiempos";
import { VOZ as ENVOLVENTE } from "./vozActividad";

const TOPE = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const FADE_EFECTO = 5;
/** Cuánto se deja sonar un efecto corto, en cuadros. */
const DURA_EFECTO = 90;

/** La carpeta del catálogo es relativa a la raíz ("public/sfx"); staticFile la quiere relativa a public/. */
const carpeta = catalogo.carpeta.replace(/^public\//, "").replace(/\/$/, "");
const efectos: Record<string, { archivo: string; pico: number; vol: number }> = catalogo.efectos;

const Efecto: React.FC<{ cue: CueEnCuadros }> = ({ cue }) => {
  const e = efectos[cue.clave];
  if (!e) return null;
  const ruta = `${carpeta}/${e.archivo}`;
  if (!hay(ruta)) return null;
  // El pico va en el cuadro del evento. Si eso cae antes del cuadro 0, se recorta el principio.
  const desde = cue.cuadro - Math.round(e.pico * FPS);
  const recorte = Math.max(0, -desde);
  const dura = Math.max(1, Math.min(cue.dura ?? DURA_EFECTO, DURACION - Math.max(0, desde)));
  const volumen = catalogo.bus * e.vol * (cue.vol ?? 1);
  return (
    <Sequence from={Math.max(0, desde)} durationInFrames={dura} layout="none">
      <Html5Audio
        src={staticFile(ruta)}
        trimBefore={recorte || undefined}
        volume={(fr) => volumen * (cue.dura ? interpolate(fr, [dura - FADE_EFECTO, dura], [1, 0], TOPE) : 1)}
      />
    </Sequence>
  );
};

export const Sonido: React.FC = () => {
  const hayVoz = hayDelVideo(VOZ);
  const hayVideo = hayDelVideo(VIDEO);
  return (
    <>
      {hayVoz ? <Html5Audio src={srcDelVideo(VOZ)} /> : hayVideo ? <Html5Audio src={srcDelVideo(VIDEO)} /> : null}
      {hayDelVideo(MUSICA) ? (
        <Html5Audio
          src={srcDelVideo(MUSICA)}
          volume={(fr) =>
            0.7 *
            (1 - 0.35 * (ENVOLVENTE[Math.min(fr, ENVOLVENTE.length - 1)] ?? 0)) *
            interpolate(fr, [0, 8, DURACION - 24, DURACION - 1], [0.6, 1, 1, 0], TOPE)
          }
        />
      ) : null}
      {TODOS_LOS_CUES.map((cue, i) => (
        <Efecto key={`${cue.clave}-${cue.cuadro}-${i}`} cue={cue} />
      ))}
    </>
  );
};
