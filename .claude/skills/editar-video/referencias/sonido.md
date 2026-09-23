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

Criterio neutro de elección: instrumental, energía media-alta, entre 110 y 125 BPM, sin cambios
bruscos de sección.

### Paso a paso

1. **Pedir el OK antes de bajar.** Son descargas de internet: de 2 a 8 MB por pista.
2. **Buscar en los listados de Mixkit.** Para videos que explican herramientas sirven estos:

   | Listado | Dirección |
   |---|---|
   | Tecnología | `https://mixkit.co/free-stock-music/tag/technology/` |
   | Corporativa | `https://mixkit.co/free-stock-music/tag/corporate/` |
   | Electrónica | `https://mixkit.co/free-stock-music/electronic/` |
   | Hip-hop | `https://mixkit.co/free-stock-music/hip-hop/` |
   | Chill | `https://mixkit.co/free-stock-music/chillout/` |
   | Lo-fi | `https://mixkit.co/free-stock-music/lo-fi-beats/` |

   El HTML de cada listado trae la lista entera en un bloque de datos (`"@type":"MusicRecording"`)
   con título, género, duración (`"duration":"PT2M7S"`) y dirección del archivo. Descartar de
   entrada las que duran menos que el video más unos 15 s: el tramo casi nunca arranca en el 0.
3. **Sacar la dirección directa de cada una.** Cada pista tiene un número, y el archivo completo
   está en `https://assets.mixkit.co/music/<número>/<número>.mp3` (es el `url` de ese bloque). Si no
   responde, la dirección vigente está en la página de descarga,
   `https://mixkit.co/free-stock-music/download/<número>/`, en el atributo
   `data-download--modal-url-value`. Mixkit cambia el formato de vez en cuando: esa página manda.
4. **Bajar de 3 a 5 candidatas** a una carpeta de trabajo, con el número en el nombre:
   `curl -L -o <scratch>/musica/<número>.mp3 <dirección>` (en PowerShell, `curl.exe`).
5. **Filtrar con Gemini:** `musica.mjs <scratch>/musica`. Escribe `escucha.json` y un ranking:
   si es instrumental, BPM, energía, si compite con la voz y desde qué segundo arranca el beat.
   Descartar las que tienen voces, las que salen de 110–125 BPM y las que marcan cambios de sección.
6. **Escuchar y elegir.** El ranking descarta; no elige. La primera (o las dos primeras) se escuchan
   desde el arranque que propone Gemini, y se confirma ese segundo de oído: el modelo lo erra seguido.
   Si la persona está, se le ofrecen las dos mejores.
7. **Cortar el tramo** del largo del video más 4 s, con fundido de entrada de 0,25 s:
   `tramo.mjs <scratch>/musica/<número>.mp3 <scratch>/musica/tramo.wav --desde <arranque> --duracion <video + 4>`
8. **Nivelar a −33 LUFS:** `nivelar.mjs <scratch>/musica/tramo.wav public/<slug>/musica.m4a -33`
9. **Anotarla en `memory/`** —la memoria del proyecto de esta persona—: número de Mixkit, título,
   segundo de arranque y en qué video se usó. Así el próximo video no vuelve a escuchar todo, y se
   evita repetir la misma pista en videos seguidos.

**Mezcla:** volumen 0,7 multiplicado por el ducking `1 − 0.35 · voz[cuadro]` —unos −3,7 dB mientras
habla—, con fade de entrada de 0,6 a 1 en 8 cuadros y fade de salida en los últimos 24.

La envolvente de voz que alimenta el ducking se genera con
`actividad.mjs public/<slug>/voz.wav src/<slug>/vozActividad.ts`.

## Efectos

**El catálogo es la fuente única:** `referencias/efectos.json`. Para cada clave dice de qué efecto
de Mixkit sale (`mixkit`, `nombre`, `pagina`, `descarga`), qué `filtro` lleva, dónde pega (`pico`,
en segundos desde el inicio del archivo, medido después del filtro), cuánto dura (`duracion`), a qué
volumen entra (`vol`) y para qué `evento` es. La plantilla y las herramientas leen de ahí; nadie
copia esos números a mano.

**Los archivos no viajan en el repo.** La licencia de Mixkit (Sound Effects Free License,
`https://mixkit.co/license/#sfxFree`) deja usarlos gratis y sin atribución en los videos, pero no
redistribuirlos sueltos ni dentro de una plantilla. Cada persona los baja una vez:

```
npm run efectos
```

**Antes, pedir el OK:** baja 15 archivos de internet, unos 7 MB. El comando deja en `public/sfx/` lo
que falte, lo pasa a WAV, le aplica su filtro y vuelve a medir el pico: si difiere más de 0,05 s del
catálogo, o si el archivo satura, lo avisa. Lo que ya está no se vuelve a bajar.
`efectos.mjs --revisar` lista qué falta sin bajar nada.

Si una descarga falla —Mixkit cambia a veces las direcciones—, el mensaje dice qué efecto es, en
qué página buscarlo y cómo dejarlo en su lugar después de bajarlo a mano:
`efectos.mjs --importar <clave> <archivo bajado>`.

### Colocación

Cada efecto se coloca para que su **pico** caiga en el cuadro del evento:
`desde = cuadro_del_evento − round(pico · 30)`.

Bus de efectos: **× 0,5** sobre la suma de todos (`bus` en el catálogo). El volumen final de cada
efecto es `vol × bus`.

### Agregar o reemplazar un efecto

