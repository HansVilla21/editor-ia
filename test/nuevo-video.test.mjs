/**
 * nuevo-video.mjs copia la base de composición a src/<slug>/ y le arma su entrada.
 *
 * Lo que se cuida: que la copia no quede apuntando a la base (el render no falla, renderiza
 * el contenido de la base, y eso se descubre tarde), que los ids salgan del slug, y que un
 * slug que ya existe o que no sirve se rechace sin tocar nada.
 *
 * Todo corre en carpetas temporales: nunca se crea un video de verdad en el repo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { aPascal, nuevoVideo, validarSlug } from "../scripts/nuevo-video.mjs";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const SCRIPT = join(REPO, "scripts", "nuevo-video.mjs");

/** Una base mínima, con una subcarpeta, para probar el script sin depender de los componentes. */
function raizDePrueba() {
  const raiz = mkdtempSync(join(tmpdir(), "nuevo-video-"));
  const base = join(raiz, "src", "plantilla");
  mkdirSync(join(base, "escenas"), { recursive: true });
  writeFileSync(join(base, "datos.ts"), 'export const DIR = "plantilla";\nexport const X = 1;\n');
  writeFileSync(join(base, "Reel.tsx"), "export const Reel = () => null;\n");
  writeFileSync(join(base, "escenas", "Lista.tsx"), "export const Lista = () => null;\n");
  writeFileSync(join(base, "palabras.json"), "[]\n");
  mkdirSync(join(raiz, "src", "entries"), { recursive: true });
  writeFileSync(
    join(raiz, "src", "entries", "plantilla.tsx"),
    [
      'import { Composition, Still, registerRoot } from "remotion";',
      'import { Reel } from "../plantilla/Reel";',
      'import { Portada } from "../plantilla/Portada";',
      "const Raiz = () => (",
      "  <>",
      '    <Composition id="Plantilla" component={Reel} durationInFrames={1} fps={30} width={1080} height={1920} />',
      '    <Still id="PlantillaPortada" component={Portada} width={1080} height={1920} />',
      "  </>",
      ");",
      "registerRoot(Raiz);",
      "",
    ].join("\n"),
  );
  return raiz;
}

