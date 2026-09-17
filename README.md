# editor-ia

Un editor de videos verticales que vive adentro de Claude Code, y que **aprende tu
estilo** a partir de los videos que te gustan.

Le pasás una grabación y te devuelve el reel terminado: cortado, con subtítulos, con
gráficos, con efectos de sonido y con música.

## Cómo se instala

Abrí un proyecto nuevo en Claude Code y pegá esto:

```
Cloná https://github.com/HansVilla21/editor-ia en esta carpeta,
abrilo como proyecto y corré /arrancar
```

El proyecto se encarga del resto: instala lo que falta, te dice cómo conseguir lo único
que no puede conseguir solo, y hace un video de prueba para confirmar que todo funciona.

## Qué necesitás

- **Claude Code.** Es la plataforma donde corre. Sin eso no hay editor.
- **Una clave de Gemini**, que es gratis y se saca en
  [Google AI Studio](https://aistudio.google.com/apikey).

Nada más. Remotion, ffmpeg, Chrome y Whisper los baja la instalación.

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
