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

`<scratch>` es una carpeta de trabajo para lo intermedio (mapas, transcripciones, hojas de
cuadros): `out/<slug>/`, que git ignora. Lo que se entrega va en `videos/`, y lo que usa la
composición en `public/<slug>/`.

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
- Pedir OK antes de: descargar de una fuente nueva (música, efectos, b-roll), instalar algo fuera
  del proyecto, usar una sesión iniciada del usuario, o publicar en cualquier lado. Los logos se
  bajan según "Logos de otras marcas" en `memory/preferencias.md` (ver fase 4).
- Archivos de código de más de 300 líneas se parten.

## Las fases (marcar cada una al terminarla)

### 1. Intake

**Antes que nada, la memoria.** Leé enteros `memory/preferencias.md` y `memory/reglas.md`, y de
`memory/decisiones.md` las secciones "Música" y "Umbrales de corte". Cada preferencia y cada regla
dice en qué fase se aplica y con qué opción o archivo; una regla gana sobre lo que dice esta skill.
Lo que diga `(sin preguntar)` usa su valor por defecto. Si esos archivos no están,
`node scripts/memoria.mjs` los arma desde las plantillas.

`sondear.mjs <grabación>` → fps, rotación, duración, resolución y espacio de color. Rotación −90
significa que el archivo es vertical rotado; si el color no es bt709, hay que tonemapear.
Hoja de contacto para ver qué hay: `cuadros.mjs <grabación> <scratch>/hoja --cada 90 --hoja 6`.

Arrancar el video con `npm run nuevo <slug>` (minúsculas, números y guiones). Copia `src/plantilla/`
a `src/<slug>/`, arma `src/entries/<slug>.tsx` con los ids `<Slug>` y `<Slug>Portada` (de
`mi-video` sale `MiVideo`), y crea `public/<slug>/` y `videos/<YYYY-MM-DD>-<slug>/versiones/`. Si el
slug ya existe no toca nada. Por video se edita `datos.ts`: qué es cada dato y de dónde sale está en
`referencias/estilo-visual.md`, sección "La plantilla". Si el guion pide algo que la plantilla no
tiene, la escena nueva va en `escenas/` y se avisa al entregar; el resto de la copia no se toca,
salvo `subtitulos.tamano` en `src/<slug>/marca.ts` si "Subtítulos" de las preferencias pide otro
tamaño.

**Verificación:** el script avisa si en la copia quedó alguna referencia a la plantilla. Si quedara,
el render no falla: renderiza el contenido de la plantilla, y eso se descubre tarde.

### 2. Corte de silencios (dos pasadas)

```
cortar.mjs <grabación> public/<slug>/video.mp4 <scratch>/tramos.json --umbral -36 --minimo 0.28
apretar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 <scratch>/quitados.json
```

`cortar.mjs` saca los silencios y deja el resto a 1080×1920 y 30 fps. `--tamano 1440x2560` solo si la
grabación es 4K y vas a acercar más que el zoom de la plantilla (1,08): con la plantilla tal cual,
1080×1920 alcanza. Deja 0,08 s antes y 0,14 s después de cada frase para
no morder una "s" final, tira los sonidos sin voz (clics, monedas, golpes) que quedarían como
parpadeos, y deja 1,2 s de toma real después de la última palabra (`--cola`). `apretar.mjs` es la
segunda pasada: saca las respiraciones y el aire muerto que el ruido de sala le esconde al corte,
sin tocar las "s" finales, el primer 0,3 s ni los últimos 0,8 s.

**Verificación:**
- En `tramos.json`, `descartados`: si hay una palabra ahí, bajar `--tramo-minimo`.
- `cortar.mjs` lista las pausas internas de más de 0,35 s que quedaron y `apretar.mjs` imprime
  cuánto sacó. Si sacó mucho, mirar con `--solo-mapa`: cada pausa tiene que caer entre dos frases.
- **El final:** mirar la cola con `cuadros.mjs public/<slug>/video.mp4 <scratch>/cola --tiempos "…"`
  (el último 1,5 s, cada 0,1 s). El video termina en el último cuadro en que la persona sigue
  mirando a cámara o sonriendo: entre 0,4 y 1,3 s después de la última palabra. Si baja la vista
  antes, el corte va ahí (`VIDEO_CUADROS` en `datos.ts`). Nunca un cuadro congelado. Acelerar achica
  la cola en la misma proporción.

