/**
 * Corregir palabras.json sin tocar los tiempos: leer la lista "mal => bien" y aplicarla.
 *
 * Se compara sin distinguir mayúsculas y sin la puntuación de los bordes ("¿Codl," es "codl").
 * El texto nuevo va tal cual lo escribió la persona; la puntuación de los bordes de lo viejo se
 * conserva, porque de ahí salen los cortes de frase de los subtítulos.
 */
import { cuadroDe } from "./_comun.mjs";

const BORDE = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su;

/** Separa "¿Codl," en ["¿", "Codl", ","]. */
function partes(texto) {
  const [, antes, centro, despues] = String(texto).match(BORDE);
  return { antes, centro, despues };
}

const normal = (texto) => partes(texto).centro.toLocaleLowerCase("es");

const tokens = (lado) =>
  lado
    .trim()
    .split(/\s+/)
    .filter((t) => normal(t) !== "");

/**
 * Una corrección por línea: `mal => bien`, una o varias palabras de cada lado.
 * Las líneas vacías y las que empiezan con # se ignoran; las que no se entienden van a `errores`.
 */
export function leerCorrecciones(texto) {
  const correcciones = [];
  const errores = [];
  String(texto)
    .split(/\r?\n/)
    .forEach((crudo, i) => {
      const linea = crudo.trim();
      const numero = i + 1;
      if (!linea || linea.startsWith("#")) return;
      const flecha = linea.indexOf("=>");
      if (flecha < 0) {
        errores.push({ numero, linea, motivo: "no tiene «=>»" });
        return;
      }
      const textoMal = linea.slice(0, flecha).trim();
      const textoBien = linea.slice(flecha + 2).trim();
      const mal = tokens(textoMal).map(normal);
      const bien = tokens(textoBien);
      if (mal.length === 0 || bien.length === 0) {
        errores.push({ numero, linea, motivo: "le falta un lado: va «mal => bien»" });
        return;
      }
      correcciones.push({ numero, textoMal, textoBien, mal, bien });
    });
  return { correcciones, errores };
}

const redondear = (s) => Number(Number(s).toFixed(3));

/** Le pasa a la palabra nueva la puntuación de los bordes de la vieja, si ella no trae la suya. */
function conBordes(nueva, antes, despues) {
  const p = partes(nueva);
  return `${p.antes || antes}${p.centro}${p.despues || despues}`;
}

/** Una palabra nueva con su tramo; lleva cuadros solo si palabras.json los traía. */
function conTiempos(texto, inicio, fin, conCuadros) {
  const palabra = { texto, inicio: redondear(inicio), fin: redondear(fin) };
  if (conCuadros) {
    palabra.cuadroInicio = cuadroDe(palabra.inicio);
    palabra.cuadroFin = cuadroDe(palabra.fin);
  }
  return palabra;
}

/**
 * Reemplaza las palabras viejas por las nuevas. Misma cantidad: palabra por palabra, con sus
 * tiempos. Otra cantidad: las nuevas se reparten el tramo de las viejas según su largo.
 */
function reemplazar(viejas, bien) {
  if (viejas.length === bien.length) {
    return viejas.map((v, i) => {
      const { antes, despues } = partes(v.texto);
      return { ...v, texto: conBordes(bien[i], antes, despues) };
    });
  }
  const primera = viejas[0];
  const ultima = viejas[viejas.length - 1];
  const conCuadros = "cuadroInicio" in primera;
  const largos = bien.map((b) => Math.max(1, partes(b).centro.length));
  const total = largos.reduce((s, n) => s + n, 0);
  const tramo = ultima.fin - primera.inicio;
  let acumulado = 0;
  return bien.map((b, i) => {
    const inicio = primera.inicio + (tramo * acumulado) / total;
    acumulado += largos[i];
    const fin = i === bien.length - 1 ? ultima.fin : primera.inicio + (tramo * acumulado) / total;
    const texto = conBordes(
      b,
      i === 0 ? partes(primera.texto).antes : "",
      i === bien.length - 1 ? partes(ultima.texto).despues : "",
    );
    return conTiempos(texto, inicio, fin, conCuadros);
  });
}

/**
 * Aplica las correcciones en orden, cada una sobre lo que dejó la anterior, en todas las
 * apariciones. Devuelve las palabras nuevas y, por corrección, el segundo de cada aparición.
 */
export function aplicarCorrecciones(palabras, correcciones) {
  let actuales = palabras.map((p) => ({ ...p }));
  const resultados = [];
  for (const c of correcciones) {
    const apariciones = [];
    const siguientes = [];
    let i = 0;
    while (i < actuales.length) {
      const coincide =
        i + c.mal.length <= actuales.length &&
        c.mal.every((m, k) => normal(actuales[i + k].texto) === m);
      if (coincide) {
        const viejas = actuales.slice(i, i + c.mal.length);
        apariciones.push(viejas[0].inicio);
        siguientes.push(...reemplazar(viejas, c.bien));
        i += c.mal.length;
      } else {
        siguientes.push(actuales[i]);
        i += 1;
      }
    }
    actuales = siguientes;
    resultados.push({ ...c, apariciones });
  }
  return { palabras: actuales, resultados };
}
