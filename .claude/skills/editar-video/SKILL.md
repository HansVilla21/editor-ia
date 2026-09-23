---
name: editar-video
description: Editar un video vertical corto de punta a punta, desde la grabación hasta el archivo final con su portada. Usar cuando alguien pasa una grabación —y a veces un guion o una lista de enlaces— y pide que se la editen: "editá este video", "hacelo completo", "ponele subtítulos, música y efectos", "armame la portada". Usar también cuando pide cambios sobre un video ya editado con este método: música, efectos, subtítulos, niveles o portada.
---

# Editar un video (grabación → video final + portada)

## Principio

La persona graba. El editor resuelve todo lo demás y entrega un archivo listo para publicar.

Dos frases gobiernan el trabajo:

> **Se reutiliza el sistema, no se reinventa.** La plantilla de composición está en `src/plantilla/`,
> los valores del estilo en `referencias/`, las herramientas en `scripts/`.

> **Las opiniones no cuentan; los cuadros sí.** Ninguna afirmación sobre cómo quedó el video se da
> por buena sin mirar un cuadro renderizado o sin un número medido. Vale para lo que dice el modelo
> que mira el video, para lo que dice el que escucha la mezcla, y para lo que uno cree recordar.

Formato: **1080×1920 a 30 fps**. Redondeo compartido en todo el proyecto: `f = round(segundos · 30)`.

## Cómo se corren las herramientas

Todos los scripts viven en `.claude/skills/editar-video/scripts/` y se corren desde la raíz del
proyecto (`node .claude/skills/editar-video/scripts/cortar.mjs …`). Abajo se escribe solo
`cortar.mjs …`. Cada uno explica lo que recibe con `--ayuda`. Reciben los videos tal cual: nunca
hace falta `ffmpeg` suelto, que no está en el PATH de la persona.

## Reglas duras

- **Nunca tapar la cara ni correr a la persona hacia un lado.** Gráficos, íconos y animaciones van
  siempre dentro del panel, nunca encima de ella.
- **El texto en pantalla es lo que la persona DIJO**, no lo que decía el guion. Si hay diferencia,
  se respeta lo dicho y se avisa al entregar.
- La plantilla `src/plantilla/` no se modifica: se copia con `npm run nuevo`. Todo el video se
  construye en `src/<slug>/` y sus archivos en `public/<slug>/`.
- Salida: `videos/<YYYY-MM-DD>-<slug>/`, con **solo** `video-final.mp4` y `portada.png` a la vista, y
  todas las versiones en `versiones/vN-<qué cambió>.mp4`. **Nunca borrar una versión.**
- Nada se borra: lo que sobra se mueve a `descartes/` dentro de la carpeta del video y se avisa.
- Pedir OK antes de: descargar de una fuente nueva (música, efectos, b-roll, logos), instalar algo
  fuera del proyecto, usar una sesión iniciada del usuario, o publicar en cualquier lado.
- Archivos de código de más de 300 líneas se parten.

## Las fases (marcar cada una al terminarla)

### 1. Intake

`sondear.mjs <grabación>` → fps, rotación, duración, resolución y espacio de color. Rotación −90
significa que el archivo es vertical rotado; si el color no es bt709, hay que tonemapear.
Hoja de contacto para ver qué hay: `cuadros.mjs <grabación> <scratch>/hoja --cada 90 --hoja 6`.

Arrancar el video con `npm run nuevo <slug>` (minúsculas, números y guiones). Copia `src/plantilla/`
a `src/<slug>/`, arma `src/entries/<slug>.tsx` con los ids `<Slug>` y `<Slug>Portada` (de
`mi-video` sale `MiVideo`), y crea `public/<slug>/` y `videos/<YYYY-MM-DD>-<slug>/versiones/`. Si el
slug ya existe no toca nada. En la copia se edita **solo `datos.ts`**: qué es cada dato y de dónde
sale está en `referencias/estilo-visual.md`, sección "La plantilla".

