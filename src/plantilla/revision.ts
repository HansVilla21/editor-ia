/**
 * Revisa los datos una vez por render y avisa en la consola lo que suele salir mal. No frena
 * nada: el video renderiza igual. Los avisos se leen en la terminal del render o en el Studio.
 */
import { getRemotionEnvironment } from "remotion";
import { hayDelVideo, MUSICA, VIDEO, VOZ } from "./archivos";
import { medidasDelCta } from "./Cta";
import { BLOQUES, CTA, ENCUADRE, TITULAR } from "./datos";
import { BLOQUES_F, bloqueEn, CTA_F, DURACION, f } from "./tiempos";
import { medidasDelTitular } from "./Titular";

const MINIMO_BLOQUE = 54; // 1,8 s

export function avisos(): string[] {
  const lista: string[] = [];
  if (ENCUADRE.menton <= ENCUADRE.cy || ENCUADRE.pelo >= ENCUADRE.cy) {
    lista.push("ENCUADRE: el pelo tiene que quedar arriba del centro de la cara y el mentón abajo. Revisá encuadre.json y guia.png.");
  }
  BLOQUES_F.forEach((b, i) => {
    const largo = b.hastaF - b.desdeF;
    if (largo < MINIMO_BLOQUE && i < BLOQUES_F.length - 1) {
      lista.push(`Bloque ${i + 1} (${b.desde} s): dura ${largo} cuadros; el mínimo es ${MINIMO_BLOQUE}.`);
    }
    if (b.tipo === "full" && b.escena) lista.push(`Bloque ${i + 1}: es full y tiene escena. En full no se pone nada sobre la cara: se ignora.`);
    if (b.tipo === "split" && !b.escena) lista.push(`Bloque ${i + 1}: es split y no tiene escena; el panel queda vacío.`);
    const original = BLOQUES.find((x) => x.desde === b.desde);
    const siguiente = BLOQUES_F[i + 1];
    if (original && siguiente && Math.abs(f(original.hasta) - siguiente.desdeF) > 1) {
      lista.push(`Bloque ${i + 1}: termina en ${original.hasta} s pero el siguiente empieza en ${siguiente.desde} s. Se toma el inicio del siguiente.`);
    }
  });
  if (CTA_F >= DURACION) lista.push(`CTA: empieza en ${CTA.desde} s, después del final del video.`);
  else if (bloqueEn(CTA_F).tipo !== "full") lista.push("CTA: cae en un bloque split. El cierre va en full.");
  else if (medidasDelCta("full").escala < 1) lista.push("CTA: no entra entre el mentón y y = 1680; se achicó. Acortá el texto.");
  const palabras = TITULAR.join(" ").split(/\s+/).filter(Boolean).length;
  if (TITULAR.length > 2) lista.push("TITULAR: más de dos líneas; se muestran las dos primeras.");
  if (palabras < 3 || palabras > 7) lista.push(`TITULAR: tiene ${palabras} palabras; lo que se lee en un segundo son de 3 a 7.`);
  const t = medidasDelTitular(BLOQUES_F[0].tipo);
  if (t.tamano < 64) lista.push(`TITULAR: no entra entre y = 240 y el pelo; quedó en ${t.tamano} px. Acortalo.`);
  if (!hayDelVideo(VIDEO)) lista.push("Falta el video: se muestra el marcador.");
  else if (!hayDelVideo(VOZ)) lista.push("Falta voz.wav: suena el audio del video, sin nivelar.");
  if (!hayDelVideo(MUSICA)) lista.push("Sin musica.m4a: el video va sin música.");
  return lista;
}

let revisado = false;

/**
 * Una vez por render. Cada pestaña del navegador carga este código de nuevo, así que en
 * `npx remotion render` avisa solo la pestaña principal (las demás callan); en el Studio, una
 * vez por carga. previa.mjs abre una pestaña por cuadro y filtra los repetidos de su lado.
 */
export function revisarUnaVez() {
  if (revisado) return;
  revisado = true;
  if (getRemotionEnvironment().isRendering && !window.remotion_isMainTab) return;
  for (const a of avisos()) console.warn(`[revisión] ${a}`);
}
