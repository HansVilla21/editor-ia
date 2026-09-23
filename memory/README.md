# memory/ — lo que el editor aprendió de vos

Esta carpeta es la memoria del editor. Viene con plantillas vacías: lo que se escribe acá
sale de tus respuestas y de tus correcciones, y es tuyo.

Con esto el editor mejora video a video: lo que le dijiste una vez no te lo vuelve a
preguntar, y lo que corregiste una vez no lo vuelve a hacer mal.

Las plantillas están en `plantillas/` y se copian solas acá la primera vez que abrís el
proyecto (o a mano, con `node scripts/memoria.mjs`). Tus archivos no viajan en git: una
actualización del proyecto nunca pisa tus respuestas.

## Qué hay en cada archivo

| Archivo | Qué guarda | Quién lo escribe y cuándo |
|---|---|---|
| `preferencias.md` | Cómo querés tus videos: plataforma, ritmo, subtítulos, música, portada, cómo termina, logos | Claude, con tus respuestas: en `/arrancar`, en `/calibrar` y cuando cambiás de idea |
| `reglas.md` | Cada corrección que pediste "para siempre", convertida en una regla | Claude, cuando corregís algo de un video y decís que va para todos |
| `decisiones.md` | La historia: qué música se usó en cada video, qué umbrales de corte funcionaron, qué estilo se estudió y qué se descartó | Claude, al entregar cada video, al terminar `/estudiar` y al terminar `/calibrar` |

Tus colores, tipografías y logo no van acá: van en `.claude/skills/mi-marca/SKILL.md`.

## Cómo lo usa el editor

- **Antes de cada video** lee `preferencias.md` y `reglas.md`, enteros. Una regla escrita
  gana sobre el estilo neutro; lo que pidas en el momento gana sobre una regla vieja (y
  entonces la regla se actualiza).
- **Al elegir música** mira `decisiones.md` para no repetir la misma pista en videos
  seguidos ni volver a proponer una que no te gustó.
- **Nunca inventa una preferencia.** Un campo que dice `(sin preguntar)` usa el valor por
  defecto, y eso está bien: todos los valores por defecto dan un video bueno.

## Podés editarlo a mano

Son archivos de texto. Si algo quedó mal anotado, cambialo o borralo; o decíselo a Claude
con tus palabras ("ya no quiero la música tan baja") y lo actualiza él.

## Qué no va acá

- Claves, contraseñas, correos o datos de clientes: nunca.
- Los videos y las grabaciones: van en `videos/` y en `referencias/`.
