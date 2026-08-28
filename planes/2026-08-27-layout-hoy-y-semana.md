# Layout — hoy y la semana a todo el ancho

> **Reconstrucción a posteriori.** Armada desde el commit `da901c9` y su diff.
> No es el plan original.

**Commit:** `da901c9` · 2026-08-27

## El problema

Las tareas vivían en un grid de dos columnas: "hoy" y "la semana" lado a lado,
a mitad de ancho cada una. Eso generaba dos problemas:

1. **La semana era una tira vertical larga.** Los 7 días eran filas apiladas en
   una columna angosta, así que había que scrollear para ver el jueves y no se
   podía abarcar la semana de un vistazo.
2. **La tarjeta de hoy quedaba corta y desbalanceada**, dejando un hueco negro
   grande al costado. En su momento se le puso `position: sticky`, que era un
   parche para ese hueco.

## Decisiones tomadas

- **Semana**: grid adaptable de tarjetas, una por día, que se reacomoda según
  el ancho (`repeat(auto-fill, minmax(250px,1fr))`).
- **Hoy**: barra de progreso arriba y las tareas repartidas en columnas.
- **Pendientes**: franja propia a todo el ancho, entre hoy y la semana, para
  verlo apenas abrís el dashboard.

## Qué se hizo

- Se desarmó el grid de dos columnas; los tres bloques quedan uno debajo del otro
- El bloque rojo salió de adentro de la tarjeta de la semana
- `renderTareas()` se partió en `renderHoy()` y `renderSemana()`
- Se fue el `position: sticky`, que ya no tenía sentido

## Tres decisiones tomadas sobre la marcha

**Las etiquetas en la semana se reducen a un punto de color.** Con la pill
completa, "Entregar TP2 de Tecnología Digital" se partía en 4 líneas porque la
etiqueta le comía el ancho. Sigue siendo clickeable y el `title` muestra el
nombre.

**Cada tarjeta de día mide lo suyo** (`align-items: start`). Con el stretch por
defecto, un día con 1 tarea medía 343px igual que el que tenía 6, con un vacío
enorme adentro.

**Se probó meter los 7 días en una sola fila** para evitar el hueco de la
segunda fila. Quedaban columnas de 185px y los textos se volvían a partir en 4
líneas, así que se volvió a 250px.

> Nota: la decisión de `align-items: start` se revirtió el 2026-08-28. Ver
> [Tarjetas de la semana parejas](2026-08-28-tarjetas-parejas.md).
