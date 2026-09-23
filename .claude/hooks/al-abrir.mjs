#!/usr/bin/env node
/**
 * Corre cada vez que se abre el proyecto y dice lo único que conviene hacer ahora.
 * Si no hay nada pendiente, no dice nada.
 */
import { readFileSync } from "node:fs";
import { revisarMaquina } from "../../scripts/doctor.mjs";
import { siguientePaso } from "../../scripts/estado.mjs";
import { asegurarMemoria } from "../../scripts/memoria.mjs";

const leerEstado = () => {
  try {
    return JSON.parse(readFileSync(new URL("../../estado.json", import.meta.url), "utf8"));
  } catch {
    return {};
  }
};

// La memoria de la persona (preferencias, reglas, decisiones) se arma sola desde las plantillas.
asegurarMemoria();

const paso = siguientePaso({ revisiones: await revisarMaquina(), estado: leerEstado() });

if (paso) console.log(paso.mensaje);
