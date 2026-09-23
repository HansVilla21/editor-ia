---
description: Edita un video nuevo de punta a punta, desde la grabación hasta el archivo final. Pregunta solo lo que hace falta, ofrece opciones al entregar y convierte cada corrección en una regla.
argument-hint: la grabación y de qué trata (opcional)
---

Editá un video completo con la skill `editar-video`. Hablá corto y sin jerga. Los textos de acá están escritos de vos; si la persona te escribe de tú o de usted, hablale como ella.

**Toda pregunta de este comando tiene una respuesta por defecto.** Si la persona contesta "no sé", "lo que vos digas" o no contesta esa parte, usás el por defecto que figura al lado, lo decís en una línea y seguís. Nunca frenes el video esperando una respuesta que ya tiene por defecto.

## 1. Antes de pedir nada: leer la memoria

- **`memory/preferencias.md` y `memory/reglas.md`, enteros.** Cada preferencia y cada regla se aplica donde dice su "Dónde se aplica", durante todo el video. Si una regla contradice a la skill, gana la regla. Lo que diga `(sin preguntar)` usa su valor por defecto.
- **De `memory/decisiones.md`**, las secciones "Música" (no repetir la pista del video anterior ni proponer una descartada) y "Umbrales de corte" (arrancar con los que ya funcionaron).
- **`estado.json`:**
  - Si `preferencias` no es `true`, hacé primero la ronda del paso 7 de `/arrancar` (está en `.claude/commands/arrancar.md`), una sola vez, y después seguí acá.
  - Si `estiloEntrenado` no es `true` y `videosHechos` es 0, sumá una línea al mensaje de la sección 2: "Tu estilo todavía es el neutro: si querés, antes me pasás 2 o 3 videos que te gusten y lo armo (`/estudiar`)". Por defecto, se sigue con el neutro. En los videos siguientes no lo repitas.

Si falta algún archivo de `memory/`, seguí con los valores por defecto: no frenes por eso.

## 2. Lo que hace falta de este video

Pedí en **un solo mensaje** lo que falte de esta lista, con la numeración corrida. Lo que ya dijo, no lo vuelvas a pedir:

> Para arrancar necesito:
>
> 1. **La grabación.** Arrastrá el archivo a esta ventana, o dejalo en la carpeta del proyecto y decime cómo se llama.
> 2. **De qué trata**, en una línea.
> 3. **El guion**, si en la grabación repetiste frases hasta que salieran bien: una frase por línea. Con eso elijo la mejor toma de cada una. *(Si no lo tenés, lo armo yo con lo que dijiste y te lo muestro.)* Si la grabación es una sola toma limpia, no hace falta.
> 4. **El cierre.** Si al final pedís que comenten una palabra: ¿cuál es, y qué le llega a quien la comenta? (un enlace, una guía, un archivo). *(Si no, uso lo que digas al final.)*
> 5. **Enlaces o datos** para mostrar: una página, una herramienta, una cifra. *(Si no hay, busco yo lo que nombres y lo verifico.)*
>
> Si todavía no grabaste, escribí `/antes-de-grabar` y te paso unos consejos.

La última línea va solo si todavía no pasó ninguna grabación.

Por defecto, si falta algo:

- **Sin guion, con repeticiones:** corré primero los pasos 3 y 4 de `.claude/skills/editar-video/referencias/tomas.md` (`tramos.mjs` y `transcribir.mjs … --tramos`), que no necesitan guion y no inventan frases. Con ese texto armá `guion.txt`: la versión completa de cada frase, una por línea y sin repetir. Mostráselo antes de elegir tomas: "Armé el guion con lo que dijiste; si falta o sobra algo, decime."
- **El cierre:** si pide que comenten una palabra, `CTA.palabra` es esa palabra y `CTA.recibe` es lo que dice en la grabación que va a mandar; si no lo dice, no se inventa: se pregunta una sola vez, junto con el titular y el cierre de la fase 7 (sección 4), y si tampoco contesta, `recibe` queda vacío. Si no pide comentar nada, el cierre es su última frase repartida en las tres líneas (`pide`, `palabra`, `recibe`), sin agregar ninguna promesa.

