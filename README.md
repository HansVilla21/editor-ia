# editor-ia

Un editor de videos verticales que vive adentro de Claude Code, y que **aprende tu
estilo** a partir de los videos que te gustan.

Le pasás una grabación y te devuelve el reel terminado: cortado, con subtítulos, con
gráficos, con efectos de sonido y con música.

## Qué necesitás

- **Claude Code.** Es la plataforma donde corre. Sin eso no hay editor.
- **Node 20.12 o más nuevo** (la versión LTS de [nodejs.org](https://nodejs.org)). Claude
  Code no lo trae incluido. Si no lo tenés, el arranque te avisa y te dice cómo.
- **Una clave de Gemini**, que es gratis y se saca en
  [Google AI Studio](https://aistudio.google.com/apikey).
- **Unos 1,5 GB libres.** Todo queda dentro de la carpeta del proyecto.
- **En Mac o Linux**, además: `git` y las herramientas para compilar (en Mac,
  `xcode-select --install`). Whisper se compila en tu máquina.

Lo demás lo baja el arranque: Remotion, ffmpeg, el Chrome con el que renderiza y Whisper.
No hace falta instalar ffmpeg ni Python a mano.

## Cómo se instala

1. Creá una carpeta vacía con una ruta corta (en Windows, por ejemplo `C:\editor-ia`), abrí
   Claude Code en ella y pegá esto:

   ```
   Cloná https://github.com/HansVilla21/editor-ia en esta carpeta
   ```

2. **Cerrá Claude Code y volvé a abrirlo en esa misma carpeta.** Las reglas y los comandos
   del proyecto recién se activan cuando Claude Code arranca adentro de él.
3. Escribí `/arrancar`.

El arranque se encarga del resto: revisa qué falta, lo instala pidiéndote el OK para lo
pesado, te dice cómo conseguir la clave de Gemini, y hace un video de prueba de 3 segundos
para confirmar que todo funciona.

## Cómo se usa

- **Tus preferencias:** en `/arrancar` te hace unas preguntas cortas (dónde publicás, ritmo,
  subtítulos, música, logos). Todo tiene un valor por defecto: si no sabés, decí "lo que vos
  digas". Quedan en `memory/preferencias.md` y las podés cambiar cuando quieras.
- **Escribir el guion:** `/guion` con de qué va el video y, si tenés, uno a tres videos cuyo
  gancho te guste. Te devuelve el guion listo para grabar, una frase por línea, con qué se ve
  en cada momento y qué datos hay que confirmar. Lo único que te pregunta es qué recibe quien
  comenta la palabra del cierre.
- **Antes de grabar:** `/antes-de-grabar` te da consejos cortos para grabar de forma que el
  editor saque lo mejor.
- **Editar un video:** pasale la grabación y contale de qué trata ("editá este video,
  es sobre…"), o escribí `/nuevo-video`. Si la grabación tiene repeticiones, pasale también
  el guion: con eso elige la última toma buena de cada frase.
- **Después del primer video:** `/calibrar` son ocho preguntas sobre cómo quedó; cada
  respuesta ajusta algo concreto para el próximo.
- **Enseñarle tu estilo:** `/estudiar` con 2 o 3 enlaces y qué te gusta de cada uno.
- **Tu marca:** tus colores, tipografías y lo que nunca querés ver en un video van en
  `.claude/skills/mi-marca/SKILL.md`. Claude te ayuda a llenarlo.
- **Corregir:** decile qué no te gustó con tus palabras. Cada video sale en una versión
  nueva y las anteriores quedan guardadas. Si la corrección es para siempre, queda escrita en
  `memory/` y el próximo video ya sale bien.

## Cómo le enseñás tu estilo

Esta es la parte que lo hace tuyo.

Le pasás 2 o 3 videos que te gusten —el enlace alcanza— y le contás **qué te gusta de
cada uno**. Esa frase importa: sin ella el análisis no tiene norte.

Entonces:

1. Un agente mide cada video cuadro a cuadro: transiciones, tipografía, ritmo, sonido.
2. Te resume lo que encontró y lo que esos videos tienen en común.
3. Vos aprobás.
4. Lo aprobado se escribe en tu estilo, con la anotación de dónde salió cada valor.

A partir de ahí, cada video que edites sale con ese estilo. Y podés seguir agregando
referencias cuando quieras.

Mientras tanto edita con un estilo neutro, que funciona bien pero no se parece a vos.

## Qué hace, en concreto

- Corta los silencios y ensambla las mejores tomas cuando la grabación tiene
  repeticiones.
- Transcribe lo que decís y arma los subtítulos sincronizados palabra por palabra.
- Te encuadra sin taparte la cara.
- Busca las capturas y los datos que haya que mostrar, y los verifica.
- Sincroniza cada efecto de sonido con el cuadro de su animación.
- Mezcla la música debajo de tu voz y deja el volumen final donde lo piden las redes.
- Arma la portada.

## Licencia

MIT. Usalo, cambialo y compartilo.
