---
description: Escribe el guion de tu próximo video, con la forma que funciona en videos cortos. Si tenés videos cuyo gancho te gusta, aprende de ellos. Sale listo para grabar.
argument-hint: de qué va el video y, si tenés, 1 a 3 enlaces o archivos de videos cuyo gancho te guste
---

Escribí el guion de un video corto. El método está en la skill `estudiar-referentes`, sección
"Cuando los referentes son para escribir un guion": leela y seguila. Este comando es el
ritual, para que salga igual todas las veces.

Pedido de esta vuelta: **$ARGUMENTS**

## 1 · Qué hay

Separá del pedido:

- **El tema:** de qué va el video.
- **Los referentes:** enlaces o archivos, hasta tres, y lo que dijo que le gusta de cada uno.
- **Lo que ya dijo:** la palabra del cierre, qué recibe quien la comenta, con qué lo hace,
  cómo funciona, cifras, enlaces, algo que le haya pasado.

Si falta el tema, es lo único que pedís antes de arrancar, en una línea, y parás acá:

> Contame de qué va el video, en una línea. Y si tenés uno o dos videos cuyo gancho te
> guste, pasámelos: el enlace alcanza.

Antes de escribir, leé lo que ya se sabe de la persona, si existe: las secciones 5 (qué no
hacer nunca) y 6 (cómo habla) de `.claude/skills/mi-marca/SKILL.md`, `memory/preferencias.md` y
`memory/reglas.md`.

**El trato del guion es el que ella usa al hablar.** Las pistas, en orden: el "Trato" de
`memory/preferencias.md` (rige los textos en pantalla, pero suele coincidir con cómo habla) y el
que usa al escribirte. La sección 6 de `mi-marca` suma las palabras que usa y las que nunca usa.
Si no se nota, tú, y lo decís al entregar. En
ese trato van las frases del guion y el pedido del cierre; el chat y los rótulos del archivo
siguen como siempre en este proyecto.

### Sin referentes

Pasa seguido, y no frena nada:

- Si hay estudios de guion anteriores en `referencias/estudio/guion-*.md`, usalos.
- Si no, escribí con la forma de la skill, que no depende de ningún referente, y anotá en el
  guion "Referentes: ninguno, con la forma de siempre".
- No pidas referentes antes de escribir. Se ofrecen una sola vez, al entregar.

## 2 · Estudio corto (solo si hay referentes)

El paso 1 del método, en unos diez minutos por referente. Si un enlace no baja, pedí el
archivo una vez, en una línea, y seguí con los demás, o sin ninguno: no esperes. El informe
va a `referencias/estudio/guion-<slug>.md`. Nada de esto toca el estilo: no se escribe en
`.claude/skills/editar-video/referencias/` ni en `estado.json`.

## 3 · Los datos

Todo lo que el guion afirma va a la tabla "Datos" como **verificado** (con su fuente) o **a
confirmar** (con la frase de repuesto que se graba si nadie lo confirma). Lo que el guion no
afirma pero lo mejoraría va como **opcional**: la frase ya funciona sin eso.

- **Lo de la herramienta** (precios, límites, planes, cantidades): verificalo en la fuente
  oficial y anotá el enlace y la fecha. Si no se puede verificar, va a confirmar.
- **Lo de la persona** (con qué lo hace, cuánto le ahorra, cuántos clientes): solo lo que ella
  dijo. Lo que no dijo no se pregunta: la frase va sin eso y el dato queda opcional.
- **Cómo funciona su sistema** (cuándo avisa, qué pasa después): lo que no dijo se escribe en
  lo más general que siga siendo cierto. Si una frase supone algo concreto, a confirmar.
- **Cualquier otro dato** (una estadística, un estudio, "la mayoría de…"): con una fuente que
  se pueda abrir, o afuera. Un número que suena bien y no tiene fuente no entra, ni a
  confirmar.
- **La prueba del gancho** es real: su sistema funcionando, nunca una pantalla armada. Una
  cita, un pedido o un cliente de prueba a su nombre sirve: el sistema es el de verdad. Los
  nombres, teléfonos, correos y montos de terceros los tapa ella antes de pasar la captura.

## 4 · Escribir

- Los seis tramos de la skill, en orden, con el titular fijo de 3 a 7 palabras.
- **Sin números verificados**, el tramo de la herramienta cuenta un paso concreto que se ve en
  pantalla. Nunca un número de relleno.
- **El giro** necesita algo suyo. Si no contó nada, escribí una idea que se pueda decir sin
  haberla vivido —una opinión sobre el tema, nunca una anécdota inventada— y dejá como
  opcional que una historia suya la reemplace.
- **La palabra del cierre:** si no la dijo, proponé una: corta, en mayúsculas, sin tildes, que
  tenga que ver con el tema. Mientras no diga qué recibe quien comenta, la última frase lleva
  una propuesta neutra ("y te mando cómo lo hice") y el encabezado dice "(falta: qué recibe)".
- Entre 110 y 130 palabras, contando las frases del guion y no los repuestos. Contalas. Los
  segundos del encabezado son palabras ÷ 2,7 (un ritmo normal hablando), y si las
  preferencias piden acelerar, divididos además por esa velocidad.
- Dos pasadas antes de guardar: **se entiende fácil** (cada frase, como la oye alguien que no
  sabe del tema) y **datos** (cada uno con su estado).

## 5 · El archivo

