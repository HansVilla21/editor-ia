/**
 * Elige qué escena dibujar en el cuerpo del panel según su tipo.
 * Para sumar un tipo nuevo: su componente en esta carpeta, su forma en tipos.ts y un caso acá.
 */
import React from "react";
import type { BloqueEnCuadros } from "../tiempos";
import type { Escena } from "../tipos";
import { Comando } from "./Comando";
import { Contador } from "./Contador";
import { Lista } from "./Lista";
import { Tarjeta } from "./Tarjeta";

export const EscenaDelBloque: React.FC<{ escena: Escena; bloque: BloqueEnCuadros }> = ({ escena, bloque }) => {
  switch (escena.tipo) {
    case "tarjeta":
      return <Tarjeta escena={escena} bloque={bloque} />;
    case "lista":
      return <Lista escena={escena} />;
    case "contador":
      return <Contador escena={escena} bloque={bloque} />;
    case "comando":
      return <Comando escena={escena} bloque={bloque} />;
    default:
      return null;
  }
};
