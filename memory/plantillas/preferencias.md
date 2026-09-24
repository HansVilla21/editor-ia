# Preferencias — cómo querés tus videos

> **Para Claude.** Este archivo se lee entero antes de cada video. Cada sección tiene una o
> más líneas **Elegido** y un **Por defecto**:
>
> - `(sin preguntar)` quiere decir que todavía nadie preguntó: se usa el por defecto.
> - Cuando la persona contesta, se reemplaza **solo la línea Elegido que corresponde** (las
>   secciones con varias partes tienen una línea por parte, y la etiqueta se conserva:
>   `**Elegido (tamaño):** …`), siempre con esta forma:
>   `**Elegido:** <valor> · "<sus palabras>" · <fecha>, en <dónde>`
>   Por ejemplo: `**Elegido:** 1,1× · "me gusta más rápido" · 2026-09-24, en /arrancar`.
>   "Dónde" es `/arrancar`, `/calibrar` o el slug del video en el que lo pidió.
> - Si contesta "no sé", "lo que vos digas" o salta la pregunta, el valor es `por defecto`:
>   `**Elegido:** por defecto · "lo que vos digas" · 2026-09-24, en /arrancar`. Así se
>   distingue de lo que nunca se preguntó.
> - Un matiz que no es una de las opciones ("que el titular sea cortito") no va acá: es una
>   regla, en `reglas.md`.
> - Nunca se inventa un valor, y el Por defecto no se borra: es a lo que se vuelve.
> - **Dónde se aplica** dice en qué fase de la skill `editar-video`, y con qué herramienta o
>   archivo, se usa cada respuesta.
>
> **Para vos.** Lo podés cambiar cuando quieras: a mano, o diciéndole a Claude con tus
> palabras qué querés distinto. Todos los valores por defecto dan un video bueno.

---

## Tu nombre y el de tu marca

**Elegido:** (sin preguntar)
**Por defecto:** se toman de cómo los decís en la grabación. No aparecen escritos en pantalla
salvo que lo pidas.
**Dónde se aplica:** fase 3: van en `--nombres` de la segunda transcripción
(`transcribir.mjs … --motor gemini --nombres "<nombre>, <marca>"`), para que los subtítulos los
escriban bien. Si pediste que aparezcan, en `PORTADA.etiqueta` de `src/<slug>/datos.ts`.

## Plataforma

**Elegido:** (sin preguntar)
**Por defecto:** varias (Instagram, TikTok y YouTube Shorts).
**Opciones:** Instagram · TikTok · YouTube Shorts · varias
**Dónde se aplica:** fase 7, en la previa. La plantilla deja libre arriba de y = 240 y debajo
de y = 1680. Cada app tapa distinto según el largo de la descripción, y TikTok es la que más
tapa: abajo, más o menos los últimos 320 a 500 px (descripción, música, barra); a la derecha,
sus botones, los últimos ~160 px. Con TikTok o con "varias": que el cierre termine por encima
de y ≈ 1600 (si no, se acorta `CTA.palabra` o `CTA.recibe`: el bloque se achica) y que nada
importante quede pegado al borde derecho.

## Trato en los textos de pantalla

**Elegido:** (sin preguntar)
**Por defecto:** el mismo que usás al hablar en la grabación (se deduce de lo que decís; si
no se nota, tú).
**Opciones:** vos · tú · usted
**Dónde se aplica:** el cierre (`CTA.pide`: "Comentá", "Comenta" o "Comente"), el titular, la
portada y el panel. Lo que decís hablando no se toca.

## Silencios

**Elegido:** (sin preguntar)
**Por defecto:** todas las pausas muertas afuera, dejando el aire justo para que ninguna
palabra suene cortada: las dos pasadas, `cortar.mjs` y `apretar.mjs`.
**Opciones:** todas las pausas · respiraciones naturales (solo `cortar.mjs`, sin
`apretar.mjs`: queda más pausado)
**Dónde se aplica:** fase 2.

## Velocidad

**Elegido:** (sin preguntar)
**Por defecto:** normal (1×): no se acelera.
**Opciones:** 1× · 1,05× · 1,1× · otra, entre 0,5 y 2
**Dónde se aplica:** fase 2c: `acelerar.mjs public/<slug>/video.mp4 public/<slug>/video.mp4 <velocidad>`,
después de apretar y antes de transcribir.

## Subtítulos

**Elegido (modo):** (sin preguntar)
**Elegido (tamaño):** (sin preguntar)
**Por defecto:** de a 2 o 3 palabras, sincronizados con la voz, tamaño mediano (58 px).
**Opciones:** modo: de a 2 o 3 palabras · solo las palabras clave · sin subtítulos. Tamaño:
chico (52 px) · mediano (58 px) · grande (66 px) · muy grande (76 px) · o un número exacto en px
(si pide "más grande todavía", se sube un escalón y se anota el número acá, no en `reglas.md`)
**Dónde se aplica:**
- El modo, en `PALABRAS` de `src/<slug>/datos.ts`: sin subtítulos, `[]`; solo palabras clave,
  las entradas de `palabras.json` filtradas a esas palabras. Palabras clave son las que se leen
  solas y dicen algo: nombres (de herramientas, marcas, personas), números y el sustantivo o
  verbo central de la frase; una o dos por frase, y nunca dos que juntas no signifiquen nada
  ("sistema diseño"): si quedan así, se deja solo la más fuerte.