/** Todos los archivos de una carpeta, recursivo. */
function archivos(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const menciones = (ruta) => /plantilla/i.test(readFileSync(ruta, "utf8"));

test("aPascal arma el id de la composición a partir del slug", () => {
  assert.equal(aPascal("mi-video"), "MiVideo");
  assert.equal(aPascal("reel-2-final"), "Reel2Final");
  assert.equal(aPascal("5-skills"), "5Skills");
  assert.equal(aPascal("prueba"), "Prueba");
});

test("validarSlug acepta minúsculas, números y guiones", () => {
  for (const bueno of ["mi-video", "reel2", "5-skills", "a"]) {
    assert.equal(validarSlug(bueno), null, bueno);
  }
});

test("validarSlug rechaza lo que rompería rutas o ids", () => {
  for (const malo of ["", "Mi-Video", "mi video", "mi_video", "ñandú", "../fuera", "-x", "x-", "a--b", "plantilla", "mi-plantilla", "entries", "sfx"]) {
    assert.equal(typeof validarSlug(malo), "string", `debería rechazar "${malo}"`);
  }
});

test("copia la base entera a src/<slug>/, con subcarpetas", () => {
  const raiz = raizDePrueba();
  nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  const copia = join(raiz, "src", "mi-video");
  assert.ok(existsSync(join(copia, "Reel.tsx")));
  assert.ok(existsSync(join(copia, "escenas", "Lista.tsx")));
  assert.ok(existsSync(join(copia, "palabras.json")));
  // La base queda como estaba.
  assert.match(readFileSync(join(raiz, "src", "plantilla", "datos.ts"), "utf8"), /DIR = "plantilla"/);
});

test("DIR de la copia apunta a public/<slug>/", () => {
  const raiz = raizDePrueba();
  nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  const datos = readFileSync(join(raiz, "src", "mi-video", "datos.ts"), "utf8");
  assert.match(datos, /export const DIR = "mi-video";/);
});

test("la entrada nueva registra <Slug> y <Slug>Portada y apunta a la copia", () => {
  const raiz = raizDePrueba();
  const r = nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  assert.equal(r.id, "MiVideo");
  assert.equal(r.idPortada, "MiVideoPortada");
  const entrada = readFileSync(join(raiz, "src", "entries", "mi-video.tsx"), "utf8");
  assert.match(entrada, /id="MiVideo"/);
  assert.match(entrada, /id="MiVideoPortada"/);
  assert.match(entrada, /from "\.\.\/mi-video\/Reel"/);
});

test("no queda ninguna mención a la base ni en la copia ni en la entrada", () => {
  const raiz = raizDePrueba();
  nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  const quedan = [...archivos(join(raiz, "src", "mi-video")), join(raiz, "src", "entries", "mi-video.tsx")].filter(menciones);
  assert.deepEqual(quedan, []);
});

test("crea public/<slug>/ y videos/<fecha>-<slug>/versiones/", () => {
  const raiz = raizDePrueba();
  const r = nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  assert.ok(existsSync(join(raiz, "public", "mi-video")));
  assert.ok(existsSync(join(raiz, "videos", "2026-09-23-mi-video", "versiones")));
  assert.equal(r.carpetaVideos, "videos/2026-09-23-mi-video");
});

test("respeta lo que ya había en public/<slug>/", () => {
  const raiz = raizDePrueba();
  mkdirSync(join(raiz, "public", "mi-video"), { recursive: true });
  writeFileSync(join(raiz, "public", "mi-video", "video.mp4"), "no se toca");
  nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  assert.equal(readFileSync(join(raiz, "public", "mi-video", "video.mp4"), "utf8"), "no se toca");
});

test("rechaza un slug que ya existe y no toca nada", () => {
  const raiz = raizDePrueba();
  nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-23" });
  writeFileSync(join(raiz, "src", "mi-video", "datos.ts"), "// editado a mano\n");
  assert.throws(() => nuevoVideo({ raiz, slug: "mi-video", fecha: "2026-09-24" }), /ya existe/);
  assert.equal(readFileSync(join(raiz, "src", "mi-video", "datos.ts"), "utf8"), "// editado a mano\n");
  assert.equal(existsSync(join(raiz, "videos", "2026-09-24-mi-video")), false);
});

test("rechaza un slug cuya entrada ya existe aunque falte la carpeta", () => {
  const raiz = raizDePrueba();
  writeFileSync(join(raiz, "src", "entries", "otro.tsx"), "// ya estaba\n");
  assert.throws(() => nuevoVideo({ raiz, slug: "otro", fecha: "2026-09-23" }), /ya existe/);
  assert.equal(existsSync(join(raiz, "src", "otro")), false);
});

test("rechaza un slug inválido sin crear nada", () => {
  const raiz = raizDePrueba();
  assert.throws(() => nuevoVideo({ raiz, slug: "Mi Video", fecha: "2026-09-23" }), /slug/i);
  assert.deepEqual(readdirSync(join(raiz, "src")).sort(), ["entries", "plantilla"]);
  assert.equal(existsSync(join(raiz, "public")), false);
});

test("la línea de comandos imprime los pasos que siguen, en español", () => {
  const raiz = raizDePrueba();
  const r = spawnSync(process.execPath, [SCRIPT, "mi-video", "--raiz", raiz, "--fecha", "2026-09-23"], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /src\/mi-video\/datos\.ts/);
  assert.match(r.stdout, /MiVideoPortada/);
  assert.match(r.stdout, /Qué sigue/);
});

test("la línea de comandos sale con error y explica por qué", () => {
  const raiz = raizDePrueba();
  const sinSlug = spawnSync(process.execPath, [SCRIPT, "--raiz", raiz], { encoding: "utf8" });
  assert.notEqual(sinSlug.status, 0);
  assert.match(sinSlug.stderr, /slug/i);
  const malo = spawnSync(process.execPath, [SCRIPT, "Mi_Video", "--raiz", raiz], { encoding: "utf8" });
  assert.notEqual(malo.status, 0);
  assert.match(malo.stderr, /minúsculas/);
});

test("con la base real del repo, la copia queda sin menciones y con sus ids", () => {
  const raiz = mkdtempSync(join(tmpdir(), "nuevo-video-real-"));
  cpSync(join(REPO, "src", "plantilla"), join(raiz, "src", "plantilla"), { recursive: true });
  mkdirSync(join(raiz, "src", "entries"), { recursive: true });
  cpSync(join(REPO, "src", "entries", "plantilla.tsx"), join(raiz, "src", "entries", "plantilla.tsx"));
  nuevoVideo({ raiz, slug: "prueba-real", fecha: "2026-09-23" });
  const quedan = [...archivos(join(raiz, "src", "prueba-real")), join(raiz, "src", "entries", "prueba-real.tsx")].filter(menciones);
  assert.deepEqual(quedan, []);
  const entrada = readFileSync(join(raiz, "src", "entries", "prueba-real.tsx"), "utf8");
  assert.match(entrada, /id="PruebaReal"/);
  assert.match(entrada, /id="PruebaRealPortada"/);
  assert.match(readFileSync(join(raiz, "src", "prueba-real", "datos.ts"), "utf8"), /export const DIR = "prueba-real";/);
});
