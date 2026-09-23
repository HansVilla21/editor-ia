---
name: estudiar-referentes
description: Usar cuando el usuario pasa enlaces o archivos de videos de otros creadores como ejemplo de la edición que quiere — "mirá este video", "quiero que se vea así", "este es mi referente", "me gusta cómo edita", "analizá estas transiciones", "entrená el estilo con esto" — o para escribir un guion a partir de ellos o de un tema — "ayudame con el guion", "quiero grabar sobre esto", "vos sos el experto", "lo grabo hoy". También cuando hay que revisar, ampliar o cambiar el estilo con el que edita el proyecto, o decidir si un recurso visual se copia y cómo se fabrica en Remotion.
---

# Estudiar videos de referencia

Así aprende el editor. El usuario señala videos que admira, cada uno se mide cuadro a
cuadro, y los valores que él aprueba pasan a ser su estilo. No es un informe suelto: el
ciclo termina escribiendo en `.claude/skills/editar-video/referencias/`.

Hay un segundo modo, más corto: cuando los videos no vienen para copiar la edición sino
las palabras, y lo que sale es un guion listo para grabar. Está al final, en "Cuando los
referentes son para escribir un guion".

## Los dos principios

**Gemini propone, los cuadros deciden.** Un modelo mira el video y escribe un borrador en
segundos, pero se equivoca con los fps, las tipografías, los colores, el texto en pantalla
y el sonido. Ninguna afirmación entra a un informe sin un número de cuadro que la
respalde. El borrador ahorra tiempo; no decide nada.

**Una referencia vale por lo que el usuario dijo que le gusta de ella.** Sin esa frase el
análisis pierde el norte y sale un inventario de doscientos datos que no sirven para nada.
Si no la dijo, preguntar antes de empezar; una línea alcanza:

> ¿Qué te gusta de este? ¿El ritmo, los textos, las transiciones, cómo muestra la pantalla?
> Si no sabés explicarlo, decime el segundo que te gustó y yo miro qué pasa ahí.

Si aun así no hay frase, se deduce una del video y **se escribe en el informe que es
deducida**. Nunca se inventa en silencio.

## El formato

Todo se mide y se expresa en **1080×1920 a 30 fps**, que es lo que produce este proyecto.
Si la referencia viene en otra resolución, convertir cada medida en píxeles multiplicando
por `1080 / ancho_original`. Si viene a otros fps, convertir cada duración a cuadros de 30
(`cuadros30 = round(segundos · 30)`) y decir en el informe a qué fps se midió.

## Herramientas

No hace falta instalar nada: los binarios llegan con `npm install`.

```bash
FF=$(node -e "console.log(require('ffmpeg-static'))")
FFPROBE=$(node -e "console.log(require('@ffprobe-installer/ffprobe').path)")
```

Las rutas tienen espacios: siempre entre comillas. En PowerShell es `$FF = node -e "..."`.
El `drawtext` de ffmpeg no está garantizado en el binario de npm, así que **no se rotulan
los cuadros**: la posición en la hoja ya dice el tiempo, como se explica abajo.

**El borrador de Gemini**, que ubica en uno a tres minutos qué mirar y en qué segundo:

```bash
node .claude/skills/estudiar-referentes/scripts/borrador.mjs "referencias/<archivo>.mp4" \
  "referencias/estudio/<slug>/borrador.md" --enfoque "<lo que le gusta a la persona, textual>"
```

Sale marcado como BORRADOR SIN VERIFICAR, con cada tiempo aproximado y los cuadros para
verificarlo. Necesita la clave de Gemini; sin ella, todo el flujo funciona igual, más lento.

## El flujo

### 1. La frase del usuario, una por referencia

Anotarla textual, con sus palabras, antes de tocar nada. De ahí sale el enfoque de cada
agente. Si mandó tres videos, son tres frases: no sirve una sola para todo el lote.

### 2. Conseguir el video

Va a `referencias/`, que está en `.gitignore` — el material de cada usuario no viaja en el
repositorio.

- Limpiar el enlace de parámetros de seguimiento (`utm_*`, `igsh`, `stkn`) antes de nada.
- Si hay una herramienta de descarga en la máquina, intentarla una vez y mirar el
  resultado. Muchas plataformas piden sesión iniciada y devuelven un error vacío, un
  archivo de cero bytes, o una página de inicio de sesión disfrazada de video.
- **Si falla, no insistir ni buscar la forma de saltear la sesión.** Pedirle el archivo al
  usuario, en una línea:

  > No pude bajarlo: esa plataforma pide sesión iniciada. Bajalo vos desde la app —el
  > botón de guardar o compartir— y dejá el archivo en la carpeta `referencias/`. El
  > nombre da igual, yo lo encuentro.

- Si el usuario ya dejó archivos ahí, usarlos directamente: el enlace no hace falta.
- Nunca anunciar la descarga como hecha antes de verificar que el archivo abre y dura lo
  que tiene que durar.

### 3. El vistazo propio, antes de delegar

Nunca pasarle a un agente los datos que dijo la plataforma. Medirlos:

