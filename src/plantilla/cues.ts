/**
 * Qué efectos suenan y en qué cuadro cae su golpe.
 *
 * Los mecánicos salen solos de los bloques: whooshIn al pasar de full a split, whooshOut al
 * volver, swish en cada sub-escena, un click por fila de lista, los ticks del contador con el
 * espaciado de su curva, el tecleo mientras se tipea y un impacto en el cierre. Los demás van
 * en CUES, en datos.ts, sincronizados con su gráfico.
 */
import { cuadrosDeTipeo, ticksDeContador } from "./anim";
import { CUES, EFECTOS } from "./datos";
import { BLOQUES_F, CTA_F, DURACION, f } from "./tiempos";
import type { ClaveEfecto } from "./tipos";

export type CueEnCuadros = {
  clave: ClaveEfecto;
  /** Cuadro del evento: ahí cae el pico del efecto. */
  cuadro: number;
  vol?: number;
  /** Cuántos cuadros suena (archivos largos), con fade al final. */
  dura?: number;
};

export function cuesAutomaticos(): CueEnCuadros[] {
  const cues: CueEnCuadros[] = [];
  BLOQUES_F.forEach((b, i) => {
    const antes = BLOQUES_F[i - 1];
    if (antes && antes.tipo === "full" && b.tipo === "split") cues.push({ clave: "whooshIn", cuadro: b.desdeF });
    if (antes && antes.tipo === "split" && b.tipo === "full") cues.push({ clave: "whooshOut", cuadro: b.desdeF });
    if (antes && antes.tipo === "split" && b.tipo === "split") cues.push({ clave: "swish", cuadro: b.desdeF });
    const e = b.tipo === "split" ? b.escena : undefined;
    if (!e) return;
    if (e.tipo === "lista") for (const fila of e.filas) cues.push({ clave: "click", cuadro: f(fila.en) });
    if (e.tipo === "contador") {
      for (const t of ticksDeContador(f(e.desde), f(e.hasta ?? e.desde + 1))) cues.push({ clave: "tick", cuadro: t, dura: 8 });
    }
    if (e.tipo === "comando") cues.push({ clave: "typing", cuadro: f(e.en), dura: cuadrosDeTipeo(e.texto) });
  });
  if (CTA_F < DURACION) cues.push({ clave: "impact", cuadro: CTA_F + 3 });
  return cues;
}

/** Con "pocos", de los automáticos quedan solo los de los cambios de plano; con "ninguno", nada. */
const CAMBIOS_DE_PLANO: ClaveEfecto[] = ["whooshIn", "whooshOut"];
const automaticos = () =>
  EFECTOS === "ninguno"
    ? []
    : EFECTOS === "pocos"
      ? cuesAutomaticos().filter((c) => CAMBIOS_DE_PLANO.includes(c.clave))
      : cuesAutomaticos();

export const TODOS_LOS_CUES: CueEnCuadros[] = [
  ...automaticos(),
  ...(EFECTOS === "ninguno" ? [] : CUES).map((c) => ({ clave: c.clave, cuadro: f(c.en), vol: c.vol, dura: c.dura === undefined ? undefined : f(c.dura) })),
].filter((c) => c.cuadro >= 0 && c.cuadro < DURACION);
