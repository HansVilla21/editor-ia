# Elegir tomas de una grabación cruda

> **Esto es método, no estilo: se sigue tal cual.** Lo único que es punto de partida son los tres
> umbrales de detección de voz, que dependen de la sala y del micrófono de cada persona. El primer
> video se usa para ajustarlos, y los que funcionen se anotan en `memory/`.

**El caso:** un solo archivo de cámara de 3 o 4 minutos, en el que la persona lee el guion frase por
frase, con pausas largas, y repite la frase cuando se traba. Hay que quedarse con una sola versión
de cada línea y que el resultado suene corrido.

## Por qué no alcanza con transcribir el crudo

- Con silencios largos, la transcripción **deriva**: los tiempos se corren varios segundos respecto
  del audio, y lo hacen de a poco, así que el error se descubre tarde.
- Además **alucina frases de cierre que nadie dijo** ("nos vemos en el próximo video"), típicamente
  al final de un silencio largo.
- Compactar el audio antes tampoco resuelve: las palabras terminan cayendo en el tramo equivocado.
- Lo que sí funciona: **transcribir cada tramo de voz por separado**. Cada tramo tiene sus propios
  límites conocidos, así que el texto es confiable y los tiempos no pueden derivar más allá del
  tramo.

## El flujo

1. **Mirar el archivo.**
   `sondear.mjs <crudo>`: rotación −90 significa vertical rotado, y si el color no es bt709 hay que
   tonemapear. No hace falta preparar el audio a mano: cada herramienta de abajo recibe la grabación
   tal cual y le saca el audio con el ffmpeg del proyecto (que no está en el PATH de la persona).

2. **Mapa de intentos.**
   `tomas.mjs <crudo> guion.txt <scratch>/tomas.json`, con el guion a una frase por línea. Si la
   persona no pasó el guion, pedírselo: sin él no hay contra qué comparar los intentos. Devuelve cada intento con si está completo, si está fluido, cuál es el problema y una
   recomendación. **Sus tiempos son aproximados** y a veces confunde una pausa a mitad de frase con
   un intento cortado: sirve para saber qué buscar, no para cortar.

3. **Tramos de voz.**
   `tramos.mjs <crudo> <scratch>/mapa.json --umbral -42 --minimo 0.3 --aire 0.12`.
   Estos son los límites reales, medidos sobre la onda.

4. **Texto por tramo.**
   `transcribir.mjs <crudo> <scratch>/tramos.json --tramos <scratch>/mapa.json` — una
   llamada por tramo, con 0,3 s de silencio agregado a los lados para que no se coma la primera ni
   la última palabra.

5. **Armar la EDL.** Un archivo `edl.json` con segundos del crudo: por cada línea del guion, la
   **última toma completa y fluida**, con los límites del tramo. Se descartan los arranques en falso
   cortos.
   Cuando una toma buena trae un error pegado al principio ("y también no cambia nada…"), hay que
   recortar dentro del tramo:
   - `energia.mjs <crudo> <t0> <t1>` muestra la energía cada 20 ms. En habla corrida no
     suele haber una pausa clara, así que no siempre alcanza.
   - Probar 4 o 5 puntos de entrada candidatos, transcribir cada uno y quedarse con el primero cuya
     transcripción arranca en la palabra correcta. La diferencia entre un punto que sirve y uno que
     se come una palabra suele ser de 0,1 a 0,3 s.
   **La última pieza termina 1,3 s después de la última palabra**, no en el límite del tramo: ahí
   está la persona mirando a cámara o sonriendo antes de cortar, y sobre eso entra el cierre (ver
   "El final", abajo).

6. **Montar.**
   `montar.mjs <crudo> edl.json public/<slug>/video.mp4 <scratch>/montaje.json` — 1080×1920 a 30 fps,
   con fades de audio de 12 ms en cada costura para que no queden clics. Si el crudo es 4K y vas a
   usar acercamientos, `--tamano 1440x2560` los deja nítidos; en ese caso pasale el mismo
   `--tamano` a `cortar.mjs` y a la composición.

7. **Cortar las pausas** sobre el montaje, no sobre el crudo:
   `cortar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 tramos.json --umbral -33 --minimo 0.24 --aire 0.10`.
   El umbral estándar de −36 dB deja demasiado silencio cuando hay ruido de sala entre tomas; bajar
   el mínimo por debajo de 0,20 s se come los finales suaves. Lo que hace solo, sin que se lo pidas:
   - Deja 0,14 s después de cada frase aunque el aire sea menor: la cola de una "s" final tiene poca
     energía, ffmpeg la cuenta como silencio y con menos se oye mocha.
   - Tira los sonidos sin voz —clics, monedas, golpes en la mesa, respiraciones sueltas— que de
     otro modo quedan como tramos de 0,1 a 0,3 s: un parpadeo en la imagen y un jump cut falso. Una
     palabra corta no se tira: tiene una vocal sostenida. Lo que tiró queda en `tramos.json`, en
     `descartados`: miralo, y si hay una palabra ahí, bajá `--tramo-minimo`.
   - Deja 1,2 s de toma real después de la última palabra (`--cola`), si la EDL la trae.
   Al terminar lista las **pausas internas de más de 0,35 s** que quedaron (segundo y duración).
   Casi siempre son respiraciones por debajo del umbral: las saca el paso siguiente.

