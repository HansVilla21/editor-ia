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
proyecto:

```
node .claude/skills/editar-video/scripts/cortar.mjs …
```

En las fases de abajo se escribe solo `cortar.mjs …` para no repetir la ruta.

## Reglas duras

- **Nunca tapar la cara ni correr a la persona hacia un lado.** Gráficos, íconos y animaciones van
  siempre dentro del panel, nunca encima de ella.
- **El texto en pantalla es lo que la persona DIJO**, no lo que decía el guion. Si hay diferencia,
  se respeta lo dicho y se avisa al entregar.
- La plantilla `src/plantilla/` no se modifica: se copia. Todo el video se construye en
  `src/<slug>/` y sus archivos en `public/<slug>/`.
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

Crear `videos/<YYYY-MM-DD>-<slug>/versiones/`. Copiar `src/plantilla/` a `src/<slug>/` y su entrada
a `src/entries/<slug>.tsx`. En la copia hay que cambiar: el directorio de archivos, los ids de la
composición y de la portada, los datos del tema, los bloques, los subtítulos, los cortes, los cues
de sonido, el encuadre y los textos de portada y cierre.

**Verificación:** buscar `plantilla` con grep dentro de `src/<slug>/`. Si queda una referencia, el
render no falla — renderiza el contenido de la plantilla, y eso se descubre tarde.

### 2. Corte de silencios

`cortar.mjs <grabación> public/<slug>/video.mp4 tramos.json --umbral -36 --minimo 0.28 --aire 0.08`

**Verificación:** el script reporta el silencio que queda. Tiene que ser ≤ 5 %. Los inicios de cada
tramo son los jump cuts: se guardan como `CORTES` para el zoom alterno.

### 2b. Si la grabación es cruda, con repeticiones

Cuando la persona lee frase por frase, con pausas largas, y repite cuando se traba, la fase 2 no
alcanza: primero hay que elegir tomas. El flujo completo está en `referencias/tomas.md`.

### 3. Palabras con sus tiempos

```
ffmpeg -i public/<slug>/video.mp4 -ar 16000 -ac 1 -c:a pcm_s16le <scratch>/audio.wav
transcribir.mjs <scratch>/audio.wav <scratch>/captions.json --idioma es
palabras.mjs <scratch>/captions.json src/<slug>/palabras.json
```

Segunda opinión sobre los nombres propios y las palabras raras:
`transcribir.mjs <scratch>/audio.wav <scratch>/gemini.json --motor gemini --nombres "Remotion, Whisper, …"`.

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

Una tabla: frase → layout (full o split) → qué gráfico → con qué palabra sincroniza.

El patrón está en `referencias/estilo-visual.md`: anuncio en **full**, explicación en **split**, una
idea por gráfico, y el gancho con su titular fijo desde el cuadro 0.

### 6. Encuadre (dónde está la cara)

Acá no hay detección local de rostros: **la cara la ubica Gemini mirando cuadros de este video**, y
después se verifica mirando un cuadro.

1. `cara.mjs public/<slug>/video.mp4 src/<slug>/encuadre.json` — extrae varios cuadros repartidos a
   lo largo del video, se los manda a Gemini y le pide, en píxeles de 1080×1920 y para cada cuadro:
   centro de la cara, tope del pelo y punta del mentón. El script se queda con la mediana de todos
   los cuadros y descarta los que se apartan mucho.
2. **Verificación obligatoria:** el script escribe `guia.png`, un cuadro del video con las tres
   líneas dibujadas encima. Mirarlo. Si la línea del mentón cae en el cuello, o la del pelo en la
   frente, repetir con otros cuadros antes de seguir. La coordenada de Gemini es una propuesta.
3. De ahí salen el corrimiento del split y la altura de los subtítulos en full, con las fórmulas de
   `referencias/estilo-visual.md`.

**Nunca reciclar los números de otro video.** Cambian la distancia a la cámara, la silla y el
recorte, y un número viejo corta la cabeza o pone el subtítulo sobre el mentón.

### 7. Construir y revisar con cuadros

Se construye en `src/<slug>/`, con archivos de menos de 300 líneas.

Antes de renderizar el video entero:
`previa.mjs src/entries/<slug>.tsx <Id> <scratch>/previa "f1,f2,…" --escala 0.35 --hoja 5`

Cuadros que siempre se miran: el 0, el gancho, la mitad de cada transición, cada sub-escena, el CTA
y el último. Un solo bundle para todos.

