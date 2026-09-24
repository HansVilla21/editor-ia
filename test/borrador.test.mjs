/**
 * borrador.mjs, la parte sin red: el pedido a Gemini, cuántos cuadros mira, dónde mirar y el
 * markdown del BORRADOR. Lo que habla con Gemini está en borrador-gemini.test.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  armarPrompt,
  armarMarkdown,
  muestreoPara,
  rangoDeCuadros,
} from "../.claude/skills/estudiar-referentes/scripts/_borrador.mjs";

const ENFOQUE = "me gusta cómo aparecen los textos de a una palabra";
const FICHA = { duracion: 34.5, fps: 30, ancho: 1080, alto: 1920 };

// ---------------------------------------------------------------- el pedido

test("el pedido lleva, textual, lo que le gusta a la persona, y manda a priorizarlo", () => {
  const prompt = armarPrompt({ enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 });
  assert.ok(prompt.includes(`«${ENFOQUE}»`));
  assert.match(prompt, /dondeMirar/);
  assert.match(prompt, /mitad/);
});

test("el pedido le pasa la ficha medida y le prohíbe dar valores finales", () => {
  const prompt = armarPrompt({ enfoque: ENFOQUE, ficha: FICHA, muestreo: 5 });
  assert.match(prompt, /34,5 s/);
  assert.match(prompt, /1080×1920/);
  assert.match(prompt, /hexadecimal/);
  assert.match(prompt, /tipograf/);
  assert.match(prompt, /SOLO JSON/);
});

test("sin enfoque no hay pedido: el error lo dice en castellano", () => {
  assert.throws(() => armarPrompt({ enfoque: "  ", ficha: FICHA, muestreo: 5 }), /enfoque/);
  assert.throws(() => armarPrompt({ ficha: FICHA, muestreo: 5 }), /le gusta/);
});

// ---------------------------------------------------------------- cuántos cuadros mira

test("mira 5 cuadros por segundo salvo que se pida otra cosa, entre 1 y 24", () => {
  assert.deepEqual(muestreoPara(40), { fps: 5, recortado: false });
  assert.deepEqual(muestreoPara(40, 10), { fps: 10, recortado: false });
  assert.deepEqual(muestreoPara(10, 60), { fps: 24, recortado: true });
  assert.deepEqual(muestreoPara(10, 0.2), { fps: 1, recortado: true });
});

test("en un video largo baja el muestreo para no pasar de 600 cuadros", () => {
  assert.deepEqual(muestreoPara(300), { fps: 2, recortado: true });
  assert.deepEqual(muestreoPara(90, 8), { fps: 6, recortado: true });
  assert.deepEqual(muestreoPara(1200), { fps: 1, recortado: true });
});

// ---------------------------------------------------------------- dónde mirar

test("cada segundo se vuelve una tira de 24 cuadros consecutivos a los fps reales", () => {
  assert.deepEqual(rangoDeCuadros(3.2, 30), { desde: 88, hasta: 111 });
  assert.deepEqual(rangoDeCuadros(3.2, 60), { desde: 184, hasta: 207 });
  assert.deepEqual(rangoDeCuadros(0.1, 30), { desde: 0, hasta: 23 });
  assert.deepEqual(rangoDeCuadros(3.2, 30, 100), { desde: 76, hasta: 99 });
  assert.equal(rangoDeCuadros("no sé", 30), null);
});

// ---------------------------------------------------------------- el markdown

const DATOS = {
  tema: "cómo automatizar una planilla",
  enfoque: { queLoProduce: "cada palabra entra con un desenfoque corto", dondeSeVe: [{ t: 2, que: "la primera palabra" }] },
  gancho: { hasta: 2.5, tecnica: "resultado primero", dice: "Esto lo hizo una IA", porQueFunciona: "muestra el final" },
  estructura: [{ desde: 0, hasta: 2.5, funcion: "gancho", resumen: "muestra el resultado | antes de explicar" }],
  cortes: [{ t: 1.2, tipo: "corte seco" }, { t: 3.4, tipo: "zoom" }],
  transiciones: [{ t: 3.4, tipo: "zoom rápido", duracionAprox: 0.3, detalle: "acerca la cara" }],
  textoEnPantalla: [{ desde: 0, hasta: 2.5, rol: "titular", estilo: "blanca gruesa", animacion: "entra de abajo" }],
  graficos: [
    { desde: 5, hasta: 8, descripcion: "contador", comoParece: "codigo", pista: "números nítidos" },
    { desde: 9, hasta: 12, descripcion: "página web", comoParece: "captura", pista: "barra del navegador" },
    { desde: 13, hasta: 14, descripcion: "logo que se derrite", comoParece: "ia-3d-archivo", pista: "reflejos" },
  ],
  ritmo: { cambiosVisuales: 14, segundosPorPlano: 2.4, comentario: "rápido al principio" },
  sonido: { musica: "suave, sin voz", voz: "limpia", efectos: [{ t: 3.4, descripcion: "whoosh" }] },
  dondeMirar: [{ t: 3.2, que: "la entrada de la segunda palabra", porQue: "es lo que le gusta" }],
  dudas: "no estoy seguro del segundo 3",
};

const md = (datos = DATOS) =>
  armarMarkdown({
    video: "referencias/referencia.mp4",
    enfoque: ENFOQUE,
    ficha: FICHA,
    modelo: "gemini-pro-latest",
    muestreo: 5,
    fecha: "2026-09-23",
    datos,
  });

test("el markdown arranca marcado como BORRADOR sin verificar, con la regla del proyecto", () => {
  const texto = md();
  assert.match(texto.split("\n")[0], /^# BORRADOR sin verificar/);
  assert.match(texto, /Gemini propone, los cuadros deciden/);
  assert.ok(texto.includes(`«${ENFOQUE}»`));
  assert.match(texto, /gemini-pro-latest/);
  assert.match(texto, /2026-09-23/);
});

test("lo medido con ffprobe se separa de lo que dice el modelo", () => {
  assert.match(md(), /Medido con ffprobe:\*\* 34,5 s · 30 cuadros\/s · 1080×1920/);
});

test("cada punto dice qué mirar, en qué segundo aproximado y con qué cuadros verificarlo", () => {
  const texto = md();
  assert.match(texto, /## Qué mirar y en qué segundo/);
  assert.match(texto, /≈ 3,2 s\*\* \(cuadros 88–111\) — la entrada de la segunda palabra/);
  assert.match(texto, /## Cómo verificar/);
  assert.match(texto, /between\(n\\,<desde>\\,<hasta>\)/);
  assert.ok(texto.includes('"referencias/referencia.mp4"'));
});

test("los tiempos del modelo nunca salen como un valor final: siempre aproximados", () => {
  const texto = md();
  const cifrasSueltas = texto
    .split("\n")
    .filter((l) => /\d,\d s/.test(l) && !l.includes("Medido con ffprobe"))
    .filter((l) => !/≈ \d/.test(l));
  assert.deepEqual(cifrasSueltas, []);
});

test("los gráficos llevan su letra de fabricación, a confirmar", () => {
  const texto = md();
  assert.match(texto, /A · código \(a confirmar\)/);
  assert.match(texto, /B · captura \(a confirmar\)/);
  assert.match(texto, /C · IA, 3D o archivo \(a confirmar\)/);
});

test("si el modelo ya cerró la frase con punto, no queda un punto doble", () => {
  const texto = md({ dondeMirar: [{ t: 1, que: "Mirar la entrada.", porQue: "Es lo que le gusta." }] });
  assert.match(texto, /— Mirar la entrada\. Es lo que le gusta\.?$/m);
  assert.doesNotMatch(texto, /\w\.\./);
});

test("la letra de fabricación se deduce aunque el modelo no use las palabras pedidas", () => {
  const graficos = [
    { descripcion: "uno", comoParece: "Animación de código (HTML)" },
    { descripcion: "dos", comoParece: "grabación de pantalla" },
    { descripcion: "tres", comoParece: "render 3D" },
    { descripcion: "cuatro", comoParece: "vaya uno a saber" },
  ];
  const texto = md({ graficos });
  assert.match(texto, /uno \| A · código/);
  assert.match(texto, /dos \| B · captura/);
  assert.match(texto, /tres \| C · IA, 3D o archivo/);
  assert.match(texto, /cuatro \| sin letra: «vaya uno a saber»/);
});

test("una barra en lo que dijo el modelo no rompe las tablas", () => {
  assert.match(md(), /muestra el resultado \\\| antes de explicar/);
});

test("si el modelo devolvió poco o nada, el markdown sale igual y lo dice", () => {
  for (const datos of [null, {}, { dondeMirar: "no es una lista", estructura: [null] }]) {
    const texto = md(datos);
    assert.match(texto.split("\n")[0], /^# BORRADOR sin verificar/);
    assert.match(texto, /El modelo no marcó puntos/);
  }
});
