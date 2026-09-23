---
description: Edita un video nuevo de punta a punta, desde la grabación hasta el archivo final. Pregunta solo lo que hace falta, ofrece opciones al entregar y convierte cada corrección en una regla.
argument-hint: la grabación y de qué trata (opcional)
---

Editá un video completo con la skill `editar-video`. Hablá de vos, corto y sin jerga.

## 1. Antes de pedir nada: leer la memoria

- **`memory/preferencias.md` y `memory/reglas.md`, enteros.** Cada preferencia y cada regla se aplica donde dice su "Dónde se aplica", durante todo el video. Si una regla contradice a la skill, gana la regla. Lo que diga `(sin preguntar)` usa su valor por defecto.
- **De `memory/decisiones.md`**, las secciones "Música" (no repetir la pista del video anterior ni proponer una descartada) y "Umbrales de corte" (arrancar con los que ya funcionaron).
- **`estado.json`:**
  - Si `preferencias` no es `true`, hacé primero la ronda del paso 7 de `/arrancar` (está en `.claude/commands/arrancar.md`), una sola vez, y después seguí acá.
  - Si `estiloEntrenado` no es `true`, avisale una sola vez que va a salir con el estilo neutro y ofrecele entrenarlo antes con `/estudiar`. Si dice que siga, seguí sin insistir.

Si falta algún archivo de `memory/`, seguí con los valores por defecto: no frenes por eso.

## 2. Lo que hace falta de este video

Pedí en **un solo mensaje** lo que falte de esta lista. Lo que ya dijo, no lo vuelvas a pedir:

> Para arrancar necesito:
>
> 1. **La grabación.** Arrastrá el archivo a esta ventana (se pega su ruta), o dejalo en la carpeta del proyecto y decime cómo se llama.
> 2. **De qué trata**, en una línea.
> 3. **El guion**, si en la grabación repetiste frases hasta que salieran bien: una frase por línea. Con eso elijo la mejor toma de cada una.
> 4. **El cierre.** Si al final pedís que comenten una palabra: ¿cuál es, y qué le llega a quien la comenta? (un enlace, una guía, un archivo). *(Si no pedís nada, cierro con lo que digas al final.)*
> 5. **Enlaces o datos** para mostrar: una página, un repositorio, una cifra. *(Si no hay, busco yo lo que nombres y lo verifico.)*
>
> Si todavía no grabaste, escribí `/antes-de-grabar` y te paso unos consejos.

El cierre nunca promete algo que no existe. Si pide que comenten una palabra pero no dice qué le llega a quien comenta, preguntalo: es lo que va en pantalla.

## 3. El trabajo

Seguí la skill `editar-video` en orden, sin saltarte fases. Las fases existen porque cada una atrapa un error que ya costó tiempo.

Mostrá avances en los puntos donde una decisión cambia el resultado: el corte, el encuadre, el guion visual y la mezcla. No pidas permiso para cada paso.

## 4. Dónde se pregunta, y no se decide solo

Solo en estos puntos, y juntando en un mensaje los que caigan a la vez. No preguntes lo que ya está en `memory/` ni lo que se puede medir o deducir de la grabación. Cada pregunta trae qué hacés si contesta "lo que vos digas":

| Cuándo | Qué preguntar | Si contesta "lo que vos digas" |
|---|---|---|
| Fase 2b, antes de armar la EDL: `tomas.mjs` avisa líneas del guion que no se grabaron, o cosas dichas fuera del guion | Cada una, citada: "La línea *…* no está grabada: ¿la saco, o la grabás de nuevo?" · "Dijiste *…*, que no está en el guion: ¿queda o sale?" | Lo no grabado sale, y avisás si el video pierde sentido sin eso. Lo dicho fuera del guion queda si es una frase completa que se entiende sola; si es un tropiezo, sale |
| Fase 4: una cifra dicha que no coincide con la real | "Decís *cinco minutos* y el video dura 3:57. ¿En pantalla pongo *menos de 4 minutos* y el audio queda como está, corto esa frase, o la grabás de nuevo?" | En pantalla, la formulación verdadera; el audio queda. Nunca un número falso en pantalla |
| Fases 4 y 5: el video nombra apps o marcas, y "Logos" dice preguntar cada vez (o `sin preguntar`) | Todas juntas: "Nombrás *X*, *Y* y *Z*. ¿Pongo sus logos oficiales?" Con permiso permanente no se pregunta; con "nunca", tampoco | Sin logos: el nombre en texto |
| Fase 2, "El final": mira a otro lado antes de 0,4 s después de la última palabra, y "Final" no dice qué hacer | "Cuando terminás de hablar mirás a otro lado enseguida. ¿Corto justo ahí (queda un poco abrupto) o cierro con una tarjeta?" | Cortar en el último cuadro bueno |
| Fase 7, antes del render final | El titular y el cierre completos, tal como se van a leer, y qué recibe quien comenta: "Titular: *…*. Cierre: *Comentá GUÍA y te mando la plantilla*. ¿Van así?" | Van los propuestos |

Aparte de esto sigue en pie lo que pide la skill: el OK antes de bajar cualquier cosa de una fuente nueva (música, efectos, logos).

## 5. La entrega

Dejá el resultado en `videos/<fecha>-<slug>/`: `video-final.mp4` y `portada.png` sueltos, y todo lo demás en `versiones/`, sin borrar nada.

**Opciones, listas para elegir:**

