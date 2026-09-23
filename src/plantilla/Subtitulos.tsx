/**
 * Subtítulos: bloques de 2 a 3 palabras (4 como máximo), cortes secos, sin animación, sin color
 * y sin karaoke. Lo que la persona DIJO, con los nombres propios bien escritos.
 *
 * Un bloque de palabras nunca cruza un cambio de bloque del video: los dos cambian en el mismo
 * cuadro. En full van a la altura del pecho, en split sobre la costura, y desde el cierre se
 * ocultan. Viven afuera de la toma: la transición no los mueve.
 */
import React from "react";
import { useCurrentFrame } from "remotion";
import { PALABRAS, PILDORA } from "./datos";
import { Y_SUBTITULOS_FULL, Y_SUBTITULOS_SPLIT } from "./encuadre";
import { colores, radio, subtitulos, tipografia } from "./marca";
import { BLOQUES_F, bloqueEn, CTA_F, f } from "./tiempos";
import type { Palabra } from "./tipos";

const PAUSA = 0.35; // segundos de silencio que separan dos bloques de palabras
const MAX_PALABRAS = 3;
const MAX_LETRAS = 24;
const CIERRA = /[.!?…]["»”)]?$/;
const PAUSA_ESCRITA = /[,;:]$/;
const PUNTUADA = /[.,;:!?…]["»”)]?$/;

const cuadroDe = (p: Palabra) => p.cuadroInicio ?? f(p.inicio);
const texto = (g: Palabra[]) => g.map((p) => p.texto).join(" ");

export type Grupo = { palabras: Palabra[]; desde: number; hasta: number };

/**
 * Junta las palabras en bloques de lectura. `costuras` son los cuadros donde cambia el bloque
 * del video: ningún bloque de palabras las cruza.
 */
export function agrupar(palabras: Palabra[], costuras: number[], fin: number): Grupo[] {
  const cruza = (a: Palabra, b: Palabra) => costuras.some((c) => cuadroDe(a) < c && cuadroDe(b) >= c);
  const grupos: Palabra[][] = [];
  let actual: Palabra[] = [];
  for (const p of palabras) {
    const previa = actual[actual.length - 1];
    if (previa) {
      const letras = texto([...actual, p]).length;
      // Un cuarto solo si cierra la frase y entra: así no queda una palabra huérfana.
      const lleno =
        actual.length >= MAX_PALABRAS && !(actual.length === MAX_PALABRAS && PUNTUADA.test(p.texto) && letras <= MAX_LETRAS + 4);
      if (
        lleno ||
        (letras > MAX_LETRAS && actual.length >= 2) ||
        CIERRA.test(previa.texto) ||
        PAUSA_ESCRITA.test(previa.texto) ||
        p.inicio - previa.fin > PAUSA ||
        cruza(previa, p)
      ) {
        grupos.push(actual);
        actual = [];
      }
    }
    actual.push(p);
  }
  if (actual.length) grupos.push(actual);

  // Una palabra sola sin puntuación se pega al bloque siguiente si entra y no hay pausa ni costura.
  for (let i = 0; i < grupos.length - 1; i++) {
    const g = grupos[i];
    const siguiente = grupos[i + 1];
    const w = g[0];
    if (
      g.length === 1 &&
      !PUNTUADA.test(w.texto) &&
      siguiente.length < 4 &&
      siguiente[0].inicio - w.fin <= PAUSA &&
      !cruza(w, siguiente[0]) &&
      texto([w, ...siguiente]).length <= MAX_LETRAS + 4
    ) {
      grupos.splice(i, 2, [w, ...siguiente]);
    }
  }

  return grupos
    .map((g, i) => {
      const proximo = grupos[i + 1];
      const ultimo = g[g.length - 1];
      // Se sostiene hasta el bloque siguiente; en un silencio largo, hasta un segundo después.
      const hasta = Math.min(proximo ? cuadroDe(proximo[0]) : fin, (ultimo.cuadroFin ?? f(ultimo.fin)) + 30, fin);
      return { palabras: g, desde: cuadroDe(g[0]), hasta: Math.max(hasta, cuadroDe(g[0]) + 1) };
    })
    .filter((g) => g.desde < fin);
}

/** Sin la coma o el punto del final: en pantalla sobran. Los signos de pregunta quedan. */
const limpio = (g: Palabra[]) => texto(g).replace(/[.,;:…]+$/, "");

const costuras = [...BLOQUES_F.slice(1).map((b) => b.desdeF), CTA_F];
const GRUPOS = agrupar(PALABRAS, costuras, CTA_F);

export const Subtitulos: React.FC = () => {
  const cuadro = useCurrentFrame();
  if (cuadro >= CTA_F) return null;
  const grupo = GRUPOS.find((g) => cuadro >= g.desde && cuadro < g.hasta);
  if (!grupo) return null;
  const y = bloqueEn(cuadro).tipo === "split" ? Y_SUBTITULOS_SPLIT : Y_SUBTITULOS_FULL;
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: y,
        transform: "translateY(-50%)",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: tipografia.subtitulos,
          fontWeight: subtitulos.peso,
          fontSize: subtitulos.tamano,
          lineHeight: 1.12,
          letterSpacing: subtitulos.espaciado,
          color: colores.texto,
          textShadow: PILDORA.subtitulos ? undefined : subtitulos.sombra,
          background: PILDORA.subtitulos ? colores.pildora : undefined,
          borderRadius: radio.pildora,
          padding: PILDORA.subtitulos ? "8px 22px" : 0,
        }}
      >
        {limpio(grupo.palabras)}
      </div>
    </div>
  );
};
