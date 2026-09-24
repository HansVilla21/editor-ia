/**
 * Titular fijo del gancho: visible completo desde el cuadro 0, sin animación de entrada (el
 * primer cuadro es la vista previa del feed). Vive en el bloque del gancho y sale con su
 * transición.
 *
 * Va arriba, entre y = 240 (debajo de la interfaz de la app) y el tope del pelo menos 40 px,
 * calculado con el zoom mayor. Nunca sobre la cara: si no entra, pasa a una línea o se achica.
 * Con TITULAR_LOGO, el logo de la marca va delante de la primera línea, a la altura de la letra.
 */
import React from "react";
import { normal } from "./anim";
import { ENFASIS, PILDORA, TITULAR, TITULAR_LOGO } from "./datos";
import { peloEnPantalla, type Tipo, ZONA } from "./encuadre";
import { anchoDelLogo, hayLogo, Logo, SOMBRA_SOBRE_TOMA } from "./Logo";
import { colores, radio, sombraFuerte, tipografia } from "./marca";

const ALTO_DE_LINEA = 1.04;
const RELLENO = PILDORA.titular ? 14 : 0;
/** El logo va delante de la primera línea: alto y separación, en proporción a la letra. */
const LOGO_EM = 0.8;
const HUECO_EM = 0.24;

/** Dónde y a qué tamaño va el titular. Lo usa también revision.ts para avisar si quedó chico. */
export const medidasDelTitular = (tipo: Tipo) => {
  const techo = ZONA.arriba;
  const piso = Math.round(peloEnPantalla(tipo) - 40);
  const disponible = piso - techo - RELLENO * 2;
  const logo = hayLogo(TITULAR_LOGO);
  // Lo que entra a lo ancho: 0,58 em por letra, más el logo (y su hueco) en la primera línea.
  const logoEm = logo ? (anchoDelLogo(TITULAR_LOGO as string, 1000) / 1000) * LOGO_EM + HUECO_EM : 0;
  const tamanoDeLinea = (l: string, i: number) => (960 - RELLENO * 4) / Math.max(1, l.length * 0.58 + (i === 0 ? logoEm : 0));
  const probar = (lineas: string[]) =>
    Math.floor(Math.min(80, ...lineas.map(tamanoDeLinea), disponible / (lineas.length * ALTO_DE_LINEA)));
  let lineas = TITULAR.map((l) => l.trim()).filter(Boolean).slice(0, 2);
  let tamano = probar(lineas);
  if (tamano < 64 && lineas.length === 2) {
    const una = [lineas.join(" ")];
    if (probar(una) > tamano) {
      lineas = una;
      tamano = probar(una);
    }
  }
  tamano = Math.max(36, tamano);
  const alto = Math.ceil(lineas.length * tamano * ALTO_DE_LINEA) + RELLENO * 2;
  const arriba = Math.round(techo + Math.max(0, (piso - techo - alto) / 2));
  return { lineas, tamano, arriba, alto, piso, logo };
};

/** Pinta con el acento las palabras de ENFASIS. */
export const ConEnfasis: React.FC<{ texto: string }> = ({ texto }) => {
  const clave = new Set(ENFASIS.map(normal));
  const partes = texto.split(/(\s+)/);
  return (
    <>
      {partes.map((p, i) =>
        clave.has(normal(p)) ? (
          <span key={i} style={{ color: colores.acento }}>
            {p}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};

export const Titular: React.FC<{ tipo: Tipo }> = ({ tipo }) => {
  const { lineas, tamano, arriba, logo } = medidasDelTitular(tipo);
  if (!lineas.length) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: arriba, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          textAlign: "center",
          fontFamily: tipografia.familia,
          fontWeight: tipografia.pesoTitular,
          fontSize: tamano,
          lineHeight: ALTO_DE_LINEA,
          letterSpacing: "-0.03em",
          color: colores.texto,
          textShadow: PILDORA.titular ? undefined : sombraFuerte,
          background: PILDORA.titular ? colores.pildora : undefined,
          borderRadius: radio.pildora,
          padding: PILDORA.titular ? `${RELLENO}px ${RELLENO * 2}px` : 0,
          whiteSpace: "nowrap",
        }}
      >
        {lineas.map((l, i) =>
          i === 0 && logo ? (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: Math.round(tamano * HUECO_EM) }}>
              <Logo slug={TITULAR_LOGO as string} alto={Math.round(tamano * LOGO_EM)} sombra={PILDORA.titular ? undefined : SOMBRA_SOBRE_TOMA} />
              <span>
                <ConEnfasis texto={l} />
              </span>
            </div>
          ) : (
            <div key={i}>
              <ConEnfasis texto={l} />
            </div>
          ),
        )}
      </div>
    </div>
  );
};
