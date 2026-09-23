import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cajaAPixeles,
  aComposicion,
  medirCuadro,
  resumirEncuadre,
} from "../.claude/skills/editar-video/scripts/_encuadre.mjs";
import { ordenDeModelos, preguntar } from "../.claude/skills/editar-video/scripts/_gemini.mjs";

const VERTICAL = { ancho: 1080, alto: 1920 };
const VERTICAL_GRANDE = { ancho: 1440, alto: 2560 };

// ---------------------------------------------------------------- caja → píxeles

test("una caja 0–1000 pasa a píxeles del video de 1080x1920", () => {
  assert.deepEqual(cajaAPixeles([375, 250, 500, 750], VERTICAL), { arriba: 720, izquierda: 270, abajo: 960, derecha: 810 });
});

test("la misma caja en un video de 1440x2560 cae en sus propios píxeles", () => {
  assert.deepEqual(cajaAPixeles([375, 250, 500, 750], VERTICAL_GRANDE), { arriba: 960, izquierda: 360, abajo: 1280, derecha: 1080 });
});

test("los píxeles de un video de 1440x2560 se llevan a la composición de 1080x1920", () => {
  const enVideo = { arriba: 960, izquierda: 360, abajo: 1280, derecha: 1080 };
  assert.deepEqual(aComposicion(enVideo, VERTICAL_GRANDE), { arriba: 720, izquierda: 270, abajo: 960, derecha: 810 });
});

test("un video que no es 9:16 cubre la composición: se escala y se recorta al centro", () => {
  // 1080x1080 → escala 16/9 hasta 1920 de alto; sobran 840 px de ancho, 420 por lado.
  const enVideo = { arriba: 270, izquierda: 405, abajo: 540, derecha: 675 };
  assert.deepEqual(aComposicion(enVideo, { ancho: 1080, alto: 1080 }), { arriba: 480, izquierda: 300, abajo: 960, derecha: 780 });
});

// ---------------------------------------------------------------- un cuadro

const respuesta = (cara, cabeza) => [
  ...(cara ? [{ label: "cara", box_2d: cara }] : []),
  ...(cabeza ? [{ label: "cabeza", box_2d: cabeza }] : []),
];

test("de la caja de la cara salen el centro y el mentón; de la de la cabeza, el pelo", () => {
  const cuadro = medirCuadro(respuesta([375, 400, 500, 600], [250, 375, 500, 625]), VERTICAL);
  assert.equal(cuadro.usado, true);
  assert.equal(cuadro.cy, 840);
  assert.equal(cuadro.menton, 960);
  assert.equal(cuadro.pelo, 480);
  assert.equal(cuadro.cx, 540);
});

test("la misma lectura en un video de 1440x2560 da las mismas coordenadas de composición", () => {
  const cuadro = medirCuadro(respuesta([375, 400, 500, 600], [250, 375, 500, 625]), VERTICAL_GRANDE);
  assert.equal(cuadro.cy, 840);
  assert.equal(cuadro.menton, 960);
  assert.equal(cuadro.pelo, 480);
  assert.equal(cuadro.cx, 540);
});

test("también entiende las cajas con nombre en vez de lista", () => {
  const cuadro = medirCuadro(
    { cara: { box_2d: [375, 400, 500, 600] }, cabeza: { box_2d: [250, 375, 500, 625] } },
    VERTICAL,
  );
  assert.equal(cuadro.cy, 840);
  assert.equal(cuadro.pelo, 480);
});

test("un cuadro sin cara no se usa", () => {
  assert.equal(medirCuadro([], VERTICAL).usado, false);
  assert.equal(medirCuadro(respuesta(null, [250, 375, 500, 625]), VERTICAL).usado, false);
  assert.equal(medirCuadro(null, VERTICAL).usado, false);
});

test("una caja de cara vacía cuenta como cuadro sin cara, no como caja inválida", () => {
  // Así contestó gemini-pro-latest un cuadro donde la visera tapaba la cara.
  const cuadro = medirCuadro([{ label: "cara", box_2d: [] }, { label: "cabeza", box_2d: [378, 171, 712, 626] }], VERTICAL);
  assert.equal(cuadro.usado, false);
  assert.equal(cuadro.motivo, "sin cara");
});

test("una cara de menos del 6 % del alto del cuadro es absurda y no se usa", () => {
  // 50 de 1000 = 5 %
  assert.equal(medirCuadro(respuesta([450, 400, 500, 600]), VERTICAL).usado, false);
});

test("una cara de más del 45 % del alto del cuadro es absurda y no se usa", () => {
  // 500 de 1000 = 50 %
  assert.equal(medirCuadro(respuesta([200, 300, 700, 700]), VERTICAL).usado, false);
});

