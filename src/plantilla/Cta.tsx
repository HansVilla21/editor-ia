/**
 * El cierre: "Comentá / PALABRA / y te mando…", tipográfico, sobre el pecho y por debajo del
 * mentón (con el zoom mayor). Las tres líneas entran con blurIn escalonado. Desde acá los
 * subtítulos se ocultan: el cierre ocupa su lugar.
 *
 * Nunca por debajo de y = 1680: si no entra, se achica entero.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { blurIn } from "./anim";
import { CTA, PILDORA } from "./datos";
import { mentonEnPantalla, ZONA } from "./encuadre";
import { colores, radio, sombraFuerte, tipografia } from "./marca";
import { tamanoQueEntra } from "./piezas";
import { bloqueEn, COSTURA, CTA_F } from "./tiempos";

const SEPARACION = 12;

export const medidasDelCta = (tipo: "full" | "split") => {
  const pide = 72;
  const palabra = tamanoQueEntra(CTA.palabra, 150, 940, 0.66);
  const recibe = Math.min(52, tamanoQueEntra(CTA.recibe, 52, 940, 0.55));
  const alto = pide * 1.1 + palabra * 1.02 + recibe * 1.15 + SEPARACION * 2 + (PILDORA.subtitulos ? 40 : 0);
  // En split (no recomendado: el cierre va en full) se apoya en el panel.
  const arriba = tipo === "split" ? COSTURA + 200 : Math.round(mentonEnPantalla("full") + 60);
  const escala = Math.min(1, (ZONA.abajo - arriba) / alto);
  return { pide, palabra, recibe, arriba, alto, escala };
};

export const Cta: React.FC = () => {
  const cuadro = useCurrentFrame();
  if (cuadro < CTA_F) return null;
  const m = medidasDelCta(bloqueEn(CTA_F).tipo);
  const linea = (tamano: number, peso: number): React.CSSProperties => ({
    fontFamily: tipografia.familia,
    fontWeight: peso,
    fontSize: tamano,
    lineHeight: 1.05,
    letterSpacing: "-0.03em",
    whiteSpace: "nowrap",
    textShadow: PILDORA.subtitulos ? undefined : sombraFuerte,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: m.arriba,
        display: "flex",
        justifyContent: "center",
        transform: m.escala < 1 ? `scale(${m.escala.toFixed(3)})` : undefined,
        transformOrigin: "50% 0%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: SEPARACION,
          color: colores.texto,
          background: PILDORA.subtitulos ? colores.pildora : undefined,
          borderRadius: radio.pildora,
          padding: PILDORA.subtitulos ? "20px 36px" : 0,
        }}
      >
        <div style={{ ...linea(m.pide, 800), ...blurIn(cuadro, CTA_F, 5, 20) }}>{CTA.pide}</div>
        <div style={{ ...linea(m.palabra, 900), color: colores.acento, ...blurIn(cuadro, CTA_F + 3, 5, 20) }}>{CTA.palabra}</div>
        <div style={{ ...linea(m.recibe, 700), ...blurIn(cuadro, CTA_F + 6, 5, 20) }}>{CTA.recibe}</div>
      </div>
    </div>
  );
};
