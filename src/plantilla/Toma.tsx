/**
 * Una toma: el video a pantalla completa (full) o arriba con el panel abajo (split), envuelto
 * en la transición. Los subtítulos y el cierre viven afuera, para no moverse con el plano.
 */
import React from "react";
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from "remotion";
import { delVideo, hayDelVideo, srcDelVideo, VIDEO } from "./archivos";
import { CORRIMIENTO_SPLIT, CX, CY, type Tipo, ZOOM } from "./encuadre";
import { colores } from "./marca";
import { Marcador } from "./Marcador";
import { Panel } from "./Panel";
import { ALTO, ANCHO, type BloqueEnCuadros, COSTURA, tramoEn } from "./tiempos";
import { Titular } from "./Titular";
import { transicion } from "./Transicion";

/** El video (o su marcador) a 1080x1920, con el zoom alterno de los jump cuts. */
const Plano: React.FC<{ tipo: Tipo }> = ({ tipo }) => {
  const cuadro = useCurrentFrame();
  // En cada jump cut el encuadre cambia de nivel: 1,0 y el segundo zoom, con origen en la cara.
  const zoom = tramoEn(cuadro) % 2 === 1 ? ZOOM[tipo] : 1;
  const estilo: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: ANCHO,
    height: ALTO,
    transform: zoom === 1 ? undefined : `scale(${zoom})`,
    transformOrigin: `${CX}px ${CY}px`,
  };
  if (!hayDelVideo(VIDEO)) {
    return (
      <div style={estilo}>
        <Marcador archivo={delVideo(VIDEO)} />
      </div>
    );
  }
  // Silenciado: la voz entra aparte (Sonido.tsx), ya nivelada.
  return <OffthreadVideo src={srcDelVideo(VIDEO)} muted style={{ ...estilo, objectFit: "cover" }} />;
};

export const Toma: React.FC<{ bloque: BloqueEnCuadros; primero: boolean }> = ({ bloque, primero }) => {
  const cuadro = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: colores.fondo, overflow: "hidden" }}>
      <AbsoluteFill style={transicion(cuadro, bloque)}>
        {bloque.tipo === "full" ? (
          <Plano tipo="full" />
        ) : (
          <>
            {/* Mitad de arriba: el mismo video a escala 1, subido. Nunca corrido de costado. */}
            <div style={{ position: "absolute", left: 0, top: 0, width: ANCHO, height: COSTURA, overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: CORRIMIENTO_SPLIT, width: ANCHO, height: ALTO }}>
                <Plano tipo="split" />
              </div>
            </div>
            {/* Mitad de abajo: el panel, pegado a la costura, sin borde ni margen. */}
            <div style={{ position: "absolute", left: 0, top: COSTURA, width: ANCHO, height: ALTO - COSTURA, overflow: "hidden" }}>
              <Panel bloque={bloque} />
            </div>
          </>
        )}
        {/* El titular vive en el bloque del gancho y sale con su transición. */}
        {primero ? <Titular tipo={bloque.tipo} /> : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
