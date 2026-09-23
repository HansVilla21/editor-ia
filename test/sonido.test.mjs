/**
 * Sonido: el catálogo de efectos, la descarga desde Mixkit, y dos mediciones que mentían
 * (el pico de la mezcla y la saturación de un efecto) porque se medían sobre la mezcla mono.
 * Todo el audio de prueba se genera acá con el ffmpeg del proyecto.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFile } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegStatic from "ffmpeg-static";

import { validarCatalogo, CLAVES } from "../.claude/skills/editar-video/scripts/efectos.mjs";

const SCRIPTS = fileURLToPath(new URL("../.claude/skills/editar-video/scripts/", import.meta.url));
const CATALOGO = fileURLToPath(new URL("../.claude/skills/editar-video/referencias/efectos.json", import.meta.url));
const carpeta = mkdtempSync(join(tmpdir(), "sonido-"));

const generar = (salida, fuente, ...extra) => {
  const r = spawnSync(ffmpegStatic, ["-v", "error", "-y", "-f", "lavfi", "-i", fuente, ...extra, salida]);
  assert.equal(r.status, 0, String(r.stderr));
  return salida;
};

const correr = (script, args) =>
  spawnSync(process.execPath, [join(SCRIPTS, script), ...args], { encoding: "utf8" });

/** Asíncrono: el servidor de prueba vive en este mismo proceso y tiene que poder responder. */
const correrAsync = (script, args) =>
  new Promise((cumplir) => {
    execFile(process.execPath, [join(SCRIPTS, script), ...args], (error, stdout, stderr) =>
      cumplir({ codigo: error ? (error.code ?? 1) : 0, stdout, stderr, todo: stdout + stderr }),
    );
  });

