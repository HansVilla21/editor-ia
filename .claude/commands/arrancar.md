---
description: Deja el proyecto listo para editar y pregunta cómo querés tus videos. Se corre la primera vez; si se vuelve a correr, salta lo que ya está hecho.
---

Dejá el proyecto funcionando de punta a punta.

Hablá en español, de vos, y no des nada por sabido: quien corre esto puede no haber usado nunca una terminal. Nada de jerga sin explicar. Los textos de acá están escritos de vos; si la persona te escribe de tú o de usted, hablale como ella.

**Si ya se corrió antes** (existe `estado.json`, `npm run doctor` da todo OK y existe `out/prueba.mp4`), no repitas la instalación: decí en una línea que el editor ya funciona y andá directo al primer paso que falte. Casi siempre es el 7, las preferencias.

## 0. Antes de nada: Node y la carpeta

Corré `node -v`.

- Si no existe, o es anterior a la 20.12: explicale que Node es el programa que corre las herramientas del editor, que es gratis, y que tiene que instalar la versión **LTS** desde https://nodejs.org. Después de instalarlo, que cierre y vuelva a abrir Claude Code en esta carpeta, y seguís desde acá. Claude Code no lo trae incluido.
- Mirá la ruta de la carpeta del proyecto. Si estás en Windows y tiene más de 150 caracteres (pasa mucho adentro de OneDrive o de carpetas muy anidadas), pedile que mueva el proyecto a una ruta corta, por ejemplo `C:\editor-ia`: con rutas largas Windows no encuentra el Chrome que usa el render, y el error no explica por qué.

## 1. Instalar

Corré `npm install`.

Avisale que baja las herramientas del editor —Remotion y ffmpeg, unos 450 MB— y que puede tardar unos minutos. Que no cierre nada. El Chrome que usa Remotion para renderizar (unos 110 MB) se baja solo más adelante, en el primer render.

## 2. Revisar qué falta

Corré `npm run doctor`.

Por cada cosa que falte, contale con tus palabras lo que dice el campo "cómo resolver". No le pegues la salida cruda del comando. La clave de Gemini y Whisper se resuelven en los dos pasos que siguen.

## 3. La clave de Gemini

Si falta la clave:

- Explicale que es gratis y que es lo único que tiene que conseguir por su cuenta.
- Pasale el enlace: https://aistudio.google.com/apikey
- Copiá `.env.example` a `.env` y pedile que pegue la clave ahí, después de `GEMINI_API_KEY=`.
- **Nunca** imprimas la clave en pantalla ni la escribas en ningún archivo que no sea `.env`.
- Cuando diga que la pegó, corré `npm run doctor` de nuevo: la clave tiene que aparecer como OK.

Contale para qué se usa: transcribir lo que dice, elegir las mejores tomas, escuchar la música candidata y ubicar la cara para encuadrar.

## 4. Whisper

Whisper es el programa que saca cada palabra con su tiempo exacto, para los subtítulos. Se baja una sola vez y queda **dentro del proyecto**, en la carpeta `.whisper/`: no instala nada en el resto de la máquina.

Antes de bajarlo, pedile el OK con estos datos: son unos 490 MB y tarda unos minutos. Con el OK, corré `npm run whisper`.

- En Mac o Linux, Whisper se compila en la máquina: hacen falta `git` y un compilador. Si falla por eso, el mensaje del comando dice qué instalar (en Mac: `xcode-select --install`). Explicáselo en simple y volvé a correrlo.
- Si prefiere no bajarlo todavía, seguí con el arranque, pero avisale que hace falta antes del primer video: Gemini da el texto por frase, no el tiempo de cada palabra, y sin eso no hay subtítulos sincronizados palabra por palabra. Al abrir el proyecto se lo va a recordar.

## 4b. Efectos de sonido (opcional)

Los videos llevan sonidos cortos: un whoosh en los cambios de plano, clics, un impacto al cierre. Vienen de Mixkit, gratis y sin atribución, pero su licencia no deja redistribuirlos, y por eso no vienen en el proyecto. Pedile el OK con estos datos: son 15 archivos, unos 7 MB, y quedan en `public/sfx/`. Con el OK, corré `npm run efectos`. Si alguno falla, el comando dice cuál y cómo bajarlo a mano: contáselo simple. Si prefiere esperar, seguí; se bajan antes del primer video con el mismo comando.

## 5. La prueba de fuego

Corré `npm run render`.

Si sale `out/prueba.mp4`, la cadena completa funciona: Remotion, ffmpeg y Chrome. Decíselo simple, porque es la señal de que ya puede trabajar: "Funciona: el editor ya puede armar un video de punta a punta." Invitalo a abrir el archivo.