## 3. El trabajo

Seguí la skill `editar-video` en orden, sin saltarte fases. Las fases existen porque cada una atrapa un error que ya costó tiempo.

Mostrá avances donde una decisión cambia el resultado —el corte, el encuadre, el guion visual y la mezcla— sin frenar: los mostrás y seguís. Solo esperás respuesta en los puntos de la sección 4.

## 4. Dónde se pregunta, y no se decide solo

Solo en estos puntos, y juntando en un mensaje los que caigan a la vez. No preguntes lo que ya está en `memory/` ni lo que se puede medir o deducir de la grabación.

| Cuándo | Qué preguntar | Por defecto |
|---|---|---|
| Fase 2b, antes de armar la EDL: `tomas.mjs` avisa líneas del guion que no se grabaron, o cosas dichas fuera del guion | Cada una, citada: "La línea *…* no está grabada: ¿la saco, o la grabás de nuevo?" · "Dijiste *…*, que no está en el guion: ¿queda o sale?" | Lo no grabado sale, y avisás si el video pierde sentido sin eso. Lo dicho fuera del guion queda si es una frase completa que se entiende sola; si es un tropiezo, sale |
| Fase 4: una cifra dicha que no coincide con la real | "Decís *en cinco minutos*, pero según lo que mostrás son casi siete. Si lo dejo así, se escucha *cinco*. ¿Lo dejo sin poner el número en ningún gráfico, corto esa frase, o la grabás de nuevo?" | Queda el audio, y el número no va en el titular, el panel ni la portada. Si hay una forma verdadera que no choca con lo que se oye ("más de 280.000" cuando dijo "trescientos mil"), va esa. Se avisa al entregar |
| Fases 4 y 5: el video nombra apps o marcas, y "Logos" dice preguntar cada vez o `(sin preguntar)` | Todas juntas: "Nombrás *X*, *Y* y *Z*. ¿Pongo sus logos oficiales?" Con permiso permanente no se pregunta; con "nunca", tampoco. Si contesta "siempre" o "nunca", va a "Logos de otras marcas" de `memory/preferencias.md` | Sin logos: el nombre en texto |
| Fase 2, "El final": mira a otro lado antes de 0,4 s después de la última palabra (medido en el video final, ya acelerado si se acelera), y "Final" no dice qué hacer | "Cuando terminás de hablar mirás a otro lado enseguida. ¿Termino igual un instante después (con el cierre en pantalla casi no se nota), corto justo ahí (queda abrupto), o cierro con una pantalla final con el texto del cierre?" | Termina 0,4 s después de la última palabra |
| Fase 7, antes del render final | El titular y el cierre completos, tal como se van a leer, y qué recibe quien comenta: "Titular: *…*. Cierre: *Comentá GUÍA y te mando la plantilla*. ¿Van así?" | Van los propuestos |
| Fase 8, antes de bajar música, si "Música" no dice que se baja sin preguntar | "Para la música bajo de 3 a 5 pistas gratis de Mixkit, entre 10 y 40 MB. ¿Dale? ¿Y te pregunto la próxima o las bajo directo?" | Sí, y se sigue preguntando. Si dice que las baje directo, va a "Música" de `memory/preferencias.md` |

Los subtítulos dicen siempre lo que la persona dijo: una cifra corregida cambia los gráficos, nunca los subtítulos. Por eso, si no quiere que se lea el número dicho, las salidas son cortar la frase o grabarla de nuevo.

Qué música va no se pregunta mientras trabajás (solo el OK para bajarla): elegís una y la otra va como opción al entregar.

Aparte de esto sigue en pie lo que pide la skill: el OK antes de bajar cualquier cosa de una fuente nueva (efectos nuevos, imágenes, b-roll). Los logos siguen lo que diga "Logos": con permiso permanente no se vuelve a pedir.

## 5. La entrega

