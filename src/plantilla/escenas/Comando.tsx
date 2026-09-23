/**
 * Comando: una terminal donde el texto se tipea a 1,2 caracteres por cuadro, con el cursor
 * parpadeando cada 8. Cuando termina, entran los renglones de salida con blurIn.
 * Secretos de ejemplo, siempre enmascarados: sk_live_••••••••.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { blurIn, cuadrosDeTipeo, cursorVisible, tipeado } from "../anim";
import { colores, tipografia } from "../marca";
import { CUERPO, tarjeta } from "../piezas";
import { type BloqueEnCuadros, f } from "../tiempos";
import type { Escena } from "../tipos";

type Props = { escena: Extract<Escena, { tipo: "comando" }>; bloque: BloqueEnCuadros };

export const Comando: React.FC<Props> = ({ escena, bloque }) => {
  const cuadro = useCurrentFrame();
  const f0 = f(escena.en);
  const finTipeo = f0 + cuadrosDeTipeo(escena.texto);
  const escribiendo = cuadro >= f0 && cuadro < finTipeo;
  const letra = escena.texto.length > 90 ? 28 : 34;
  return (
    <div
      style={{
        ...tarjeta,
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: CUERPO.alto,
        overflow: "hidden",
        background: "#0E1219",
        ...blurIn(cuadro, bloque.desdeF + 2),
      }}
    >
      <div
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: `1px solid ${colores.borde}`,
          fontFamily: tipografia.mono,
          fontSize: 22,
          letterSpacing: "0.08em",
          color: colores.textoSuave,
        }}
      >
        terminal
      </div>
      <div style={{ padding: "26px 28px", fontFamily: tipografia.mono, fontSize: letra, lineHeight: 1.35, color: colores.texto }}>
        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          <span style={{ color: colores.acento }}>$ </span>
          {tipeado(escena.texto, cuadro, f0)}
          <span
            style={{
              display: "inline-block",
              width: Math.round(letra * 0.55),
              height: Math.round(letra * 1.05),
              marginLeft: 2,
              verticalAlign: "text-bottom",
              background: colores.acento,
              opacity: escribiendo || cursorVisible(cuadro) ? 1 : 0,
            }}
          />
        </div>
        {(escena.salida ?? []).map((renglon, i) => (
          <div
            key={`${i}-${renglon}`}
            style={{
              marginTop: i === 0 ? 18 : 6,
              fontSize: Math.round(letra * 0.88),
              color: colores.textoSuave,
              whiteSpace: "pre-wrap",
              ...blurIn(cuadro, finTipeo + 4 + i * 4),
            }}
          >
            {renglon}
          </div>
        ))}
      </div>
    </div>
  );
};