```bash
"$FFPROBE" -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,avg_frame_rate,nb_frames \
  -show_entries format=duration -of default=noprint_wrappers=1 "referencias/<archivo>.mp4"
```

Hay referencias a 50 y 60 fps, y verticales de 1440×2560. Ese dato cambia todas las
cuentas del informe, así que va medido y se le pasa al agente.

**Hoja de contacto**, una mirada general con una casilla cada medio segundo:

```bash
"$FF" -v error -i "referencias/<archivo>.mp4" \
  -vf "fps=1/0.5,scale=180:-1,tile=6x8" -frames:v 4 "<scratch>/hoja-%02d.png"
```

Las hojas salen numeradas desde `01`. Con `fps=1/P` y `tile=CxR`, si `h` es el número de
la hoja menos uno, la casilla `k` —contando desde cero, de izquierda a derecha y de arriba
abajo— es el segundo `(h·C·R + k)·P`. Por eso no hace falta rotular nada: con
`fps=1/0.5` y `tile=6x8`, la casilla 13 de la hoja 01 es el segundo 6,5.

**Tira de cuadros consecutivos**, que es con lo que se mide una transición:

```bash
"$FF" -v error -i "referencias/<archivo>.mp4" \
  -vf "select='between(n\,120\,143)',scale=200:-1,tile=8x3" \
  -frames:v 1 -fps_mode passthrough "<scratch>/tira-120.png"
```

La casilla `k` es el cuadro `120 + k`.

**Cortes de escena**, para saber dónde mirar:

```bash
"$FF" -hide_banner -i "referencias/<archivo>.mp4" \
  -filter:v "select='gt(scene,0.3)',showinfo" -f null -
```

Cada línea trae `pts_time:` — ese es el segundo del corte; el cuadro es
`round(pts_time · fps_real)`.

### 4. Un agente por referencia, en paralelo

Lanzar el agente `analista-referente`, uno por video, todos en el mismo mensaje. A cada
uno se le pasa:

- la ruta del archivo en `referencias/`;
- el slug (`<creador-o-tema>-<id-corto>`), que nombra el informe y su carpeta de cuadros;
- duración, fps y resolución **medidos** en el paso 3;
- la frase textual del usuario, y si es deducida, dicho;
- el enfoque: qué medir a fondo, derivado de esa frase;
- el tope de tiempo: 25 a 35 minutos por agente.

El informe sale en `referencias/estudio/<slug>.md` y hasta ocho cuadros clave en
`referencias/estudio/<slug>/`. Cada agente empieza por el borrador de Gemini, si hay clave,
y lo deja en esa misma carpeta.

### 5. Resumir cada informe al llegar

Tres a cinco puntos por referencia, en lenguaje de usuario, sin jerga:

- qué produce eso que le gustó, dicho en una frase;
- qué de eso se puede hacer con código en Remotion y qué no;
- qué choca con las reglas que él ya fijó en `.claude/skills/mi-marca/SKILL.md`.

Y al cerrar el lote: qué se repite entre las referencias. Lo que aparece en dos o tres es
mucho más confiable que lo que aparece en una sola.

### 6. Consolidar

Los valores aprobados se escriben con el comando **`/estudiar`**, que tiene el ritual
completo y deja anotada la procedencia de cada valor. No consolidar de memoria ni a mano:
el punto del comando es que salga igual todas las veces.

Una referencia nueva que supere algo que el sistema ya hace **no reemplaza nada de
entrada**: entra como candidata, se prueba en un video, y recién ahí se decide.

## Clasificar cada recurso por cómo se fabrica

Todo lo que aparece en pantalla cae en una de tres casillas. Sin esta tabla se prometen
cosas que después no se pueden hacer.

| Tipo | Ejemplo | Camino |
|---|---|---|
| A · animación de código | contadores, terminales, tarjetas, listas, transiciones, textos | Remotion directo, sale gratis |
| B · captura o grabación | páginas web, repositorios, aplicaciones | captura automática, o pedírsela al usuario |
| C · IA de video, 3D o material de archivo | objetos que se deforman, logos que mutan, planos imposibles | servicio externo de pago, decide el usuario |

Cada gráfico del informe lleva su letra y la evidencia de por qué es esa y no otra. Un
recurso B mal clasificado como A hace perder una tarde.

## Cuando los referentes son para escribir un guion

A veces los videos no vienen para copiar la edición sino las palabras: "ayudame con el
guion", "quiero grabar sobre esto, como hace este", "vos sos el experto, lo grabo hoy". Acá
no se mide cuadro a cuadro ni se toca el estilo: se estudia cómo enganchan y en qué orden
cuentan, y sale un guion listo para grabar. El ritual es **`/guion`**; esto es el método.
Funciona igual sin referentes: la forma de abajo no depende de ninguno.

### 1. Estudio corto, centrado en la palabra

Hasta tres referentes. Cada uno se consigue como en el paso 2 del flujo; si no baja, se
pide el archivo una vez y se sigue con los demás, o sin ninguno. Por cada uno:

