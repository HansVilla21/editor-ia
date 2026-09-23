/**
 * Los datos de este video. Es el ÚNICO archivo que se edita por video: el resto es el sistema.
 *
 * Todos los tiempos van en segundos del video cortado (public/<DIR>/video.mp4). Se pasan a
 * cuadros con f = round(s · 30), el mismo redondeo que usan los subtítulos: así el cambio de
 * bloque y el cambio de subtítulo caen en el mismo cuadro.
 *
 * Los valores que vienen de fábrica son un ejemplo: un video de 26 s sin archivos, que
 * renderiza igual (sin video se ve un marcador, sin audio no suena). Se reemplazan todos.
 */
import palabras from "./palabras.json";
import type { Bloque, Cta, Cue, Encuadre, Palabra, Portada } from "./tipos";

/** Carpeta de este video dentro de public/. La escribe nuevo-video.mjs: no se toca. */
export const DIR = "plantilla";

/**
 * Cuadros de public/<DIR>/video.mp4 (duración de sondear.mjs × 30, hacia abajo). El video
 * dura exactamente esto y termina en toma real: sin congelar el último cuadro.
 */
export const VIDEO_CUADROS = 785;

/**
 * Titular fijo del gancho: de 3 a 7 palabras, una o dos líneas, visible completo desde el
 * cuadro 0. Coherente con la portada.
 */
export const TITULAR: string[] = ["3 cosas que reviso", "antes de publicar"];

/** Palabras o números que van con el acento en el titular y en la portada. Los subtítulos, sin color. */
export const ENFASIS: string[] = ["3"];

/** El cierre. Desde `desde` se ocultan los subtítulos. */
export const CTA: Cta = { desde: 22.64, pide: "Comentá", palabra: "LISTA", recibe: "y te mando la guía" };

/**
 * Los bloques, en orden. Cada uno arranca en la primera palabra de su frase (el `inicio` de
 * palabras.json). Full para anunciar, split para explicar o mostrar; el gancho y el cierre en
 * full. Mínimo 1,8 s por bloque. El último se estira hasta el final del video.
 */
export const BLOQUES: Bloque[] = [
  { desde: 0, hasta: 2.99, tipo: "full" }, // "Tres cosas que reviso antes de publicar un video."
  {
    desde: 2.99,
    hasta: 7.2,
    tipo: "split",
    escena: {
      tipo: "lista",
      etiqueta: "1 / 3",
      titulo: "Que se lea",
      filas: [
        { texto: "Subtítulos cortos", en: 4.26 }, // "subtítulos"
        { texto: "Lejos de la cara", en: 5.26 }, // "lejos"
        { texto: "Nada encima", en: 6.39 }, // "nada"
      ],
    },
  }, // "Primero, que se lea: subtítulos cortos, lejos de la cara y nada encima."
  { desde: 7.2, hasta: 8.99, tipo: "full" }, // "Segundo, que se escuche bien."
  {
    desde: 8.99,
    hasta: 13.63,
    tipo: "split",
    escena: {
      tipo: "contador",
      etiqueta: "2 / 3",
      titulo: "Que se escuche",
      valor: 14,
      desde: 11.06, // "menos"
      hasta: 12.04, // fin de "LUFS"
      prefijo: "−",
      sufijo: " LUFS",
      nota: "el volumen que piden las redes",
    },
  }, // "La voz manda, y el master queda en menos catorce LUFS, lo que piden las redes."
  { desde: 13.63, hasta: 15.8, tipo: "full" }, // "Y tercero, mirar antes de renderizar."
  {
    desde: 15.8,
    hasta: 19.28,
    tipo: "split",
    escena: {
      tipo: "comando",
      etiqueta: "3 / 3",
      titulo: "Mirar antes de renderizar",
      fuente: "previa.mjs",
      texto: 'previa.mjs src/entries/mi-video.tsx MiVideo previa "0,90,240"',
      en: 15.99, // "comando"
      salida: ["3 cuadros en 1 hoja(s).", "Mirarlas antes de renderizar."],
    },
  }, // "Un comando saca los cuadros clave y los reviso uno por uno."
  {
    desde: 19.28,
    hasta: 22.64,
    tipo: "split",
    escena: {
      tipo: "tarjeta",
      etiqueta: "3 / 3",
      titulo: "Nada tapa la cara",
      imagen: "captura.jpg",
      texto: ["Cuadro 0: el titular no toca el pelo", "Cuadro 90: el subtítulo, lejos del mentón", "Cuadro 240: la cabecera entra entera"],
    },
  }, // "Si algo tapa la cara, se corrige antes del render final." (sub-escena: corte seco)
  { desde: 22.64, hasta: 26.17, tipo: "full" }, // "Comentá LISTA y te mando la guía completa."
];

/**
 * Jump cuts del corte de silencios, en segundos: los `inicioSalida` de tramos.json (o sus
 * `cortes` divididos por 30). En cada uno el zoom alterna entre 1,0 y el segundo nivel.
 */
export const CORTES: number[] = [1.34, 3.93, 5.26, 9.84, 12.17, 14.28, 16.41, 18.05, 20.6, 23.39];

/**
 * Dónde está la cara, de encuadre.json (cara.mjs), verificado mirando guia.png. Nunca
 * reciclar los números de otro video.
 */
export const ENCUADRE: Encuadre = { cy: 820, pelo: 600, menton: 1020 };

/**
 * Efectos extra, sincronizados con su gráfico: el pico cae en el segundo `en`. Los de las
 * transiciones, las filas de las listas, los contadores, el tipeo y el cierre ya los pone
 * Sonido.tsx solo.
 */
export const CUES: Cue[] = [
  { clave: "bleep", en: 16.41 }, // "saca"
  { clave: "ok", en: 22.15 }, // "final"
];

/** Píldora oscura detrás del texto, para fondos claros o con ruido y ropa clara. */
export const PILDORA = { titular: false, subtitulos: false };

/** La portada: se arma sobre public/<DIR>/portada.png, un cuadro extraído de la grabación. */
export const PORTADA: Portada = {
  etiqueta: "ANTES DE PUBLICAR",
  titulo: "3 cosas",
  subtitulo: "que reviso en cada video",
  items: ["Que se lea", "Que se escuche", "Mirar cuadros"],
};

/** Lo que dijo, palabra por palabra (palabras.mjs), con los nombres propios bien escritos. */
export const PALABRAS: Palabra[] = palabras;