test("una cara con el centro fuera del 80 % del medio, en horizontal, no se usa", () => {
  // centro en 50 de 1000 = 5 % del ancho
  assert.equal(medirCuadro(respuesta([375, 0, 500, 100]), VERTICAL).usado, false);
  // centro en 950 de 1000
  assert.equal(medirCuadro(respuesta([375, 900, 500, 1000]), VERTICAL).usado, false);
});

test("una caja al revés o en píxeles en vez de 0–1000 no se usa", () => {
  assert.equal(medirCuadro(respuesta([500, 400, 375, 600]), VERTICAL).usado, false);
  assert.equal(medirCuadro(respuesta([720, 432, 960, 648].map((v) => v * 2)), VERTICAL).usado, false);
  assert.equal(medirCuadro(respuesta([375, 400, 500]), VERTICAL).usado, false);
});

test("si la caja de la cabeza falta o empieza debajo de la frente, la cara sirve igual pero sin pelo", () => {
  const sinCabeza = medirCuadro(respuesta([375, 400, 500, 600]), VERTICAL);
  assert.equal(sinCabeza.usado, true);
  assert.equal(sinCabeza.pelo, null);
  const cabezaRara = medirCuadro(respuesta([375, 400, 500, 600], [400, 375, 500, 625]), VERTICAL);
  assert.equal(cabezaRara.usado, true);
  assert.equal(cabezaRara.pelo, null);
});

// ---------------------------------------------------------------- todos los cuadros

const bueno = (cy, menton, pelo, cx = 540) => ({ usado: true, cx, cy, menton, pelo, frente: cy - 120 });
const descartado = (motivo, extra = {}) => ({ usado: false, motivo, ...extra });

test("el encuadre es la mediana de los cuadros usados; los descartados no cuentan", () => {
  const encuadre = resumirEncuadre([
    bueno(840, 960, 480),
    descartado("cara absurda", { cx: 540, cy: 100, menton: 150, pelo: 40 }),
    bueno(850, 970, 490),
    descartado("sin cara"),
    bueno(900, 1100, 700),
  ]);
  assert.equal(encuadre.cy, 850);
  assert.equal(encuadre.menton, 970);
  assert.equal(encuadre.pelo, 490);
  assert.equal(encuadre.cx, 540);
  assert.equal(encuadre.usados, 3);
  assert.equal(encuadre.mirados, 5);
});

test("un cuadro que se aparta de la mediana más de media cara no cuenta, y queda marcado", () => {
  // Caras de 240 px (frente a mentón): el límite es 120 px del centro mediano.
  // Con el 1070 adentro, la mediana de 4 sería 855 y el mentón 975.
  const encuadre = resumirEncuadre([
    bueno(840, 960, 480),
    bueno(850, 970, 490),
    bueno(860, 980, 500),
    bueno(1070, 1190, 720),
  ]);
  assert.equal(encuadre.cy, 850);
  assert.equal(encuadre.menton, 970);
  assert.equal(encuadre.usados, 3);
  assert.equal(encuadre.mirados, 4);
  assert.equal(encuadre.cuadros[3].usado, false);
  assert.match(encuadre.cuadros[3].motivo, /mediana/);
  assert.equal(encuadre.cuadros[0].usado, true);
});

test("del centro y el mentón salen el corrimiento del split y la altura de los subtítulos", () => {
  const encuadre = resumirEncuadre([bueno(850, 1010, 565)]);
  assert.equal(encuadre.corrimientoSplit, -380); // −(850 − 470)
  assert.equal(encuadre.subtitulosFull, 1170); // 850 + 160·1,25 + 120
});

test("la altura de los subtítulos en full tiene tope en 1560", () => {
  const encuadre = resumirEncuadre([bueno(1200, 1400, 900)]);
  assert.equal(encuadre.subtitulosFull, 1560); // 1200 + 250 + 120 = 1570
});

test("si ningún cuadro trae la cabeza, el pelo sale de la frente y se avisa", () => {
  const encuadre = resumirEncuadre([
    { usado: true, cx: 540, cy: 840, menton: 960, pelo: null, frente: 720 },
    { usado: true, cx: 540, cy: 850, menton: 970, pelo: null, frente: 730 },
    { usado: true, cx: 540, cy: 860, menton: 980, pelo: null, frente: 740 },
  ]);
  assert.equal(encuadre.pelo, 730);
  assert.ok(encuadre.avisos.some((a) => /pelo/i.test(a)));
});

test("si todos los cuadros se descartan, el error lo dice en castellano y cuenta por qué", () => {
  assert.throws(
    () => resumirEncuadre([descartado("sin cara"), descartado("cara absurda"), descartado("sin cara")]),
    (e) => /ningún cuadro/i.test(e.message) && /3/.test(e.message) && /sin cara/.test(e.message),
  );
  assert.throws(() => resumirEncuadre([]), /ningún cuadro/i);
});

test("si Gemini no contestó en ningún cuadro, el error apunta a la clave y la conexión, no al video", () => {
  const caido = descartado("Gemini no contestó: Gemini respondió 400: API key not valid.");
  assert.throws(
    () => resumirEncuadre([caido, caido, caido]),
    (e) => /clave/i.test(e.message) && /conexi/i.test(e.message) && !/a cámara/.test(e.message),
  );
});

