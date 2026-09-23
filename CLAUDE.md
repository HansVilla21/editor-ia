# editor-ia

## Qué es

Un editor de videos verticales cortos que vive adentro de Claude Code. Recibe una
grabación y devuelve el video terminado: cortado, con subtítulos, con gráficos, con
efectos de sonido y con música.

Y aprende: a partir de videos que el usuario admira, mide cómo están hechos y escribe su
estilo, que después usa en cada edición.

## La regla que gobierna todo

**Gemini propone, los cuadros deciden.**

Ninguna afirmación sobre un video se da por buena sin verificarla contra los cuadros. El
modelo hace el borrador —qué transición parece, qué tipografía parece, a cuántos cuadros
por segundo parece ir— y la medición manda. Los modelos se equivocan seguido en esto:
dicen 30 fps cuando son 24, o inventan el nombre de una tipografía.

Esa disciplina es lo que hace que los videos salgan bien a la primera, y no el motor de
render.

## Formato

Vertical, 1080×1920, a 30 fps. Es lo que piden Instagram, TikTok y YouTube Shorts.

## Cómo está armado

| Carpeta | Qué hay |
|---|---|
| `.claude/skills/editar-video/` | La skill principal, con sus fases y sus scripts |
| `.claude/skills/editar-video/referencias/` | **El estilo.** Arranca con el neutro y se reemplaza al entrenar |
| `.claude/skills/estudiar-referentes/` | El ciclo que aprende un estilo nuevo |
| `.claude/skills/mi-marca/` | Los colores y tipografías del usuario. Arranca en blanco |
| `.claude/agents/` | El analista que mide cada referencia |
| `src/plantilla/` | La composición de Remotion que se copia por video |
| `referencias/` | Los videos de referencia del usuario y sus informes |
| `videos/` | Las entregas |
| `memory/` | Decisiones tomadas y por qué |
| `.whisper/` | Whisper y su modelo. Se baja con `npm run whisper` y no viaja en el repo |

## Qué correr sin preguntar

`npm run doctor`, `npm test`, `npm run render`, `npm run studio`, `npx tsc --noEmit`, y
lecturas de git.

ffmpeg y ffprobe vienen en `node_modules` y **no están en el PATH**: nunca escribas un
comando `ffmpeg …` suelto. Las herramientas de `.claude/skills/editar-video/scripts/`
reciben los videos tal cual y usan el ffmpeg del proyecto.

## Qué requiere confirmación

Instalar dependencias nuevas · bajar Whisper la primera vez (`npm run whisper`, unos
490 MB) · borrar o sobrescribir videos del usuario · publicar cualquier cosa · usar
servicios pagos.

## Reglas que no se negocian

**La clave de Gemini solo vive en `.env`.** Nunca se imprime en pantalla, nunca se copia
a otro archivo, nunca se pega en un commit.

**Los videos del usuario no se borran.** Cada versión queda en `versiones/`. Si hay que
sacar algo del medio, se mueve, no se elimina.

**No se inventan datos.** Si hay que mostrar una cifra en pantalla —estrellas de un
repositorio, una fecha, un precio— se verifica contra la fuente antes de escribirla.

**Archivos de más de 300 líneas se parten.**

## Convenciones

- **Español** para código, comentarios, commits y documentación.
- Commits con formato `tipo: descripción breve`.
- Nada de emojis en el código ni en los archivos.