- el borrador, en `referencias/estudio/guion-<slug>/<referente>-borrador.md`, con
  `--enfoque "el gancho y el orden en que cuenta: para escribir un guion"` más lo que la
  persona dijo que le gusta de él. Sin clave: la hoja de contacto y, si Whisper está
  instalado, `transcribir.mjs` para oír el gancho;
- una tabla segundo → qué dice, resumido → función (gancho, problema, prueba, solución,
  giro, cierre);
- qué funciona y qué no se copia. **El gancho literal de otro es suyo, y sus cifras
  también:** se aprende la forma, no las frases.

Un solo informe para el lote, en `referencias/estudio/guion-<slug>.md`. Sin el agente
analista: acá no hay valores de edición que medir.

### 2. La forma

Seis tramos, en este orden:

1. **Gancho con prueba visual en el primer segundo.** El resultado se ve antes de
   explicarlo, y arriba va el titular fijo: de 3 a 7 palabras, que se leen en un segundo.
2. **El problema**, dicho como lo vive quien mira: algo que reconoce de su semana.
3. **Qué hace la persona:** su forma de resolverlo, en primera persona.
4. **Qué hace la herramienta, con números reales:** cuánto tarda, cuánto cuesta, cuántos.
   Solo los verificados; si no hay ninguno, un paso concreto que se ve en pantalla.
5. **Un giro propio:** algo que solo esa persona tiene o vivió —una anécdota, un error, un
   resultado que no esperaba—. Es lo que hace que el video no sea intercambiable. Si no contó
   nada, una opinión suya sobre el tema, nunca una anécdota inventada.
6. **El cierre:** pedir que comenten una palabra a cambio de algo, o un cierre sin pedido.

Frases cortas, una idea por frase y una frase por línea, con las palabras y el trato con que
habla la persona (de dónde sale cada pista, en `/guion`). Entre 110 y 130 palabras: a unas
2,7 palabras por segundo, que es un ritmo normal hablando, son de 40 a 48 segundos.

### 3. Que se entienda fácil

Leer cada frase como alguien que no sabe del tema y la oye una sola vez, con el pulgar listo
para pasar al siguiente video. Afuera la jerga, las siglas sin explicar y los nombres
largos: "el repositorio usuario/herramienta-pro-v2" pasa a "un repositorio de GitHub". El
nombre de la herramienta se queda si es el tema del video. Si una frase hay que leerla dos
veces, se reescribe.

### 4. Nada inventado

Toda cifra y todo dato que el guion afirma —precios, tiempos, cantidades, fechas, "diez
veces más rápido"— queda en una de dos:

- **verificado**, con la fuente al lado: un enlace oficial con su fecha, un archivo de la
  persona, una medición;
- **a confirmar**, con una frase de repuesto sin el número, que es la que se graba si nadie
  lo confirma.

Las cifras propias de la persona ("me ahorra tres horas por semana") quedan a confirmar
hasta que ella las diga. Las de los referentes no se usan. Lo que no se sabe de su sistema
(con qué herramienta lo hace, cuánto tarda) no se inventa ni se pregunta: la frase se
escribe sin eso, se entiende igual, y el dato queda como **opcional**, lo que mejoraría el
guion si lo cuenta. Y la prueba visual es real: una captura o grabación de su sistema, con
los datos de terceros tapados; nunca una pantalla armada.

### 5. El entregable

`videos/<fecha>-<slug>/guion.md`, con el slug que después se usa para editar (minúsculas,
números y guiones): el titular, el guion a una frase por línea —tal cual lo usa `tomas.mjs`
para elegir las tomas—, el plan visual con material que ya existe o se puede capturar, los
datos con su estado, y los consejos para grabar, que remiten a `/antes-de-grabar`. La
plantilla está en `/guion`.

### 6. Una sola pregunta

Lo único que se le pregunta a la persona es **qué recibe quien comenta la palabra del
cierre**. Todo lo demás se propone con un valor por defecto: la palabra, el titular, el
largo. Lo que queda a confirmar no se pregunta uno por uno: va en una lista al final del
guion, cada cosa con su repuesto. Si no quiere cierre con palabra, no hay pregunta.

## Errores comunes

- Creerle al borrador del modelo los fps, las tipografías, los colores, el texto en
  pantalla o los efectos de sonido. Todo eso se verifica en los cuadros y en el espectro.
- Medir cuadro a cuadro un video entero cuando el usuario señaló una sola cosa. El enfoque
  manda; el resto se recorre por arriba.
- Copiar algo que choca con las reglas del usuario. Antes de recomendar, leer `mi-marca`.
- Dar por buena una medida tomada en una hoja de contacto de medio segundo. Lo que se
  afirma con un número de cuadro se mira en una tira de cuadros consecutivos.
- Analizar más de tres o cuatro referencias de una. El estilo se vuelve un promedio sin
  carácter, que es exactamente lo que este ciclo existe para evitar.
- En un guion, copiar el gancho de un referente palabra por palabra, o usar sus cifras
  como si fueran de la persona.
- Frenar el guion esperando referentes que no llegan. La forma funciona sin ellos.
- Llenar un hueco con un dato que suena bien. Lo que no se sabe va a confirmar, con su frase
  de repuesto.