El slug sigue las reglas de `npm run nuevo`: minúsculas sin tilde, números y guiones, por
ejemplo `mi-primer-agente`. La fecha es la de hoy. Guardá en
`videos/<AAAA-MM-DD>-<slug>/guion.md`. Si ya hay un `guion.md` ahí, no lo pises: movelo a
`versiones/guion-v1.md` (o el número que siga) y escribí el nuevo.

Con esta forma:

````markdown
# Guion · <título de trabajo> (<AAAA-MM-DD>)

- **Tema:** <una línea>
- **Referentes:** <cuáles, y el estudio en referencias/estudio/guion-<slug>.md> | ninguno, con la forma de siempre
- **Largo:** <N> palabras, unos <N> segundos a ritmo normal
- **Titular fijo del gancho:** <3 a 7 palabras>
- **Cierre:** <Comentá> **<PALABRA>** y te mando <lo que recibe | (falta: qué recibe)>

## Guion

Una frase por línea, tal cual se dice. Estas líneas son el guion que usa el editor para
elegir la mejor toma de cada frase: si cambiás una, avisá.

```text
<frase 1>
<frase 2>
…
```

## Plan visual

| # | Frase (el principio) | Qué se ve | Disposición | Material |
|---|---|---|---|---|
| 1 | <…> | vos mostrando <el resultado> a cámara, con el titular arriba | full | a grabar por vos, en la misma toma |
| 2 | <…> | <la captura del resultado> | split · tarjeta | captura tuya: <qué pantalla> |
| 4 | <…> | <tres pasos> | split · lista | animación |
| 6 | <…> | <la página de la herramienta> | split · tarjeta | captura de <enlace> |

full: vos a cámara, sin nada encima · split: vos arriba y el contenido abajo (una captura,
una lista, un contador o un comando).

## Datos

| # | Qué se afirma | Estado | Fuente, o frase de repuesto |
|---|---|---|---|
| 6 | <…> | verificado | <enlace>, consultado el <AAAA-MM-DD> |
| 8 | <…> | a confirmar | Si no se confirma: "<la frase sin el dato>" |
| 9 | <…> | opcional | La frase ya funciona. Con <el dato>, <qué gana> |

## Para grabar

- Decí cada línea como está. Si te trabás, repetí la línea entera: el editor se queda con la
  última toma buena de cada una.
- Antes de la primera palabra y después de la última, 1 o 2 segundos callado, mirando al lente.
- <lo propio de este guion: qué mostrar a cámara, qué capturas sacar y qué tapar en ellas>
- El resto de los consejos: `/antes-de-grabar`.

## Antes de grabar, falta

- [ ] Qué recibe quien comenta <PALABRA>.
- [ ] <cada dato a confirmar: si no se confirma, se graba la frase de repuesto>
- [ ] <cada captura o toma que tiene que sacar la persona>
- [ ] (opcional) <cada dato opcional, y qué frase mejora>
````

Reglas del plan visual, con los nombres de la plantilla
(`.claude/skills/editar-video/referencias/estilo-visual.md`, sección "La plantilla"):

- **El gancho va en full**, que es donde vive el titular. Por eso la prueba del primer segundo,
  si puede ser, la muestra la persona a cámara (el celular con el mensaje, la pantalla con el
  resultado) en la misma toma; la captura entra en split desde la frase siguiente. En una
  toma a cámara no se puede tapar nada después: lo que muestre tiene que ser de prueba y a su
  nombre, o no tener datos de nadie. Decilo en "Para grabar".
- **Split** lleva una escena: `tarjeta` (una captura), `lista`, `contador` (solo con una cifra
  verificada) o `comando`. Una grabación de pantalla en movimiento no es ninguna de esas: si
  hace falta, anotalo como "escena nueva" para que el editor lo sepa.
- **Material:** "ya existe" con su ruta, "captura de" con su enlace, "captura tuya" o "a
  grabar por vos" con qué exactamente, o "animación". Lo que necesitaría IA de video, 3D o
  material de archivo (la letra C de la skill) no se propone: si la persona lo pide, se le dice
  que es un servicio pago y decide ella.

## 6 · Entregar

En el chat, corto:

1. Dónde quedó, cuántas palabras tiene y cuánto dura, más o menos.
2. **El guion**, solo las líneas, para que lo lea sin abrir el archivo.
3. **La única pregunta**, si el cierre lleva palabra:
   > ¿Qué le mandás a quien comente **<PALABRA>**? Un PDF, una plantilla, un enlace, un
   > video… Es lo que dice el cierre en pantalla.
4. **Lo pendiente, en una línea:** qué quedó a confirmar (si no se confirma, se graba el
   repuesto) y qué es opcional.
5. El paso siguiente: grabar, con los consejos de `/antes-de-grabar`, y después pasarte la
   grabación: el editor usa este guion para elegir las tomas.

Solo si corresponde, media línea cada una: "Lo escribí de tú; si hablás de otra forma, lo
paso" (si el trato fue una suposición) y "Si tenés uno o dos videos cuyo gancho te guste,
pasámelos y lo ajusto" (si no hubo referentes, una sola vez).

Cuando conteste, actualizá `guion.md`: la línea del cierre, la última frase del guion y la
lista de lo que falta. Si en el camino corrige algo que vale para siempre —cómo cierra, una
palabra que no usa—, arreglalo en el guion y escribilo como regla en `memory/reglas.md`. Si
el archivo no existe, crealo con este formato por regla: `## <AAAA-MM-DD> — <la regla en una
línea>`, y debajo **Qué pasó** (con sus palabras), **Regla** y **Dónde se aplica** (acá:
`/guion`).
