/**
 * Lista: cada fila entra con blurIn en la palabra que la nombra. Hasta 4 filas a tamaño pleno;
 * con más, se achican para que el cuerpo no pase de y = 720 del panel.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { blurIn } from "../anim";
import { colores, tipografia } from "../marca";
import { colorDeEstado, CUERPO, Icono, tarjeta } from "../piezas";
import { f } from "../tiempos";
import type { Escena } from "../tipos";

type Props = { escena: Extract<Escena, { tipo: "lista" }> };

export const Lista: React.FC<Props> = ({ escena }) => {
  const cuadro = useCurrentFrame();
  const n = Math.max(1, escena.filas.length);
  const separacion = n > 4 ? 14 : 20;
  const alto = Math.min(92, Math.floor((CUERPO.alto - separacion * (n - 1)) / n));
  const letra = Math.round(Math.min(40, alto * 0.44));
  return (
    <>
      {escena.filas.map((fila, i) => (
        <div
          key={`${i}-${fila.texto}`}
          style={{
            ...tarjeta,
            position: "absolute",
            left: 0,
            right: 0,
            top: i * (alto + separacion),
            height: alto,
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "0 28px",
            borderColor: fila.estado ? `${colorDeEstado(fila.estado)}88` : colores.borde,
            fontFamily: tipografia.familia,
            fontWeight: 700,
            fontSize: letra,
            letterSpacing: "-0.01em",
            color: colores.texto,
            whiteSpace: "nowrap",
            overflow: "hidden",
            ...blurIn(cuadro, f(fila.en)),
          }}
        >
          <Icono numero={i + 1} estado={fila.estado} tamano={Math.round(alto * 0.48)} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{fila.texto}</span>
        </div>
      ))}
    </>
  );
};