**Verificación:** el script avisa si en la copia quedó alguna referencia a la plantilla. Si quedara,
el render no falla: renderiza el contenido de la plantilla, y eso se descubre tarde.

### 2. Corte de silencios (dos pasadas)

```
cortar.mjs <grabación> public/<slug>/video.mp4 <scratch>/tramos.json --umbral -36 --minimo 0.28
apretar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 <scratch>/quitados.json
```

`cortar.mjs` saca los silencios y deja el resto a 1080×1920 y 30 fps (`--tamano 1440x2560` si la
grabación es 4K y vas a usar acercamientos). Deja 0,08 s antes y 0,14 s después de cada frase para
no morder una "s" final, tira los sonidos sin voz (clics, monedas, golpes) que quedarían como
parpadeos, y deja 1,2 s de toma real después de la última palabra (`--cola`). `apretar.mjs` es la
segunda pasada: saca las respiraciones y el aire muerto que el ruido de sala le esconde al corte,
sin tocar las "s" finales, el primer 0,3 s ni los últimos 0,8 s.

**Verificación:**
- En `tramos.json`, `descartados`: si hay una palabra ahí, bajar `--tramo-minimo`.
- `cortar.mjs` lista las pausas internas de más de 0,35 s que quedaron y `apretar.mjs` imprime
  cuánto sacó. Si sacó mucho, mirar con `--solo-mapa`: cada pausa tiene que caer entre dos frases.
- Entre la última palabra y el último cuadro tiene que haber al menos 1 s.

### 2b. Si la grabación es cruda, con repeticiones

Cuando la persona lee frase por frase, con pausas largas, y repite cuando se traba, primero hay que
elegir tomas. **Pedile el guion** (una frase por línea): sin él no hay contra qué comparar. El flujo
completo está en `referencias/tomas.md`. El orden es montar → cortar → apretar → (acelerar, si lo
pidió) → transcribir el archivo final.

### 2c. Acelerar (opcional, solo si la persona lo pide)

`acelerar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 1.1`

La velocidad la decide quien graba: preguntale una vez y anotá la respuesta en `memory/`. Si no dice
nada, no se acelera. La voz no cambia de tono y el video queda a 30 fps. Después de acelerar cambian
todos los tiempos: la fase 3 transcribe este archivo, nunca uno anterior.

### 3. Palabras con sus tiempos

Siempre sobre el archivo que salió de la fase 2 (apretado y, si se aceleró, acelerado):

```
transcribir.mjs public/<slug>/video.mp4 <scratch>/captions.json --idioma es
palabras.mjs <scratch>/captions.json src/<slug>/palabras.json
cortes.mjs <scratch>/tramos.json --quitados <scratch>/quitados.json [--velocidad 1.1]
```

Si `transcribir.mjs` dice que falta Whisper, se instala con `npm run whisper` (dentro del proyecto,
en `.whisper/`). `cortes.mjs` imprime la línea `CORTES` lista para `datos.ts`, ya corrida por lo que
sacó `apretar.mjs` y por la velocidad: los cortes de `apretar.mjs` no son `CORTES`.

Segunda opinión sobre los nombres propios y las palabras raras:
`transcribir.mjs public/<slug>/video.mp4 <scratch>/gemini.json --motor gemini --nombres "Remotion, Whisper, …"`.
Los subtítulos son lo que dijo, con los nombres propios bien escritos.

### 4. Datos y capturas

Si el video afirma algo verificable —una cifra, un nombre de repositorio, un precio, un comando—,
se verifica antes de ponerlo en pantalla.

- Repositorios de GitHub: `https://api.github.com/repos/<owner>/<repo>` da estrellas, forks y
  descripción sin token.
- Capturas de páginas: `captura.mjs <url> public/<slug>/<nombre>.jpg`.
- Si la cifra dicha no coincide con la real, se muestra una formulación verdadera compatible
  ("más de 280.000") y se avisa al entregar. Nunca se muestra en pantalla un número falso.
