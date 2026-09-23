/**
 * Piezas chicas que comparten el panel y sus escenas: medidas, tags, íconos y tarjetas.
 */
import React from "react";
import { colores, radio, tipografia } from "./marca";
import type { Estado } from "./tipos";

/** Margen lateral del panel. */
export const MARGEN = 64;
/** Cuerpo del panel, en coordenadas del panel: de y = 290 a y = 720 (1680 absoluto). */
export const CUERPO = { arriba: 290, alto: 430 };
export const ANCHO_UTIL = 1080 - MARGEN * 2;

/** Achica un texto de una línea para que entre en `ancho` (estimación por caracteres, conservadora). */
export const tamanoQueEntra = (texto: string, maximo: number, ancho = ANCHO_UTIL, factor = 0.58) =>
  Math.floor(Math.min(maximo, ancho / Math.max(1, texto.length * factor)));

export const colorDeEstado = (estado?: Estado) =>
  estado === "ok" ? colores.bien : estado === "alerta" ? colores.atencion : estado === "error" ? colores.error : colores.acento;

export const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = colores.textoSuave }) => (
  <span
    style={{
      fontFamily: tipografia.mono,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: "0.06em",
      color,
      border: `1px solid ${color}55`,
      background: `${color}14`,
      borderRadius: radio.tag,
      padding: "6px 12px",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/** Círculo con un número, o el ícono del estado (bien, atención, error). */
export const Icono: React.FC<{ numero?: number; estado?: Estado; tamano?: number }> = ({ numero, estado, tamano = 44 }) => {
  const color = colorDeEstado(estado);
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" style={{ flex: "none" }}>
      <circle cx="12" cy="12" r="11" fill={`${color}22`} stroke={color} strokeWidth="1.5" />
      {estado === "ok" ? (
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      ) : estado === "error" ? (
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      ) : estado === "alerta" ? (
        <path d="M12 6.8v6.4M12 16.6v.2" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <text x="12" y="16.2" textAnchor="middle" fontFamily="ui-monospace, Consolas, monospace" fontWeight="700" fontSize="11" fill={color}>
          {numero ?? ""}
        </text>
      )}
    </svg>
  );
};

/** Estilo de las tarjetas y filas del panel. */
export const tarjeta: React.CSSProperties = {
  background: colores.superficie,
  border: `1px solid ${colores.borde}`,
  borderRadius: radio.tarjeta,
};
