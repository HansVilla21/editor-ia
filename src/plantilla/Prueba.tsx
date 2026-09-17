import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colores, tipografia } from "./marca";

/**
 * Los 3 segundos que confirman que la cadena entera funciona.
 * Si esto renderiza, Remotion, ffmpeg y Chrome están bien instalados.
 */
export const Prueba: React.FC = () => {
  const cuadro = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrada = spring({ frame: cuadro, fps, config: { damping: 200 } });
  const opacidad = interpolate(cuadro, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colores.fondo,
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
      }}
    >
      <div
        style={{
          color: colores.texto,
          fontFamily: tipografia.familia,
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          opacity: opacidad,
          transform: `translateY(${interpolate(entrada, [0, 1], [40, 0])}px)`,
        }}
      >
        Funciona
      </div>

      <div
        style={{
          color: colores.textoSuave,
          fontFamily: tipografia.familia,
          fontSize: 36,
          fontWeight: 500,
          opacity: interpolate(cuadro, [15, 35], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        Ya podés editar
      </div>
    </AbsoluteFill>
  );
};