Dejá el resultado en `videos/<fecha>-<slug>/`: `video-final.mp4` y `portada.png` sueltos, y todo lo demás en `versiones/`, sin borrar nada.

**Opciones, listas para elegir:**

- **Dos músicas**, si el video lleva música: la que va en el video y otra de carácter distinto (no una casi igual), cortada y nivelada igual, en `versiones/musica-b-<número de Mixkit>.m4a`. Contáselo simple: "Te dejé otra música para escuchar; si te gusta más, la pongo y lo vuelvo a armar."
- **Dos o tres portadas**, salvo que "Portada" diga que elige Claude: la elegida es `portada.png` y las otras, con los mismos textos sobre otro cuadro, van en `versiones/portada-b.png` y `versiones/portada-c.png`. La plantilla lee siempre `public/<slug>/portada.png`: para cada opción, extraé su cuadro ahí (fase 10), sacá el still a `versiones/`, y al final volvé a extraer el de la elegida.

**El mensaje**, una línea por cosa y en este orden, salteando las que no tengan nada: dónde quedó y cuánto dura; qué resolviste sin preguntar; en qué se apartó lo dicho del guion; qué datos corregiste contra la fuente; qué reglas tuyas de otros videos aplicaste; las opciones de música y portada; qué quedó sin hacer. Y cerrá con estas dos preguntas:

> 1. ¿Qué le cambiarías? Lo que sea, aunque sea chico: una palabra mal escrita, un corte, la música.
> 2. ¿Hay algo que te gustó y querés que se repita en todos los videos?

Lo que conteste a la primera sigue la sección 6. Lo que conteste a la segunda se escribe también, en un solo lugar, con la tabla de la sección 6.

**Las versiones siguientes del mismo video** (v2, v3…) se entregan con dos líneas: qué cambió y "¿Así queda, o algo más?". `video-final.mp4` pasa a ser la versión nueva; los renders anteriores siguen en `versiones/`, y el master de cualquiera se rehace con `nivelar.mjs` (fase 9).

**Anotá, una sola vez por video** (en la primera entrega, no en cada versión):

- `videosHechos` más uno en `estado.json`.
- En `memory/decisiones.md`: una línea en "Videos" (que se completa si después hay versiones), la música usada y la opción B en "Música", y los umbrales con que cortaste (`cortar.mjs`, y `tramos.mjs` si era cruda) en "Umbrales de corte", si dieron un buen corte.

**Si es el primer video** (`videosHechos` quedó en 1) y `calibrado` no es `true`: cuando diga que el video queda así, o que no quiere más cambios, proponé la calibración:

> Como es tu primer video, te propongo `/calibrar`: son unas preguntas cortas sobre cómo quedó —los cortes, el ritmo, los subtítulos, la música, la portada— y con eso el próximo sale a tu medida. ¿La hacemos ahora?

## 6. Cómo convertir una corrección en regla

Cada vez que corrige algo, al entregar o en cualquier momento:

1. **Arreglá el video.** Sale una versión nueva, `versiones/vN-<qué cambió>.mp4`; la anterior se queda. Si el arreglo vuelve a cortar, apretar o acelerar, cambian todos los tiempos: rehacé desde la fase 3 (palabras y `CORTES`) y volvé a sacar de `palabras.json` todo lo que tiene tiempo en `datos.ts`: `BLOQUES`, `CTA.desde`, `CUES`, los `en` de las escenas y `VIDEO_CUADROS`.
2. **Decidí si es de una vez o para siempre.**
   - **De una vez:** es sobre algo de este video y nada más: una palabra de este tema, un dato, un gráfico puntual, "esta música no".
   - **Para siempre:** es una falla que se puede repetir ("la *s* de *frases* quedó cortada") o un gusto dicho en general ("los subtítulos se leen chicos", "no me gusta la música electrónica"). Si trae un motivo general ("esta no, muy electrónica"), el motivo es para siempre.
   - Si no está claro, preguntá en una línea: "¿Esto es solo para este video o para todos los que vienen?" Por defecto: si es una falla (algo sonó o se vio mal), para siempre; si es un gusto sobre algo puntual, solo este video, y si lo vuelve a pedir en otro, pasa a ser para siempre.
