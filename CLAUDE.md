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
| `memory/` | Las preferencias de la persona, las reglas que salieron de sus correcciones y la historia de cada video. Viajan solo las plantillas (`memory/plantillas/`) |
| `.whisper/` | Whisper y su modelo. Se baja con `npm run whisper` y no viaja en el repo |

## Al empezar

Si el aviso de inicio dice algo, decíselo a la persona en una línea y seguí con lo que pidió:
no insistas. Antes de editar cualquier video, leé `memory/preferencias.md` y
`memory/reglas.md` (si faltan, `node scripts/memoria.mjs` los arma desde las plantillas).

## Cuando la persona corrige algo

1. Se arregla el video, en una versión nueva.
2. Se decide si es de una vez o para siempre; si no está claro, se pregunta en una línea.
3. Si es para siempre, se escribe en un solo lugar: una preferencia en
   `memory/preferencias.md`; algo de marca en `mi-marca`; un valor de estilo medido en
   `referencias/`, con su procedencia; todo lo demás en `memory/reglas.md`, con su formato.
4. Se le dice en una línea qué quedó escrito y dónde.

El procedimiento completo, con ejemplos, está en `/nuevo-video`, sección 6. Una corrección
que no queda escrita se repite en el video siguiente.

## Cómo se habla

Español, sin jerga. Los textos del proyecto están de vos; si la persona escribe de tú o de
usted, se le habla como ella.

## Qué correr sin preguntar

`npm run doctor`, `npm test`, `npm run render`, `npm run studio`, `npx tsc --noEmit`, y
lecturas de git.

ffmpeg y ffprobe vienen en `node_modules` y **no están en el PATH**: nunca escribas un
comando `ffmpeg …` suelto. Las herramientas de `.claude/skills/editar-video/scripts/`
reciben los videos tal cual y usan el ffmpeg del proyecto. Si alguna vez hace falta ffmpeg
directo (el análisis de referencias lo usa), se toma de ahí:
`FF=$(node -e "console.log(require('ffmpeg-static'))")`.

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
