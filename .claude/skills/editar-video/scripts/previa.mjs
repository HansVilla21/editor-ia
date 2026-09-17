/**
 * Fase 7 — mirar cuadros sueltos de la composición ANTES de renderizar el video entero.
 *
 * Un solo bundle para todos los cuadros: armarlo es lo que tarda, renderizar cada cuadro no.
 */
import { readFileSync } from "node:fs";

import {
  ayuda,
  leerArgumentos,
  numero,
  morir,
  temporal,
  corta,
  segundosDe,
  asegurarCarpeta,
} from "./_comun.mjs";
import { armarTira, buscarFuente } from "./_hojas.mjs";

const AYUDA = `
previa.mjs — cuadros sueltos de la composición, sin renderizar el video

  node .claude/skills/editar-video/scripts/previa.mjs <entrada.tsx> <Id> <salida> "f1,f2,f3" \\
       [--escala 0.35] [--hoja 5] [--ancho 240] [--props <props.json>] [--suelto]

Recibe: la entrada de Remotion (src/entries/<slug>.tsx), el id de la composición y los
        cuadros que se quieren ver, separados por coma.
Devuelve: hojas <salida>0.png, <salida>1.png… con esos cuadros en fila y su número encima.
          Con --suelto, cada cuadro a tamaño completo en vez de hojas.

  --escala   a qué escala se renderiza cada cuadro (0.35 alcanza para revisar composición)
  --hoja     cuántos cuadros entran en cada hoja
  --props    JSON con las props de entrada de la composición

Cuadros que siempre se miran: el 0, el gancho, la mitad de cada transición, cada sub-escena,
el CTA y el último.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["suelto"] });
const [entrada, idComposicion, salida, listaCuadros] = libres;
if (!entrada || !idComposicion || !salida || !listaCuadros) {
  morir("Faltan argumentos: <entrada.tsx> <Id> <salida> \"f1,f2\". Probá con --ayuda.");
}

const cuadros = String(listaCuadros)
  .split(/[,\s]+/)
  .map((x) => x.trim())
  .filter(Boolean)
  .map(Number)
  .filter((n) => Number.isFinite(n) && n >= 0);

if (cuadros.length === 0) morir("No entendí la lista de cuadros. Es algo como \"0,45,120\".");

const escala = numero(opciones.escala, 0.35);
const porHoja = Math.max(1, Math.round(numero(opciones.hoja, 5)));
const ancho = Math.max(80, Math.round(numero(opciones.ancho, 240)));

let props = {};
if (opciones.props) {
  try {
    props = JSON.parse(readFileSync(opciones.props, "utf8"));
  } catch (e) {
    morir(`No pude leer ${corta(opciones.props)}: ${e.message}`);
  }
}

const { bundle } = await import("@remotion/bundler");
const { selectComposition, renderStill } = await import("@remotion/renderer");

console.log("Armando el bundle (es lo que tarda; después cada cuadro es rápido)…");
const servidor = await bundle({ entryPoint: entrada, onProgress: () => {} });

let composicion;
try {
  composicion = await selectComposition({ serveUrl: servidor, id: idComposicion, inputProps: props });
} catch (e) {
  morir(
    `No encontré la composición "${idComposicion}" en ${corta(entrada)}.\n` +
      `${String(e.message).slice(0, 300)}`,
  );
}

console.log(`${composicion.id}: ${composicion.width}x${composicion.height}, ${composicion.durationInFrames} cuadros a ${composicion.fps} fps`);

const fuera = cuadros.filter((f) => f >= composicion.durationInFrames);
if (fuera.length) {
  console.log(`aviso  Estos cuadros caen fuera de la composición y se saltean: ${fuera.join(", ")}`);
}
const pedidos = cuadros.filter((f) => f < composicion.durationInFrames);
if (pedidos.length === 0) morir("Ningún cuadro pedido existe en la composición.");

const piezas = [];
for (const cuadro of pedidos) {
  const destino = opciones.suelto
    ? `${salida}-f${cuadro}.png`
    : temporal(`-previa${String(cuadro).padStart(5, "0")}.png`);
  asegurarCarpeta(destino);
  await renderStill({
    composition: composicion,
    serveUrl: servidor,
    output: destino,
    frame: cuadro,
    inputProps: props,
    imageFormat: "png",
    scale: opciones.suelto ? 1 : escala,
  });
  piezas.push({ ruta: destino, etiqueta: `f${cuadro} t${segundosDe(cuadro).toFixed(2)}` });
  console.log(`  cuadro ${String(cuadro).padStart(5)} (${segundosDe(cuadro).toFixed(2)} s) listo`);
}

if (opciones.suelto) {
  console.log("");
  console.log(`${piezas.length} cuadros a tamaño completo, uno por archivo.`);
  for (const p of piezas) console.log(`  ${corta(p.ruta)}`);
} else {
  const hojas = [];
  for (let k = 0; k < piezas.length; k += porHoja) {
    const grupo = piezas.slice(k, k + porHoja);
    const destino = `${salida}${Math.floor(k / porHoja)}.png`;
    await armarTira(grupo, destino, { ancho });
    hojas.push(destino);
    console.log(`${corta(destino)}  ->  ${grupo.map((g) => g.etiqueta).join("  ")}`);
  }
  console.log("");
  console.log(`${piezas.length} cuadros en ${hojas.length} hoja(s). Mirarlas antes de renderizar.`);
  if (!buscarFuente()) {
    console.log("aviso  Sin tipografía en esta máquina: las hojas salen sin la etiqueta encima.");
  }
}

process.exit(0);
