/**
 * Tarjeta: una captura de pantalla dentro de una tarjeta clara, con paneo a lo largo de la frase
 * (escala 1,4, se desplaza hasta el 40 % con inOut cúbico). Si la captura todavía no está en
 * public/, muestra los renglones de `texto` y avisa qué archivo falta.
 */
import React from "react";
import { Easing, Img, useCurrentFrame } from "remotion";
import { blurIn, lerp } from "../anim";
import { delVideo, hayDelVideo, srcDelVideo } from "../archivos";
import { colores, radio, tipografia } from "../marca";
import { CUERPO } from "../piezas";
import type { BloqueEnCuadros } from "../tiempos";
import type { Escena } from "../tipos";

type Props = { escena: Extract<Escena, { tipo: "tarjeta" }>; bloque: BloqueEnCuadros };

const TINTA = "#1B2230";
const TINTA_SUAVE = "#6B7380";

export const Tarjeta: React.FC<Props> = ({ escena, bloque }) => {
  const cuadro = useCurrentFrame();
  const hayImagen = Boolean(escena.imagen) && hayDelVideo(escena.imagen as string);
  const paneo = lerp(cuadro, [bloque.desdeF, bloque.hastaF], [0, 1], Easing.inOut(Easing.cubic));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: CUERPO.alto,
        background: "#FFFFFF",
        border: `1px solid ${colores.borde}`,
        borderRadius: radio.tarjeta,
        overflow: "hidden",
        ...blurIn(cuadro, bloque.desdeF + 2),
      }}
    >
      {hayImagen ? (
        <Img
          src={srcDelVideo(escena.imagen as string)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `50% ${(40 * paneo).toFixed(2)}%`,
            transform: "scale(1.4)",
            transformOrigin: "50% 0%",
          }}
        />
      ) : (
        <div style={{ padding: "34px 40px", fontFamily: tipografia.familia }}>
          {(escena.texto ?? []).map((renglon, i) => (
            <div
              key={`${i}-${renglon}`}
              style={{
                fontWeight: i === 0 ? 700 : 500,
                fontSize: 36,
                lineHeight: 1.25,
                color: i === 0 ? TINTA : "#3A4352",
                marginTop: i === 0 ? 0 : 18,
              }}
            >
              {renglon}
            </div>
          ))}
          {/* Renglones de relleno, para que se lea como una página y no como un hueco. */}
          {[0.92, 0.74, 0.84].slice(0, Math.max(0, 4 - (escena.texto ?? []).length)).map((ancho, i) => (
            <div key={i} style={{ marginTop: 22, height: 16, width: `${ancho * 100}%`, borderRadius: 8, background: "#E6E9EE" }} />
          ))}
          {escena.imagen ? (
            <div
              style={{
                position: "absolute",
                left: 40,
                right: 40,
                bottom: 24,
                fontFamily: tipografia.mono,
                fontSize: 20,
                color: TINTA_SUAVE,
              }}
            >
              falta public/{delVideo(escena.imagen)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
