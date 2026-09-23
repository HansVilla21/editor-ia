/**
 * El video armado: una toma por vez (solo se monta el bloque activo), los subtítulos y el
 * cierre encima —afuera de la transición—, y el sonido al lado.
 *
 * Esta carpeta se copia entera por video con `npm run nuevo <slug>`. En la copia se edita
 * datos.ts y nada más: si hace falta otra escena, se agrega en escenas/ y se anota.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cta } from "./Cta";
import { colores } from "./marca";
import { revisarUnaVez } from "./revision";
import { Sonido } from "./Sonido";
import { Subtitulos } from "./Subtitulos";
import { BLOQUES_F, indiceDeBloque } from "./tiempos";
import { Toma } from "./Toma";

export const Reel: React.FC = () => {
  revisarUnaVez();
  const cuadro = useCurrentFrame();
  const i = indiceDeBloque(cuadro);
  return (
    <AbsoluteFill style={{ background: colores.fondo }}>
      <Toma key={i} bloque={BLOQUES_F[i]} primero={i === 0} />
      <Subtitulos />
      <Cta />
      <Sonido />
    </AbsoluteFill>
  );
};
