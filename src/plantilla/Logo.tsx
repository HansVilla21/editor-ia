/**
 * Logos de marcas, de public/logos/ (los baja logo.mjs, con permiso). En datos.ts va el slug que
 * imprime logo.mjs: logo: "github". Si el archivo no está, no se dibuja nada y lo demás se
 * acomoda como si no hubiera logo: un clon recién bajado renderiza igual.
 *
 * Qué archivo se usa, en este orden:
 *   <slug>-oficial.svg o .png   el oficial del kit de prensa (logo.mjs --importar): tal cual
 *   <slug>-blanco.svg           la versión blanca (logo.mjs --blanco), sobre fondo oscuro
 *   <slug>.svg                  el de Simple Icons, de una sola tinta (negra): sobre fondo oscuro
 *                               se pasa a blanco con un filtro; sobre fondo claro va negro
 * Nunca otro color, nunca deformado: el alto manda y el ancho sale de su proporción, hasta 2,5
 * veces el alto en los oficiales anchos (los que traen el nombre escrito).
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { hay } from "./archivos";
import { colores } from "./marca";

/** El fondo sobre el que va el logo. */
export type Fondo = "oscuro" | "claro";

const CARPETA = "logos";
const A_BLANCO = "brightness(0) invert(1)";
const A_NEGRO = "brightness(0)";

/** La sombra de los textos grandes sobre la toma (sombraFuerte), como filtro para una imagen. */
export const SOMBRA_SOBRE_TOMA = "drop-shadow(0 3px 18px rgba(0,0,0,.7)) drop-shadow(0 1px 4px rgba(0,0,0,.8))";

const esClaro = (hex: string) => {
  const h = hex.replace("#", "");
  const largo = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(largo.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
};

/**
 * El fondo de los textos de la marca (panel, titular, portada): si el texto es claro, el fondo
 * es oscuro y el logo de una tinta va blanco, como el texto. Si mi-marca pone texto oscuro, negro.
 */
export const FONDO_DEL_TEXTO: Fondo = esClaro(colores.texto) ? "oscuro" : "claro";

type Elegido = { ruta: string; filtro?: string; cuadrado: boolean };

/** Los de Simple Icons son cuadrados; un oficial puede ser ancho, y se achica hasta entrar acá. */
const PROPORCION_MAXIMA = 2.5;

/** Qué archivo usar para ese slug sobre ese fondo, o null si no hay ninguno. */
export const archivoDelLogo = (slug: string, fondo: Fondo = FONDO_DEL_TEXTO): Elegido | null => {
  const ruta = (nombre: string) => `${CARPETA}/${nombre}`;
  for (const extension of [".svg", ".png"]) {
    const oficial = ruta(`${slug}-oficial${extension}`);
    if (hay(oficial)) return { ruta: oficial, cuadrado: false };
  }
  const blanco = ruta(`${slug}-blanco.svg`);
  const simple = ruta(`${slug}.svg`);
  if (fondo === "oscuro") {
    if (hay(blanco)) return { ruta: blanco, cuadrado: true };
    if (hay(simple)) return { ruta: simple, filtro: A_BLANCO, cuadrado: true };
  } else {
    if (hay(simple)) return { ruta: simple, cuadrado: true };
    if (hay(blanco)) return { ruta: blanco, filtro: A_NEGRO, cuadrado: true };
  }
  return null;
};

/** ¿Hay archivo para este logo? Sin slug, no. */
export const hayLogo = (slug?: string | null): slug is string => Boolean(slug) && archivoDelLogo(slug as string) !== null;

/** El ancho que puede ocupar el logo a ese alto: para reservarle lugar al lado de un texto. */
export const anchoDelLogo = (slug: string, alto: number, fondo: Fondo = FONDO_DEL_TEXTO) => {
  const elegido = archivoDelLogo(slug, fondo);
  return elegido ? Math.round(alto * (elegido.cuadrado ? 1 : PROPORCION_MAXIMA)) : 0;
};

/** Los slugs pedidos que no tienen archivo en public/logos/, sin repetir. Para los avisos. */
export const logosQueFaltan = (slugs: (string | null | undefined)[]) =>
  [...new Set(slugs.filter((s): s is string => Boolean(s)))].filter((s) => !hayLogo(s));

type Props = {
  slug: string;
  /** Alto en píxeles. El ancho sale de la proporción del archivo. */
  alto: number;
  fondo?: Fondo;
  /** Filtro extra, como SOMBRA_SOBRE_TOMA cuando va sobre el video. */
  sombra?: string;
  /** Para la animación de entrada (pop, blurIn): va en una caja aparte, sin pisar el filtro. */
  style?: React.CSSProperties;
};

export const Logo: React.FC<Props> = ({ slug, alto, fondo = FONDO_DEL_TEXTO, sombra, style }) => {
  const elegido = archivoDelLogo(slug, fondo);
  if (!elegido) return null;
  const filtro = [elegido.filtro, sombra].filter(Boolean).join(" ");
  return (
    <div style={{ display: "flex", flex: "none", ...style }}>
      <Img
        src={staticFile(elegido.ruta)}
        style={{
          height: alto,
          width: elegido.cuadrado ? alto : "auto",
          maxWidth: anchoDelLogo(slug, alto, fondo),
          objectFit: "contain",
          filter: filtro || undefined,
        }}
      />
    </div>
  );
};
