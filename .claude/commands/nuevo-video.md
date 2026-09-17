---
description: Edita un video nuevo de punta a punta, desde la grabación hasta el archivo final.
---

Editá un video completo con la skill `editar-video`.

## Antes de empezar

Pedí lo que falte de esto:

- **La grabación.** Puede ser una toma limpia o una con repeticiones; la skill sabe manejar las dos.
- **De qué va el video.** Una línea alcanza.
- **Enlaces o datos** que haya que mostrar en pantalla, si corresponde.

Si `estado.json` dice que el estilo todavía no se entrenó, avisale una sola vez que va a salir con el estilo neutro y ofrecele entrenarlo primero. Si dice que siga, seguí sin insistir.

## El trabajo

Seguí la skill `editar-video` en orden, sin saltarte fases. Las fases existen porque cada una atrapa un error que ya costó tiempo.

Mostrá avances en los puntos donde una decisión cambia el resultado: el corte, el encuadre, el guion visual y la mezcla. No pidas permiso para cada paso.

## La entrega

Dejá el resultado en `videos/<fecha>-<slug>/`:

- `video-final.mp4` y la portada, sueltos.
- Todo lo demás en `versiones/`, sin borrar nada.

Sumá uno a `videosHechos` en `estado.json`.

Al final, contale en dos líneas qué decisiones tomaste y qué puede cambiar si no le gusta.
