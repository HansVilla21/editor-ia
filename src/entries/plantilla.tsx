/**
 * Entrada de Remotion de un video: registra el reel y su portada, a 1080x1920 y 30 fps.
 *
 * Render:   npx remotion render src/entries/<slug>.tsx <Id> videos/<carpeta>/versiones/v1-….mp4
 * Portada:  npx remotion still src/entries/<slug>.tsx <Id>Portada videos/<carpeta>/portada.png
 * Studio:   npx remotion studio src/entries/<slug>.tsx
 */
import React from "react";
import { Composition, registerRoot, Still } from "remotion";
import { Portada } from "../plantilla/Portada";
import { Reel } from "../plantilla/Reel";
import { ALTO, ANCHO, DURACION, FPS } from "../plantilla/tiempos";

const Raiz: React.FC = () => (
  <>
    <Composition id="Plantilla" component={Reel} durationInFrames={DURACION} fps={FPS} width={ANCHO} height={ALTO} />
    <Still id="PlantillaPortada" component={Portada} width={ANCHO} height={ALTO} />
  </>
);

registerRoot(Raiz);
