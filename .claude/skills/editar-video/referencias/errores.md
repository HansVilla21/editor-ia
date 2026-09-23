# Errores que ya costaron tiempo

Cada fila es un error que ya pasó al editar con este método, con su causa y su arreglo. Se lee
ante cualquier síntoma raro y antes de dar un video por terminado. Cuando aparece uno nuevo, se
suma una fila acá (y, si salió de una corrección de la persona, también va a `memory/reglas.md`).

| Síntoma | Causa y arreglo |
|---|---|
| El render sale con contenido de otro video | Quedó una referencia a la plantilla en la copia. `npm run nuevo` avisa; si se copió a mano, buscar `plantilla` con grep en `src/<slug>/` |
| Un cuadro con el subtítulo viejo justo en la costura | Bloques y subtítulos con distinto redondeo. Usar `f = round(s · 30)` en los dos |
| Con subtítulos de palabras clave, la última palabra de un bloque aparece en el lugar del bloque siguiente | Un grupo se sostenía hasta un segundo después de su palabra y cruzaba el cambio de plano. La plantilla ya lo corta en la costura; si pasa en una copia vieja, actualizar `Subtitulos.tsx` desde la plantilla |
| La portada sale con la cara del cuadro 0 | `<Freeze>` sobre el video dentro de un still devuelve el cuadro 0. Extraer el PNG con `cuadros.mjs` y montarlo como imagen |
| Se ve un marcador con líneas en vez de la persona | Falta `public/<slug>/video.mp4`, o `DIR` no coincide con la carpeta. La plantilla no se rompe: muestra dónde caería la cara |
| La captura de una página sale clara aunque se pidió modo oscuro | Muchos sitios ignoran `--force-dark-mode`. Usar la captura clara dentro de una tarjeta blanca |
| El efecto "whoosh" suena a tic-tac | Los catálogos describen mal varios archivos. Elegir por nombre de archivo y confirmar con `efecto.mjs` |
| Falta un efecto o no suena | `efectos.mjs --revisar`; con OK, `npm run efectos`; si Mixkit cambió la dirección, bajarlo a mano y `efectos.mjs --importar <clave> <archivo>` |
| "Hay clipping" o "falta ducking" según el modelo que escucha | Su crítica es genérica y se repite casi igual en cada versión. Confirmar con `mezcla.mjs` antes de tocar un nivel |
| La voz satura después de normalizar | AAC más loudnorm dinámico. La voz va con `voz.mjs`: WAV, ganancia fija y limitador a −3 dB |
| El render falla con una ruta de salida absoluta | Espacios en la ruta más el shell de Windows. Usar ruta relativa y sin espacios |
| El render se corta con "timeout" en los primeros cuadros | Video de 1440×2560 o varios videos a la vez. `--concurrency=3 --timeout=120000` |
| Decimales con coma al pasar tiempos por la terminal | Configuración regional. Pasar los tiempos por archivo o por parámetro de script, nunca escritos a mano en el shell |
| Un número con gradiente se ve invisible dentro de un titular | El `text-shadow` heredado tapa el `background-clip: text`. Poner `textShadow: "none"` en ese span y usar `filter: drop-shadow` |
| La transcripción inventa un cierre que nadie dijo, o los tiempos se corren varios segundos | Silencios largos en el crudo. Transcribir tramo por tramo, nunca el archivo entero (`referencias/tomas.md`) |
| Una "s" final o la última sílaba de una frase suena mocha | Quedó poco aire después de la frase. `cortar.mjs` deja 0,14 s (`--tras`): no bajarlo. En `apretar.mjs`, no bajar los umbrales para ganar segundos |
| Parpadeos de 0,1 a 0,3 s al principio, o un jump cut que no corresponde a nada | Clics, monedas o golpes que quedaron como tramo. `cortar.mjs` los tira y los anota en `descartados`; si alguno quedó, subir `--tramo-minimo` |
| Falta una palabra corta después de cortar | `cortar.mjs` la tomó por ruido. Buscarla en `descartados` y bajar `--tramo-minimo` |
| Quedan muchas pausas internas largas después de cortar | Ruido de sala alto. Subir el umbral de a 2 dB y volver a cortar; nunca bajar el mínimo por debajo de 0,20 s: se come los finales suaves. Después, `apretar.mjs` |
| El video termina pegado a la última palabra, o se ve congelado al final | Falta toma real. La última pieza de la EDL termina 1,3 s después de la palabra, `cortar.mjs --cola 1.2`, y la composición sin `<Freeze>` |
| Los subtítulos o los zooms se corren después de apretar o acelerar | Se usaron tiempos medidos antes. Transcribir el archivo final y sacar los `CORTES` con `cortes.mjs` |
| Dos corridas de `cara.mjs` dan números muy distintos, o el mentón cae en la ropa | Mirar `cuadros` en `encuadre.json` (qué se descartó y por qué) y repetir con `--cuadros 16` |
| Aparece "AVISO … modelo Flash de respaldo" | El modelo Pro no respondió (cuota, o el modelo no existe para esa clave). Flash mide peor: mirar `guia.png` con más cuidado, repetir más tarde o fijar `GEMINI_MODEL` en `.env` |
| El logo no aparece | Falta el archivo en `public/logos/` (lo avisa `[revisión]`) o el slug no coincide: `logo.mjs "<marca>"` imprime el exacto |
| `logo.mjs` dice que Simple Icons no la tiene | Probar el nombre como lo escribe la marca o el `--slug` que sugiere; si no, el oficial del kit con `--importar`. Nunca dibujar uno |
| "Ningún cuadro trajo una cara utilizable" | Si dice que Gemini no contestó, es la clave o la conexión; si no, la persona no está a cámara en esos cuadros: probar con más cuadros |
