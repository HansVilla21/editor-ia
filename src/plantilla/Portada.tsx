/**
 * La portada (1080x1920), como imagen fija.
 *
 * La foto es public/<DIR>/portada.png: un cuadro extraído de la grabación con cuadros.mjs
 * (congelar el video dentro de un still devuelve el cuadro 0). Se sube 130 px, se agranda
 * 1,25 alrededor de la cara y lleva un retoque suave. Todo lo importante queda entre y = 240 e
 * y = 1680, el recorte que se ve en la grilla del perfil; el texto nunca sube hasta el mentón.
 */
import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { delVideo, hayDelVideo, PORTADA as FOTO, srcDelVideo } from "./archivos";
import { ENCUADRE, PORTADA } from "./datos";
import { CX, CY, ZONA } from "./encuadre";
import { colores, radio, tipografia } from "./marca";
import { Marcador } from "./Marcador";
import { tamanoQueEntra } from "./piezas";
import { ConEnfasis } from "./Titular";

const SUBE = 130;
const ESCALA = 1.25;
/** El mentón en la portada, después de subir y agrandar la foto. */
const MENTON = CY - SUBE + (ENCUADRE.menton - CY) * ESCALA;

const Chip: React.FC<{ n: number; texto: string }> = ({ n, texto }) => (
  <span
    style={{
      fontFamily: tipografia.mono,
      fontWeight: 500,
      fontSize: 27,
      color: colores.textoSuave,
      background: colores.superficie,
      border: `1px solid ${colores.borde}`,
      borderRadius: radio.tarjeta,
      padding: "10px 18px",
      whiteSpace: "nowrap",
    }}
  >
    <span style={{ color: colores.acento }}>{String(n).padStart(2, "0")}</span> {texto}
  </span>
);

export const Portada: React.FC = () => {
  const titulo = tamanoQueEntra(PORTADA.titulo, 230, 960, 0.6);
  const alto =
    (PORTADA.etiqueta ? 64 : 0) + titulo * 0.95 + (PORTADA.subtitulo ? 84 : 0) + ((PORTADA.items ?? []).length ? 100 : 0);
  // El bloque de texto se apoya abajo, en 1640, y se achica si llegaría a tocar el mentón.
  const base = ZONA.abajo - 40;
  const escala = Math.min(1, (base - (MENTON + 40)) / alto);
  return (
    <AbsoluteFill style={{ background: colores.fondo, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translateY(${-SUBE}px) scale(${ESCALA})`,
          transformOrigin: `${CX}px ${CY}px`,
        }}
      >
        {hayDelVideo(FOTO) ? (
          <Img
            src={srcDelVideo(FOTO)}
            style={{ width: 1080, height: 1920, objectFit: "cover", filter: "brightness(1.05) contrast(1.06) saturate(1.04)" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0 }}>
            <Marcador archivo={delVideo(FOTO)} />
          </div>
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${colores.fondo}00 0%, ${colores.fondo}00 45%, ${colores.fondo}D0 60%, ${colores.fondo} 74%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 1920 - base,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          transform: escala < 1 ? `scale(${Math.max(0.5, escala).toFixed(3)})` : undefined,
          transformOrigin: "50% 100%",
        }}
      >
        {PORTADA.etiqueta ? (
          <span
            style={{
              fontFamily: tipografia.mono,
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: "0.14em",
              color: colores.acento,
              border: `1px solid ${colores.acento}55`,
              background: `${colores.acento}18`,
              borderRadius: radio.tag,
              padding: "8px 18px",
            }}
          >
            {PORTADA.etiqueta}
          </span>
        ) : null}
        <div
          style={{
            marginTop: PORTADA.etiqueta ? 14 : 0,
            fontFamily: tipografia.familia,
            fontWeight: 800,
            fontSize: titulo,
            lineHeight: 0.95,
            letterSpacing: "-0.05em",
            color: colores.texto,
            whiteSpace: "nowrap",
          }}
        >
          <ConEnfasis texto={PORTADA.titulo} />
        </div>
        {PORTADA.subtitulo ? (
          <div
            style={{
              marginTop: 14,
              fontFamily: tipografia.familia,
              fontWeight: 800,
              fontSize: tamanoQueEntra(PORTADA.subtitulo, 64, 960, 0.56),
              letterSpacing: "-0.03em",
              color: colores.texto,
              whiteSpace: "nowrap",
            }}
          >
            {PORTADA.subtitulo}
          </div>
        ) : null}
        {(PORTADA.items ?? []).length ? (
          <div style={{ marginTop: 34, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 14 }}>
            {(PORTADA.items ?? []).map((t, i) => (
              <Chip key={t} n={i + 1} texto={t} />
            ))}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

