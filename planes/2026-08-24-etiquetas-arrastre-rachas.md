# Etiquetas, arrastre entre semanas, cronómetros y rachas

> **Reconstrucción a posteriori.** Armada desde los commits `4538b7b` y
> `8469bf0` y sus diffs. No es el plan original.

**Commits:** `4538b7b` · 2026-08-24 · y `8469bf0` · 2026-08-25

## El problema

Cuatro cosas aparecieron al usar el dashboard:

1. **Un agujero real.** Las tareas se guardan con una clave por semana y
   `renderPendientes()` solo recorría los días previos de la semana en curso.
   El lunes la clave cambiaba y **lo que quedaba sin terminar el domingo
   desaparecía**. Los datos seguían en localStorage, pero nada los mostraba.
2. Franco vive en varios contextos a la vez (su calendario tenía bloques
   "UNI y AGENCIA" el mismo día) y todas las tareas caían en una sola pila.
3. Cuatro de sus nueve hábitos son de duración, pero los tildaba de memoria.
4. El tracker de hábitos se reseteaba cada lunes sin memoria entre semanas, así
   que le faltaba justo lo que hace que un tracker funcione: la racha.

## Decisiones tomadas

- **Etiquetas**: UNI / AGENCIA / PERSONAL / PROYECTOS, con los colores que ya
  estaban en la paleta (sky, coral, lime, peri).
- **Asignación**: chips de "etiqueta activa" arriba del input. Elegís una vez y
  todo lo que cargues sale con esa. Click en la pill de una tarea la cambia.
- **Timers**: solo en `UNI 90min` y `30min Aprendizaje`. `3hr de Celu` queda
  afuera a propósito: es un límite que no querés alcanzar, no una meta.
- **Arrastre**: mira todas las semanas anteriores, muestra hasta 8 y avisa
  "y N más".

## Qué se hizo

- Bloque rojo que recorre también las semanas anteriores guardadas, con → para
  pasar una tarea a hoy (conservando su etiqueta) y × para descartarla
- Filtro por etiqueta que afecta las dos tarjetas y el bloque de pendientes
- Cronómetro que guarda **el momento de arranque, no los segundos**, para que
  sobreviva a cerrar la pestaña. Al cumplirse el objetivo tilda el hábito solo
- Racha de días seguidos leyendo todas las semanas ya guardadas

## Dos detalles que importan

**Si hoy todavía no tildaste el hábito, la racha cuenta desde ayer.** Sin eso,
la racha se vería en cero cada mañana hasta marcar algo, que es exactamente lo
contrario a lo que motiva.

**El tick del cronómetro toca solo el texto del contador**, no re-renderiza la
sección. Un re-render completo le robaría el foco al input de "1 Prioridad del
día" mientras escribís.

## Corrección posterior (`8469bf0`)

El botón del cronómetro era un círculo gris de 28px pegado al círculo de tildar:
se leía como decoración, no como acción. Además desaparecía apenas tildabas el
hábito, así que si ya habías marcado UNI ese día no había forma de encontrarlo.

Pasó a ser una píldora naranja con texto (`▶ 90min`), visible aunque el hábito
ya esté tildado.
