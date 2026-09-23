# Estilo visual — el estilo neutro

> **Estos son valores de arranque, no verdades.** Están elegidos para que el proyecto produzca algo
> digno el primer día, y están pensados para ser reemplazados. Cuando la persona entrene su estilo
> con la skill `estudiar-referentes`, los números medidos se escriben acá, con la procedencia
> anotada, y este archivo deja de ser neutro.
>
> **Lo que no se reemplaza es el método:** medir antes de afirmar, sincronizar cada gráfico con su
> palabra, una idea por gráfico, y verificar con cuadros.

Colores y tipografías salen de la skill `mi-marca`. Mientras esté vacía rigen los valores neutros de
este archivo. Plantilla viva: `src/plantilla/`. Se copia a `src/<slug>/` con `npm run nuevo <slug>` y
se cambian los datos, no el sistema (ver "La plantilla", al final).

Formato: 1080×1920 a 30 fps. Redondeo compartido: `f = round(segundos · 30)`.

## Estructura

- Bloques que alternan **full** (cara a pantalla completa) y **split** (cara arriba, de 0 a 960;
  contenido abajo, de 960 a 1920, sin borde ni margen entre los dos).
- Patrón por ítem: **full** para anunciar ("la tercera es X") y **split** para explicar o mostrar.
  El gancho y el cierre van en full.
- El cambio de bloque cae en el **primer cuadro de la primera palabra de la frase nueva**, con el
  mismo redondeo que los subtítulos. Si no coinciden, un cuadro sale con el subtítulo viejo justo en
  la costura.
- Bloque mínimo: **54 cuadros** (1,8 s). La transición ocupa 6 cuadros antes del corte y 10 después.

## Titular fijo del gancho

Mucha gente pasa el video antes de los 3 segundos: desde el **cuadro 0** tiene que leerse de qué
trata. Esto no es negociable, aunque cambien los valores.

- Texto: 3 a 7 palabras, legible en un segundo, promesa concreta y con número si lo hay. Coherente
  con la portada.
- **Estático**: visible completo en el cuadro 0, sin animación de entrada. El primer cuadro es la
  vista previa del feed. Vive en el bloque del gancho y sale con la transición.
- Posición: arriba, entre y ≥ 240 (debajo de la interfaz de la app) y el tope del pelo menos 40 px.
  Nunca sobre la cara. Si no entra, se baja a una línea o se achica el cuerpo; no se mueve a la
  persona.
- Estilo neutro: 800, **64 a 80 px**, `letter-spacing -0.03em`, blanco con sombra fuerte, máximo dos
  líneas, centrado. La palabra o el número clave, con el acento de `mi-marca`.
- Si el fondo es claro o tiene ruido: píldora `rgba(11,15,22,.72)`, radio 16.
- Los subtítulos del gancho siguen en su lugar habitual, a la altura del pecho.

## Encuadre de la cara

Se mide en **cada** video, con `cara.mjs` (fase 6 de la skill), y se verifica mirando `guia.png`.
De ahí salen tres números: centro de la cara `cy`, tope del pelo, punta del mentón.

- **Full:** el video va a sangre, sin recorte.
- **Split:** el mismo video a escala 1, subido `corrimiento = −(cy − 470)` px. Sin corrimiento
  lateral nunca: mover la cara de lado se nota más que dejarla descentrada.
- **Jump cuts** del corte de silencios: alternar zoom 1,0 y 1,08 en full, 1,0 y 1,05 en split, con
  origen en el centro de la cara, cambiando en cada tramo.

## Transición entre full y split

Se aplica `translateY(dy) scale(s)` más `blur(σ px)` al plano completo —video y panel juntos—, con
origen en (540, 960). **Los subtítulos no se transforman**: si se mueven con el plano, el ojo pierde
la línea de lectura.

Valores neutros, en cuadros a 30 fps:

- **Salida** (6 cuadros antes del corte):
  - `dy`: `[0, -12, -30, -54, -84, -120]`
  - `s`: `[1, 1.01, 1.04, 1.09, 1.16, 1.25]`
  - `blur`: `[0, 0.6, 1.2, 1.8, 2.4, 3.0]`
- **Entrada** (10 cuadros desde el corte):
  - `s`: `[1.14, 1.10, 1.07, 1.045, 1.028, 1.016, 1.008, 1.003, 1.001, 1]`
  - `dy`: `[10, 26, 34, 28, 18, 10, 4, 0, -2, 0]`
  - `blur`: `[2.0, 1.6, 1.2, 0.9, 0.6, 0.4, 0.2, 0, 0, 0]`

El primer bloque no lleva entrada y el último no lleva salida.

## Subtítulos

- Peso 800, **58 px**, `letter-spacing -0.02em`, blanco.
- Sombra: `0 2px 12px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.7)`.
- Bloques de 2 a 3 palabras, 4 como máximo. Cortes secos: sin animación, sin color, sin karaoke.
- Texto = lo que dice, corregido contra la segunda transcripción, con los nombres propios bien
  escritos.
- Altura en **full**: `centro = cy + (mentón − cy) · 1.25 + 120`, con tope en y = 1560. El zoom
  alterno tiene origen en la cara, por eso la altura se calcula desde el mentón y no desde el borde.
- Altura en **split**: centrados en y = 960, sobre la costura.
- Si la ropa es clara y el texto blanco desaparece sobre el pecho: píldora `rgba(11,15,22,.72)`.
- Se ocultan desde el cierre.

## Panel de contenido

Colores neutros. El acento sale de `mi-marca`; mientras esté vacía, `#5B8DEF`.

- Fondo: `radial-gradient(120% 70% at 50% 0%, #161A22, #0B0F16 60%)`, con una barra de 4 px del
  color de acento arriba, que tapa la costura con el video.
- Cabecera, en coordenadas del panel, y = 64: etiqueta de tipo y posición (`PASO 1 / 3`) en
  monoespaciada de 26 px con el acento, tags a la derecha, título de 84 px peso 800
  `letter-spacing -0.035em`, y la fuente en monoespaciada de 28 px. Entra con blur-in escalonado:
  +0, +2 y +4 cuadros.
- Cuerpo: desde y = 290 hasta y = 720 del panel (1680 absoluto). Más abajo queda la interfaz de la
  app: ahí no va nada importante.
- **Nada del cuerpo sube por encima de y = 290**, aunque sea para ganar lugar: una tarjeta corrida
  para arriba tapa el título de la cabecera, y es de lo primero que se nota.
- **Lo que va en una fila tiene que entrar en esa fila.** Chips, tags o secciones que no entran se
  achican o se sacan; si parten en dos renglones se salen de su tarjeta. Mirarlo en los cuadros.
- Tarjetas `#141821`, borde `#272C36`, radio 12. Estados: ok `#3FBF87`, alerta `#E8B440`,
  error `#E5675F`.

## Vocabulario de movimiento

Una idea por gráfico, sincronizada con su palabra, ±1 cuadro.

| Pieza | Valores neutros | Uso |
|---|---|---|
| blurIn | blur 8→0, opacidad 0→1, sube 14 px, 5 cuadros, ease-out cúbico | filas, tarjetas, texto |
| pop | escala 0.6→1 lineal en 5 cuadros, opacidad en 2, sin rebote | íconos, archivos, tags |
| countUp | ease-out cúbico, desde la palabra que anuncia la cifra hasta el final del número | cifras, contadores |
| typed | 1,2 caracteres por cuadro, cursor que parpadea cada 8 | prompts, comandos |
| sub-escenas | corte seco dentro del split, cada una entra con blurIn | cambio de idea |
| pan de captura | escala 1.4, desplazamiento de −40 % a lo largo de la frase, inOut cúbico | capturas de pantalla |