// ---------------------------------------------------------------- modelos de Gemini

test("sin GEMINI_MODEL, el orden es pro-latest, 2.5-pro y 2.5-flash", () => {
  assert.deepEqual(ordenDeModelos({}), ["gemini-pro-latest", "gemini-2.5-pro", "gemini-2.5-flash"]);
  assert.deepEqual(ordenDeModelos({ GEMINI_MODEL: "  " }), ["gemini-pro-latest", "gemini-2.5-pro", "gemini-2.5-flash"]);
});

test("con GEMINI_MODEL, ese modelo va primero y no se repite", () => {
  assert.deepEqual(ordenDeModelos({ GEMINI_MODEL: "gemini-3-pro-preview" }), [
    "gemini-3-pro-preview",
    "gemini-pro-latest",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
  ]);
  assert.deepEqual(ordenDeModelos({ GEMINI_MODEL: " gemini-2.5-flash " }), [
    "gemini-2.5-flash",
    "gemini-pro-latest",
    "gemini-2.5-pro",
  ]);
});

/**
 * Gemini de mentira: cada modelo de la lista `caidos` responde 404; el resto contesta.
 * Anota cada pedido para revisar URL y encabezados. No sale nada a la red.
 */
async function conGeminiFalso({ caidos = [], entorno = {} }, cuerpo) {
  const pedidos = [];
  const lineas = [];
  const antes = { fetch: globalThis.fetch, log: console.log, warn: console.warn };
  const entornoAntes = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, GEMINI_MODEL: process.env.GEMINI_MODEL };
  process.env.GEMINI_API_KEY = "clave-de-prueba-123";
  delete process.env.GEMINI_MODEL;
  Object.assign(process.env, entorno);
  globalThis.fetch = async (url, opciones) => {
    pedidos.push({ url: String(url), encabezados: opciones.headers });
    const modelo = String(url).match(/models\/([^:]+):/)?.[1];
    if (caidos.includes(modelo)) {
      return new Response(JSON.stringify({ error: { message: "no existe" } }), { status: 404 });
    }
    const texto = JSON.stringify({ ok: true });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texto }] } }] }), {
      status: 200,
    });
  };
  console.log = (...a) => lineas.push(a.join(" "));
  console.warn = (...a) => lineas.push(a.join(" "));
  try {
    const resultado = await cuerpo();
    return { resultado, pedidos, lineas };
  } finally {
    globalThis.fetch = antes.fetch;
    console.log = antes.log;
    console.warn = antes.warn;
    for (const [nombre, valor] of Object.entries(entornoAntes)) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  }
}

test("preguntar prueba primero el modelo de GEMINI_MODEL, con la clave solo en el encabezado", async () => {
  const { resultado, pedidos } = await conGeminiFalso({ entorno: { GEMINI_MODEL: "modelo-propio" } }, () =>
    preguntar({ partes: [{ text: "hola" }] }),
  );
  assert.equal(resultado.modelo, "modelo-propio");
  assert.match(pedidos[0].url, /models\/modelo-propio:generateContent$/);
  for (const p of pedidos) {
    assert.ok(!p.url.includes("clave-de-prueba-123"), "la clave no puede ir en la URL");
    assert.equal(p.encabezados["x-goog-api-key"], "clave-de-prueba-123");
  }
});

test("cuando los Pro fallan y contesta Flash, se avisa en pantalla", async () => {
  const { resultado, lineas } = await conGeminiFalso(
    { caidos: ["gemini-pro-latest", "gemini-2.5-pro"] },
    () => preguntar({ partes: [{ text: "hola" }] }),
  );
  assert.equal(resultado.modelo, "gemini-2.5-flash");
  assert.ok(lineas.some((l) => /flash/i.test(l) && /aviso/i.test(l)));
  assert.ok(lineas.every((l) => !l.includes("clave-de-prueba-123")), "la clave no puede salir en pantalla");
});

test("si contesta el primer modelo, no hay aviso de Flash", async () => {
  const { resultado, lineas } = await conGeminiFalso({}, () => preguntar({ partes: [{ text: "hola" }] }));
  assert.equal(resultado.modelo, "gemini-pro-latest");
  assert.ok(!lineas.some((l) => /aviso/i.test(l)));
});

test("si la persona eligió Flash en GEMINI_MODEL, tampoco se avisa: no es un respaldo", async () => {
  const { resultado, lineas } = await conGeminiFalso({ entorno: { GEMINI_MODEL: "gemini-2.5-flash" } }, () =>
    preguntar({ partes: [{ text: "hola" }] }),
  );
  assert.equal(resultado.modelo, "gemini-2.5-flash");
  assert.ok(!lineas.some((l) => /aviso/i.test(l)));
});
