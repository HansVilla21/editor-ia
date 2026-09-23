# Preferencias — cómo querés tus videos

> **Para Claude.** Este archivo se lee entero antes de cada video. Cada sección tiene un
> **Elegido** y un **Por defecto**:
>
> - `(sin preguntar)` quiere decir que todavía nadie preguntó: se usa el por defecto.
> - Cuando la persona contesta, se reemplaza **solo** la línea de Elegido, con su respuesta,
>   sus palabras entre comillas y la fecha:
>   `**Elegido:** 1,1× · "me gusta más rápido" · 2026-09-24, en /arrancar`
> - Si contesta "no sé" o "lo que vos digas": `**Elegido:** por defecto · "lo que vos digas" · 2026-09-24`.
>   Así se distingue de lo que nunca se preguntó, y `/calibrar` sabe qué revisar.
> - Nunca se inventa un valor, y el Por defecto no se borra: es a lo que se vuelve.
> - **Dónde se aplica** dice en qué fase de la skill `editar-video`, y con qué herramienta o
>   archivo, se usa cada respuesta.
>
> **Para vos.** Lo podés cambiar cuando quieras: a mano, o diciéndole a Claude con tus
> palabras qué querés distinto. Todos los valores por defecto dan un video bueno.

---

## Tu nombre y el de tu marca

**Elegido:** (sin preguntar)
**Por defecto:** ningún nombre en pantalla.
**Dónde se aplica:** fase 3: va en `--nombres` de la segunda transcripción
(`transcribir.mjs … --motor gemini --nombres "<nombre>, <marca>"`), para que los subtítulos lo
escriban bien. También en la portada o el cierre, si se usa.

## Plataforma

**Elegido:** (sin preguntar)
**Por defecto:** varias (Instagram, TikTok y YouTube Shorts): nada importante arriba de
y = 240 ni debajo de y = 1680, que es lo que ya respeta la plantilla.
**Opciones:** Instagram · TikTok · YouTube Shorts · varias
**Dónde se aplica:** fases 7 y 10: los cuadros del cierre, de los subtítulos y de la portada
se revisan pensando en lo que tapa esa app. Con TikTok, además, que el cierre y los
subtítulos no caigan en la franja de abajo, donde va la descripción.

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

**Elegido:** (sin preguntar)
**Por defecto:** palabra por palabra, en bloques de 2 o 3 palabras, tamaño mediano (58 px).
**Opciones:** bloques de 2 o 3 · solo palabras clave · sin subtítulos. Tamaño: chico (52 px) ·
mediano (58 px) · grande (66 px)
**Dónde se aplica:**
- El modo, en `PALABRAS` de `src/<slug>/datos.ts`: sin subtítulos, `[]`; solo palabras clave,
  las entradas de `palabras.json` filtradas a esas palabras.
- El tamaño, en `subtitulos.tamano` de `src/<slug>/marca.ts`, en cada video, apenas se crea
  con `npm run nuevo`. Es la única línea de la copia fuera de `datos.ts` que se toca.

## Titular del gancho

**Elegido:** (sin preguntar)
**Por defecto:** sí: un titular fijo de 3 a 7 palabras arriba, visible desde el primer
cuadro, para que quien pasa rápido sepa de qué trata. Antes del render final se te muestra.
**Opciones:** sí · no
**Dónde se aplica:** `TITULAR` en `src/<slug>/datos.ts`. Sin titular: `[]` (el render avisa
"tiene 0 palabras", y en ese caso está bien).

## Música

**Elegido:** (sin preguntar)
**Por defecto:** sí, instrumental, de energía media, que no compita con tu voz (el criterio
neutro de `referencias/sonido.md`), a −33 LUFS.
**Opciones:** sí · no. El tipo, con tus palabras ("tranqui", "electrónica", "lo-fi"…). El
volumen: más baja (−36) · normal (−33) · más presente (−30)
**Dónde se aplica:** fase 8: el tipo va en `musica.mjs <carpeta> --pedido "<tus palabras>"`; el
volumen en `nivelar.mjs <tramo> public/<slug>/musica.m4a <nivel>`. Sin música, no se crea
`musica.m4a` y la plantilla la omite. Al entregar se te ofrecen dos opciones.

## Efectos de sonido

**Elegido:** (sin preguntar)
**Por defecto:** normales: los que pone la plantilla (cambios de plano, filas, contador,
tecleo, cierre) y de 2 a 4 más en los momentos clave.
**Opciones:** pocos (solo los de la plantilla) · normales · muchos (uno en cada gráfico que
entra)
**Dónde se aplica:** `CUES` en `src/<slug>/datos.ts`. El volumen de todos juntos es `bus` en
`.claude/skills/editar-video/referencias/efectos.json` (0,5).

## Portada

**Elegido:** (sin preguntar)
**Por defecto:**
- Mirada: la mejor expresión con los ojos abiertos (boca cerrada o sonrisa real); mirando al
  lente si hay un cuadro bueno.
- Composición: la de la plantilla en todos los videos: el perfil se ve ordenado.
- Opciones: se te muestran 2 o 3 para elegir.
**Opciones:** mirada: siempre al lente · me da igual. Composición: siempre la misma · variar
en cada video (otro cuadro, otra pose, otros textos; una composición nueva es trabajo aparte
y se avisa). Elegir: 2 o 3 opciones · elegí vos.
**Dónde se aplica:** fase 10: la búsqueda del cuadro (`cuadros.mjs <grabación> … --cada 32`) y
`PORTADA` en `src/<slug>/datos.ts`. Para variar, mirar en `decisiones.md` cómo fue la última.

## Final

**Elegido:** (sin preguntar)
**Por defecto:** sobre vos: el cierre entra sobre la toma real y el video termina en el
último cuadro en que seguís mirando a cámara, entre 0,4 y 1,3 s después de la última palabra.
**Si mirás a otro lado enseguida** (antes de 0,4 s): se te pregunta en ese video.
**Opciones:** cortar justo ahí (se siente un poco abrupto) · tarjeta de cierre (una escena
nueva en `src/<slug>/escenas/`, que se avisa al entregar)
**Dónde se aplica:** fase 2, "El final": `cortar.mjs --cola` y `VIDEO_CUADROS` en `datos.ts`.

## Logos de otras marcas

**Elegido:** (sin preguntar)
**Por defecto:** preguntar cada vez.
**Opciones:** permiso permanente · preguntar cada vez · nunca
**Dónde se aplica:** fases 4 y 5, cada vez que el video nombra una app, una herramienta o una
marca. Solo desde fuentes con licencia clara (`referencias/estilo-visual.md`, "Logos de
marcas"). Tu propio logo no va acá: va en `mi-marca`.
