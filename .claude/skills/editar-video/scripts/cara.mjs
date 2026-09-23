/**
 * Fase 6 — dónde está la cara en ESTE video.
 *
 * Acá no hay detección local de rostros: la cara la ubica Gemini, cuadro por cuadro, con su
 * salida nativa de detección (cajas `box_2d` normalizadas de 0 a 1000), que es mucho más
 * estable que pedirle píxeles sueltos. Las cuentas están en _encuadre.mjs. Después la decide
 * el ojo mirando guia.png: la coordenada del modelo es una propuesta.
 *
 * Nunca reciclar los números de otro video: cambian la distancia a la cámara, la silla y el
 * recorte, y un número viejo corta la cabeza o pone el subtítulo sobre el mentón.
 */
import { dirname, join } from "node:path";

import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  sondear,
  ffmpeg,
  escribirJson,
  corta,
  fijo,
  temporal,
  asegurarCarpeta,
  ALTO,
  ANCHO,
} from "./_comun.mjs";
import { preguntar, enBase64, clave } from "./_gemini.mjs";
import { medirCuadro, resumirEncuadre, SIN_RESPUESTA } from "./_encuadre.mjs";

const AYUDA = `
cara.mjs — ubica la cara del video y saca los números del encuadre

  node .claude/skills/editar-video/scripts/cara.mjs <video.mp4> <encuadre.json> \\
       [--cuadros 8] [--guia <guia.png>]

Recibe: el video ya cortado (public/<slug>/video.mp4), de 1080x1920 o 1440x2560.
Cómo: saca --cuadros cuadros repartidos por el video y, por cada uno, le pide a Gemini dos cajas
      (box_2d, de 0 a 1000): la cara (frente a mentón, oreja a oreja) y la cabeza con el pelo.
      Descarta los cuadros sin cara, las cajas absurdas (una cara de menos del 6 % o más del
      45 % del alto, o con el centro fuera del 80 % del medio) y los que se apartan de la
      mediana más de media cara, y se queda con la mediana de los que quedan.
Devuelve: <encuadre.json>, en píxeles de la composición de 1080x1920 (el video la cubre):
            cy      centro de la caja de la cara (a la altura de la nariz)
            pelo    borde de arriba de la caja de la cabeza (pelo, gorra)
            menton  borde de abajo de la caja de la cara
            corrimientoSplit = -(cy - 470)
            subtitulosFull   = cy + (menton - cy) * 1.25 + 120, tope 1560
            cuadros          lo que se leyó en cada cuadro y si se usó
          y guia.png: un cuadro del video, del tamaño de la composición, con las líneas encima.

GEMINI_MODEL (en el entorno o en .env) elige el modelo; si no, gemini-pro-latest y respaldos.

VERIFICACIÓN OBLIGATORIA: mirar guia.png. La azul tiene que tocar lo más alto del pelo o la
gorra, la verde cruzar la nariz, la ámbar la punta del mentón, y la blanca (subtítulos) caer
debajo del mentón. Si no, repetir con más cuadros (--cuadros 16) antes de seguir.
`;

/** Lo que se le pide a Gemini por cada cuadro: su formato nativo de detección. */
const INSTRUCCION = [
  "Detectá a la persona que habla a cámara en esta imagen y devolvé dos cajas delimitadoras:",
  '  "cara":   la cara sola, desde el borde de arriba de la frente (donde empieza el pelo o la',
  "            visera) hasta la punta del mentón, y de oreja a oreja. Sin cuello y sin pelo.",
  '  "cabeza": la cabeza entera, desde lo más alto del pelo, la gorra o el sombrero hasta la',
  "            punta del mentón.",
  'Cada caja como "box_2d": [ymin, xmin, ymax, xmax], normalizada de 0 a 1000 respecto de la',
  "imagen entera. Si no se ve la cara (no hay nadie, está de espaldas, o mira tan abajo que la",
  "visera o el pelo la tapan), devolvé [].",
  'Devolvé SOLO JSON: [{"label":"cara","box_2d":[ymin,xmin,ymax,xmax]},' +
    '{"label":"cabeza","box_2d":[ymin,xmin,ymax,xmax]}]',
].join("\n");

