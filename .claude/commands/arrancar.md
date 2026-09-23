---
description: Deja el proyecto listo para editar. Se corre una sola vez, la primera.
---

Dejá el proyecto funcionando de punta a punta.

Hablá en español, de vos, y no des nada por sabido: quien corre esto puede no haber usado nunca una terminal. Nada de jerga sin explicar.

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

## 5. La prueba de fuego

Corré `npm run render`.

Si sale `out/prueba.mp4`, la cadena completa funciona: Remotion, ffmpeg y Chrome. Decíselo con esas palabras, porque es la señal de que ya puede trabajar. Invitalo a abrir el archivo.

Si falla, leé el error y resolvelo antes de seguir. No sigas con un render roto. Un error `spawn … chrome-headless-shell.exe ENOENT` en Windows casi siempre es la ruta demasiado larga del paso 0.

## 6. Dejar anotado el estado

Escribí `estado.json` en la raíz:

```json
{ "estiloEntrenado": false, "videosHechos": 0 }
```

## 7. Pedir las referencias

Cerrá con esto, que es lo más importante de todo el arranque:

> Listo, ya podés editar.
>
> Ahora falta enseñarle tu estilo. Pasame 2 o 3 videos que te gusten —con el enlace alcanza— y contame **qué te gusta de cada uno**. Con eso mido cómo están hechos y armo tu estilo.
>
> Sin eso vas a editar con el estilo neutro: funciona, pero no se parece a vos.
