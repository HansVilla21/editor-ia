/**
 * La forma de los datos de un video. Los valores van en datos.ts; acá solo está qué campos hay
 * y qué significa cada uno.
 */
import type catalogo from "../../.claude/skills/editar-video/referencias/efectos.json";

/** Una clave del catálogo de efectos (referencias/efectos.json): whooshIn, pop, click… */
export type ClaveEfecto = keyof typeof catalogo.efectos;

/** Una palabra con su tiempo, tal como la escribe palabras.mjs. */
export type Palabra = {
  texto: string;
  /** Segundos del video cortado. */
  inicio: number;
  fin: number;
  cuadroInicio?: number;
  cuadroFin?: number;
};

/** Cabecera del panel: etiqueta arriba a la izquierda, tags a la derecha, título, fuente y logo. */
type Cabecera = {
  /** Tipo y posición, corto: "PASO 1 / 3". Va en monoespaciada con el acento. */
  etiqueta?: string;
  /** Tags a la derecha de la etiqueta: "OFICIAL", "GRATIS". Uno o dos. */
  tags?: string[];
  /** El título grande. Si es largo, se achica solo para entrar en una línea. */
  titulo: string;
  /** De dónde sale lo que se muestra: "github.com/dueño/repo", "nombre-de-la-web.com". */
  fuente?: string;
  /**
   * La marca de la que habla la escena: el slug de public/logos/ que imprime logo.mjs ("github").
   * Va a la izquierda del título, de 64 px. Si el archivo no está, el título va solo.
   */
  logo?: string;
};

export type Estado = "ok" | "alerta" | "error";

/** Lo que muestra el panel de un bloque split. Una idea por escena. */
export type Escena =
  | (Cabecera & {
      tipo: "tarjeta";
      /** Captura en public/<DIR>/ (captura.mjs). Se muestra en una tarjeta clara, con paneo. */
      imagen?: string;
      /** Si no hay imagen: renglones de texto dentro de la tarjeta. */
      texto?: string[];
      /**
       * Si no hay imagen pero sí `logo`, el logo va grande en la tarjeta (y no se repite en la
       * cabecera), con el primer renglón de `texto` como pie. Entra con pop en este segundo: la
       * palabra que nombra la marca. Por defecto, cuando entra la tarjeta.
       */
      logoEn?: number;
    })
  | (Cabecera & {
      tipo: "lista";
      /** Cada fila entra con blurIn en el segundo `en` (la palabra que la nombra). Hasta 4 se ven cómodas. */
      filas: { texto: string; en: number; estado?: Estado }[];
    })
  | (Cabecera & {
      tipo: "contador";
      /** La cifra final. Verificada contra la fuente: nunca un número inventado. */
      valor: number;
      /** Segundo de la palabra que anuncia la cifra: ahí arranca a contar. */
      desde: number;
      /** Segundo en que termina de decir el número: ahí llega al valor. Por defecto, desde + 1. */
      hasta?: number;
      prefijo?: string;
      sufijo?: string;
      /** Una línea chica debajo del número. */
      nota?: string;
    })
  | (Cabecera & {
      tipo: "comando";
      /** Lo que se tipea, a 1,2 caracteres por cuadro. Secretos siempre enmascarados. */
      texto: string;
      /** Segundo en que arranca el tipeo. */
      en: number;
      /** Renglones de respuesta, que entran cuando termina el tipeo. */
      salida?: string[];
    });

/**
 * Un bloque del video, en segundos. Full = la cara a pantalla completa; split = la cara arriba
 * (0 a 960) y el panel abajo (960 a 1920). Dos split seguidos son sub-escenas: corte seco, sin
 * transición. La transición va solo donde cambia el tipo.
 */
export type Bloque = {
  desde: number;
  hasta: number;
  tipo: "full" | "split";
  /** Solo en split. En full no se pone nada encima de la cara. */
  escena?: Escena;
};

/** Dónde está la cara, en píxeles de 1080x1920 (de encuadre.json, verificado con guia.png). */
export type Encuadre = {
  /** Centro de la cara. */
  cy: number;
  /** Tope del pelo. */
  pelo: number;
  /** Punta del mentón. */
  menton: number;
  /** Centro horizontal de la cara, si se midió. Por defecto 540. */
  cx?: number;
};

/** Un efecto de sonido: su pico cae en el segundo `en`. */
export type Cue = {
  clave: ClaveEfecto;
  en: number;
  /** Multiplica el volumen del catálogo (1 = como está). */
  vol?: number;
  /** Para archivos largos: cuántos segundos suena, con un fade de 5 cuadros al final. */
  dura?: number;
};

/** El cierre: "Comentá PALABRA y te mando…". */
export type Cta = {
  /** Segundo de la primera palabra del cierre. Desde ahí se ocultan los subtítulos. */
  desde: number;
  /** El verbo, en el trato de la persona ("Trato" en memory/preferencias.md): "Comentá", "Comenta", "Escribí"… */
  pide: string;
  /** La palabra que tienen que comentar. Va grande y con el acento. */
  palabra: string;
  /** Qué reciben a cambio. */
  recibe: string;
};

export type Portada = {
  /** Línea chica en monoespaciada, arriba del título. */
  etiqueta?: string;
  /** Corto y grande: "3 cosas". Los números de ENFASIS salen con el acento. */
  titulo: string;
  subtitulo?: string;
  /** Chips numerados debajo: los ítems del video. */
  items?: string[];
  /** La marca de la que trata el video (slug de public/logos/): va arriba de la etiqueta. */
  logo?: string;
};