/** Cuántas consultas a la vez: más que esto choca con la cuota gratuita. */
const EN_PARALELO = 3;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [video, salida] = libres;
if (!video || !salida) morir("Faltan argumentos: <video.mp4> <encuadre.json>. Probá con --ayuda.");

clave(); // Antes de sacar cuadros: si falta la clave, no tiene sentido trabajar.

const cuantos = Math.max(3, Math.round(numero(opciones.cuadros, 8)));
const guia = opciones.guia ?? join(dirname(salida), "guia.png");

const info = await sondear(video);
if (!info.video) morir("El archivo no tiene video.");
// Rotación ya aplicada: ffmpeg entrega los cuadros derechos, del tamaño que se ve.
const tamano = { ancho: info.video.anchoMostrado, alto: info.video.altoMostrado };
if (Math.abs(tamano.ancho / tamano.alto - ANCHO / ALTO) > 0.01) {
  console.log(`aviso  El video se ve ${tamano.ancho}x${tamano.alto}, que no es vertical 9:16.`);
  console.log(`       Las coordenadas salen en la composición de ${ANCHO}x${ALTO}, con el video recortado al centro.`);
}

// Cuadros repartidos a lo largo del video, sin los bordes: al principio y al final suele moverse.
const momentos = [];
for (let i = 0; i < cuantos; i++) {
  momentos.push(Number((info.duracion * ((i + 0.5) / cuantos)).toFixed(2)));
}

/** Cada cuadro a su tamaño real: la caja de Gemini es relativa a la imagen que recibe. */
async function sacarCuadro(segundos) {
  const destino = temporal("-cara.jpg");
  await ffmpeg([
    "-v", "error", "-y", "-ss", String(segundos), "-i", video,
    "-frames:v", "1", "-update", "1", "-q:v", "3", destino,
  ]);
  return destino;
}

async function leerCuadro(segundos) {
  const imagen = await sacarCuadro(segundos);
  try {
    const { modelo, datos } = await preguntar({
      partes: [{ inline_data: { mime_type: "image/jpeg", data: enBase64(imagen) } }, { text: INSTRUCCION }],
    });
    return { segundos, modelo, ...medirCuadro(datos, tamano) };
  } catch (e) {
    return { segundos, usado: false, motivo: `${SIN_RESPUESTA}: ${String(e.message).slice(0, 120)}` };
  }
}

/** Corre `tarea` sobre cada elemento, de a `n` a la vez, y devuelve los resultados en orden. */
async function deA(n, elementos, tarea) {
  const resultados = new Array(elementos.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < elementos.length) {
      const i = siguiente++;
      resultados[i] = await tarea(elementos[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, elementos.length) }, trabajador));
  return resultados;
}

/** Una línea por cuadro: lo que leyó y, si no cuenta, por qué. */
function mostrar(lista) {
  console.log("");
  for (const c of lista) {
    const cuando = `t ${fijo(c.segundos).padStart(6)} s`;
    const descarte = c.usado ? "" : `descartado: ${c.motivo}`;
    if (!Number.isFinite(c.cy)) {
      console.log(`  ${cuando}   ${descarte}`);
      continue;
    }
    const n = (v) => (Number.isFinite(v) ? String(Math.round(v)) : "—").padStart(4);
    console.log(
      `  ${cuando}   pelo ${n(c.pelo)}   centro ${n(c.cy)}   mentón ${n(c.menton)}   x ${n(c.cx)}` +
        `   ${descarte || `(${c.modelo})`}`,
    );
  }
}

console.log(`Mandando ${momentos.length} cuadros de ${tamano.ancho}x${tamano.alto} a Gemini, uno por consulta…`);
const lecturas = await deA(EN_PARALELO, momentos, leerCuadro);

