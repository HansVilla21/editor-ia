/**
 * Lo que borrador.mjs arma sin red: el pedido a Gemini y el markdown del borrador.
 *
 * Gemini propone, los cuadros deciden. El borrador dice QUÉ mirar y EN QUÉ SEGUNDO; nunca da
 * un valor final. Por eso cada tiempo del modelo sale con "≈" y con los cuadros para
 * verificarlo, y lo único que se escribe como dato es lo que midió ffprobe.
 */

export const MUESTREO_POR_DEFECTO = 5;
/** Tope de cuadros que mira Gemini: cuida la cuota gratuita sin perder los cortes de un video corto. */
export const CUADROS_MAXIMOS = 600;
/** Gemini acepta hasta 24 cuadros por segundo. */
const MUESTREO_MAXIMO = 24;
/** Una tira de 8×3 casillas: la misma que usa el analista para medir una transición. */
const CASILLAS = 24;
const ANTES = 8;

// ---------------------------------------------------------------- números

/** 3.25 → "3,3". Coma decimal: el borrador lo lee una persona. */
const decimal = (n, d = 1) => Number(n).toFixed(d).replace(".", ",");
const esNumero = (n) => n !== null && n !== "" && Number.isFinite(Number(n));
/** Un tiempo del modelo: siempre aproximado. */
const aprox = (t) => (esNumero(t) ? `≈ ${decimal(t)} s` : "≈ ? s");
const fpsLegible = (fps) => String(Math.round(Number(fps) * 100) / 100).replace(".", ",");

/** Cuántos cuadros por segundo mira Gemini: el pedido (o 5), entre 1 y 24, y sin pasar de 600 en total. */
export function muestreoPara(duracion, pedido) {
  const deseado = esNumero(pedido) ? Number(pedido) : MUESTREO_POR_DEFECTO;
  let fps = Math.min(MUESTREO_MAXIMO, Math.max(1, Math.round(deseado)));
  if (esNumero(duracion) && Number(duracion) > 0 && Number(duracion) * fps > CUADROS_MAXIMOS) {
    fps = Math.max(1, Math.floor(CUADROS_MAXIMOS / Number(duracion)));
  }
  return { fps, recortado: fps !== deseado };
}

/**
 * Los 24 cuadros consecutivos que hay que mirar alrededor del segundo `t`, contados a los fps
 * reales del archivo: 8 antes y 15 después, sin salirse del video.
 */
export function rangoDeCuadros(t, fps, total) {
  if (!esNumero(t) || !esNumero(fps) || Number(fps) <= 0) return null;
  let desde = Math.max(0, Math.round(Number(t) * Number(fps)) - ANTES);
  let hasta = desde + CASILLAS - 1;
  if (esNumero(total) && hasta > Number(total) - 1) {
    hasta = Math.max(0, Number(total) - 1);
    desde = Math.max(0, hasta - CASILLAS + 1);
  }
  return { desde, hasta };
}

// ---------------------------------------------------------------- el pedido

const FORMA = `{
  "tema": "de qué trata, en una línea",
  "enfoque": {"queLoProduce": "qué recurso concreto produce lo que le gusta a la persona",
              "dondeSeVe": [{"t": 0.0, "que": "qué pasa en ese segundo"}]},
  "gancho": {"hasta": 0.0, "tecnica": "cómo engancha", "dice": "la frase del gancho, hasta 15 palabras",
             "porQueFunciona": "una línea"},
  "estructura": [{"desde": 0.0, "hasta": 0.0,
                  "funcion": "gancho | problema | prueba | solucion | giro | cta | otro",
                  "resumen": "qué dice y qué se ve, resumido, sin transcribir"}],
  "cortes": [{"t": 0.0, "tipo": "corte seco | zoom | transición | otro"}],
  "transiciones": [{"t": 0.0, "tipo": "cómo parece", "duracionAprox": 0.0, "detalle": "qué se mueve"}],
  "textoEnPantalla": [{"desde": 0.0, "hasta": 0.0, "rol": "subtitulo | titular | rotulo | otro",
                       "estilo": "cómo se ve, descripto", "animacion": "cómo entra y sale"}],
  "graficos": [{"desde": 0.0, "hasta": 0.0, "descripcion": "qué se ve",
                "comoParece": "codigo | captura | ia-3d-archivo | otro", "pista": "qué lo delata"}],
  "ritmo": {"cambiosVisuales": 0, "segundosPorPlano": 0.0, "comentario": "una línea"},
  "sonido": {"musica": "cómo suena", "voz": "cómo está tratada",
             "efectos": [{"t": 0.0, "descripcion": "qué suena"}]},
  "dondeMirar": [{"t": 0.0, "que": "qué mirar", "porQue": "por qué importa"}],
  "dudas": "lo que no tenés claro"
}`;

