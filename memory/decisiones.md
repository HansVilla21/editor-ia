# Decisiones — la historia de tus videos

> **Para Claude.** Acá va lo que pasó, no lo que hay que hacer (eso va en `reglas.md` y en
> `preferencias.md`). Sirve para no repetir: la misma música en videos seguidos, una pista
> que no gustó, un candidato de estilo que ya se descartó, umbrales que ya se probaron.
>
> - Una línea por cosa, en su sección, la más nueva abajo. Con fecha y con el slug del video.
> - Se agrega; lo de videos anteriores no se reescribe. La línea del video en curso sí se
>   completa, en el mismo renglón, si después de entregarlo hay versiones nuevas.
> - Las líneas entre `<!-- -->` son ejemplos de la forma, no datos: se dejan como están.
> - En la fase 1 de cada video se leen **Música** y **Umbrales de corte**. **Estilo** se lee
>   antes de proponer candidatos en `/estudiar`.

## Videos

Uno por video: duración, música, portada y lo que la persona pidió cambiar.

<!-- - 2026-09-24 · `mi-video` · 42 s · música Mixkit 123 · portada: cuadro 14,2 s, mirando al lente, composición de la plantilla · cambios: subtítulos más grandes (v2) -->

## Música

Cada pista usada o descartada, para no repetirla ni volver a proponer la que no gustó.

<!-- - Mixkit 123 "Título de la pista" · arranque 12,4 s · usada en `mi-video` (2026-09-24) · aprobada -->
<!-- - Mixkit 456 "Otra pista" · ofrecida como opción B en `mi-video` (2026-09-24) -->
<!-- - Mixkit 789 "Otra más" · descartada en `mi-video`: "muy electrónica" -->

## Umbrales de corte

Los que funcionaron con tu sala y tu micrófono. El próximo video arranca con estos en lugar
de los de fábrica.

<!-- - 2026-09-24 · `mi-video` · crudo con repeticiones · `tramos.mjs --umbral -42` · `cortar.mjs --umbral -33 --minimo 0.24` · quedaron 2 pausas internas -->

## Estilo

Lo que escribe `/estudiar`: qué referencias, qué se aprobó, qué quedó en prueba y qué se
descartó, con su motivo.

<!-- - 2026-09-24 · referencias: «Referencia A», «Referencia B» · aprobado: 1, 3 · en prueba: 2 · descartado: 4 ("no me gusta el zoom") -->

## Calibración

Lo que se ajustó en cada `/calibrar`.

<!-- - 2026-09-25 · después de `mi-video` · subtítulos a 66 px, música a −36, más aire al final -->
