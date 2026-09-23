/**
 * Contador: la cifra cuenta con ease-out cúbico desde la palabra que la anuncia hasta que
 * termina de decirla. La cifra se verifica contra la fuente antes de ponerla: nunca inventada.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { blurIn, conMiles, countUp } from "../anim";
import { colores, tipografia } from "../marca";
import { ANCHO_UTIL, CUERPO } from "../piezas";
import { type BloqueEnCuadros, f } from "../tiempos";
import type { Escena } from "../tipos";

type Props = { escena: Extract<Escena, { tipo: "contador" }>; bloque: BloqueEnCuadros };

export const Contador: React.FC<Props> = ({ escena, bloque }) => {
  const cuadro = useCurrentFrame();
  const f0 = f(escena.desde);
  const f1 = f(escena.hasta ?? escena.desde + 1);
  const n = countUp(cuadro, f0, f1, escena.valor);
  const prefijo = escena.prefijo ?? "";
  const sufijo = escena.sufijo ?? "";
  // El tamaño se fija con la cifra final, para que no salte mientras cuenta.
  const largo = `${prefijo}${conMiles(escena.valor)}`.length + sufijo.length * 0.45;
  const tamano = Math.floor(Math.min(210, ANCHO_UTIL / (largo * 0.62)));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: CUERPO.alto,
        // La cifra aparece justo antes de que se nombre, y ahí cuenta.
        ...blurIn(cuadro, Math.max(bloque.desdeF + 2, f0 - 6)),
      }}
    >
      <div
        style={{
          fontFamily: tipografia.familia,
          fontWeight: 800,
          fontSize: tamano,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: colores.acento,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {prefijo}
        {conMiles(n)}
        {sufijo ? (
          <span style={{ fontSize: Math.round(tamano * 0.4), letterSpacing: "-0.02em", color: colores.texto }}>{sufijo}</span>
        ) : null}
      </div>
      {escena.nota ? (
        <div
          style={{
            marginTop: 24,
            fontFamily: tipografia.familia,
            fontWeight: 600,
            fontSize: 38,
            color: colores.textoSuave,
            textAlign: "center",
          }}
        >
          {escena.nota}
        </div>
      ) : null}
    </div>
  );
};