/** El pedido a Gemini. El enfoque de la persona es obligatorio: sin él, el borrador no tiene norte. */
export function armarPrompt({ enfoque, ficha, muestreo }) {
  const foco = String(enfoque ?? "").trim();
  if (!foco) {
    throw new Error("Falta el enfoque: lo que le gusta a la persona de este video. Sin eso el borrador no tiene norte.");
  }
  const { duracion, fps, ancho, alto } = ficha ?? {};
  return [
    "Sos un editor senior de videos cortos verticales y diseñador de movimiento. Mirá y escuchá este",
    "video de referencia con atención, más de una vez. Otra persona va a verificar cuadro por cuadro",
    "todo lo que digas: tu trabajo es decirle QUÉ mirar y EN QUÉ SEGUNDO, no dar valores finales.",
    "",
    `Lo que le gusta a la persona de este video, con sus palabras: «${foco}»`,
    "Eso manda. Buscá qué recurso concreto lo produce y en qué segundos aparece. Al menos la mitad",
    'de los puntos de "dondeMirar" tienen que ser sobre eso.',
    "",
    `Datos medidos del archivo, no los contradigas: dura ${decimal(duracion ?? 0)} s, va a ${fpsLegible(fps ?? 0)}`,
    `cuadros por segundo y mide ${ancho}×${alto}. Te lo muestran a ${muestreo} cuadros por segundo.`,
    "",
    "Reglas:",
    "- Tiempos en segundos desde el inicio del video, con un decimal. Si dudás, dalo igual y explicalo en \"dudas\".",
    "- No afirmes cuadros por segundo, nombres de tipografías, colores en hexadecimal ni medidas en",
    '  píxeles. Describilos: "letra sin serifa gruesa, en mayúsculas, blanca con sombra".',
    "- Efectos de sonido: solo los que de verdad escuchás, con su segundo.",
    "- No transcribas el video. Del gancho, la frase si es corta (hasta 15 palabras); del resto, resumí.",
    '- "dondeMirar": de 5 a 10 puntos, en orden de tiempo.',
    "- Todo en español.",
    "",
    "Devolvé SOLO JSON, sin markdown, con esta forma:",
    FORMA,
  ].join("\n");
}

// ---------------------------------------------------------------- el markdown

const lista = (x) => (Array.isArray(x) ? x.filter((e) => e && typeof e === "object") : []);
const texto = (x) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim() : esNumero(x) ? String(x) : "");
const celda = (x) => texto(x).replace(/\|/g, "\\|") || "—";
const objeto = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
/** Frases del modelo en una sola línea, cada una con su punto y sin punto doble. */
const unir = (...partes) =>
  partes
    .map((p) => texto(p).replace(/[.\s]+$/, ""))
    .filter(Boolean)
    .map((p) => `${p}.`)
    .join(" ");

const LETRAS = {
  A: "A · código (a confirmar)",
  B: "B · captura (a confirmar)",
  C: "C · IA, 3D o archivo (a confirmar)",
};

/** La letra de fabricación, aunque el modelo no use las palabras pedidas. Lo que no se entiende, se muestra tal cual. */
function fabricacion(comoParece) {
  const crudo = texto(comoParece);
  const s = crudo.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (/captura|grabacion|pantalla|screen/.test(s)) return LETRAS.B;
  if (/ia-3d|\bia\b|\b3d\b|archivo|stock|generad/.test(s)) return LETRAS.C;
  if (/codigo|code|animacion|html|vector|motion/.test(s)) return LETRAS.A;
  return crudo ? `sin letra: «${celda(crudo)}»` : "sin letra";
}

function seccionDondeMirar(datos, ficha) {
  const puntos = lista(datos.dondeMirar);
  if (!puntos.length) return ["El modelo no marcó puntos. Recorré la hoja de contacto entera."];
  const total = esNumero(ficha.duracion) && esNumero(ficha.fps) ? Math.floor(ficha.duracion * ficha.fps) : undefined;
  return [
    'Cada punto trae los cuadros para armar su tira (ver "Cómo verificar", al final).',
    "",
    ...puntos.map((p, i) => {
      const r = rangoDeCuadros(p.t, ficha.fps, total);
      const cuadros = r ? ` (cuadros ${r.desde}–${r.hasta})` : "";
      return `${i + 1}. **${aprox(p.t)}**${cuadros} — ${unir(p.que, p.porQue) || "sin detalle"}`;
    }),
  ];
}