Si falla, leé el error y resolvelo antes de seguir. No sigas con un render roto. Un error `spawn … chrome-headless-shell.exe ENOENT` en Windows casi siempre es la ruta demasiado larga del paso 0.

## 6. Dejar anotado el estado

Si no existe, escribí `estado.json` en la raíz:

```json
{ "preferencias": false, "estiloEntrenado": false, "videosHechos": 0, "calibrado": false }
```

Si ya existe, no lo pises: sumale solo las claves que le falten, con esos valores.

## 7. Tus preferencias

Una sola ronda de preguntas, todas juntas en un mensaje. Cada una trae entre paréntesis el valor por defecto, que funciona bien: quien no sabe qué contestar no tiene que pensar nada. Mandá esto tal cual:

> Antes de seguir, unas preguntas rápidas sobre cómo querés tus videos. Contestá con el número y tus palabras. Lo que no sepas, saltealo o decime "lo que vos digas": uso lo que va entre paréntesis. Todo se puede cambiar después.
>
> 1. **Tu nombre**, y el de tu marca o negocio si tenés, escritos como corresponde: así los subtítulos no los escriben mal. *(Los saco de cómo los decís.)*
> 2. **¿Dónde vas a publicar?** Instagram, TikTok, YouTube Shorts o varias. *(Varias.)*
> 3. **En los textos de la pantalla, ¿de vos, de tú o de usted?** *(Como hables en el video.)*
> 4. **Ritmo.** ¿Corto todas las pausas o dejo las respiraciones naturales? ¿Velocidad normal o un poco más rápido (1,1×)? *(Todas las pausas, velocidad normal.)*
> 5. **Subtítulos.** ¿De a 2 o 3 palabras, siguiendo tu voz; solo las palabras clave; o sin subtítulos? *(De a 2 o 3 palabras.)*
> 6. **Música de fondo.** ¿Sí o no? Si sí, ¿de qué tipo, con tus palabras? *(Sí: instrumental, con ritmo, bajita debajo de tu voz.)*
> 7. **Logos.** Cuando nombres una app o una marca, puedo poner su logo oficial. ¿Lo bajo sin preguntarte, te pregunto cada vez, o nunca? *(Te pregunto cada vez.)*
>
> Lo demás —la portada, los efectos, cómo termina el video— lo ves en tu primer video y lo ajustamos después. Y si tenés colores o logo propios, pasame cuando quieras una captura de tu perfil o de tu logo y los cargo.

Con la respuesta:

- **Escribí `memory/preferencias.md`**, siguiendo las instrucciones de arriba de ese archivo: en cada sección que tocó una pregunta, reemplazá solo la línea **Elegido**, con la fecha. La pregunta 1 va en "Tu nombre y el de tu marca", la 2 en "Plataforma", la 3 en "Trato en los textos de pantalla", la 4 en "Silencios" y en "Velocidad", la 5 en "Subtítulos" (la línea del modo), la 6 en "Música" (la línea de sí o no, y el tipo) y la 7 en "Logos de otras marcas" (solo logos: no cuenta como permiso para bajar música). Lo que saltó o contestó con "no sé": `por defecto` y lo que dijo. Titular, efectos, portada y final quedan `(sin preguntar)`.
- Si contestó con algo que no está entre las opciones, anotalo con sus palabras y, si no se puede hacer con el editor, decíselo en una línea y proponé lo más parecido.
- Si pasó una captura de su marca, seguí `.claude/skills/mi-marca/SKILL.md` para llenarla. Si no, no insistas.
- Contale en dos o tres líneas qué quedó anotado ("Anotado: tu nombre va como *Ana Ruiz*, subtítulos de a 2 o 3 palabras, música tranqui, te pregunto antes de cada logo") y dónde está el archivo, por si lo quiere cambiar a mano.
- Poné `preferencias: true` en `estado.json`.

Si contesta "elegí vos" a todo, es una respuesta: `por defecto` y sus palabras en cada sección de las siete preguntas. Si dice que ahora no, dejá el archivo como está. En los dos casos poné `preferencias: true` igual, decile que usás los valores por defecto y que lo que no le guste del primer video se cambia con decírtelo, y no vuelvas a preguntar.

## 8. Pedir las referencias

Cerrá con esto, que es lo más importante de todo el arranque:

> Listo, ya podés pasarme videos para editar.
>
> Ahora falta que me enseñes tu estilo. Pasame 2 o 3 videos que te gusten —con el enlace alcanza— y contame **qué te gusta de cada uno**. Con eso mido cómo están hechos y armo tu estilo. Si no los tenés a mano, escribí `/estudiar` cuando los tengas.
>
> Sin eso tus videos salen con un estilo neutro: funciona, pero no se parece a vos.
>
> Y si todavía no grabaste nada, escribí `/antes-de-grabar`: son consejos cortos para grabar de forma que el editor saque lo mejor.
