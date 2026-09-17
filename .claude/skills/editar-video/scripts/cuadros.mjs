/**
 * Mirar cuadros de un archivo de video: hojas de contacto para ver qué hay,
 * y extracción de un cuadro suelto a PNG para la portada.
 *
 * "Las opiniones no cuentan; los cuadros sí": esta es la herramienta con la que se mira.
 */
import {
  ayuda,
  leerArgumentos,
  numero,
  comoCuadros,
  morir,
  sondear,
  corta,
  fijo,
  cuadroDe,
  segundosDe,
} from "./_comun.mjs";
import { hojasDeContacto, extraerCuadro, contarHojas, buscarFuente } from "./_hojas.mjs";

const AYUDA = `
cuadros.mjs — hojas de contacto y extracción de cuadros

  node .claude/skills/editar-video/scripts/cuadros.mjs <video> <salida> [opciones]

Recibe: cualquier video (la grabación cruda, el corte, el render final).
Devuelve: hojas <salida>0.png, <salida>1.png… con los cuadros en fila y su tiempo encima,
          y en pantalla qué cuadro es cada uno.

Elegir qué cuadros:
  --cada 90          uno cada 90 cuadros (a 30 fps: cada 3 s). Con sufijo s son segundos: --cada 2.5s
  --tiempos "1.2,3"  una lista de segundos
  --cuadros "36,90"  una lista de cuadros a 30 fps

Cómo salen:
  --hoja 6           cuántos cuadros entran en cada hoja
  --ancho 240        ancho de cada cuadro dentro de la hoja
  --suelto           en vez de hojas, escribe cada cuadro a tamaño completo.
                     Con un solo cuadro pedido y una <salida> terminada en .png, usa ese nombre tal cual.

Ejemplos de la skill:
  cuadros.mjs grabacion.mp4 scratch/hoja --cada 90 --hoja 6        ver qué hay
  cuadros.mjs grabacion.mp4 scratch/portada --cada 32 --hoja 5     buscar la portada
  cuadros.mjs final.mp4 scratch/bordes --tiempos "2.4,5.1" --hoja 5  revisar las costuras
  cuadros.mjs grabacion.mp4 videos/x/foto.png --tiempos "12.4" --suelto   extraer la portada

Congelar el video dentro de un still de Remotion devuelve el cuadro 0: por eso la portada
se extrae acá a PNG y se monta como imagen.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["suelto"] });
const [video, salida] = libres;
if (!video || !salida) morir("Faltan argumentos: <video> <salida>. Probá con --ayuda.");

const info = await sondear(video);
if (!info.video) morir("El archivo no tiene video.");

const lista = (valor) =>
  String(valor)
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number);

let momentos = [];
if (opciones.tiempos !== undefined) {
  momentos = lista(opciones.tiempos).map((s) => ({ segundos: s }));
} else if (opciones.cuadros !== undefined) {
  momentos = lista(opciones.cuadros).map((f) => ({ segundos: segundosDe(f) }));
} else {
  const paso = comoCuadros(opciones.cada, 90);
  if (!Number.isFinite(paso) || paso < 1) morir("--cada tiene que ser un número de cuadros mayor que 0.");
  const pasoSegundos = segundosDe(paso);
  for (let s = 0; s < info.duracion; s += pasoSegundos) momentos.push({ segundos: Number(s.toFixed(3)) });
}

momentos = momentos
  .filter((m) => Number.isFinite(m.segundos) && m.segundos >= 0 && m.segundos < info.duracion)
  .map((m) => ({ ...m, etiqueta: `t${fijo(m.segundos, 2)} f${cuadroDe(m.segundos)}` }));

if (momentos.length === 0) morir("Ningún cuadro pedido cae dentro del video.");

if (opciones.suelto) {
  const unico = momentos.length === 1 && /\.(png|jpg|jpeg)$/i.test(salida);
  for (const m of momentos) {
    const destino = unico ? salida : `${salida}-f${cuadroDe(m.segundos)}.png`;
    await extraerCuadro(video, m.segundos, destino);
    console.log(`${corta(destino)}  ${m.etiqueta}`);
  }
  console.log(`\n${momentos.length} cuadro(s) a tamaño completo (${info.video.anchoMostrado}x${info.video.altoMostrado}).`);
} else {
  const porHoja = Math.max(1, Math.round(numero(opciones.hoja, 6)));
  const ancho = Math.max(80, Math.round(numero(opciones.ancho, 240)));
  const hojas = await hojasDeContacto(video, momentos, salida, { porHoja, ancho });
  if (hojas.length === 0) morir("No pude extraer ningún cuadro.");
  contarHojas(hojas);
  console.log("");
  console.log(`${momentos.length} cuadros en ${hojas.length} hoja(s) de hasta ${porHoja}.`);
  if (!buscarFuente()) {
    console.log("aviso  No encontré una tipografía en esta máquina: las hojas salen sin la etiqueta encima.");
    console.log("       La correspondencia está arriba, de izquierda a derecha.");
  }
}
