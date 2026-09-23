/**
 * El panel de contenido del split (1080x960, debajo de la costura).
 *
 * Coordenadas del panel: cabecera desde y = 64, cuerpo de y = 290 a y = 720 (1680 absoluto).
 * Nada arriba de la cabecera, y nada importante debajo del cuerpo: ahí está la interfaz de la app.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { blurIn } from "./anim";
import { EscenaDelBloque } from "./escenas/EscenaDelBloque";
import { colores, tipografia } from "./marca";
import { CUERPO, MARGEN, Tag, tamanoQueEntra } from "./piezas";
import type { BloqueEnCuadros } from "./tiempos";
import type { Escena } from "./tipos";

/** Etiqueta y tags (+0), título (+2) y fuente (+4): entran con blurIn escalonado. */
const Cabecera: React.FC<{ escena: Escena; f0: number }> = ({ escena, f0 }) => {
  const cuadro = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: MARGEN, right: MARGEN, top: 64 }}>
      {escena.etiqueta || escena.tags?.length ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 34, ...blurIn(cuadro, f0) }}>
          <span style={{ fontFamily: tipografia.mono, fontWeight: 500, fontSize: 26, letterSpacing: "0.12em", color: colores.acento }}>
            {escena.etiqueta ?? ""}
          </span>
          <span style={{ display: "flex", gap: 10 }}>
            {(escena.tags ?? []).slice(0, 2).map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </span>
        </div>
      ) : null}
      <div
        style={{
          marginTop: 18,
          fontFamily: tipografia.familia,
          fontWeight: tipografia.pesoTitular,
          fontSize: tamanoQueEntra(escena.titulo, 84),
          lineHeight: 1.05,
          letterSpacing: "-0.035em",
          color: colores.texto,
          whiteSpace: "nowrap",
          ...blurIn(cuadro, f0 + 2),
        }}
      >
        {escena.titulo}
      </div>
      {escena.fuente ? (
        <div
          style={{
            marginTop: 16,
            fontFamily: tipografia.mono,
            fontSize: 28,
            color: colores.textoSuave,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            ...blurIn(cuadro, f0 + 4),
          }}
        >
          {escena.fuente}
        </div>
      ) : null}
    </div>
  );
};

export const Panel: React.FC<{ bloque: BloqueEnCuadros }> = ({ bloque }) => {
  const escena = bloque.escena;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(120% 70% at 50% 0%, ${colores.fondoPanel}, ${colores.fondo} 60%)`,
      }}
    >
      {/* Barra del acento: tapa la costura con el video. */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 4, background: colores.acento }} />
      {escena ? <Cabecera escena={escena} f0={bloque.desdeF} /> : null}
      <div style={{ position: "absolute", left: MARGEN, right: MARGEN, top: CUERPO.arriba, height: CUERPO.alto }}>
        {escena ? <EscenaDelBloque escena={escena} bloque={bloque} /> : null}
      </div>
    </div>
  );
};