### 2b. Si la grabación es cruda, con repeticiones

Cuando la persona lee frase por frase, con pausas largas, y repite cuando se traba, primero hay que
elegir tomas. **Pedile el guion** (una frase por línea): sin él no hay contra qué comparar. El flujo
completo está en `referencias/tomas.md`. El orden es montar → cortar → apretar → (acelerar, si lo
pidió) → transcribir el archivo final. Sobre un montaje, `cortar.mjs` va con `--umbral -33 --minimo
0.24` (tomas.md, paso 7): entre tomas queda ruido de sala. Si `tomas.mjs` avisa líneas del guion que
no se grabaron o cosas dichas fuera del guion, **preguntale** qué hacer con cada una antes de armar
la EDL: no se decide solo. `tomas.mjs` marca TRABADO solo cuando la persona se trabó; un intento
con silencios largos sale como `fluido, con pausas` y sirve igual: el corte los saca.

Si el guion salió de `/guion`, ya está en `videos/<fecha>-<slug>/guion.md`: usá ese mismo slug y esa
fecha (`node scripts/nuevo-video.mjs <slug> --fecha <fecha>`) para que todo quede en la misma
carpeta, y copiá las líneas del bloque `text` de la sección "Guion" a `<scratch>/guion.txt` para
`tomas.mjs`. Los datos marcados "a confirmar" en ese archivo se revisan en la fase 4.

### 2c. Acelerar (opcional, solo si la persona lo pide)

`acelerar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 1.1`

La velocidad está en "Velocidad" de `memory/preferencias.md`; si dice `(sin preguntar)`, no se
acelera. La voz no cambia de tono y el video queda a 30 fps. Después de acelerar cambian
todos los tiempos: la fase 3 transcribe este archivo, nunca uno anterior.

### 3. Palabras con sus tiempos

Siempre sobre el archivo que salió de la fase 2 (apretado y, si se aceleró, acelerado):

```
transcribir.mjs public/<slug>/video.mp4 <scratch>/captions.json --idioma es
palabras.mjs <scratch>/captions.json src/<slug>/palabras.json
cortes.mjs <scratch>/tramos.json --quitados <scratch>/quitados.json [--montaje <scratch>/montaje.json] \
           [--velocidad 1.1] --video public/<slug>/video.mp4
```

Si `transcribir.mjs` dice que falta Whisper, se instala con `npm run whisper` (dentro del proyecto,
en `.whisper/`). `cortes.mjs` imprime la línea `CORTES` lista para `datos.ts`: suma las costuras
entre tomas (`--montaje`), la corre por lo que sacó `apretar.mjs` y por la velocidad, y con `--video`
lleva cada corte al cuadro donde la imagen salta de verdad. Los cortes de `apretar.mjs` no son
`CORTES`: caen entre frases y no llevan zoom.

Segunda opinión sobre los nombres propios y las palabras raras:
`transcribir.mjs public/<slug>/video.mp4 <scratch>/gemini.json --motor gemini --nombres "Remotion, Whisper, …"`.
Los subtítulos son lo que dijo, con los nombres propios bien escritos. Si la segunda opinión (o la
persona) encuentra palabras mal escritas, no se edita el JSON a mano: se anotan en
`<scratch>/correcciones.txt`, una por línea (`Codl => Code`, `volvió la día => devolvió la IA`), y
se corre `corregir.mjs src/<slug>/palabras.json <scratch>/correcciones.txt`. Deja los tiempos donde
estaban; lo que avisa que no encontró casi siempre es una tilde o una palabra de más.

### 4. Datos y capturas

Si el video afirma algo verificable —una cifra, un nombre de repositorio, un precio, un comando—,
se verifica antes de ponerlo en pantalla.

- Repositorios de GitHub: `https://api.github.com/repos/<owner>/<repo>` da estrellas, forks y
  descripción sin token.
- Capturas de páginas: `captura.mjs <url> public/<slug>/<nombre>.jpg`.
- Si la cifra dicha no coincide con la real, se muestra una formulación verdadera compatible
  ("más de 280.000") y se avisa al entregar. Nunca se muestra en pantalla un número falso.
