/**
 * Fase 4 — la captura de una página, para mostrar en pantalla algo que existe de verdad.
 *
 * El navegador es el mismo que usa Remotion para renderizar: no hace falta instalar nada
 * aparte ni tener Chrome en el sistema.
 */
import { writeFileSync } from "node:fs";
import { extname } from "node:path";

import { ayuda, leerArgumentos, numero, morir, corta, asegurarCarpeta } from "./_comun.mjs";

const AYUDA = `
captura.mjs — saca una foto de una página web

  node .claude/skills/editar-video/scripts/captura.mjs <url> <salida.jpg|.png> \\
       [--ancho 1100] [--alto 1500] [--escala 2] [--espera 1200] [--oscuro] [--completo]

Recibe: la dirección de la página.
Devuelve: <salida> con la franja visible, sin barras de scroll y a doble resolución,
          que es lo que hace falta para que se lea bien en 1080x1920.

  --ancho / --alto  tamaño de la ventana, en píxeles de CSS
  --escala          2 es el doble de resolución (lo normal para video)
  --espera          milisegundos extra después de cargar, para las fuentes y las animaciones
  --oscuro          pide modo oscuro. Muchos sitios lo ignoran: si sale clara, la captura clara
                    dentro de una tarjeta blanca se lee mejor que forzarlo
  --completo        la página entera, no solo la franja visible

La primera vez puede bajar el navegador que usa Remotion, si todavía no está.
`;

ayuda(process.argv, AYUDA);
const { libres, opciones } = leerArgumentos(process.argv.slice(2), { banderas: ["oscuro", "completo"] });
const [url, salida] = libres;
if (!url || !salida) morir("Faltan argumentos: <url> <salida.jpg>. Probá con --ayuda.");
if (!/^https?:\/\//i.test(url)) morir("La dirección tiene que empezar con http:// o https://");

const ancho = Math.round(numero(opciones.ancho, 1100));
const alto = Math.round(numero(opciones.alto, 1500));
const escala = numero(opciones.escala, 2);
const espera = numero(opciones.espera, 1200);
const formato = extname(salida).toLowerCase() === ".png" ? "png" : "jpeg";

const { ensureBrowser, openBrowser } = await import("@remotion/renderer");

await ensureBrowser();
const navegador = await openBrowser("chrome", { chromiumOptions: { gl: null } });

try {
  const pagina = await navegador.newPage({
    context: null,
    logLevel: "error",
    indent: false,
    pageIndex: 0,
    onBrowserLog: null,
    onLog: () => {},
  });

  await pagina.setViewport({ width: ancho, height: alto, deviceScaleFactor: escala });
  const cdp = pagina._client();
  await cdp.send("Emulation.setScrollbarsHidden", { hidden: true });
  if (opciones.oscuro) {
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
  }

  console.log(`Abriendo ${url} …`);
  // El navegador de Remotion solo espera el evento load: lo que falte lo cubre --espera.
  await pagina.goto({ url, timeout: 45000 });
  await new Promise((r) => setTimeout(r, espera));

  const parametros = { format: formato, captureBeyondViewport: Boolean(opciones.completo) };
  if (formato === "jpeg") parametros.quality = 92;
  if (opciones.completo) {
    const metricas = await cdp.send("Page.getLayoutMetrics");
    const tamano = metricas.value?.cssContentSize ?? metricas.cssContentSize;
    if (tamano) {
      parametros.clip = { x: 0, y: 0, width: tamano.width, height: tamano.height, scale: 1 };
    }
  }

  const respuesta = await cdp.send("Page.captureScreenshot", parametros);
  const datos = respuesta.value?.data ?? respuesta.data;
  if (!datos) morir("El navegador no devolvió ninguna imagen.");

  asegurarCarpeta(salida);
  const bytes = Buffer.from(datos, "base64");
  writeFileSync(salida, bytes);

  console.log(`${corta(salida)}  ${ancho}x${alto} css a escala ${escala}  (${Math.round(bytes.length / 1024)} kB)`);
  console.log("Mirar la captura antes de montarla: si el sitio ignoró el modo oscuro, va dentro de una tarjeta blanca.");
} finally {
  await navegador.close({ silent: true }).catch(() => {});
}

process.exit(0);