Mapa de frase a gráfico que funciona, para copiar la forma y no el contenido: nombre de algo →
captura real de eso · "antes de X, hacé Y" → checklist que desbloquea X · "busca el error con
método" → error en rojo, tres pasos, y "probar a ciegas" tachado · "N mil personas" → contador ·
"le pedís algo y te entrega A, B y C" → prompt tipeado y archivos que hacen pop en cada formato
nombrado · "lo explicás una y otra vez" → burbujas repetidas que colapsan en un archivo · "se pisan"
→ dos tarjetas que chocan y un tag de alerta.

## Logos de marcas

Cada herramienta, marca o plataforma que se nombra lleva **su logo real**. Nunca se dibuja uno
parecido.

**Permiso.** Bajar un logo es descargar de internet, y se hace según lo que la persona eligió en
`memory/preferencias.md`, campo **logos**:

- *Permiso permanente:* se bajan sin preguntar y se dice al entregar cuáles se bajaron.
- *Preguntar cada vez* (y mientras no haya respuesta): una sola pregunta con todos los del video
  juntos, antes de bajar ninguno: "¿Bajo los logos de GitHub y Supabase de Simple Icons?".
- *Nunca:* no se baja ninguno, y la marca se nombra con texto.

**Cómo se consiguen.** Con `logo.mjs "<marca>"`, escrita como la escribe la marca ("Google Gemini",
"n8n"):

1. Busca primero en `public/logos/catalogo.json`: lo que ya está no se vuelve a bajar.
2. Si no está, lo baja de Simple Icons (SVG de una sola tinta, CC0 1.0 salvo los que traen licencia
   propia, que el script anota y avisa) a `public/logos/<slug>.svg`, y lo anota en el catálogo con
   fuente, licencia, color de la marca y fecha. Imprime la línea para `datos.ts`: `logo: "<slug>"`.
3. Si Simple Icons no la tiene, lo dice y sugiere nombres parecidos (con `--slug`, si era otra forma
   de escribirla). El oficial sale del kit de prensa de la marca ("Brand", "Press", "Media kit"): la
   versión para fondo oscuro, en SVG o PNG transparente, y se registra con `logo.mjs "<marca>"
   --importar <archivo> --fuente <página del kit>` → `public/logos/<slug>-oficial.<ext>`. Si la
   marca no publica su logo, va con texto.

Los logos no viajan en el repo: cada persona los baja en su proyecto.

**Dónde van, en `datos.ts`.**

- En la cabecera de cualquier escena del split: `logo: "<slug>"`. 64 px de alto, a la izquierda
  del título y centrado con su línea; entra con pop junto al título, que se achica para dejarle
  lugar.
- En una `tarjeta` sin captura: con `logo`, va grande en la tarjeta clara (300 px; 260 si el primer
  renglón de `texto` va como pie), con pop en `logoEn`, el segundo de la palabra que nombra la marca.
  No se repite en la cabecera. Si hay captura, la captura manda y el logo queda arriba.
- En el gancho: `TITULAR_LOGO = "<slug>"`, delante de la primera línea, a la altura de la letra.
- En la portada: `PORTADA.logo`, 120 px arriba de la etiqueta.

Si el archivo no está, la plantilla lo omite (el título ocupa todo el ancho) y lo avisa en la
consola del render: `[revisión] Falta el logo "<slug>"…`.

**Color.** El de Simple Icons va blanco sobre el panel, el titular y la portada (del color del
texto de `mi-marca`) y negro sobre la tarjeta clara. El oficial (`-oficial`) va tal cual, con sus
colores; si es ancho, ocupa hasta 2,5 veces su alto. `--blanco` deja además
`public/logos/<slug>-blanco.svg`, para usarlo fuera de la composición.

