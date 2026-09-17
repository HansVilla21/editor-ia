---
description: Deja el proyecto listo para editar. Se corre una sola vez, la primera.
---

Dejá el proyecto funcionando de punta a punta.

Hablá en español, de vos, y no des nada por sabido: quien corre esto puede no haber usado nunca una terminal. Nada de jerga sin explicar.

## 1. Instalar

Corré `npm install`.

Avisale que la primera vez baja Chrome y ffmpeg, que son varios cientos de megas, y que puede tardar unos minutos. Que no cierre nada.

## 2. Revisar qué falta

Corré `npm run doctor`.

Por cada cosa que falte, contale con tus palabras lo que dice el campo "cómo resolver". No le pegues la salida cruda del comando.

## 3. La clave de Gemini

Si falta la clave:

- Explicale que es gratis y que es lo único que tiene que conseguir por su cuenta.
- Pasale el enlace: https://aistudio.google.com/apikey
- Copiá `.env.example` a `.env` y pedile que pegue la clave ahí.
- **Nunca** imprimas la clave en pantalla ni la escribas en ningún archivo que no sea `.env`.

Contale para qué se usa: transcribir lo que dice, elegir las mejores tomas, escuchar la música candidata y ubicar la cara para encuadrar.

## 4. Whisper

Instalá whisper.cpp con el modelo `small`, que es el que saca las palabras con sus tiempos para los subtítulos. Avisá que son unos 470 MB.

## 5. La prueba de fuego

Corré `npm run render`.

Si sale `out/prueba.mp4`, la cadena completa funciona: Remotion, ffmpeg y Chrome. Decíselo con esas palabras, porque es la señal de que ya puede trabajar. Invitalo a abrir el archivo.

Si falla, leé el error y resolvelo antes de seguir. No sigas con un render roto.

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
