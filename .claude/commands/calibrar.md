---
description: Después del primer video, ocho preguntas cortas sobre cómo quedó. Cada respuesta ajusta el editor en un lugar concreto, y el próximo video sale más a tu medida.
---

Calibrá el editor con lo que la persona vio en su video. Hablá corto y sin jerga. Los textos de acá están escritos de vos; si la persona te escribe de tú o de usted, hablale como ella.

## Antes

- El video a calibrar es el último entregado: la carpeta más nueva de `videos/`. Si no hay ninguno, decile que esto sirve después del primer video, que lo hacen cuando tenga uno, y pará acá.
- Leé `memory/preferencias.md` y `memory/reglas.md`. No preguntes lo que ya quedó contestado después de entregar ese video, en esta conversación o escrito en esos archivos con fecha igual o posterior a la entrega (si ya pidió subtítulos más grandes, esa no va). Si de una pregunta ya contestó una parte, preguntá solo la otra.
- Se puede correr de nuevo después de cualquier video: las preguntas son las mismas.

## Las preguntas, en un solo mensaje

> Abrí tu video (`videos/<carpeta>/video-final.mp4`) y miralo una vez, con sonido. Después contestame lo que quieras de esto; lo que te pareció bien, saltealo.
>
> 1. **Cortes.** ¿Alguna palabra sonó cortada, sobre todo al final de una frase? ¿O quedaron pausas que se sienten largas?
> 2. **Ritmo.** ¿Se siente lento, bien o apurado?
> 3. **El final.** ¿El video termina muy de golpe, justo, o se estira de más?
> 4. **Subtítulos.** ¿Se leen cómodos, o los querés más chicos o más grandes?
> 5. **Encuadre.** ¿Te ves bien ubicado? ¿Algo te corta la cabeza, o el texto te queda muy cerca de la cara?
> 6. **Música.** ¿Está fuerte, bien, o casi no se oye? ¿Te gusta el tipo?
> 7. **Efectos de sonido.** ¿Hay de más, están bien, o faltan?
> 8. **Portada.** ¿Te gusta cómo salís? ¿La preferís mirando a cámara? ¿Que cambie de diseño en cada video, o siempre igual?

Sacá las preguntas que no van y numerá corrido. Lo que no contesta, o dice que está bien, o contesta "lo que vos digas", no se toca.

## Qué se cambia con cada respuesta, y dónde se escribe

Cada ajuste queda escrito en **un** lugar (más la historia en `memory/decisiones.md`, cuando se dice). Las preferencias se escriben como dice el encabezado de `memory/preferencias.md` (solo la línea **Elegido** que corresponde, con sus palabras y la fecha); las reglas, con el formato de `memory/reglas.md`.

**1. Cortes**
- *Una palabra sonó cortada, o una "s" final mocha:* más aire después de cada frase: `cortar.mjs … --tras 0.18` y `apretar.mjs … --tras 0.16` (de fábrica, 0,14 y 0,12). → Regla en `memory/reglas.md`, fase 2. Si la cortada fue la última palabra del video, se arregla como en la 3, el final.
- *Pausas que se sienten largas:* mirar las `pausasInternas` que dejó `cortar.mjs` en su `tramos.json`. Si "Silencios" dice respiraciones naturales, pasar a todas las pausas (`memory/preferencias.md`). Si ya estaba en todas, subir `cortar.mjs --umbral` de a 2 dB (de −36 a −34; en un montaje de tomas, de −33 a −31) → `memory/decisiones.md`, "Umbrales de corte". Nunca bajar `--minimo` de 0,20 ni los umbrales de `apretar.mjs`: se comen los finales.
- *Muy cortado, sin respirar:* "Silencios" → respiraciones naturales (sin `apretar.mjs`), en `memory/preferencias.md`.

**2. Ritmo**
- *Lento:* si "Silencios" dice respiraciones naturales, primero pasar a todas las pausas. Si ya estaba, "Velocidad" → 1,1× (fase 2c, `acelerar.mjs … 1.1`). → `memory/preferencias.md`.
- *Apurado:* si se aceleró, "Velocidad" → 1×; si no, "Silencios" → respiraciones naturales. → `memory/preferencias.md`.

**3. El final**
- *Muy de golpe:* primero mirá por qué terminó ahí: el último 1,5 s del video con `cuadros.mjs … --tiempos`, cada 0,1 s.
  - Si terminó porque miró a otro lado, más cola no cambia nada. Preguntale en una línea si prefiere terminar igual un instante después (con el cierre en pantalla casi no se nota) o cerrar con una pantalla final con el texto del cierre → "Final" en `memory/preferencias.md`. Y pasale el consejo 4 de `/antes-de-grabar`: quedarse mirando al lente 1 o 2 segundos al terminar.
  - Si seguía mirando a cámara, faltó cola: el video tiene que terminar en el último cuadro bueno hasta 1,3 s después de la última palabra, **medido en el video final**. Si se acelera, la cola se achica en la misma proporción: `cortar.mjs … --cola` igual a 1,3 por la velocidad (1,43 con 1,1×) y, en una grabación con tomas, la última pieza de la EDL 1,4 s por la velocidad después de la última palabra. → Regla en `memory/reglas.md`, fase 2, "El final".