**Nunca:** dibujar, redibujar o inventar un logo; deformarlo, rotarlo o recolorearlo (salvo blanco
o negro por contraste); ponerlo sobre la cara en plano completo; bajarlo sin el permiso que
corresponde o de una fuente sin licencia clara (un buscador de imágenes, una captura recortada);
ni ponerlo de forma que sugiera un patrocinio que no existe: el logo nombra la herramienta de la
que se habla. El logo de la propia persona sale de `mi-marca`, no de acá.

## Datos y capturas

- Cifras de repositorios: `https://api.github.com/repos/<owner>/<repo>` (estrellas, forks,
  descripción), sin token. Si la cifra dicha no coincide, se muestra una formulación verdadera y se
  avisa.
- Capturas: `captura.mjs <url> <salida.jpg> --ancho 1100 --alto 1500`, con escala de dispositivo 2 y
  sin barras de scroll, recortando la franja útil. El modo oscuro forzado no funciona en muchos
  sitios: en ese caso se usa la captura clara dentro de una tarjeta blanca, que además se lee mejor.
- Si algo no tiene página propia, se captura la página oficial y se usa una etiqueta de texto en
  lugar de una cifra. Nunca atribuirle a una pieza las cifras del proyecto que la contiene.
- Secretos de ejemplo, siempre enmascarados.

## Portada

- 1080×1920, con todo lo importante entre y = 240 e y = 1680: es el recorte que se ve en la grilla
  del perfil.
- La foto se busca en **toda** la grabación, incluidas las pausas entre tomas, no solo en el video
  cortado. Preferir boca cerrada o sonrisa real con ojos abiertos. Entregar 2 o 3 opciones.
- Retoque suave: `brightness(1.05) contrast(1.06) saturate(1.04)`, y la cara un poco más grande que
  en el video (escala ~1,25 alrededor de la cara).
- Composición neutra: imagen subida 130 px, degradado al fondo desde el 45 %, etiqueta en
  monoespaciada, título de hasta 230 px con el número en el acento, subtítulo de 64 px y una fila de
  chips numerados con los ítems.
- El cuadro elegido se extrae a PNG y se monta como imagen: congelar el video dentro de un still
  devuelve el cuadro 0.

## La plantilla

`src/plantilla/` es este estilo hecho código. No se edita para un video: `npm run nuevo <slug>` la
copia a `src/<slug>/`, arma `src/entries/<slug>.tsx` con los ids `<Slug>` y `<Slug>Portada` (de
`mi-video` sale `MiVideo`), y crea `public/<slug>/` y `videos/<fecha>-<slug>/versiones/`. Rechaza un
slug que ya existe o que no es de minúsculas, números y guiones.

En la copia se edita **solo `datos.ts`**. Todos los tiempos van en segundos del video cortado:

| Dato | Qué es | De dónde sale |
|---|---|---|
| `DIR` | la carpeta del video en `public/` | la pone `npm run nuevo` |
| `VIDEO_CUADROS` | cuadros de `video.mp4`. El reel dura eso y termina en toma real: sin congelar | `sondear.mjs` (duración × 30, hacia abajo) |
| `TITULAR`, `ENFASIS` | el titular del gancho (1 o 2 líneas) y las palabras que van con el acento en el titular y la portada | el guion visual |
| `TITULAR_LOGO` | el logo delante del titular, o `null` | `logo.mjs`, con permiso ("Logos de marcas") |
| `BLOQUES` | `{desde, hasta, tipo: "full" \| "split", escena?}`, cada uno en la primera palabra de su frase | `palabras.json` |
| `CORTES` | los jump cuts, en segundos | `tramos.json` (`inicioSalida`) |
| `ENCUADRE` | `{cy, pelo, menton, cx?}` en píxeles de 1080×1920 | `encuadre.json`, verificado con `guia.png` |
| `CUES` | efectos extra: `{clave, en, vol?, dura?}` con la clave del catálogo | `referencias/efectos.json` |
| `CTA` | `{desde, pide, palabra, recibe}`: "Comentá / PALABRA / y te mando…" | lo que dice al cerrar |
| `PILDORA` | fondo oscuro detrás del titular o de los subtítulos | fondo claro o ropa clara |
| `PORTADA` | etiqueta, título, subtítulo, ítems y `logo` | el guion visual |
| `PALABRAS` | `palabras.json`, lo que dijo con los nombres bien escritos | `palabras.mjs` |