- El tamaño, en `subtitulos.tamano` de `src/<slug>/marca.ts`, en cada video, apenas se crea
  con `npm run nuevo`. Es la única línea de la copia fuera de `datos.ts` que se toca por una
  preferencia.

## Titular del gancho

**Elegido:** (sin preguntar)
**Por defecto:** sí: un titular fijo de 3 a 7 palabras arriba, visible desde el primer
cuadro, para que quien pasa rápido sepa de qué trata. Se te muestra antes de terminar el video.
**Opciones:** sí · no
**Dónde se aplica:** `TITULAR` en `src/<slug>/datos.ts`. Sin titular: `[]` (el render avisa
"tiene 0 palabras", y en ese caso está bien).

## Música

**Elegido (sí o no, y el tipo):** (sin preguntar)
**Elegido (volumen):** (sin preguntar)
**Elegido (bajar pistas de Mixkit):** (sin preguntar)
**Por defecto:** sí, con el criterio neutro de
`.claude/skills/editar-video/referencias/sonido.md`: instrumental, con energía, entre 110 y 125 BPM, sin cambios bruscos, a −33 LUFS debajo de la voz. Antes de bajar
pistas se pide el OK; si dice que sí "siempre", se anota acá y no se vuelve a pedir.
**Opciones:** sí · no. El tipo, con tus palabras ("tranqui", "acústica", "lo-fi"…). El
volumen: más baja (−36) · normal (−33) · más presente (−30). Bajar pistas: preguntar · sí,
sin preguntar.
**Dónde se aplica:** fase 8. El tipo va en `musica.mjs <carpeta> --pedido "<tus palabras>"`;
si es algo más lento que 110–125 BPM (tranqui, acústica), con un `--bpm` que le corresponda,
por ejemplo `--bpm 70-100`, y buscando en el género de Mixkit que más se acerque (los que no
figuran en `sonido.md` están en `https://mixkit.co/free-stock-music/`). El volumen
va en `nivelar.mjs <tramo> public/<slug>/musica.m4a <nivel>`. Sin música, no se crea
`musica.m4a` y la plantilla la omite. Al entregar se te ofrecen dos opciones.

## Efectos de sonido

**Elegido:** (sin preguntar)
**Por defecto:** normales: los que pone la plantilla (cambios de plano, filas, contador,
tecleo, cierre) y de 2 a 4 más en los momentos clave.
**Opciones:** ninguno · pocos (solo un whoosh en los cambios de plano) · normales · muchos (uno
en cada gráfico que entra)
**Dónde se aplica:** `EFECTOS` en `src/<slug>/datos.ts` ("ninguno", "pocos", "normales" o
"muchos") y los extra en `CUES` (con "ninguno" y "pocos", `CUES` queda vacío). El volumen de todos juntos es `bus` en
`.claude/skills/editar-video/referencias/efectos.json` (0,5).

## Portada

**Elegido (mirada):** (sin preguntar)
**Elegido (composición):** (sin preguntar)
**Elegido (quién elige):** (sin preguntar)
**Por defecto:** la mejor expresión con los ojos abiertos (boca cerrada o sonrisa real),
mirando al lente si hay un cuadro bueno; la composición de la plantilla en todos los videos,
para que el perfil se vea ordenado; y 2 o 3 opciones para que elijas vos.
**Opciones:** mirada: siempre al lente · me da igual. Composición: siempre la misma · variar
en cada video (otro cuadro, otra pose, otros textos; una composición nueva es trabajo aparte
y se avisa). Quién elige: vos, entre 2 o 3 · Claude.
**Dónde se aplica:** fase 10: la búsqueda del cuadro (`cuadros.mjs <grabación> … --cada 32`) y
`PORTADA` en `src/<slug>/datos.ts`. Para variar, mirar en `decisiones.md` cómo fue la última.

## Final

**Elegido:** (sin preguntar)
**Por defecto:** sobre vos: el cierre entra sobre la toma real y el video termina en el
último cuadro en que seguís mirando a cámara, entre 0,4 y 1,3 s después de la última palabra.
Si mirás a otro lado antes de los 0,4 s, se te pregunta en ese video; sin respuesta, termina a
los 0,4 s igual, que con el cierre en pantalla el gesto casi no se nota y un corte pegado a la
última sílaba sí.
**Opciones:** sobre vos · cortar justo cuando mirás a otro lado (queda abrupto) · tarjeta de
cierre: una pantalla final con el texto del cierre (una escena nueva en `src/<slug>/escenas/`,
que se avisa al entregar)
**Dónde se aplica:** fase 2, "El final": `cortar.mjs --cola` y `VIDEO_CUADROS` en `datos.ts`.

## Logos de otras marcas

**Elegido:** (sin preguntar)
**Por defecto:** preguntar cada vez.
**Opciones:** permiso permanente · preguntar cada vez · nunca
**Dónde se aplica:** fases 4 y 5, cada vez que el video nombra una app, una herramienta o una
marca. Solo desde fuentes con licencia clara (`.claude/skills/editar-video/referencias/estilo-visual.md`, "Logos de
marcas"). Tu propio logo no va acá: va en `mi-marca`.