- Secretos de ejemplo, siempre enmascarados: `sk_live_••••••••`.

### 5. Guion visual

Una tabla: frase → layout (full o split) → qué gráfico → con qué palabra sincroniza. El patrón está
en `referencias/estilo-visual.md`: anuncio en **full**, explicación en **split**, una idea por
gráfico, y el gancho con su titular fijo desde el cuadro 0.

La tabla se vuelca directo en `BLOQUES` de `datos.ts`: cada bloque arranca en el `inicio` de la
primera palabra de su frase (`palabras.json`), y los tiempos de cada escena son los de su palabra.
Escenas del split: `tarjeta` (captura con paneo), `lista`, `contador` (cifra verificada) y
`comando`. Dos split seguidos son sub-escenas: corte seco, sin transición. El titular va en
`TITULAR` (3 a 7 palabras, el número en `ENFASIS`) y el cierre en `CTA`. Los efectos de las
transiciones, las filas, los contadores, el tipeo y el cierre los pone la plantilla; en `CUES` van
solo los demás.

### 6. Encuadre (dónde está la cara)

1. `cara.mjs public/<slug>/video.mp4 src/<slug>/encuadre.json` — saca 8 cuadros repartidos por el
   video y, por cada uno, le pide a Gemini dos cajas `box_2d`: la cara (frente a mentón) y la cabeza
   con el pelo o la gorra. Las pasa a la composición de 1080×1920 (sirve igual con un video de
   1440×2560), descarta cuadros sin cara, cajas absurdas y lecturas lejos de la mediana, y se queda
   con la mediana: `cy`, `pelo`, `menton`, `corrimientoSplit` y `subtitulosFull`.
2. **Verificación obligatoria:** mirar `guia.png`. Azul en lo más alto del pelo o la gorra, verde
   cruzando la nariz, ámbar en la punta del mentón, blanca (subtítulos en full) debajo del mentón.
   Si algo no calza, o se usaron menos de la mitad de los cuadros, repetir con `--cuadros 16`.
3. Copiar `{cy, pelo, menton}` de `encuadre.json` a `ENCUADRE` en `src/<slug>/datos.ts`.

**Nunca reciclar los números de otro video.** Cambian la distancia a la cámara, la silla y el
recorte, y un número viejo corta la cabeza o pone el subtítulo sobre el mentón.

### 7. Construir y revisar con cuadros

Se llena `src/<slug>/datos.ts`: `VIDEO_CUADROS` (duración de `sondear.mjs` × 30, hacia abajo: el
video dura eso y termina en toma real), `BLOQUES`, `CORTES` (de `cortes.mjs`), `ENCUADRE`,
`TITULAR`, `ENFASIS`, `CTA`, `CUES` y `PORTADA`. El resto de la carpeta no se toca; si hace falta
una escena nueva, va en `escenas/` y se avisa al entregar. `npx tsc --noEmit` tiene que quedar limpio.

Antes de renderizar el video entero:
`previa.mjs src/entries/<slug>.tsx <Id> <scratch>/previa "f1,f2,…" --escala 0.35 --hoja 5`

Cuadros que siempre se miran: el 0 (titular completo, entre y 240 y el pelo), la mitad de cada
transición, cada escena con todas sus filas, el CTA (debajo del mentón y arriba de y 1680) y el
último (toma real, sin congelar). Los avisos `[revisión]` del render (bloque corto, split sin
escena, titular que no entra, archivo que falta) se resuelven antes del render final.

### 8. Sonido

Voz a −19 LUFS, música nivelada y con ducking, cada efecto con su pico en el cuadro del evento; todo
en `referencias/sonido.md`.