const picoDb = (ruta) => {
  const r = spawnSync(ffmpegStatic, ["-hide_banner", "-i", ruta, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  return Number(r.stderr.match(/max_volume: (-?[\d.]+) dB/)[1]);
};

// ---------------------------------------------------------------- catálogo

test("el catálogo trae las 15 claves, cada una con todos sus campos", () => {
  const catalogo = JSON.parse(readFileSync(CATALOGO, "utf8"));
  assert.equal(CLAVES.length, 15);
  assert.deepEqual(Object.keys(catalogo.efectos).sort(), [...CLAVES].sort());
  assert.deepEqual(validarCatalogo(catalogo), []);
  for (const [clave, e] of Object.entries(catalogo.efectos)) {
    assert.equal(e.archivo, `${clave}.wav`);
    assert.ok(e.duracion > 0, `${clave} sin duración`);
    assert.ok(e.descarga.includes(`/${e.mixkit}/`), `${clave}: la descarga no es del efecto ${e.mixkit}`);
  }
});

test("la validación señala un catálogo roto, campo por campo", () => {
  const catalogo = JSON.parse(readFileSync(CATALOGO, "utf8"));
  catalogo.efectos.pop = { ...catalogo.efectos.pop, pico: -0.1 };
  catalogo.efectos.snap = { ...catalogo.efectos.snap, descarga: null };
  delete catalogo.efectos.tick.vol;
  delete catalogo.licencia;
  const problemas = validarCatalogo(catalogo).join("\n");
  assert.match(problemas, /pop.*pico/);
  assert.match(problemas, /snap.*descarga/);
  assert.match(problemas, /tick.*vol/);
  assert.match(problemas, /licencia/);
});

// ---------------------------------------------------------------- efecto.mjs

test("efecto.mjs avisa cuando el archivo pasa 0 dBFS y dice cuánto bajarlo", () => {
  // Un WAV de coma flotante puede guardar muestras por encima de 1: pico 1,5 = +3,5 dBFS.
  const ruta = generar(join(carpeta, "satura.wav"), "aevalsrc=1.5*sin(2*PI*440*t):s=48000:d=0.5", "-c:a", "pcm_f32le");
  const r = correr("efecto.mjs", [ruta]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /satura/i);
  assert.match(r.stdout, /\+3\.5 dBFS/);
  assert.match(r.stdout, /-4\.5 dB/); // lo que falta para quedar en -1 dBFS
});

test("efecto.mjs avisa cuando el archivo toca el techo de 0 dBFS", () => {
  const ruta = generar(join(carpeta, "techo.wav"), "aevalsrc=if(lt(mod(t*440\\,1)\\,0.5)\\,1\\,-1):s=48000:d=0.5", "-c:a", "pcm_s16le");
  const r = correr("efecto.mjs", [ruta]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /0 dBFS/);
  assert.match(r.stdout, /recortado/i);
});

test("efecto.mjs no confunde un estéreo sano con saturación", () => {
  // Cada canal a -0,9 dBFS y en fase: la mezcla mono de ffmpeg (0,707·(L+R)) daría +2,1 dBFS.
  const ruta = generar(join(carpeta, "estereo-sano.wav"), "aevalsrc=0.9*sin(2*PI*440*t)|0.9*sin(2*PI*440*t):s=48000:d=0.5", "-c:a", "pcm_f32le");
  const r = correr("efecto.mjs", [ruta]);
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, /satura|recortado/i);
  assert.match(r.stdout, /-0\.9 dBFS/);
});

// ---------------------------------------------------------------- mezcla.mjs

test("mezcla.mjs informa el pico del canal más fuerte, no el de la mezcla mono", () => {
  const voz = generar(join(carpeta, "voz.wav"), "aevalsrc=0.708*sin(2*PI*220*t):s=48000:d=3", "-c:a", "pcm_s16le");
  // L a -3 dB, R a -6 dB. La mezcla mono daría -1,4 dB; volumedetect dice -3,0.
  const render = generar(join(carpeta, "render.wav"), "aevalsrc=0.708*sin(2*PI*220*t)|0.5*sin(2*PI*220*t):s=48000:d=3", "-c:a", "pcm_s16le");
  assert.ok(Math.abs(picoDb(render) + 3.0) < 0.15);
  const json = join(carpeta, "mezcla.json");
  const r = correr("mezcla.mjs", [render, voz, "--json", json]);
  assert.equal(r.status, 0, r.stderr);
  const informado = Number(r.stdout.match(/pico de la mezcla[^-\d]*(-?[\d.]+) dB/)[1]);
  assert.ok(Math.abs(informado + 3.0) < 0.15, `informó ${informado} dB`);
  assert.ok(Math.abs(JSON.parse(readFileSync(json, "utf8")).picoMezcla + 3.0) < 0.15);
});

// ---------------------------------------------------------------- efectos.mjs

// Un "golpe" que arranca a los 0,30 s y decae: su pico medido es 0,30.
const GOLPE = "aevalsrc=if(gte(t\\,0.3)\\,0.5*sin(2*PI*440*t)*exp(-(t-0.3)*12)\\,0):s=44100:d=1";
const pedidos = {};
let servidor;
let base;

before(async () => {
  const golpe = readFileSync(generar(join(carpeta, "golpe.wav"), GOLPE, "-c:a", "pcm_s16le"));
  servidor = createServer((req, res) => {
    pedidos[req.url] = (pedidos[req.url] ?? 0) + 1;
    if (req.url === "/1/1.wav" || req.url === "/2/2.wav") {
      res.writeHead(200, { "Content-Type": "audio/wav" });
      res.end(golpe);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((listo) => servidor.listen(0, "127.0.0.1", listo));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor?.close());

function catalogoDePrueba(nombre, efectos) {
  const sfx = join(carpeta, nombre);
  const entrada = (id, extra) => ({
    archivo: `${extra.clave}.wav`,
    nombre: `Golpe ${id}`,
    mixkit: id,
    pagina: `https://mixkit.co/free-sound-effects/discover/golpe-${id}/`,
    descarga: `${base}/${id}/${id}.wav`,
    pico: 0.3,
    vol: 0.3,
    filtro: null,
    evento: "prueba",
    ...extra,
  });
  const catalogo = {
    licencia: "Licencia de prueba",
    licenciaUrl: "https://mixkit.co/license/#sfxFree",
    carpeta: sfx,
    bus: 0.5,
    efectos: Object.fromEntries(efectos.map(([id, extra]) => [extra.clave, entrada(id, extra)])),
  };
  for (const e of Object.values(catalogo.efectos)) delete e.clave;
  const ruta = join(carpeta, `${nombre}.json`);
  writeFileSync(ruta, JSON.stringify(catalogo, null, 1));
  return { ruta, sfx };
}

test("efectos.mjs --bajar baja cada efecto a WAV, aplica el filtro y avisa si el pico no coincide", async () => {
  const { ruta, sfx } = catalogoDePrueba("bajar", [
    [1, { clave: "golpe", filtro: "volume=0.25" }],
    [2, { clave: "corrido", pico: 0.1 }],
  ]);
  const r = await correrAsync("efectos.mjs", ["--bajar", "--catalogo", ruta]);
  assert.equal(r.codigo, 0, r.todo);
  assert.equal(existsSync(join(sfx, "golpe.wav")), true);
  assert.equal(existsSync(join(sfx, "corrido.wav")), true);
  assert.equal(readFileSync(join(sfx, "golpe.wav")).subarray(0, 4).toString(), "RIFF");
  // El filtro volume=0.25 baja 12 dB: el original pica cerca de -6 dBFS.
  assert.ok(picoDb(join(sfx, "golpe.wav")) < -16, "no aplicó el filtro");
  assert.ok(picoDb(join(sfx, "corrido.wav")) > -8);
  assert.match(r.todo, /corrido[^\n]*0\.30[^\n]*0\.10|corrido[^\n]*0\.10[^\n]*0\.30/);
  assert.doesNotMatch(r.todo, /golpe[^\n]*difiere/);
  assert.match(r.todo, /Licencia de prueba/);
  assert.match(r.todo, /mixkit\.co\/license/);
});

test("si el filtro hace pasar 0 dBFS, efectos.mjs dice cuánto satura de verdad y cuánto bajarlo", async () => {
  // El golpe pica a -6 dBFS; volume=4 lo lleva a +6. Medido sobre el WAV de 16 bits ya recortado
  // diría "toca 0 dBFS, bajalo 1 dB", que no alcanza.
  const { ruta } = catalogoDePrueba("satura", [[1, { clave: "fuerte", filtro: "volume=4" }]]);
  const r = await correrAsync("efectos.mjs", ["--bajar", "--catalogo", ruta]);
  assert.equal(r.codigo, 0, r.todo);
  assert.match(r.todo, /fuerte[\s\S]*\+6\.0 dBFS/);
  assert.match(r.todo, /Bajalo 7\.0 dB/);
});

test("efectos.mjs no vuelve a bajar lo que ya está, salvo con --forzar", async () => {
  const { ruta } = catalogoDePrueba("idempotente", [[1, { clave: "golpe" }]]);
  const antes = pedidos["/1/1.wav"] ?? 0;
  assert.equal((await correrAsync("efectos.mjs", ["--bajar", "--catalogo", ruta])).codigo, 0);
  assert.equal(pedidos["/1/1.wav"], antes + 1);
  const segunda = await correrAsync("efectos.mjs", ["--bajar", "--catalogo", ruta]);
  assert.equal(segunda.codigo, 0, segunda.todo);
  assert.equal(pedidos["/1/1.wav"], antes + 1);
  assert.match(segunda.todo, /ya está/);
  assert.equal((await correrAsync("efectos.mjs", ["--bajar", "--forzar", "--catalogo", ruta])).codigo, 0);
  assert.equal(pedidos["/1/1.wav"], antes + 2);
});

test("si una descarga falla, dice qué efecto, dónde buscarlo y dónde guardarlo a mano", async () => {
  const { ruta } = catalogoDePrueba("falla", [
    [1, { clave: "golpe" }],
    [9, { clave: "perdido" }],
  ]);
  const r = await correrAsync("efectos.mjs", ["--bajar", "--catalogo", ruta]);
  assert.notEqual(r.codigo, 0);
  assert.match(r.todo, /perdido/);
  assert.match(r.todo, /https:\/\/mixkit\.co\/free-sound-effects\/discover\/golpe-9\//);
  assert.match(r.todo, /perdido\.wav/);
  assert.match(r.todo, /a mano/);
  assert.match(r.todo, /--importar perdido/);
});

test("efectos.mjs --importar deja en su lugar un efecto bajado a mano, con su filtro y medido", async () => {
  const { ruta, sfx } = catalogoDePrueba("importar", [[9, { clave: "perdido", filtro: "volume=0.25" }]]);
  const bajado = generar(join(carpeta, "bajado-a-mano.wav"), GOLPE, "-c:a", "pcm_s16le");
  const r = await correrAsync("efectos.mjs", ["--importar", "perdido", bajado, "--catalogo", ruta]);
  assert.equal(r.codigo, 0, r.todo);
  const destino = join(sfx, "perdido.wav");
  assert.equal(existsSync(destino), true);
  assert.ok(picoDb(destino) < -16, "no aplicó el filtro");
  assert.match(r.todo, /0\.30/);
  assert.equal(existsSync(bajado), true, "no se toca el archivo que bajó la persona");
});

test("efectos.mjs --revisar lista los archivos que faltan", async () => {
  const { ruta, sfx } = catalogoDePrueba("revisar", [
    [1, { clave: "golpe" }],
    [2, { clave: "corrido" }],
  ]);
  assert.equal((await correrAsync("efectos.mjs", ["--bajar", "--catalogo", ruta])).codigo, 0);
  const catalogo = JSON.parse(readFileSync(ruta, "utf8"));
  catalogo.efectos.nuevo = { ...catalogo.efectos.golpe, archivo: "nuevo.wav" };
  writeFileSync(ruta, JSON.stringify(catalogo));
  const r = await correrAsync("efectos.mjs", ["--revisar", "--catalogo", ruta]);
  assert.match(r.todo, /nuevo\.wav/);
  assert.doesNotMatch(r.todo, /falta[^\n]*golpe\.wav/);
  assert.equal(existsSync(join(sfx, "nuevo.wav")), false);
});

// ---------------------------------------------------------------- tramo.mjs

test("tramo.mjs corta el tramo de música pedido, con fundido de entrada", () => {
  const pista = generar(join(carpeta, "pista.wav"), "aevalsrc=0.5*sin(2*PI*330*t)|0.5*sin(2*PI*330*t):s=44100:d=10", "-c:a", "pcm_s16le");
  const salida = join(carpeta, "tramo", "musica.wav");
  const r = correr("tramo.mjs", [pista, salida, "--desde", "2", "--duracion", "5", "--fundido", "0.25"]);
  assert.equal(r.status, 0, r.stderr);
  const info = spawnSync(ffmpegStatic, ["-hide_banner", "-i", salida], { encoding: "utf8" }).stderr;
  const [, h, m, s] = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  assert.ok(Math.abs(Number(h) * 3600 + Number(m) * 60 + Number(s) - 5) < 0.03);
  // Arranca en silencio y sube: los primeros 20 ms, muy por debajo del nivel pleno (-6 dBFS).
  assert.ok(picoDb(salida) > -7);
  const inicio = join(carpeta, "tramo", "inicio.wav");
  spawnSync(ffmpegStatic, ["-v", "error", "-y", "-i", salida, "-t", "0.02", inicio]);
  assert.ok(picoDb(inicio) < -25, "no tiene fundido de entrada");
});

test("tramo.mjs avisa si la pista no alcanza para el tramo pedido", () => {
  const pista = generar(join(carpeta, "corta.wav"), "aevalsrc=0.5*sin(2*PI*330*t):s=44100:d=4", "-c:a", "pcm_s16le");
  const r = correr("tramo.mjs", [pista, join(carpeta, "tramo", "no.wav"), "--desde", "2", "--duracion", "5"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /dura 4\.0/);
});
