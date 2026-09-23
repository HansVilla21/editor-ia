# Reglas — lo que corregiste una vez y no se vuelve a repetir

> **Para Claude.** Este archivo se lee entero en la fase 1 de cada video, y cada regla se
> aplica en el lugar que dice su **Dónde se aplica**. Una regla gana sobre el estilo neutro y
> sobre lo que diga la skill; lo que la persona pida en el momento gana sobre una regla, y
> entonces la regla se actualiza.
>
> Una regla nace cuando la persona corrige algo de un video y la corrección es **para
> siempre**, no solo para ese video. El procedimiento completo está en `/nuevo-video`,
> sección "Cómo convertir una corrección en regla". Lo que es una preferencia de la lista
> (velocidad, subtítulos, música…) va en `preferencias.md`; lo que es de marca, en `mi-marca`.
>
> Cómo se escribe:
>
> - Una regla por corrección, con este formato exacto, la más nueva abajo de todo.
> - **Qué pasó** va con las palabras de la persona, entre comillas, y el video donde pasó.
> - **Regla** dice qué se hace distinto, en una o dos líneas, con el número si lo hay.
> - **Dónde se aplica** nombra la fase de la skill `editar-video` y la herramienta, la opción
>   o el archivo exactos.
> - Si una corrección nueva contradice una regla, no se suma otra: se reescribe esa, con una
>   línea `Reemplaza a: <lo de antes>, el <fecha>`.
> - Si una regla pide algo que rompe otra cosa (bajar los umbrales de `apretar.mjs` se come
>   las "s" finales), se le explica a la persona antes y la regla anota el límite.

Formato:

```markdown
## 2026-09-24 — Más aire al final de cada frase

**Qué pasó:** "la s de frases quedó mocha" (video `mi-video`, v2).
**Regla:** dejar 0,18 s después de cada frase al cortar, y 0,16 s al apretar.
**Dónde se aplica:** fase 2: `cortar.mjs … --tras 0.18` y `apretar.mjs … --tras 0.16`.
```

---

Todavía no hay reglas. La primera aparece la primera vez que corrijas algo "para siempre"
(al escribirla, estas dos líneas se borran).
