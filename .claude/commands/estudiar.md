---
description: Entrena tu estilo con videos que te gustan. Los mide cuadro a cuadro y escribe los valores que aprobás.
argument-hint: los enlaces o los archivos de las referencias, y qué te gusta de cada uno
---

Entrená el estilo del editor con las referencias que pasó el usuario.

Referencias de esta vuelta: **$ARGUMENTS**

Si eso vino vacío, mirá primero si hay archivos sin estudiar en `referencias/`. Si tampoco
hay, pedí lo que falta en una línea y parás acá:

> Pasame dos o tres videos que te gusten —el enlace alcanza, o dejá el archivo en la
> carpeta `referencias/`— y contame **qué te gusta de cada uno**. Esa frase es lo que hace
> que el análisis sirva para algo.

El método completo está en la skill `estudiar-referentes`: leela y seguila. Este comando
es el ritual, para que salga igual todas las veces. Todo se mide y se guarda en
**1080×1920 a 30 fps**.

## 1 a 5 · Medir

Seguí la skill: la frase textual del usuario por cada referencia, conseguir los videos en
`referencias/`, medir fps y resolución reales con `ffprobe`, lanzar un agente
`analista-referente` por referencia en paralelo, y resumirle cada informe al usuario
cuando llega.

**No sigas al paso 6 sin que el usuario haya dicho qué le gustó de lo que le resumiste.**
Esa aprobación es el único filtro que tiene el sistema.

## 6 · Consolidar

Acá es donde el estudio deja de ser un informe y pasa a ser su estilo. Los valores viven
en `.claude/skills/editar-video/referencias/`:

| Archivo | Qué guarda |
|---|---|
| `estilo-visual.md` | Disposiciones, transiciones, subtítulos, tipografías, colores, movimiento |
| `sonido.md` | Música, efectos, tratamiento de voz, niveles |
| `tomas.md` | Cómo se eligen y se encadenan las tomas de una grabación |

Si alguno no existe todavía, creálo con el encabezado, el bloque de procedencia y las
secciones que hagan falta para lo que se aprobó.

### 6.1 · Presentar los candidatos, numerados

Antes de escribir una sola línea, mostrale la lista. Un candidato por fila, en lenguaje de
usuario, y siempre con estos cuatro datos:

| # | Qué cambia | Valor medido | De dónde sale | Qué pasa con lo de ahora |
|---|---|---|---|---|
| 1 | Cómo entran los subtítulos | Desenfoque 8→0 y sube 14 px en 5 cuadros | «Referencia A», cuadros 120–125 | Nuevo, no había nada |
| 2 | Tamaño del titular | 78 px | «Referencia B», cuadro 14 | Reemplazaría los 64 px actuales |

El usuario aprueba por número. Lo que no aprueba, no se escribe. **Nunca escribas un valor
"porque es obviamente mejor".**

Antes de proponer, leé `.claude/skills/mi-marca/SKILL.md`. Un candidato que choque con la
sección 4 o la 5 de ese archivo no se propone: se menciona como descartado y por qué.

### 6.2 · Escribir, con la procedencia pegada al valor

Un valor sin procedencia es un valor que nadie va a poder revisar dentro de seis meses.
El formato de cada línea es este, y no cambia:

```markdown
- **Entrada de subtítulos:** desenfoque 8→0, sube 14 px, 5 cuadros, curva suave
  — «Referencia A» (`referencia-a-01`), cuadros 120–125 · aprobado 2026-09-17
```

Y arriba de todo, en cada archivo que hayas tocado, el bloque que dice de dónde salió todo:

```markdown
## Procedencia

| Referencia | Slug | Qué dijo el usuario | Fecha |
|---|---|---|---|
| Referencia A | `referencia-a-01` | "me gusta cómo aparecen los textos" | 2026-09-17 |
```

Reglas de escritura:

- **Editá secciones, no archivos enteros.** Reescribir el archivo completo borra valores
  que el usuario aprobó en vueltas anteriores.
- **Nada que no tenga un número de cuadro detrás.** Si el informe no lo ancló, no entra.
- Si un valor nuevo convive con uno viejo sin contradecirlo, van los dos.
- Los archivos de más de 300 líneas se parten por tema.

### 6.3 · Lo que mejora algo que ya existe va a prueba

Una referencia nueva que supere algo que el sistema ya hace **no reemplaza nada de
entrada.** Entra a una sección aparte del mismo archivo:

```markdown
## En prueba

- **Tamaño del titular:** 78 px — «Referencia B» (`referencia-b-02`), cuadro 14
  · candidato desde 2026-09-17. Reemplazaría: 64 px. Se decide después del próximo video.
```

Después del siguiente video hecho con el candidato, se le pregunta al usuario:

> El titular de este video salió a 78 px, que es lo que medimos en la referencia que te
> gustó. Antes eran 64. ¿Se queda o volvemos?

- **Se queda:** se mueve a su sección con la fecha de hoy, se borra el valor anterior, y se
  deja la línea `Reemplazó a: 64 px, el 2026-09-24`.
- **Vuelve:** se borra de "En prueba" y se anota en `memory/` para no volver a proponerlo.

### 6.4 · Dejar constancia

- Poné `estiloEntrenado: true` en `estado.json`. Es lo que hace que el proyecto deje de
  insistir con el entrenamiento al abrirse.
- Agregá una línea a `memory/decisiones.md` —creá el archivo si no está— con la fecha, qué
  referencias se estudiaron, qué se aprobó, qué quedó en prueba y qué se descartó con su
  motivo. Lo descartado importa tanto como lo aprobado: evita volver a discutirlo.
- Los informes y los videos se quedan en `referencias/`, que está en `.gitignore`. No los
  muevas a otro lado ni los commitees: son el trabajo de otras personas.
- `mi-marca` no se toca acá. Si de este estudio salió algo que debería vivir ahí —un color,
  una regla de qué no hacer— proponéselo al usuario y que él decida.

## Cerrar

Tres a cinco líneas, en lenguaje de usuario:

- qué cambió en su estilo y de qué referencia salió cada cosa;
- qué quedó en prueba y cuándo se decide;
- qué de lo que le gustaba no se puede fabricar con código, si hubo algo.

Y la invitación al paso siguiente: que grabe algo y lo edite con el estilo nuevo, que es la
única forma de saber si quedó bien.