### 8. Sonido

Voz a −19 LUFS, música nivelada y con ducking, cada efecto con su pico en el cuadro del evento.
La cadena completa, los niveles y la tabla de efectos están en `referencias/sonido.md`.

### 9. Render y master

```
npx remotion render src/entries/<slug>.tsx <Id> videos/<carpeta>/versiones/vN-<qué cambió>.mp4
mezcla.mjs videos/<carpeta>/versiones/vN-….mp4 public/<slug>/voz.wav <segundos de cada acento>
nivelar.mjs videos/<carpeta>/versiones/vN-….mp4 videos/<carpeta>/video-final.mp4 -14 --copiar-video
cuadros.mjs videos/<carpeta>/video-final.mp4 <scratch>/bordes --tiempos "<bordes de bloque>" --hoja 5
```

La verificación de mezcla se corre sobre el render **sin normalizar**, no sobre el master. El master
va a −14 LUFS con pico verdadero ≤ −1,3 dB.

### 10. Portada

Buscar el cuadro en toda la grabación, no solo en el video cortado: una boca a mitad de palabra
arruina la portada. `cuadros.mjs <grabación> <scratch>/portada --cada 32 --hoja 5`, afinar de a
±0,1 s, preferir boca cerrada o sonrisa real con ojos abiertos, y ofrecer 2 o 3 opciones.

El cuadro elegido se extrae a PNG y se monta como imagen dentro del still. `<Freeze>` sobre el video
dentro de un still devuelve el cuadro 0.

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
| El render sale con contenido de otro video | Quedó una referencia a la plantilla en la copia. Buscar `plantilla` con grep en `src/<slug>/`: no da error, renderiza lo viejo |
| Un cuadro con el subtítulo viejo justo en la costura | Bloques y subtítulos con distinto redondeo. Usar `f = round(s · 30)` en los dos |
| La portada sale con la cara del cuadro 0 | `<Freeze>` sobre el video dentro de un still devuelve el cuadro 0. Extraer el PNG con `cuadros.mjs` y montarlo como imagen |
| La captura de una página sale clara aunque se pidió modo oscuro | Muchos sitios ignoran `--force-dark-mode`. Usar la captura clara dentro de una tarjeta blanca |
| El efecto "whoosh" suena a tic-tac | Los catálogos describen mal varios archivos. Elegir por nombre de archivo y confirmar con `efecto.mjs` |
| "Hay clipping" o "falta ducking" según el modelo que escucha | Su crítica es genérica y se repite casi igual en cada versión. Confirmar con `mezcla.mjs` antes de tocar un nivel |
| La voz satura después de normalizar | AAC más loudnorm dinámico. Voz en WAV, con ganancia fija y limitador a −3 dB |
| El render falla con una ruta de salida absoluta | Espacios en la ruta más el shell de Windows. Usar ruta relativa y sin espacios |
| Decimales con coma al pasar tiempos por la terminal | Configuración regional. Pasar los tiempos por archivo o por parámetro de script, nunca escritos a mano en el shell |
| Un número con gradiente se ve invisible dentro de un titular | El `text-shadow` heredado tapa el `background-clip: text`. Poner `textShadow: "none"` en ese span y usar `filter: drop-shadow` |
| La transcripción inventa un cierre que nadie dijo, o los tiempos se corren varios segundos | Silencios largos en el crudo. Transcribir tramo por tramo, nunca el archivo entero (`referencias/tomas.md`) |
| El encuadre corta la cabeza, o el subtítulo cae sobre el mentón | Se reciclaron los números de otro video. Medir la cara en este video, siempre |
| La cara queda descentrada aunque el script la ubicó | La coordenada de Gemini es una propuesta. Mirar `guia.png` antes de fijar el corrimiento del split |
| El silencio restante sigue alto después de cortar | Ruido de sala por encima del umbral. Subir el umbral de a 2 dB y volver a medir; nunca bajar el mínimo por debajo de 0,20 s: se come los finales suaves |

## Relacionadas

- `mi-marca` — de ahí salen los colores y las tipografías. Si todavía está vacía, se trabaja con los
  valores neutros de `referencias/estilo-visual.md` y se avisa al entregar.
- `estudiar-referentes` — cuando la persona manda videos de otros creadores para subir el nivel. Los
  valores que salen de ahí reemplazan a los neutros de `referencias/`.