let encuadre;
try {
  encuadre = resumirEncuadre(lecturas);
} catch (e) {
  mostrar(lecturas);
  morir(`\n${e.message}`);
}
const { cx, cy, pelo, menton, corrimientoSplit, subtitulosFull, usados, mirados, avisos, cuadros } = encuadre;
mostrar(cuadros);

// guia.png: el cuadro usado más parecido a la mediana, del tamaño de la composición (el video
// la cubre, igual que en Remotion), con las líneas encima. Esto es lo que hay que mirar.
const usadosOrden = cuadros.filter((c) => c.usado).sort((a, b) => Math.abs(a.cy - cy) - Math.abs(b.cy - cy));
const cuadroGuia = usadosOrden[0];
const linea = (y, color, grosor = 5) =>
  `drawbox=x=0:y=${Math.round(y - grosor / 2)}:w=iw:h=${grosor}:color=${color}:t=fill`;
asegurarCarpeta(guia);
await ffmpeg([
  "-v", "error", "-y", "-ss", String(cuadroGuia.segundos), "-i", video, "-frames:v", "1", "-update", "1",
  "-vf",
  [
    `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO}`,
    linea(pelo, "#5B8DEF@0.9"),
    linea(cy, "#3FBF87@0.9"),
    linea(menton, "#E8B440@0.9"),
    `drawbox=x=${cx - 2}:y=0:w=5:h=ih:color=#E5675F@0.6:t=fill`,
    linea(subtitulosFull, "white@0.8", 3),
  ].join(","),
  guia,
]);

const redondo = (v) => (Number.isFinite(v) ? Math.round(v * 10) / 10 : v);
escribirJson(salida, {
  cy,
  pelo,
  menton,
  corrimientoSplit,
  subtitulosFull,
  cx,
  usados,
  mirados,
  video,
  tamanoVideo: `${tamano.ancho}x${tamano.alto}`,
  modelos: [...new Set(cuadros.filter((c) => c.modelo).map((c) => c.modelo))],
  cuadros: cuadros.map((c) => ({
    segundos: c.segundos,
    usado: c.usado,
    ...(c.motivo ? { motivo: c.motivo } : {}),
    // También los lejanos de la mediana: su lectura queda a la vista aunque no cuente.
    ...(Number.isFinite(c.cy)
      ? { cy: redondo(c.cy), pelo: redondo(c.pelo), menton: redondo(c.menton), frente: redondo(c.frente), cx: redondo(c.cx) }
      : {}),
    ...(c.cajas ? { cajas: c.cajas } : {}),
    ...(c.modelo ? { modelo: c.modelo } : {}),
  })),
});

const centros = cuadros.filter((c) => c.usado).map((c) => c.cy);
console.log("");
console.log(`centro de la cara   x ${cx}   y ${cy}`);
console.log(`tope del pelo       ${pelo}`);
console.log(`punta del mentón    ${menton}`);
console.log(`de pelo a mentón    ${menton - pelo} px`);
console.log("");
console.log(`corrimiento del split         ${corrimientoSplit} px`);
console.log(`altura de subtítulos en full  ${subtitulosFull}${subtitulosFull === 1560 ? " (tope)" : ""}`);
console.log("");
console.log(`encuadre en ${corta(salida)}`);
console.log(`guía en     ${corta(guia)}   (azul pelo, verde centro, ámbar mentón, blanco subtítulos)`);
console.log("");
console.log(
  `Se usaron ${usados} de ${mirados} cuadros (${fijo(info.duracion)} s de video); ` +
    `el centro varió entre ${Math.round(Math.min(...centros))} y ${Math.round(Math.max(...centros))}.`,
);
if (usados * 2 < mirados) console.log("aviso  Sirvieron menos de la mitad de los cuadros: mirar guia.png con más cuidado.");
for (const a of avisos) console.log(`aviso  ${a}`);
console.log("MIRAR guia.png antes de fijar el corrimiento. La coordenada de Gemini es una propuesta.");