- **Dos músicas**, si el video lleva música: la que va en el video y otra de carácter distinto (no una casi igual), cortada y nivelada igual, en `versiones/musica-b-<número de Mixkit>.m4a` para escucharla.
- **Dos o tres portadas**, salvo que "Portada" diga que elijas vos: la elegida es `portada.png` y las otras, con los mismos textos sobre otro cuadro, van en `versiones/portada-b.png` y `versiones/portada-c.png`.

**El mensaje,** en este orden: dónde quedó y cuánto dura; qué resolviste sin preguntar; en qué se apartó lo dicho del guion; qué datos corregiste contra la fuente; qué reglas de `memory/reglas.md` aplicaste; las opciones de música y portada; qué quedó sin hacer. Y cerrá siempre con estas dos preguntas:

> 1. ¿Qué le cambiarías? Lo que sea, aunque sea chico: una palabra mal escrita, un corte, la música.
> 2. ¿Hay algo que te gustó y querés que se repita en todos los videos?

Lo que conteste a la primera sigue la sección 6. Lo que conteste a la segunda se escribe también: si es una de las preferencias, en `memory/preferencias.md`; si no, como regla en `memory/reglas.md`.

**Anotá:**

- `videosHechos` más uno en `estado.json`.
- En `memory/decisiones.md`: una línea en "Videos"; la música usada y la opción B en "Música"; y si la grabación era cruda, los umbrales que funcionaron en "Umbrales de corte".

**Si es el primer video** (`videosHechos` quedó en 1) y `calibrado` no es `true`, cuando termine con los cambios proponé la calibración:

> Como es tu primer video, te propongo `/calibrar`: son unas preguntas cortas sobre cómo quedó —los cortes, el ritmo, los subtítulos, la música, la portada— y con eso el próximo sale a tu medida. ¿La hacemos ahora?

## 6. Cómo convertir una corrección en regla

Cada vez que corrige algo, al entregar o en cualquier momento:

1. **Arreglá el video.** Sale una versión nueva, `versiones/vN-<qué cambió>.mp4`; la anterior se queda. Si el arreglo vuelve a una fase anterior, rehacé desde ahí: después de volver a cortar o acelerar cambian todos los tiempos (transcribir de nuevo, `CORTES` de nuevo).
2. **Decidí si es de una vez o para siempre.**
   - **De una vez:** es sobre el contenido de este video: una palabra de este tema, un dato, un gráfico puntual.
   - **Para siempre:** es un gusto o una falla que se puede repetir: "la *s* de *frases* quedó mocha", "los subtítulos se leen chicos", "no me gusta la música electrónica".
   - Si no está claro, preguntá en una línea: "¿Esto es solo para este video o para todos los que vienen?"
3. **Si es para siempre, escribila en un solo lugar:**

   | Si es… | Va en | Cómo |
   |---|---|---|
   | Una de las preferencias de la lista (nombre, plataforma, trato, silencios, velocidad, subtítulos, titular, música, efectos, portada, final, logos) | `memory/preferencias.md` | Se reemplaza la línea **Elegido**, con sus palabras y la fecha |
   | De marca: un color, una tipografía, su logo, cómo aparece en pantalla, algo que no quiere ver nunca | `.claude/skills/mi-marca/SKILL.md`, en su sección | Le mostrás la línea antes de escribirla |
   | Un valor de estilo medido: un tamaño, una transición, una duración, un efecto del catálogo | El archivo de `.claude/skills/editar-video/referencias/` que lo tiene | Con la procedencia pegada al valor, como en `/estudiar`: `— corrección del <fecha>, video <slug>: "<sus palabras>"`, y `Reemplazó a: <valor anterior>` |
   | Todo lo demás: cómo cortar, cómo elegir tomas, qué revisar, qué no hacer | `memory/reglas.md` | Con su formato: fecha y regla en una línea, **Qué pasó**, **Regla**, **Dónde se aplica** |

4. **Contale en una línea qué quedó escrito y dónde:** "Anotado para siempre: más aire al final de cada frase (en `memory/reglas.md`)."
5. **En el video siguiente se aplica sola:** la sección 1 la lee, y al entregar se menciona una vez que se aplicó.

Si lo que pide rompe otra cosa —bajar los umbrales de `apretar.mjs` para cortar más se come las *s* finales—, explicale el costo en una línea, ofrecé la alternativa segura, y si insiste, la regla anota el límite. No se escribe una regla por una corrección de una sola vez: llena la memoria de ruido.

**Ejemplos:**

- *"La s de frases quedó mocha."* Arreglo: volver a cortar con `cortar.mjs … --tras 0.18` y `apretar.mjs … --tras 0.16` (de fábrica son 0,14 y 0,12), transcribir de nuevo, `CORTES` de nuevo, v2. Es para siempre: regla en `memory/reglas.md`, fase 2.
- *"No me gusta esa música."* Primero, en una línea: "¿Qué no te gustó: el tipo, que es muy movida, o que está fuerte?" Arreglo: la opción B u otra candidata, v2. Para siempre: el tipo o el volumen van en "Música" de `memory/preferencias.md`, y la pista rechazada en "Música" de `memory/decisiones.md` como descartada.
- *"Los subtítulos se leen chicos."* Arreglo: `subtitulos.tamano` de 58 a 66 en `src/<slug>/marca.ts`, v2. Para siempre: tamaño grande en "Subtítulos" de `memory/preferencias.md`.
- *"Ese azul no es el mío."* De marca: el color correcto en la sección 1 de `mi-marca` y en `MI_MARCA` de `src/plantilla/marca.ts` (así lo heredan los videos nuevos) y de `src/<slug>/marca.ts`, y v2.