Escenas del panel, solo en split (en full no se pone nada sobre la cara):

- `tarjeta`: una captura de `public/<slug>/` en tarjeta clara, con el paneo de captura. Sin captura,
  el logo grande si hay `logo` (con pop en `logoEn`), o los renglones de `texto`; y avisa qué
  archivo falta.
- `lista`: filas que entran con blurIn en su palabra (`en`), con estado opcional `ok`, `alerta` o
  `error`. Hasta 4 a tamaño pleno; con más, se achican.
- `contador`: una cifra verificada que cuenta de `desde` a `hasta`, con prefijo, sufijo y nota.
- `comando`: texto tipeado y renglones de salida cuando termina.

Todas llevan cabecera: `etiqueta` ("PASO 1 / 3"), `tags`, `titulo` (se achica solo si es largo),
`fuente` y `logo` (el slug de `public/logos/`). Una escena nueva se agrega en `escenas/`, con su forma en `tipos.ts` y su caso en
`EscenaDelBloque.tsx`.

Lo que hace sola, para no reinventarlo en cada video:

- Pega los bloques (cada uno termina donde empieza el siguiente) y estira el último hasta el final.
- Transición solo donde cambia el tipo. Dos split seguidos son sub-escenas: corte seco.
- Zoom alterno en cada corte, con origen en la cara, y el corrimiento del split, con las fórmulas de
  "Encuadre de la cara".
- El titular se ubica y se achica solo entre y = 240 y el pelo; el cierre, debajo del mentón y
  arriba de y = 1680.
- Subtítulos de 2 a 3 palabras (4 si la cuarta cierra la frase), que nunca cruzan un cambio de bloque.
- Sonido: whooshIn, whooshOut y swish en los cortes, un click por fila, los ticks del contador, el
  tecleo del comando y el impacto del cierre. `CUES` es para lo demás. Siempre con el pico en el
  cuadro del evento.
- Cada archivo se busca en `public/` antes de usarlo. Sin video, un marcador con las líneas del
  encuadre; sin voz, suena el audio del video; sin música, sin un efecto o sin un logo, se omite. Un
  clon recién bajado renderiza el ejemplo sin nada.
- Avisa en la consola del render (`[revisión] …`): bloques cortos, split sin escena, titular que no
  entra, cierre fuera de lugar, archivos y logos que faltan.

Archivos: `Reel.tsx` arma todo; `Toma.tsx`, `Transicion.ts`, `Panel.tsx` con `escenas/`,
`Subtitulos.tsx`, `Titular.tsx`, `Cta.tsx`, `Sonido.tsx` con `cues.ts` y `Portada.tsx` son las
piezas; `Logo.tsx` elige el archivo de cada logo y su tinta; `encuadre.ts` tiene las fórmulas y
`tiempos.ts` el paso a cuadros. `marca.ts` tiene colores y
tipografías: lo que diga `mi-marca` se carga una sola vez en `MI_MARCA`, y lo heredan los videos
nuevos.

## Revisión con cuadros

- Antes de renderizar: `previa.mjs src/entries/<slug>.tsx <Id> <carpeta> "f1,f2,…" --escala 0.35
  --hoja 5`, con un solo bundle para todos los cuadros. Mirar siempre: el cuadro 0, el gancho, la
  mitad de cada transición, cada sub-escena, el cierre y el último cuadro.
- Después del render: `cuadros.mjs <render> <salida> --tiempos "<bordes de bloque>" --hoja 5`, para
  verificar que el subtítulo y el layout cambian en el mismo cuadro, y que el video termina en toma
  real, después de la última palabra, sin congelar.