8. **Apretar** (segunda pasada):
   `apretar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 <scratch>/quitados.json`.
   El ruido de sala de un teléfono anda cerca de −45 dB, así que el corte no ve las respiraciones
   de 0,3 a 0,7 s entre frases. Esta pasada las encuentra con dos umbrales y respeta las "s"
   finales y los bordes (el primer 0,3 s y los últimos 0,8 s). Con `--solo-mapa` muestra lo que
   sacaría sin tocar nada. **No bajes sus umbrales para ganar segundos:** con valores más agresivos
   gana unas décimas y se come las "s" finales y el final de la última palabra. Revisá el total que
   imprime y, ante la duda, mirá la lista con `--solo-mapa`: cada pausa tiene que caer entre dos
   frases, nunca en medio de una.
   Estos cortes **no van a `CORTES`**: caen entre frases, el salto no se ve, y un cambio de zoom
   por segundo pone la toma nerviosa. Pero los `CORTES` de `tramos.json` están medidos antes de
   apretar, así que se corren. No se hace a mano: el paso 10 los saca con `cortes.mjs`.

9. **Acelerar, solo si la persona lo pide.** Hay quien prefiere sus videos un poco más rápidos
   (1,1x es lo común). Es su decisión, no la del editor: preguntale una vez y anotá la respuesta en
   `memory/`. Si no dice nada, no se acelera.
   `acelerar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 1.1` — la voz no cambia de tono y
   el video queda a 30 fps. **Todos los tiempos cambian**: cualquier número medido antes (palabras,
   segundos de un gráfico) ya no sirve.

10. **Transcribir el archivo final y verificar.** Siempre el que salió del último paso (acelerado,
    si se aceleró), nunca uno anterior: los subtítulos y los cues salen de acá. Los `CORTES` salen
    de `cortes.mjs tramos.json --montaje <scratch>/montaje.json --quitados <scratch>/quitados.json
    [--velocidad 1.1] --video public/<slug>/video.mp4`, que imprime la línea lista para `datos.ts`:
    con las costuras entre tomas, corrida por lo que sacó apretar y por la velocidad, y ajustada al
    cuadro donde la imagen salta de verdad.
    Leerlo contra la secuencia esperada: ninguna frase dos veces, ninguna palabra partida. Si la
    transcripción escribe un final raro, no tocar nada todavía: comparar la forma de onda del crudo
    y la del corte con `energia.mjs`. Suele ser un error de transcripción y no un corte mal puesto.
    Mirá también el final (sección de abajo): la cola tiene que ser toma real con la persona
    todavía mirando a cámara.

11. **Contar al entregar** qué tomas se descartaron, en qué se apartó lo dicho del guion, y si se
    aceleró, a qué velocidad.

## El final: toma real, no cuadro congelado

Un video que termina justo en la última sílaba se siente cortado; uno que congela el último cuadro
para sostener el cierre se siente trabado, como si la persona se hubiera quedado pegada. Lo que
funciona es terminar sobre **toma real**:

- En la EDL, la última pieza termina **1,3 s después de la última palabra**. Casi siempre la
  persona se queda mirando a cámara o sonríe antes de cortar la grabación: ese es el cierre.
- `cortar.mjs` conserva ese tramo con `--cola 1.2` (es el valor por defecto) en lugar de
  recortarlo como silencio, y `apretar.mjs` no toca los últimos 0,8 s.
- **Mirar la cola antes de cerrar.** No todas las personas se quedan quietas: hay quien baja la
  vista a los 0,5 s. Con `cuadros.mjs` sobre el último 1,5 s (cada 0,1 s), el video termina en el
  último cuadro en que sigue mirando a cámara o sonriendo, aunque eso deje menos de 1 s de cola.
  Entre 0,4 y 1,3 s después de la última palabra está bien; menos de 0,4 se siente cortado.
- En la composición, la duración es la del video (o la del último cuadro bueno de la cola), sin
  `<Freeze>`: el llamado a la acción entra sobre la toma real.
- Si vas a necesitar una portada, pedile a la persona que en ese final mire al lente: queda un
  cuadro bueno para elegir.

## Lo que la grabación cambia en el diseño

Cada grabación impone cosas que no son decisión de estilo:

- **Ropa clara:** el texto blanco desaparece sobre el pecho. Subtítulos en píldora
  `rgba(11,15,22,.72)` y degradado oscuro detrás del cierre.
- **Plano más abierto o más cerrado:** el corrimiento del split se recalcula siempre con `cara.mjs`;
  la fórmula aguanta los dos casos, el número no.
- **Ruido de sala alto:** si después de cortar quedan muchas pausas internas largas, subir el
  umbral del corte de a 2 dB y volver a cortar, antes de tocar el mínimo o el aire. Lo que quede lo
  saca `apretar.mjs`.