function seccionesDelModelo(datos) {
  const enfoque = objeto(datos.enfoque);
  const gancho = objeto(datos.gancho);
  const ritmo = objeto(datos.ritmo);
  const sonido = objeto(datos.sonido);
  const cortes = lista(datos.cortes).filter((c) => esNumero(c.t));
  const tabla = (encabezado, filas) =>
    filas.length ? [encabezado, encabezado.replace(/[^|]+/g, "---"), ...filas] : ["Nada, según el modelo."];

  return [
    "## Qué produce lo que le gusta, según el modelo",
    "",
    texto(enfoque.queLoProduce) || "No lo dijo.",
    ...lista(enfoque.dondeSeVe).map((p) => `- ${aprox(p.t)} — ${texto(p.que) || "sin detalle"}`),
    "",
    "## Gancho",
    "",
    `- Hasta ${aprox(gancho.hasta)}. ${unir(gancho.tecnica) || "Técnica sin describir."}`,
    ...(texto(gancho.dice) ? [`- Dice: «${texto(gancho.dice)}»`] : []),
    ...(texto(gancho.porQueFunciona) ? [`- Por qué funcionaría: ${unir(gancho.porQueFunciona)}`] : []),
    "",
    "## Estructura",
    "",
    ...tabla(
      "| Desde | Hasta | Función | Qué pasa |",
      lista(datos.estructura).map((e) => `| ${aprox(e.desde)} | ${aprox(e.hasta)} | ${celda(e.funcion)} | ${celda(e.resumen)} |`),
    ),
    "",
    "## Cortes y transiciones",
    "",
    `- Cortes que vio (${cortes.length}): ${cortes.map((c) => aprox(c.t)).join(" · ") || "ninguno"}`,
    ...lista(datos.transiciones).map(
      (t) => `- ${aprox(t.t)} — ${texto(t.tipo) || "sin tipo"}, dura ${aprox(t.duracionAprox)}. ${unir(t.detalle)}`.trim(),
    ),
    "",
    "## Texto en pantalla",
    "",
    ...tabla(
      "| Desde | Hasta | Rol | Cómo se ve | Cómo entra |",
      lista(datos.textoEnPantalla).map(
        (t) => `| ${aprox(t.desde)} | ${aprox(t.hasta)} | ${celda(t.rol)} | ${celda(t.estilo)} | ${celda(t.animacion)} |`,
      ),
    ),
    "",
    "## Gráficos",
    "",
    ...tabla(
      "| Desde | Hasta | Qué se ve | Cómo parece hecho | Qué lo delata |",
      lista(datos.graficos).map(
        (g) =>
          `| ${aprox(g.desde)} | ${aprox(g.hasta)} | ${celda(g.descripcion)} | ${fabricacion(g.comoParece)} | ${celda(g.pista)} |`,
      ),
    ),
    "",
    "## Ritmo",
    "",
    `- Cambios visuales: ${esNumero(ritmo.cambiosVisuales) ? `≈ ${ritmo.cambiosVisuales}` : "?"} · un plano cada ${aprox(ritmo.segundosPorPlano)}`,
    ...(texto(ritmo.comentario) ? [`- ${texto(ritmo.comentario)}`] : []),
    "",
    "## Sonido (nada de esto está verificado: confirmarlo en el espectro)",
    "",
    `- Música: ${texto(sonido.musica) || "no dijo"}`,
    `- Voz: ${texto(sonido.voz) || "no dijo"}`,
    ...lista(sonido.efectos).map((e) => `- Efecto en ${aprox(e.t)}: ${texto(e.descripcion) || "sin detalle"}`),
    "",
    "## Dudas del modelo",
    "",
    texto(datos.dudas) || "No anotó ninguna.",
  ];
}

/** El borrador completo. `datos` es lo que devolvió Gemini, tal cual: puede venir incompleto. */
export function armarMarkdown({ video, enfoque, ficha, modelo, muestreo, fecha, datos }) {
  const d = objeto(datos);
  const f = ficha ?? {};
  return [
    `# BORRADOR sin verificar · ${String(video).split(/[\\/]/).pop()}`,
    "",
    "> **Gemini propone, los cuadros deciden.** Esto lo escribió un modelo que miró el video una vez.",
    "> Sirve para saber qué mirar y en qué segundo, nada más: sus tiempos son aproximados, y las",
    "> transiciones, las letras y los sonidos son impresiones suyas. Ningún dato de acá entra a un",
    "> informe ni al estilo sin haberlo visto en un cuadro.",
    "",
    `- **Video:** \`${video}\``,
    `- **Medido con ffprobe:** ${decimal(f.duracion ?? 0)} s · ${fpsLegible(f.fps ?? 0)} cuadros/s · ${f.ancho}×${f.alto}`,
    `- **Lo que le gusta a la persona:** «${texto(enfoque)}»`,
    `- **Modelo:** ${modelo}, mirando ${muestreo} cuadros por segundo`,
    `- **Fecha:** ${fecha}`,
    ...(texto(d.tema) ? [`- **De qué trata, según el modelo:** ${texto(d.tema)}`] : []),
    "",
    "## Qué mirar y en qué segundo",
    "",
    ...seccionDondeMirar(d, f),
    "",
    ...seccionesDelModelo(d),
    "",
    "## Cómo verificar",
    "",
    "Una tira de 24 cuadros consecutivos por punto, con los cuadros que dice arriba. La casilla `k`",
    `es el cuadro \`<desde> + k\`, contado a los ${fpsLegible(f.fps ?? 0)} cuadros/s reales del archivo.`,
    "",
    "```bash",
    `FF=$(node -e "console.log(require('ffmpeg-static'))")`,
    `"$FF" -v error -i "${video}" -vf "select='between(n\\,<desde>\\,<hasta>)',scale=200:-1,tile=8x3" \\`,
    `  -frames:v 1 -fps_mode passthrough "<scratch>/tira-<desde>.png"`,
    "```",
    "",
  ].join("\n");
}
