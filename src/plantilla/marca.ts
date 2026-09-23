/**
 * Los colores y las tipografías de los videos.
 *
 * Arranca con el estilo neutro: un punto de partida que se ve bien apenas instalás, no el
 * estilo definitivo de nadie. Lo que la persona escriba en su skill `mi-marca` se carga en
 * MI_MARCA, acá abajo, y es lo ÚNICO que hay que tocar: todo lo demás se deriva de ahí.
 *
 * Se carga en la base que copia `npm run nuevo`, así cada video nuevo sale con la marca.
 * Los videos ya hechos conservan la que tenían: volver a renderizarlos no les cambia la cara.
 */

// Para usar una tipografía de Google Fonts, se importa acá y se pone su fontFamily en MI_MARCA.
// Ejemplo (ya viene instalado @remotion/google-fonts):
//   import { loadFont } from "@remotion/google-fonts/Montserrat";
//   const titulares = loadFont("normal", { weights: ["800"], subsets: ["latin", "latin-ext"] }).fontFamily;

type Hex = string;

type MarcaPropia = {
  colores?: {
    /** Fondo de los paneles y la portada. */
    fondo?: Hex;
    /** Texto principal, sobre el fondo. */
    texto?: Hex;
    /** El que identifica: la palabra clave, el número importante, la barra del panel. */
    acento?: Hex;
    /** Etiquetas, fuentes, notas. */
    textoSuave?: Hex;
    bien?: Hex;
    atencion?: Hex;
    error?: Hex;
  };
  tipografia?: {
    /** Titular, títulos del panel, cierre, portada. */
    titulares?: string;
    pesoTitulares?: number;
    /** Subtítulos. */
    subtitulos?: string;
    pesoSubtitulos?: number;
    /** Cifras, etiquetas, comandos: mejor de ancho fijo. */
    datos?: string;
  };
};

/** Lo que dice mi-marca. Vacío = estilo neutro. Un valor por campo, sin inventar los que faltan. */
export const MI_MARCA: MarcaPropia = {
  // colores: { acento: "#E8543F" },
  // tipografia: { titulares: titulares, pesoTitulares: 800 },
};

const SISTEMA = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace";

const c = MI_MARCA.colores ?? {};
const t = MI_MARCA.tipografia ?? {};

export const colores = {
  fondo: c.fondo ?? "#0B0F16",
  /** Arriba del degradado del panel. */
  fondoPanel: "#161A22",
  /** Tarjetas y filas. */
  superficie: "#141821",
  borde: "#272C36",
  texto: c.texto ?? "#FFFFFF",
  textoSuave: c.textoSuave ?? "#A3ADBA",
  acento: c.acento ?? "#5B8DEF",
  bien: c.bien ?? "#3FBF87",
  atencion: c.atencion ?? "#E8B440",
  error: c.error ?? "#E5675F",
  /** Píldora detrás del texto cuando el fondo es claro o tiene ruido. */
  pildora: "rgba(11,15,22,0.72)",
};

export const tipografia = {
  familia: t.titulares ?? SISTEMA,
  subtitulos: t.subtitulos ?? t.titulares ?? SISTEMA,
  mono: t.datos ?? MONO,
  pesoTitular: t.pesoTitulares ?? 800,
  pesoCuerpo: 500,
};

/** Subtítulos: legibles sobre cualquier fondo, sin tapar la cara. */
export const subtitulos = {
  tamano: 58,
  peso: t.pesoSubtitulos ?? 800,
  espaciado: "-0.02em",
  sombra: "0 2px 12px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.7)",
};

/** Sombra de los textos grandes sobre la toma (titular, cierre). */
export const sombraFuerte = "0 3px 18px rgba(0,0,0,.7), 0 1px 4px rgba(0,0,0,.8)";

/** Radios de las tarjetas y de las píldoras. */
export const radio = { tarjeta: 12, pildora: 16, tag: 8 };