- *Se estira de más:* que termine entre 0,6 y 0,8 s después de la última palabra, medido en el video final: `cortar.mjs … --cola` igual a 0,8 por la velocidad, y `VIDEO_CUADROS` en `datos.ts` en ese cuadro. → Regla en `memory/reglas.md`, fase 2.
- *Terminó mirando a otro lado, o en un gesto raro:* preguntale en una línea si prefiere cortar antes o cerrar con una pantalla final con el texto del cierre → "Final" en `memory/preferencias.md`.

**4. Subtítulos**
- *Se leen chicos:* subir a 66 px. *Se leen grandes:* bajar a 52 px (de fábrica, 58). Va en `subtitulos.tamano` de `src/<slug>/marca.ts` en cada video. → "Subtítulos", línea del tamaño, en `memory/preferencias.md`.
- *Mucho texto de golpe:* modo "solo las palabras clave" → "Subtítulos", línea del modo, en `memory/preferencias.md`.
- *No se leen sobre la ropa:* `PILDORA.subtitulos: true` en `datos.ts`. Es de esa grabación: no se escribe nada, salvo que diga que se viste siempre así (entonces, regla en `memory/reglas.md`, fase 7).

**5. Encuadre**
- *La cabeza cortada, o el texto sobre la cara:* volver a medir con `cara.mjs public/<slug>/video.mp4 src/<slug>/encuadre.json --cuadros 16`, mirar `guia.png` y copiar `{cy, pelo, menton}` a `ENCUADRE`. → Regla en `memory/reglas.md`, fase 6: "medir siempre con `--cuadros 16`".
- *Muy lejos o muy cerca de la cámara:* es de la grabación, no del editor. Pasale el consejo de distancia de `/antes-de-grabar`; no se escribe nada.

**6. Música**
- *Está fuerte:* bajarla a −36. *No se oye:* subirla a −30. Va en `nivelar.mjs <tramo> public/<slug>/musica.m4a <nivel>` (de fábrica, −33). Después del render, `mezcla.mjs` tiene que seguir dando música y efectos entre 12 y 20 dB por debajo de la voz. → "Música", línea del volumen, en `memory/preferencias.md`.
- *El tipo no:* qué quiere, con sus palabras, para `musica.mjs … --pedido "<sus palabras>"`. → "Música", línea del tipo, en `memory/preferencias.md`, y la pista en "Música" de `memory/decisiones.md` como descartada.
- *Sin música:* "Música" → no, en `memory/preferencias.md`.

**7. Efectos de sonido**
- *De más:* "Efectos" → pocos (`CUES` vacío en `datos.ts`), en `memory/preferencias.md`. Si lo que molesta es el volumen y no la cantidad: `bus` de 0,5 a 0,4 en `.claude/skills/editar-video/referencias/efectos.json`, con una nota en el renglón "Bus de efectos" de `.claude/skills/editar-video/referencias/sonido.md`: `— calibración del <fecha>: "<sus palabras>". Reemplazó a: 0,5`.
- *Faltan:* "Efectos" → muchos (un efecto en cada gráfico que entra, en `CUES`), en `memory/preferencias.md`.

**8. Portada**
- *Mirando a cámara:* "Portada", línea de la mirada → siempre al lente. Si no hay un cuadro así en la grabación, pasale el consejo de mirar al lente 1 o 2 segundos al empezar y al terminar (`/antes-de-grabar`).
- *Que cambie en cada video, o siempre igual:* "Portada", línea de la composición.
- *No le gusta cómo sale:* "Portada", línea de quién elige → vos, entre 2 o 3, aunque antes hubiera dicho que eligiera Claude.
- Todo en "Portada" de `memory/preferencias.md` (fase 10).

Si una respuesta no entra en ninguna de estas, seguí "Cómo convertir una corrección en regla" de `/nuevo-video` (`.claude/commands/nuevo-video.md`, sección 6).

## Cerrar

1. Contale en tres o cuatro líneas qué ajustaste y dónde quedó: "Listo: subtítulos grandes y música más baja (en tus preferencias), y más aire al final de cada frase (regla nueva)."
2. Ofrecé rehacer el video con los ajustes: "¿Querés que lo rehaga con esto? Sale como una versión nueva y la anterior queda." Por defecto, sí. Se rehace desde la fase más temprana que cambió, como en la sección 6 de `/nuevo-video`. Si ningún ajuste cambia este video (solo cosas para los próximos, o un consejo de grabación), no lo ofrezcas.
3. Poné `calibrado: true` en `estado.json`.
4. Agregá una línea en "Calibración" de `memory/decisiones.md`: la fecha, el video y qué se ajustó en esta calibración (o "sin cambios", si todo estaba bien).