1. Buscar candidatos en `https://mixkit.co/free-sound-effects/<tema>/` (`whoosh`, `swoosh`,
   `click`, `interface`, `notification`, `impact`, `keyboard`…). El número de cada efecto aparece en
   el reproductor: `https://assets.mixkit.co/active_storage/sfx/<número>/<número>-preview.mp3`.
2. La dirección de descarga está en `https://mixkit.co/free-sound-effects/download/<número>/`, en el
   atributo `data-download--modal-url-value`. Casi siempre es
   `https://assets.mixkit.co/active_storage/sfx/<número>/<número>.wav`; algunos son `.mp3`.
3. Bajar 3 o 4 candidatos a una carpeta de trabajo y medirlos: `efecto.mjs <archivos…>` devuelve
   inicio, pico, fin, brillo y pico en dBFS. **Los nombres mienten seguido** —hay "whoosh" que son
   tic-tac—: un "whoosh" con el pico a 0,05 s y brillo de 6000 Hz es un click. Se elige por la
   medición y la escucha, no por el nombre.
4. Editar la entrada del catálogo: `mixkit`, `nombre`, `descarga`, `filtro`, y en `pagina` una
   búsqueda que lo muestre primero: `https://mixkit.co/free-sound-effects/discover/<nombre-con-guiones>/`.
5. `efectos.mjs --bajar --forzar`. Pasar al catálogo el `pico` y la `duracion` que mide. Si avisa
   saturación, sumar al final del `filtro` la ganancia que propone (`volume=-2dB`, por ejemplo).
6. `vol`: arrancar con el del efecto que reemplaza. Si el nuevo suena bastante más fuerte o más
   débil, corregirlo; en el render, `mezcla.mjs` en el segundo del efecto dice si quedó sano (hasta
   unos 6 dB por debajo de la voz).

Filtros que ya se usan: `lowpass=f=9000` para los whoosh, `lowpass=f=8000` para los barridos largos,
`highpass=f=45,lowpass=f=12000` para los impactos (con un `volume=` al final si el filtro lo hace
pasar 0 dBFS). Para probar un filtro antes de ponerlo en el catálogo: `efecto.mjs <archivo> --suave 9000`.

### Qué efecto va con qué evento

| Clave | Qué buscar | Forma medida | Evento |
|---|---|---|---|
| whooshIn | woosh de aire con cola larga, filtrado a 9 k | sube, pega a ~0,5–0,8 s, cola larga | corte de full a split |
| whooshOut | woosh de transición más corto y seco, filtrado a 9 k | pega a ~0,4–0,6 s, cola corta | corte de split a full |
| swish | woosh rápido | pega antes de 0,15 s, termina antes de 0,3 s | sub-escena, tachado |
| sweep | barrido corto ascendente | sube y pega a ~0,3 s | flechas, deslizamientos, colapsos |
| pop | alerta corta de interfaz, ataque inmediato | pega antes de 0,1 s | tarjetas, archivos |
| snap | "select" de interfaz, muy seco | pega enseguida, dura menos de 0,05 s | tags, signos de más |
| click | clic de mouse, uno solo | un golpe seco | filas, pasos de una lista |
| tick | select corto y agudo | pega antes de 0,1 s | contador: un tick por paso, con el espaciado de la curva |
| bleep | confirmación tecnológica de dos tonos | el segundo tono pega a ~0,2 s | "generando", proceso que arranca |
| ok | tono de confirmación | pega enseguida | éxito |
| error | clic de error | pega enseguida | hallazgo, falla marcada |
| wrong | tono negativo de interfaz | pega enseguida, grave o con zumbido | conflicto, cosas que se pisan |
| scan | zoom o barrido largo de interfaz, filtrado a 8 k | sube, pega a ~0,25 s, dura ~1 s | escaneo, análisis |
| impact | impacto grave de un solo golpe, filtrado con pasa-altos 45 y pasa-bajos 12 k | un golpe y cola larga; con un brillo muy bajo (unos 250 Hz) casi no se oye en el parlante de un teléfono | cierre |
| typing | tecleo parejo en laptop, largo para poder recortarlo | suena desde el segundo 0 (`medir: "inicio"`) | prompts y comandos que se escriben: recortado a la duración del tipeo, con fade de 5 cuadros |

## Master y verificación

1. El render de Remotion va a `videos/<carpeta>/versiones/vN-….mp4` y debería medir alrededor de
   −19 LUFS con pico verdadero por debajo de −2 dB.
2. La verificación se corre sobre **ese** archivo, antes del master:
   `mezcla.mjs <render> public/<slug>/voz.wav <segundos de cada acento fuerte>`. El script resta la
   voz de la mezcla, mide lo que queda y da el pico del canal más fuerte.
   **Sano:** música y efectos entre 12 y 20 dB por debajo de la voz; los acentos pueden llegar hasta
   unos 6 dB por debajo; **nunca** por encima de la voz.
3. Master: `nivelar.mjs <render> videos/<carpeta>/video-final.mp4 -14 --copiar-video` →
   **−14 LUFS, pico verdadero ≤ −1,3 dB**. El script imprime el modo; en el master suele salir
   dinámico y está bien, porque el limitador apenas actúa.

**La escucha de un modelo no es una medición.** Devuelve casi la misma crítica genérica en cada
versión —"hay clipping" donde no lo hay, "falta ducking" con el ducking puesto—. Sirve como pista
para dónde mirar; el número de `mezcla.mjs` es lo que decide si se toca un nivel.
