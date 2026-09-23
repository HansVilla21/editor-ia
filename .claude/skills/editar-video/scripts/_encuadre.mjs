/**
 * Las cuentas del encuadre, sin red ni archivos: de las cajas que devuelve Gemini a los
 * números que usa la composición. cara.mjs pide las cajas; acá se validan y se resumen.
 *
 * Gemini devuelve cada caja como `box_2d = [ymin, xmin, ymax, xmax]`, normalizada de 0 a 1000
 * respecto de la imagen que recibió. Esa imagen es el cuadro del video a su tamaño real
 * (1080x1920, 1440x2560…), y la composición es siempre de 1080x1920: el video la cubre,
 * escalado y recortado al centro. Todo lo que sale de acá está en píxeles de la composición.
 */
import { ANCHO, ALTO, mediana } from "./_comun.mjs";

/** Una cara creíble ocupa entre el 6 % y el 45 % del alto del cuadro. */
export const CARA_MINIMA = 0.06;
export const CARA_MAXIMA = 0.45;
/** Y su centro cae en el 80 % del medio, en horizontal. */
export const MARGEN_LATERAL = 0.1;

const LIENZO = { ancho: ANCHO, alto: ALTO };

/** box_2d → píxeles del video real. */
export function cajaAPixeles([ymin, xmin, ymax, xmax], { ancho, alto }) {
  return {
    arriba: (ymin / 1000) * alto,
    izquierda: (xmin / 1000) * ancho,
    abajo: (ymax / 1000) * alto,
    derecha: (xmax / 1000) * ancho,
  };
}

/** Píxeles del video → píxeles de la composición, con el video cubriéndola (escala y recorte al centro). */
export function aComposicion({ arriba, izquierda, abajo, derecha }, { ancho, alto }, lienzo = LIENZO) {
  const escala = Math.max(lienzo.ancho / ancho, lienzo.alto / alto);
  const dx = (ancho * escala - lienzo.ancho) / 2;
  const dy = (alto * escala - lienzo.alto) / 2;
  return {
    arriba: arriba * escala - dy,
    izquierda: izquierda * escala - dx,
    abajo: abajo * escala - dy,
    derecha: derecha * escala - dx,
  };
}

/** Una caja sirve si son cuatro números dentro de 0–1000 y no está al revés. */
function cajaValida(caja) {
  if (!Array.isArray(caja) || caja.length !== 4) return null;
  const n = caja.map(Number);
  if (!n.every((v) => Number.isFinite(v) && v >= 0 && v <= 1000)) return null;
  const [ymin, xmin, ymax, xmax] = n;
  if (ymin >= ymax || xmin >= xmax) return null;
  return n;
}

/**
 * La respuesta puede venir como lista (`[{label, box_2d}]`, el formato nativo de detección)
 * o como objeto (`{cara: {box_2d}, cabeza: {box_2d}}`). Devuelve las dos cajas crudas.
 */
function leerCajas(datos) {
  const cajas = { cara: null, cabeza: null };
  if (Array.isArray(datos)) {
    for (const d of datos) {
      const nombre = String(d?.label ?? "").toLowerCase();
      if (nombre in cajas && !cajas[nombre]) cajas[nombre] = d.box_2d ?? null;
    }
  } else if (datos && typeof datos === "object") {
    cajas.cara = datos.cara?.box_2d ?? null;
    cajas.cabeza = datos.cabeza?.box_2d ?? null;
  }
  return cajas;
}

/**
 * Un cuadro: de la respuesta de Gemini a {usado, cx, cy, menton, frente, pelo}.
 * `cy` es el centro de la caja de la cara, `menton` su borde de abajo, `frente` el de arriba,
 * y `pelo` el borde de arriba de la caja de la cabeza (null si no vino o no tiene sentido).
 */
export function medirCuadro(datos, video) {
  const crudas = leerCajas(datos);
  const base = { cajas: crudas };
  if (!crudas.cara) return { ...base, usado: false, motivo: "sin cara" };

  const cara = cajaValida(crudas.cara);
  if (!cara) return { ...base, usado: false, motivo: "caja de la cara inválida" };

  const alto = (cara[2] - cara[0]) / 1000;
  if (alto < CARA_MINIMA || alto > CARA_MAXIMA) {
    return { ...base, usado: false, motivo: `cara absurda: ${Math.round(alto * 100)} % del alto` };
  }
  const centroX = (cara[1] + cara[3]) / 2000;
  if (centroX < MARGEN_LATERAL || centroX > 1 - MARGEN_LATERAL) {
    return { ...base, usado: false, motivo: `cara absurda: centro en el ${Math.round(centroX * 100)} % del ancho` };
  }

  const c = aComposicion(cajaAPixeles(cara, video), video);
  let pelo = null;
  const cabeza = cajaValida(crudas.cabeza);
  if (cabeza) {
    const k = aComposicion(cajaAPixeles(cabeza, video), video);
    // La cabeza incluye el pelo: si empieza debajo de la frente, esa caja está mal.
    if (k.arriba <= c.arriba) pelo = k.arriba;
  }

  return {
    ...base,
    usado: true,
    cx: (c.izquierda + c.derecha) / 2,
    cy: (c.arriba + c.abajo) / 2,
    menton: c.abajo,
    frente: c.arriba,
    pelo,
  };
}

/**
 * Todos los cuadros: la mediana de los usados, y los dos números del estilo
 * (`referencias/estilo-visual.md`):
 *   corrimientoSplit = −(cy − 470)
 *   subtitulosFull   = min(1560, cy + (menton − cy) · 1,25 + 120)
 */
export function resumirEncuadre(cuadros) {
  const usados = cuadros.filter((c) => c.usado);
  if (usados.length === 0) {
    const motivos = {};
    for (const c of cuadros) motivos[c.motivo ?? "sin motivo"] = (motivos[c.motivo ?? "sin motivo"] ?? 0) + 1;
    const detalle = Object.entries(motivos)
      .map(([m, n]) => `${n} ${m}`)
      .join(", ");
    throw new Error(
      `Ningún cuadro trajo una cara utilizable (${cuadros.length} mirados${detalle ? `: ${detalle}` : ""}).\n` +
        "Revisar que la persona esté a cámara en el video, y probar con más cuadros (--cuadros 16).",
    );
  }

  const medio = (campo) => Math.round(mediana(usados.map((c) => c[campo])));
  const avisos = [];
  const cx = medio("cx");
  const cy = medio("cy");
  const menton = medio("menton");

  const conPelo = usados.filter((c) => Number.isFinite(c.pelo));
  let pelo;
  if (conPelo.length) {
    pelo = Math.round(mediana(conPelo.map((c) => c.pelo)));
  } else {
    pelo = medio("frente");
    avisos.push("Ningún cuadro trajo la caja de la cabeza: el pelo es el borde de arriba de la cara (la frente).");
  }

  return {
    cx,
    cy,
    pelo,
    menton,
    corrimientoSplit: -(cy - 470),
    subtitulosFull: Math.min(1560, Math.round(cy + (menton - cy) * 1.25 + 120)),
    usados: usados.length,
    mirados: cuadros.length,
    avisos,
  };
}
