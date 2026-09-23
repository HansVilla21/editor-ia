/**
 * Titular fijo del gancho: visible completo desde el cuadro 0, sin animación de entrada (el
 * primer cuadro es la vista previa del feed). Vive en el bloque del gancho y sale con su
 * transición.
 *
 * Va arriba, entre y = 240 (debajo de la interfaz de la app) y el tope del pelo menos 40 px,
 * calculado con el zoom mayor. Nunca sobre la cara: si no entra, pasa a una línea o se achica.
 */
import React from "react";
import { normal } from "./anim";
import { ENFASIS, PILDORA, TITULAR } from "./datos";
import { peloEnPantalla, type Tipo, ZONA } from "./encuadre";
import { colores, radio, sombraFuerte, tipografia } from "./marca";
import { tamanoQueEntra } from "./piezas";

const ALTO_DE_LINEA = 1.04;
const RELLENO = PILDORA.titular ? 14 : 0;

/** Dónde y a qué tamaño va el titular. Lo usa también revision.ts para avisar si quedó chico. */
export const medidasDelTitular = (tipo: Tipo) => {
  const techo = ZONA.arriba;
  const piso = Math.round(peloEnPantalla(tipo) - 40);
  const disponible = piso - techo - RELLENO * 2;
  const probar = (lineas: string[]) =>
    Math.floor(
      Math.min(80, ...lineas.map((l) => tamanoQueEntra(l, 80, 960 - RELLENO * 4, 0.58)), disponible / (lineas.length * ALTO_DE_LINEA)),
    );
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
  return { lineas, tamano, arriba, alto, piso };
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
  const { lineas, tamano, arriba } = medidasDelTitular(tipo);
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
        {lineas.map((l, i) => (
          <div key={i}>
            <ConEnfasis texto={l} />
          </div>
        ))}
      </div>
    </div>
  );
};
