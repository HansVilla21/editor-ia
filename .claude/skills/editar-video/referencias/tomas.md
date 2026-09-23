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

6. **Montar.**
   `montar.mjs <crudo> edl.json public/<slug>/video.mp4 <scratch>/montaje.json` — 1080×1920 a 30 fps,
   con fades de audio de 12 ms en cada costura para que no queden clics.

7. **Cortar las pausas** sobre el montaje, no sobre el crudo:
   `cortar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 tramos.json --umbral -33 --minimo 0.24 --aire 0.10`.
   El umbral estándar de −36 dB deja demasiado silencio cuando hay ruido de sala entre tomas; bajar
   el mínimo por debajo de 0,20 s se come los finales suaves. Silencio restante: ≤ 5 %.

8. **Verificación obligatoria.** Transcribir el video final y leerlo contra la secuencia esperada:
   ninguna frase dos veces, ninguna palabra partida. Si la transcripción escribe un final raro, no
   tocar nada todavía: comparar la forma de onda del crudo y la del corte con `energia.mjs`. Suele
   ser un error de transcripción y no un corte mal puesto.

9. **Contar al entregar** qué tomas se descartaron y en qué se apartó lo dicho del guion.

## Lo que la grabación cambia en el diseño

Cada grabación impone cosas que no son decisión de estilo:

- **Ropa clara:** el texto blanco desaparece sobre el pecho. Subtítulos en píldora
  `rgba(11,15,22,.72)` y degradado oscuro detrás del cierre.
- **Plano más abierto o más cerrado:** el corrimiento del split se recalcula siempre con `cara.mjs`;
  la fórmula aguanta los dos casos, el número no.
- **Ruido de sala alto:** subir el umbral del corte de a 2 dB y volver a medir el silencio restante,
  antes de tocar el mínimo o el aire.