3. **Si es para siempre, escribila en un solo lugar:**

   | Si es… | Va en | Cómo |
   |---|---|---|
   | Una de las preferencias de la lista, con una de sus opciones (nombre, plataforma, trato, silencios, velocidad, subtítulos, titular, música, efectos, portada, final, logos) | `memory/preferencias.md` | Se reemplaza la línea **Elegido** que corresponde, con sus palabras y la fecha |
   | De marca: un color, una tipografía, su logo, cómo aparece en pantalla, algo que no quiere ver nunca | `.claude/skills/mi-marca/SKILL.md`, en su sección | Le mostrás la línea antes de escribirla |
   | Un valor de estilo medido que no es una preferencia de la lista: el tamaño del titular, una transición, una duración, un efecto del catálogo | El archivo de `.claude/skills/editar-video/referencias/` que lo tiene | Con la procedencia pegada al valor, como en `/estudiar`: `— corrección del <fecha>, video <slug>: "<sus palabras>"`, y `Reemplazó a: <valor anterior>` |
   | Todo lo demás, incluidos los matices de una preferencia que no son una de sus opciones ("que el titular sea cortito"): cómo cortar, cómo elegir tomas, qué revisar, qué no hacer | `memory/reglas.md` | Con su formato: fecha y regla en una línea, **Qué pasó**, **Regla**, **Dónde se aplica** |

4. **Contale en una línea qué quedó escrito y dónde:** "Anotado para siempre: más aire al final de cada frase (en `memory/reglas.md`)."
5. **En el video siguiente se aplica sola:** la sección 1 la lee, y al entregar se menciona una vez que se aplicó.

Si lo que pide rompe otra cosa —bajar los umbrales de `apretar.mjs` para cortar más se come las *s* finales—, explicale el costo en una línea, ofrecé la alternativa segura, y si insiste, la regla anota el límite. No se escribe una regla por una corrección de una sola vez: llena la memoria de ruido.

**Ejemplos:**

- *"La s de masas quedó cortada."* Primero, dónde se cortó. En una grabación cruda, si esa frase termina en una costura entre tomas, el arreglo es estirar esa pieza 0,1 s en `edl.json` y volver a montar. Si no, volver a cortar con `cortar.mjs … --tras 0.18` y `apretar.mjs … --tras 0.16` (de fábrica son 0,14 y 0,12). Después, desde la fase 3 como dice el paso 1, y v2. Es para siempre: regla en `memory/reglas.md`, fase 2 (o fase 2b, si fue la costura: "cada pieza de la EDL termina 0,1 s más tarde").
- *"No me gusta esa música, muy electrónica."* Si no dijo el motivo, primero, en una línea: "¿Qué no te gustó: el tipo, que es muy movida, o que está fuerte?" Arreglo: la opción B u otra candidata, v2. La pista rechazada va a "Música" de `memory/decisiones.md`, en una línea nueva, como descartada. El motivo general va a "Música" de `memory/preferencias.md` (línea del tipo o del volumen) y desde ahí manda la búsqueda: sus palabras en `musica.mjs --pedido`, y los listados de Mixkit que no chocan con eso ("no electrónica" saca Tecnología y Electrónica; "tranqui" pide Chill o Lo-fi y un `--bpm` más bajo).
- *"Los subtítulos se leen chicos."* Arreglo: `subtitulos.tamano` de 58 a 66 en `src/<slug>/marca.ts`, v2. Para siempre: tamaño grande en "Subtítulos" de `memory/preferencias.md`.
- *"Me gustó que el titular fuera corto."* No es una de las opciones de "Titular": regla en `memory/reglas.md`, fase 5: "titular de 3 a 5 palabras".
- *"Ese azul no es el mío."* De marca: el color correcto en la sección 1 de `mi-marca` y en `MI_MARCA` de `src/plantilla/marca.ts` (así lo heredan los videos nuevos) y de `src/<slug>/marca.ts`, y v2.