- Secretos de ejemplo, siempre enmascarados: `sk_live_••••••••`.
- **Logos:** cada marca que se nombra lleva su logo real, según "Logos de otras marcas" en
  `memory/preferencias.md`: con permiso permanente se bajan; con "preguntar cada vez" (o sin
  respuesta), una sola pregunta con todas las marcas del video juntas; con "nunca", ninguno.
  `logo.mjs "<marca>"` busca primero en `public/logos/catalogo.json`, baja de Simple Icons y dice
  el slug para `datos.ts`. Si no la tiene, no se dibuja nada: se pide el archivo del kit de prensa
  y se registra con `logo.mjs "<marca>" --importar <archivo> --fuente <página>`; si no hay, la
  marca va con texto.

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
solo los demás. El logo va en `logo` de la escena (cabecera), grande en una `tarjeta` sin captura
(con `logoEn` en la palabra que nombra la marca), en `TITULAR_LOGO` si el gancho la nombra y en
`PORTADA.logo`.

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
escena, titular que no entra, archivo o logo que falta) salen una vez por render y se resuelven
antes del render final.

### 8. Sonido

Voz a −19 LUFS, música nivelada y con ducking, cada efecto con su pico en el cuadro del evento; todo
en `referencias/sonido.md`.

- **Voz:** `voz.mjs public/<slug>/video.mp4 public/<slug>/voz.wav` (limpieza + −19 LUFS en WAV).
- **Envolvente para el ducking:** `actividad.mjs public/<slug>/voz.wav src/<slug>/vozActividad.ts`.
- **Efectos:** salen de `referencias/efectos.json`. Si falta alguno (`efectos.mjs --revisar`), pedir
  el OK y correr `npm run efectos` (15 archivos de Mixkit, unos 7 MB). Un efecto nuevo se mide antes
  con `efecto.mjs`.
- **Música:** candidatas de Mixkit → `musica.mjs <carpeta> --pedido "<lo que pidió, con sus palabras>"
  [--bpm 70-95]` → escuchar → `tramo.mjs <pista> <tramo.wav>
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
arruina la portada. `cuadros.mjs <grabación> <scratch>/portada --cada 32 --hoja 5` (en un crudo 4K
de 4 minutos tarda un par de minutos; cada etiqueta es el cuadro exacto de ese segundo), afinar de
a ±0,1 s, preferir boca cerrada o sonrisa real con ojos abiertos, respetar "Portada" de las
preferencias (mirada a cámara, composición distinta a la del video anterior) y ofrecer 2 o 3
opciones. Mirar la
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
apartó lo dicho del guion, qué datos se corrigieron contra la fuente, qué logos se bajaron y qué
marcas fueron con texto, qué alternativas hay y qué quedó sin hacer.

Al entregar se ofrecen dos músicas (`versiones/musica-b-<número>.m4a`) y dos o tres portadas
(`versiones/portada-b.png`, `portada-c.png`), y se cierra con dos preguntas: qué le cambiarías, y qué
te gustó que quieras en todos los videos. Cada corrección se arregla en una versión nueva y, si es
para siempre, se escribe en un solo lugar: `memory/preferencias.md`, `mi-marca`, `referencias/` con
procedencia, o `memory/reglas.md` (el procedimiento está en `/nuevo-video`, sección 6). La historia
—música usada y descartada, umbrales que funcionaron— va en `memory/decisiones.md`. Si es el primer
video, se propone `/calibrar`.

## Errores que ya costaron tiempo

La tabla completa, síntoma → causa y arreglo, está en `referencias/errores.md`. Leela ante
cualquier síntoma raro y antes de entregar; cuando aparece un error nuevo, sumale una fila.

## Relacionadas

- `mi-marca` — de ahí salen los colores y las tipografías. Si todavía está vacía, se trabaja con los
  valores neutros de `referencias/estilo-visual.md` y se avisa al entregar.
- `estudiar-referentes` — cuando la persona manda videos de otros creadores para subir el nivel. Los
  valores que salen de ahí reemplazan a los neutros de `referencias/`.
- `/guion` — cuando la persona todavía no grabó: escribe el guion que después se edita con esta skill.
- `/antes-de-grabar` y `/calibrar` — consejos para grabar, y el ajuste después del primer video.
