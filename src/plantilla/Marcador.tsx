/**
 * Lo que se ve donde iría el video (o la foto de la portada) cuando todavía no está en public/.
 *
 * No es una persona: son las tres líneas del encuadre —pelo, centro de la cara y mentón— para
 * que se vea dónde van a caer el titular, los subtítulos y el split antes de tener la grabación.
 */
import React from "react";
import { ENCUADRE } from "./datos";
import { colores, tipografia } from "./marca";

const Linea: React.FC<{ y: number; nombre: string }> = ({ y, nombre }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: y, height: 0, borderTop: `2px dashed ${colores.textoSuave}55` }}>
    <span
      style={{
        position: "absolute",
        right: 36,
        top: -34,
        fontFamily: tipografia.mono,
        fontSize: 22,
        letterSpacing: "0.08em",
        color: `${colores.textoSuave}AA`,
      }}
    >
      {nombre} · y {Math.round(y)}
    </span>
  </div>
);

export const Marcador: React.FC<{ archivo: string }> = ({ archivo }) => {
  const alto = ENCUADRE.menton - ENCUADRE.pelo;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: `linear-gradient(180deg, #1C2331 0%, #121722 55%, ${colores.fondo} 100%)`,
      }}
    >
      {/* Grilla suave, para que el zoom alterno y las transiciones se noten aun sin video. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />
      {/* La zona de la cara: un óvalo de guía, sin rasgos. */}
      <div
        style={{
          position: "absolute",
          left: (ENCUADRE.cx ?? 540) - alto * 0.36,
          top: ENCUADRE.pelo,
          width: alto * 0.72,
          height: alto,
          borderRadius: "50%",
          border: `2px dashed ${colores.textoSuave}66`,
          background: "rgba(255,255,255,.025)",
        }}
      />
      <Linea y={ENCUADRE.pelo} nombre="pelo" />
      <Linea y={ENCUADRE.cy} nombre="cara" />
      <Linea y={ENCUADRE.menton} nombre="mentón" />
      {/* El aviso va a la altura de la cara: ahí nunca se dibuja nada, así no choca con ningún texto. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: ENCUADRE.cy + 20,
          textAlign: "center",
          fontFamily: tipografia.mono,
          fontSize: 24,
          lineHeight: 1.4,
          color: `${colores.textoSuave}CC`,
        }}
      >
        falta
        <br />
        public/{archivo}
      </div>
    </div>
  );
};