- **Voz:** `voz.mjs public/<slug>/video.mp4 public/<slug>/voz.wav` (limpieza + −19 LUFS en WAV).
- **Envolvente para el ducking:** `actividad.mjs public/<slug>/voz.wav src/<slug>/vozActividad.ts`.
- **Efectos:** salen de `referencias/efectos.json`. Si falta alguno (`efectos.mjs --revisar`), pedir
  el OK y correr `npm run efectos` (15 archivos de Mixkit, unos 7 MB). Un efecto nuevo se mide antes
  con `efecto.mjs`.
- **Música:** candidatas de Mixkit → `musica.mjs` → escuchar → `tramo.mjs <pista> <tramo.wav>
  --desde <arranque> --duracion <video + 4>` → `nivelar.mjs <tramo.wav> public/<slug>/musica.m4a -33`.

### 9. Render y master

```
npx remotion render src/entries/<slug>.tsx <Id> videos/<carpeta>/versiones/vN-<qué cambió>.mp4
mezcla.mjs videos/<carpeta>/versiones/vN-….mp4 public/<slug>/voz.wav <segundos de cada acento>
nivelar.mjs videos/<carpeta>/versiones/vN-….mp4 videos/<carpeta>/video-final.mp4 -14 --copiar-video
cuadros.mjs videos/<carpeta>/video-final.mp4 <scratch>/bordes --tiempos "<bordes de bloque>" --hoja 5
```

La verificación de mezcla se corre sobre el render **sin normalizar**, no sobre el master. El master
va a −14 LUFS con pico verdadero ≤ −1,3 dB. Con un video de 1440×2560, o varios videos a la vez,
renderizar con `--concurrency=3 --timeout=120000`: con los valores por defecto el render se corta.

### 10. Portada

Buscar el cuadro en toda la grabación, no solo en el video cortado: una boca a mitad de palabra
arruina la portada. `cuadros.mjs <grabación> <scratch>/portada --cada 32 --hoja 5`, afinar de a
±0,1 s, preferir boca cerrada o sonrisa real con ojos abiertos, y ofrecer 2 o 3 opciones. Mirar la
elegida a tamaño completo: en la hoja chica no se ve si los ojos están cerrados o miran a otro lado.

El cuadro elegido se extrae con `cuadros.mjs <grabación> public/<slug>/portada.png --tiempos "<s>"
--suelto`, y los textos van en `PORTADA` de `datos.ts`. La plantilla sube la foto, la agranda
alrededor de la cara (con `ENCUADRE`) y achica el texto si llegaría a tocar el mentón. `<Freeze>`
sobre el video dentro de un still devuelve el cuadro 0: por eso se monta el PNG.

```
npx remotion still src/entries/<slug>.tsx <Id>Portada videos/<carpeta>/portada.png
```

### 11. Entrega

Decir, en este orden: dónde quedó el archivo y cuánto dura, qué se resolvió sin preguntar, en qué se
apartó lo dicho del guion, qué datos se corrigieron contra la fuente, qué alternativas hay (música,
portada) y qué quedó sin hacer.

Después, anotar en `memory/` lo que sirva para el próximo video: música aprobada, decisiones de
estilo, errores nuevos.

## Errores que ya costaron tiempo

| Síntoma | Causa y arreglo |
|---|---|
| El render sale con contenido de otro video | Quedó una referencia a la plantilla en la copia. `npm run nuevo` avisa; si se copió a mano, buscar `plantilla` con grep en `src/<slug>/` |
| Un cuadro con el subtítulo viejo justo en la costura | Bloques y subtítulos con distinto redondeo. Usar `f = round(s · 30)` en los dos |
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
| "Ningún cuadro trajo una cara utilizable" | Si dice que Gemini no contestó, es la clave o la conexión; si no, la persona no está a cámara en esos cuadros: probar con más cuadros |

## Relacionadas

- `mi-marca` — de ahí salen los colores y las tipografías. Si todavía está vacía, se trabaja con los
  valores neutros de `referencias/estilo-visual.md` y se avisa al entregar.
- `estudiar-referentes` — cuando la persona manda videos de otros creadores para subir el nivel. Los
  valores que salen de ahí reemplazan a los neutros de `referencias/`.
