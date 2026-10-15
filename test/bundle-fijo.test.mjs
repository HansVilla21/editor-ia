import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { asegurarBundle, borrarBundle, limpiarViejos, SELLO } from "../scripts/bundle-fijo.mjs";

const DIA = 24 * 60 * 60 * 1000;
const carpetas = [];
after(() => {
  for (const c of carpetas) fs.rmSync(c, { recursive: true, force: true }); // solo las que armó esta prueba
});

/** Un proyecto mínimo: una entrada, un archivo en public/ y la configuración. */
function proyecto() {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "editor-ia-prueba-bundle-"));
  carpetas.push(raiz);
  fs.mkdirSync(path.join(raiz, "src/entries"), { recursive: true });
  fs.mkdirSync(path.join(raiz, "public/video"), { recursive: true });
  fs.writeFileSync(path.join(raiz, "src/entries/video.tsx"), "export {};");
  fs.writeFileSync(path.join(raiz, "public/video/voz.wav"), "voz");
  fs.writeFileSync(path.join(raiz, "package.json"), "{}");
  return raiz;
}

/** Un armador falso: deja un index.html en la carpeta pedida y cuenta las veces que lo llamaron. */
function armadorFalso() {
  const llamadas = [];
  const armar = async ({ outDir }) => {
    llamadas.push(outDir);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.html"), "<html></html>");
  };
  return { armar, llamadas };
}

const futuro = (archivo, segundos) => {
  const t = new Date(Date.now() + segundos * 1000);
  fs.utimesSync(archivo, t, t);
};

const callado = () => {};

test("arma el bundle en build/<entrada> la primera vez y lo reutiliza si nada cambió", async () => {
  const raiz = proyecto();
  const { armar, llamadas } = armadorFalso();
  const entrada = path.join(raiz, "src/entries/video.tsx");
  const dir = await asegurarBundle(entrada, { raiz, armar, avisar: callado });
  assert.equal(dir, path.join(raiz, "build", "video"));
  assert.ok(fs.existsSync(path.join(dir, "index.html")));
  assert.ok(fs.existsSync(path.join(dir, SELLO)));
  await asegurarBundle(entrada, { raiz, armar, avisar: callado });
  assert.equal(llamadas.length, 1, "la segunda vez no tenía que rehacerlo");
});

test("lo rehace solo cuando un archivo de public/ o de src/ es más nuevo, y dice cuál", async () => {
  const raiz = proyecto();
  const { armar, llamadas } = armadorFalso();
  const entrada = path.join(raiz, "src/entries/video.tsx");
  await asegurarBundle(entrada, { raiz, armar, avisar: callado });
  futuro(path.join(raiz, "public/video/voz.wav"), 10);
  const avisos = [];
  await asegurarBundle(entrada, { raiz, armar, avisar: (m) => avisos.push(m) });
  assert.equal(llamadas.length, 2);
  assert.match(avisos.join("\n"), /rehaciendo build\/video \(cambió public[\\/]video[\\/]voz\.wav\)/);
});

test("si el armado falla, conserva el bundle anterior y no deja la carpeta a medias", async () => {
  const raiz = proyecto();
  const { armar } = armadorFalso();
  const entrada = path.join(raiz, "src/entries/video.tsx");
  const dir = await asegurarBundle(entrada, { raiz, armar, avisar: callado });
  futuro(path.join(raiz, "src/entries/video.tsx"), 10);
  const falla = async ({ outDir }) => {
    fs.mkdirSync(outDir, { recursive: true });
    throw new Error("se cortó");
  };
  await assert.rejects(asegurarBundle(entrada, { raiz, armar: falla, avisar: callado }), /se cortó/);
  assert.ok(fs.existsSync(path.join(dir, "index.html")), "el bundle anterior tenía que quedar");
  assert.deepEqual(fs.readdirSync(path.join(raiz, "build")), ["video"]);
});

test("borra los bundles sin uso en 7 días y los armados a medias; no toca los recientes ni los ajenos", () => {
  const raiz = proyecto();
  const build = path.join(raiz, "build");
  const ahora = Date.now();
  const conSello = (nombre, usado) => {
    fs.mkdirSync(path.join(build, nombre), { recursive: true });
    fs.writeFileSync(path.join(build, nombre, SELLO), JSON.stringify({ entrada: "x", creado: usado, usado }));
  };
  conSello("viejo", ahora - 8 * DIA);
  conSello("reciente", ahora - 2 * DIA);
  fs.mkdirSync(path.join(build, "ajeno"));
  fs.mkdirSync(path.join(build, "video.nuevo-123"));
  const hace2h = new Date(ahora - 2 * 60 * 60 * 1000);
  fs.utimesSync(path.join(build, "video.nuevo-123"), hace2h, hace2h);
  const borrados = limpiarViejos({ raiz, ahora, avisar: callado });
  assert.deepEqual(borrados.sort(), ["video.nuevo-123", "viejo"]);
  assert.deepEqual(fs.readdirSync(build).sort(), ["ajeno", "reciente"]);
});

test("borrar al aprobar: borra el bundle con sello y no toca una carpeta sin sello", async () => {
  const raiz = proyecto();
  const { armar } = armadorFalso();
  await asegurarBundle(path.join(raiz, "src/entries/video.tsx"), { raiz, armar, avisar: callado });
  fs.mkdirSync(path.join(raiz, "build", "ajeno"));
  assert.equal(borrarBundle("video", { raiz, avisar: callado }), true);
  assert.equal(borrarBundle("ajeno", { raiz, avisar: callado }), false);
  assert.deepEqual(fs.readdirSync(path.join(raiz, "build")), ["ajeno"]);
});
