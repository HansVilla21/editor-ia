# Sonido — la cadena y los niveles neutros

> **Los niveles de la voz, la música y el master no son gusto: son estándar de plataforma** y se
> quedan como están. Lo que sí es punto de partida —y se reemplaza cuando la persona entrene su
> estilo con `estudiar-referentes`— son los volúmenes relativos de cada efecto, la energía de la
> música y qué efecto acompaña a qué evento.
>
> **Lo que no se reemplaza es el método:** el pico del efecto va en el cuadro del evento, y la
> mezcla se verifica con números, no de oído.

Implementación viva: el componente de sonido de `src/plantilla/`.

## Voz

1. Sobre el video ya cortado: `highpass=f=80`, de-esser suave, y compresor
   `threshold=-24dB:ratio=2.5:attack=5:release=90`.
2. Ganancia **fija** hasta −19 LUFS, más un limitador a −3 dB, y se guarda en
   `public/<slug>/voz.wav`. **WAV, no AAC**: el AAC mete saturaciones que no estaban.
   No usar el modo "linear" de loudnorm cuando la ganancia haría pasar el pico verdadero: cae solo a
   modo dinámico y la voz respira raro. Se calcula la ganancia a mano: `volume = (−19 − medido) dB`.
3. En Remotion: el video va silenciado y la voz entra como pista de audio aparte. Así se puede
   normalizar la voz sin tocar la imagen.

## Música

**Licencia primero.** La fuente que trae el proyecto es **Mixkit**, con su Stock Music Free License:
sirve para videos de redes y de YouTube, no pide atribución, y prohíbe registrarla en Content ID,
redistribuirla sola o remezclarla como pista musical
(`https://mixkit.co/license/modal/musicFree/`). Antes de bajar de cualquier otra fuente, preguntar.

- Listado por tema: `https://mixkit.co/free-stock-music/tag/<tag>/` (technology, corporate,
  electronic, lo-fi, hip-hop, chill).
- Filtro: `musica.mjs <carpeta>` le pasa las pistas descargadas a Gemini, que descarta las que
  tienen voces o cambios caóticos y sugiere desde qué segundo arranca el beat.
- Criterio neutro de elección: instrumental, energía media-alta, entre 110 y 125 BPM, sin cambios
  bruscos de sección.
- Las pistas que la persona apruebe se anotan en `memory/` con el segundo de arranque, para no
  volver a escuchar todo en el próximo video.

**Preparación:** cortar un tramo de la duración del video más 4 s, fade-in de 0,25 s, y nivelar a
**−33 LUFS** con `nivelar.mjs <tramo> public/<slug>/musica.m4a -33`.

**Mezcla:** volumen 0,7 multiplicado por el ducking `1 − 0.35 · voz[cuadro]` —unos −3,7 dB mientras
habla—, con fade de entrada de 0,6 a 1 en 8 cuadros y fade de salida en los últimos 24.

La envolvente de voz que alimenta el ducking se genera con
`actividad.mjs public/<slug>/voz.wav src/<slug>/vozActividad.ts`.

## Efectos

Los archivos están en `public/sfx/`, con su catálogo al lado. **Los catálogos describen mal varios
archivos** —hay "whoosh" que son tic-tac—, así que el efecto se elige por nombre de archivo y se
confirma con `efecto.mjs <archivo>`, que devuelve inicio, pico, fin y brillo.

Cada efecto se coloca para que su **pico** caiga en el cuadro del evento:
`desde = cuadro_del_evento − round(pico · 30)`.

Las variantes suaves se generan del original con un filtro pasa-bajos y se guardan al lado, para no
volver a calcularlas: `lowpass=f=9000` para los whoosh, `f=8000` para los barridos largos, y
`highpass=f=45, lowpass=f=12000` para los impactos.

Volúmenes neutros. El nombre de archivo se toma del catálogo; acá va qué buscar.

| Clave | Qué buscar en el catálogo | Pico típico | vol | Evento |
|---|---|---|---|---|
| whooshIn | woosh de aire con cola larga, filtrado a 9 k | ~0,60 s | 0,30 | corte de full a split |
| whooshOut | woosh de transición más corto y seco, filtrado a 9 k | ~0,50 s | 0,36 | corte de split a full |
| swish | woosh rápido, menos de 0,3 s | ~0,10 s | 0,20 | sub-escena, tachado |
| sweep | barrido corto ascendente | ~0,30 s | 0,24 | flechas, deslizamientos, colapsos |
| pop | alerta corta de interfaz, ataque inmediato | ~0,05 s | 0,38 | tarjetas, archivos |
| snap | "select" de interfaz, muy seco | ~0,02 s | 0,32 | tags, signos de más |
| click | clic de mouse | ~0,03 s | 0,32 | filas, pasos de una lista |
| tick | select corto y agudo | ~0,05 s | 0,12 | contador: un tick por paso, con el espaciado de la curva |
| bleep | confirmación tecnológica de dos tonos | ~0,20 s | 0,32 | "generando", proceso que arranca |
| ok | tono de confirmación | ~0,02 s | 0,20 | éxito |
| error | clic de error | ~0,02 s | 0,28 | hallazgo, falla marcada |
| wrong | tono negativo de interfaz | ~0,05 s | 0,26 | conflicto, cosas que se pisan |
| scan | zoom o barrido largo, filtrado a 8 k | ~0,25 s | 0,55 | escaneo, análisis |
| impact | impacto grave, filtrado con pasa-altos 45 y pasa-bajos 12 k | ~0,15 s | 0,08 | cierre |
| typing | tecleo en laptop, recortado a la duración del tipeo y con fade de 5 cuadros | 0 s | 0,12 | prompts y comandos que se escriben |

Bus de efectos: **× 0,5** sobre la suma de todos.

## Master y verificación

1. El render de Remotion va a `videos/<carpeta>/versiones/vN-….mp4` y debería medir alrededor de
   −19 LUFS con pico verdadero por debajo de −2 dB.
2. La verificación se corre sobre **ese** archivo, antes del master:
   `mezcla.mjs <render> public/<slug>/voz.wav <segundos de cada acento fuerte>`. El script resta la
   voz de la mezcla y mide lo que queda.
   **Sano:** música y efectos entre 12 y 20 dB por debajo de la voz; los acentos pueden llegar hasta
   unos 6 dB por debajo; **nunca** por encima de la voz.
3. Master: `nivelar.mjs <render> videos/<carpeta>/video-final.mp4 -14 --copiar-video` →
   **−14 LUFS, pico verdadero ≤ −1,3 dB**. El script imprime el modo; en el master suele salir
   dinámico y está bien, porque el limitador apenas actúa.

**La escucha de un modelo no es una medición.** Devuelve casi la misma crítica genérica en cada
versión —"hay clipping" donde no lo hay, "falta ducking" con el ducking puesto—. Sirve como pista
para dónde mirar; el número de `mezcla.mjs` es lo que decide si se toca un nivel.
