/**
 * Borrador de análisis de un video de referencia, con Gemini.
 *
 * Gemini propone, los cuadros deciden: esto no mide nada. Sube el video, le pregunta al modelo
 * qué ve con el enfoque de la persona, y escribe un markdown marcado como BORRADOR que dice qué
 * mirar y en qué segundo. El analista después lo verifica cuadro por cuadro.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";

import {
  ayuda,
  asegurarCarpeta,
  corta,
  esPrincipal,
  leerArgumentos,
  morir,
  sondear,
} from "../../editar-video/scripts/_comun.mjs";
import { borrarArchivo, clave, mimeDe, preguntar, subirArchivo } from "../../editar-video/scripts/_gemini.mjs";
import { armarMarkdown, armarPrompt, muestreoPara } from "./_borrador.mjs";

const AYUDA = `
borrador.mjs — un borrador de análisis de un video de referencia, hecho por Gemini

  node .claude/skills/estudiar-referentes/scripts/borrador.mjs <video> <salida.md> --enfoque "<lo que le gusta a la persona>"

Recibe: el video de referencia (mp4, mov o webm) y la frase de la persona sobre qué le gusta de
        él, con sus palabras. Si la frase es deducida, pasala igual y decilo: --enfoque "deducido: …"
Devuelve: <salida.md>, un BORRADOR SIN VERIFICAR con qué mirar y en qué segundo —cortes,
          transiciones, texto en pantalla, gráficos, ritmo, sonido y la estructura de lo que dice—,
          con los cuadros para verificar cada punto.

Opciones:
  --muestreo 5   cuántos cuadros por segundo mira Gemini (1 a 24; por defecto 5). En videos
                 largos baja solo, para no pasar de 600 cuadros.

Gemini propone, los cuadros deciden: ningún dato del borrador entra a un informe ni al estilo sin
verlo en un cuadro. Lo único medido es la ficha de arriba (ffprobe).

Necesita la clave de Gemini en .env. Tarda de uno a tres minutos. El video se borra de Gemini
al terminar. Si <salida.md> ya existe y no es un borrador, no lo pisa.
`;

const MAXIMO_BYTES = 2e9; // Lo más que acepta la API de archivos de Gemini.

/** La fecha local de hoy como AAAA-MM-DD. */
function hoy(d = new Date()) {
  const dos = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/**
 * Sube el video, pregunta y lo borra de Gemini pase lo que pase. Devuelve {modelo, datos}.
 * `ficha` es lo medido: {duracion, fps, ancho, alto}.
 */
export async function pedirBorrador({ video, enfoque, ficha, muestreo }) {
  const instruccion = armarPrompt({ enfoque, ficha, muestreo });
  let archivo;
  try {
    archivo = await subirArchivo(video, mimeDe(video));
    const { modelo, datos } = await preguntar({
      partes: [
        { file_data: { file_uri: archivo.uri, mime_type: archivo.mimeType }, video_metadata: { fps: muestreo } },
        { text: instruccion },
      ],
    });
    return { modelo, datos };
  } finally {
    await borrarArchivo(archivo);
  }
}

/** Un archivo que ya existe solo se reemplaza si es un borrador anterior. */
const esBorrador = (ruta) => readFileSync(ruta, "utf8").startsWith("# BORRADOR");

export async function principal(argv) {
  ayuda(argv, AYUDA);
  const { libres, opciones } = leerArgumentos(argv);
  const [video, salida] = libres;
  if (!video || !salida) morir('Faltan argumentos: <video> <salida.md> --enfoque "<lo que le gusta>". Probá con --ayuda.');

  const enfoque = String(opciones.enfoque ?? "").trim();
  if (!enfoque) {
    morir(
      [
        'Falta --enfoque "<lo que le gusta a la persona de este video>".',
        "Una referencia vale por lo que la persona dijo que le gusta de ella: sin esa frase, el borrador",
        'no tiene norte. Si no la dijo, preguntásela; si la deducís, pasala igual: --enfoque "deducido: …"',
      ].join("\n"),
    );
  }
  if (!existsSync(video)) morir(`No encuentro el video ${corta(video)}.`);
  if (statSync(video).size > MAXIMO_BYTES) morir(`${corta(video)} pesa más de 2 GB, que es lo más que acepta Gemini.`);
  if (existsSync(salida) && !esBorrador(salida)) {
    morir(`${corta(salida)} ya existe y no es un borrador. Elegí otra salida: no lo piso.`);
  }

  clave(); // Antes de medir y subir: sin clave no tiene sentido trabajar.

  const info = await sondear(video);
  if (!info.video) morir(`${corta(video)} no tiene imagen: no es un video.`);
  const ficha = {
    duracion: info.duracion,
    fps: info.video.fps,
    ancho: info.video.anchoMostrado,
    alto: info.video.altoMostrado,
  };
  const { fps: muestreo, recortado } = muestreoPara(ficha.duracion, opciones.muestreo);
  if (recortado) console.log(`Gemini va a mirar ${muestreo} cuadros por segundo (tope: 1 a 24, y 600 cuadros en total).`);

  console.log(`Subiendo ${corta(video)} a Gemini y pidiendo el borrador. Tarda de uno a tres minutos…`);
  let respuesta;
  try {
    respuesta = await pedirBorrador({ video, enfoque, ficha, muestreo });
  } catch (e) {
    morir(`\nNo pude consultar a Gemini.\n${e.message}`);
  }

  const markdown = armarMarkdown({
    video: corta(video),
    enfoque,
    ficha,
    modelo: respuesta.modelo,
    muestreo,
    fecha: hoy(),
    datos: respuesta.datos,
  });
  asegurarCarpeta(salida);
  writeFileSync(salida, markdown, "utf8");

  const puntos = Array.isArray(respuesta.datos?.dondeMirar) ? respuesta.datos.dondeMirar.length : 0;
  console.log("");
  console.log(`Borrador en ${corta(salida)} (${respuesta.modelo}): ${puntos} puntos para mirar.`);
  console.log("Es un BORRADOR SIN VERIFICAR: cada punto se confirma en una tira de cuadros antes de usarlo.");
}

if (esPrincipal(import.meta.url)) await principal(process.argv.slice(2));
