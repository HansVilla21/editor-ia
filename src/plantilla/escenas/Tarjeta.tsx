/**
 * Tarjeta: una captura de pantalla dentro de una tarjeta clara, con paneo a lo largo de la frase
 * (escala 1,4, se desplaza hasta el 40 % con inOut cúbico). Si la captura todavía no está en
 * public/ pero sí el logo de `logo`, muestra el logo grande con pop en su palabra; si tampoco,
 * los renglones de `texto`. Si falta la captura, avisa qué archivo falta.
 */
import React from "react";
import { Easing, Img, useCurrentFrame } from "remotion";
import { blurIn, lerp, pop } from "../anim";
import { delVideo, hayDelVideo, srcDelVideo } from "../archivos";
import { hayLogo, Logo } from "../Logo";
import { colores, radio, tipografia } from "../marca";
import { ANCHO_UTIL, CUERPO, tamanoQueEntra } from "../piezas";
import { type BloqueEnCuadros, f } from "../tiempos";
import type { Escena } from "../tipos";

type EscenaTarjeta = Extract<Escena, { tipo: "tarjeta" }>;
type Props = { escena: EscenaTarjeta; bloque: BloqueEnCuadros };

const TINTA = "#1B2230";
const TINTA_SUAVE = "#6B7380";

const hayCaptura = (escena: EscenaTarjeta) => Boolean(escena.imagen) && hayDelVideo(escena.imagen as string);

/** ¿La tarjeta muestra el logo grande? Solo si no hay captura y el logo está en public/logos/. */
export const logoGrandeEnTarjeta = (escena: Escena) =>
  escena.tipo === "tarjeta" && !hayCaptura(escena) && hayLogo(escena.logo);

const FaltaCaptura: React.FC<{ imagen: string }> = ({ imagen }) => (
  <div style={{ position: "absolute", left: 40, right: 40, bottom: 24, fontFamily: tipografia.mono, fontSize: 20, color: TINTA_SUAVE }}>
    falta public/{delVideo(imagen)}
  </div>
);

/** El logo de la marca, de 260 a 300 px según haya pie, con pop en la palabra que la nombra. */
const LogoGrande: React.FC<Props> = ({ escena, bloque }) => {
  const cuadro = useCurrentFrame();
  const f0 = Math.max(bloque.desdeF + 2, escena.logoEn === undefined ? 0 : f(escena.logoEn));
  const pie = escena.texto?.[0];
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        // Si abajo va el aviso de la captura que falta, el logo y el pie se centran arriba de él.
        paddingBottom: escena.imagen ? 44 : 0,
      }}
    >
      <Logo slug={escena.logo as string} alto={pie ? 260 : 300} fondo="claro" style={pop(cuadro, f0)} />
      {pie ? (
        <div
          style={{
            fontFamily: tipografia.familia,
            fontWeight: 700,
            fontSize: tamanoQueEntra(pie, 40, ANCHO_UTIL - 80),
            color: TINTA,
            whiteSpace: "nowrap",
            // El pie entra con la tarjeta, para que no quede en blanco hasta que se nombra la marca.
            ...blurIn(cuadro, bloque.desdeF + 4),
          }}
        >
          {pie}
        </div>
      ) : null}
    </div>
  );
};

export const Tarjeta: React.FC<Props> = ({ escena, bloque }) => {
  const cuadro = useCurrentFrame();
  const hayImagen = hayCaptura(escena);
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
      ) : logoGrandeEnTarjeta(escena) ? (
        <LogoGrande escena={escena} bloque={bloque} />
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
        </div>
      )}
      {!hayImagen && escena.imagen ? <FaltaCaptura imagen={escena.imagen} /> : null}
    </div>
  );
};
