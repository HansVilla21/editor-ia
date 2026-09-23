/**
 * El panel de contenido del split (1080x960, debajo de la costura).
 *
 * Coordenadas del panel: cabecera desde y = 64, cuerpo de y = 290 a y = 720 (1680 absoluto).
 * Nada arriba de la cabecera, y nada importante debajo del cuerpo: ahí está la interfaz de la app.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { blurIn, pop } from "./anim";
import { EscenaDelBloque } from "./escenas/EscenaDelBloque";
import { logoGrandeEnTarjeta } from "./escenas/Tarjeta";
import { anchoDelLogo, hayLogo, Logo } from "./Logo";
import { colores, tipografia } from "./marca";
import { ANCHO_UTIL, CUERPO, MARGEN, Tag, tamanoQueEntra } from "./piezas";
import type { BloqueEnCuadros } from "./tiempos";
import type { Escena } from "./tipos";

/** El logo de la cabecera: 64 px de alto, a la izquierda del título, centrado con la línea. */
const LOGO = 64;
const HUECO_LOGO = 22;

/** Etiqueta y tags (+0), logo y título (+2) y fuente (+4): entran escalonados. */
const Cabecera: React.FC<{ escena: Escena; f0: number }> = ({ escena, f0 }) => {
  const cuadro = useCurrentFrame();
  // Si la tarjeta ya muestra el logo grande, no se repite arriba.
  const logo = hayLogo(escena.logo) && !logoGrandeEnTarjeta(escena) ? escena.logo : null;
  const anchoTitulo = ANCHO_UTIL - (logo ? anchoDelLogo(logo, LOGO) + HUECO_LOGO : 0);
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
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: HUECO_LOGO }}>
        {logo ? <Logo slug={logo} alto={LOGO} style={pop(cuadro, f0 + 2)} /> : null}
        <div
          style={{
            fontFamily: tipografia.familia,
            fontWeight: tipografia.pesoTitular,
            fontSize: tamanoQueEntra(escena.titulo, 84, anchoTitulo),
            lineHeight: 1.05,
            letterSpacing: "-0.035em",
            color: colores.texto,
            whiteSpace: "nowrap",
            ...blurIn(cuadro, f0 + 2),
          }}
        >
          {escena.titulo}
        </div>
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
