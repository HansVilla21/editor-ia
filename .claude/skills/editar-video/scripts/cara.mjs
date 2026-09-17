/**
 * Fase 6 — dónde está la cara en ESTE video.
 *
 * Acá no hay detección local de rostros: la cara la ubica Gemini mirando cuadros del video,
 * y después la decide el ojo mirando guia.png. La coordenada del modelo es una propuesta.
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
  mediana,
  temporal,
  asegurarCarpeta,
  ALTO,
  ANCHO,
} from "./_comun.mjs";
import { preguntar, enBase64, clave } from "./_gemini.mjs";

const AYUDA = `
cara.mjs — ubica la cara del video y saca los números del encuadre

  node .claude/skills/editar-video/scripts/cara.mjs <video.mp4> <encuadre.json> \\
       [--cuadros 8] [--guia <guia.png>]

Recibe: el video ya cortado (public/<slug>/video.mp4), en 1080x1920.
Devuelve: <encuadre.json> con el centro de la cara, el tope del pelo y la punta del mentón,
          más los dos números que salen de ahí:
            corrimiento del split   = -(centro - 470)
            altura de los subtítulos en full = centro + (mentón - centro) * 1.25 + 120, tope 1560
          y guia.png: un cuadro del video con las tres líneas dibujadas encima.

VERIFICACIÓN OBLIGATORIA: mirar guia.png. Si la línea del mentón cae en el cuello, o la del
pelo en la frente, repetir con otros cuadros antes de seguir.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2));
const [video, salida] = libres;
if (!video || !salida) morir("Faltan argumentos: <video.mp4> <encuadre.json>. Probá con --ayuda.");

clave(); // Antes de sacar cuadros: si falta la clave, no tiene sentido trabajar.

const cuantos = Math.max(3, Math.round(numero(opciones.cuadros, 8)));
const guia = opciones.guia ?? join(dirname(salida), "guia.png");

const info = await sondear(video);
if (!info.video) morir("El archivo no tiene video.");
if (info.video.anchoMostrado !== ANCHO || info.video.altoMostrado !== ALTO) {
  console.log(`aviso  El video se ve ${info.video.anchoMostrado}x${info.video.altoMostrado} y no ${ANCHO}x${ALTO}.`);
  console.log("       Las coordenadas salen igual en píxeles de 1080x1920, pero conviene cortarlo primero.");
}

// Cuadros repartidos a lo largo del video, sin los bordes: al principio y al final suele moverse.
const momentos = [];
for (let i = 0; i < cuantos; i++) {
  momentos.push(Number((info.duracion * ((i + 0.5) / cuantos)).toFixed(2)));
}

const imagenes = [];
for (const [i, segundos] of momentos.entries()) {
  const destino = temporal(`-cara${i}.jpg`);
  await ffmpeg([
    "-v", "error", "-y", "-ss", String(segundos), "-i", video,
    "-frames:v", "1", "-update", "1",
    "-vf", `scale=${ANCHO}:${ALTO}:force_original_aspect_ratio=increase,crop=${ANCHO}:${ALTO}`,
    "-q:v", "4", destino,
  ]);
  imagenes.push({ indice: i, segundos, ruta: destino });
}

const instruccion = [
  `Estas son ${imagenes.length} imágenes de un mismo video vertical de ${ANCHO}x${ALTO} píxeles,`,
  "tomadas en distintos momentos. En todas aparece la misma persona hablando a cámara.",
  "",
  `Para CADA imagen, en píxeles de ${ANCHO}x${ALTO} (el origen es la esquina superior izquierda):`,
  "  centroX  = centro horizontal de la cara",
  "  centroY  = centro vertical de la cara (a la altura de la nariz)",
  "  pelo     = y del punto más alto del pelo",
  "  menton   = y de la punta del mentón (donde termina la cara, NO donde empieza el cuello)",
  "  visible  = true solo si se ve la cara entera y de frente",
  "",
  "Si en una imagen no se ve bien la cara, poné visible en false y estimá igual.",
  'Devolvé SOLO JSON: {"cuadros":[{"indice":0,"centroX":0,"centroY":0,"pelo":0,"menton":0,"visible":true}]}',
].join("\n");

const partes = imagenes.map((img) => ({
  inline_data: { mime_type: "image/jpeg", data: enBase64(img.ruta) },
}));
partes.push({ text: instruccion });

console.log(`Mandando ${imagenes.length} cuadros a Gemini…`);
let respuesta;
try {
  respuesta = await preguntar({ partes });
} catch (e) {
  morir(`\nNo pude consultar a Gemini.\n${e.message}`);
}
const { modelo, datos } = respuesta;
const lecturas = (datos?.cuadros ?? []).filter(
  (c) => Number.isFinite(Number(c.centroY)) && Number.isFinite(Number(c.menton)),
);
if (lecturas.length === 0) morir("Gemini no devolvió coordenadas utilizables. Probá otra vez o con más cuadros.");

const campo = (nombre) => lecturas.map((c) => Number(c[nombre])).filter(Number.isFinite);
const medianas = {
  centroX: mediana(campo("centroX")),
  centroY: mediana(campo("centroY")),
  pelo: mediana(campo("pelo")),
  menton: mediana(campo("menton")),
};

// Los que se apartan mucho de la mediana son errores de lectura, no movimientos de la persona.
const TOLERANCIA = 140;
const buenas = lecturas.filter(
  (c) =>
    Math.abs(Number(c.centroY) - medianas.centroY) <= TOLERANCIA &&
    Math.abs(Number(c.menton) - medianas.menton) <= TOLERANCIA,
);
const usadas = buenas.length >= 3 ? buenas : lecturas;

const valor = (nombre) => Math.round(mediana(usadas.map((c) => Number(c[nombre])).filter(Number.isFinite)));
const centroX = valor("centroX");
const centroY = valor("centroY");
const pelo = valor("pelo");
const menton = valor("menton");

const corrimientoSplit = -(centroY - 470);
const alturaSubtitulosFull = Math.min(1560, Math.round(centroY + (menton - centroY) * 1.25 + 120));

// guia.png: el cuadro del medio con las tres líneas encima. Esto es lo que hay que mirar.
const cuadroGuia = imagenes[Math.floor(imagenes.length / 2)];
asegurarCarpeta(guia);
await ffmpeg([
  "-v", "error", "-y", "-i", cuadroGuia.ruta,
  "-vf",
  [
    `drawbox=x=0:y=${pelo - 2}:w=iw:h=5:color=#5B8DEF@0.9:t=fill`,
    `drawbox=x=0:y=${centroY - 2}:w=iw:h=5:color=#3FBF87@0.9:t=fill`,
    `drawbox=x=0:y=${menton - 2}:w=iw:h=5:color=#E8B440@0.9:t=fill`,
    `drawbox=x=${centroX - 2}:y=0:w=5:h=ih:color=#E5675F@0.6:t=fill`,
    `drawbox=x=0:y=${alturaSubtitulosFull - 1}:w=iw:h=3:color=white@0.8:t=fill`,
  ].join(","),
  guia,
]);

escribirJson(salida, {
  video,
  modelo,
  cuadrosMirados: imagenes.map((i) => i.segundos),
  descartados: lecturas.length - usadas.length,
  centroX,
  centroY,
  pelo,
  menton,
  corrimientoSplit,
  alturaSubtitulosFull,
  lecturas,
});

console.log("");
console.log(`centro de la cara   x ${centroX}   y ${centroY}`);
console.log(`tope del pelo       ${pelo}`);
console.log(`punta del mentón    ${menton}`);
console.log(`alto de la cara     ${menton - pelo} px`);
console.log("");
console.log(`corrimiento del split         ${corrimientoSplit} px`);
console.log(`altura de subtítulos en full  ${alturaSubtitulosFull}${alturaSubtitulosFull === 1560 ? " (tope)" : ""}`);
console.log("");
console.log(`encuadre en ${corta(salida)}`);
console.log(`guía en     ${corta(guia)}   (azul pelo, verde centro, ámbar mentón, blanco subtítulos)`);
console.log("");
console.log(`Se usaron ${usadas.length} de ${lecturas.length} lecturas (${fijo(info.duracion)} s de video).`);
console.log("MIRAR guia.png antes de fijar el corrimiento. La coordenada de Gemini es una propuesta.");
