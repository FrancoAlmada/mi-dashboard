# Respaldo, tiempo medido, recurrentes y cierre de semana

> **Reconstrucción a posteriori.** Armada desde los commits `1b733ca` a
> `12f097c` y sus diffs. No es el plan original.

**Commits:** `1b733ca` `486e13c` `7430c3f` `1d521c4` `12f097c` · 2026-08-27

## El problema

Cinco huecos que aparecieron de usar el dashboard:

1. **Todo vivía en localStorage y no había respaldo.** Limpiar datos del
   navegador o cambiar de máquina significaba perder meses de hábitos, rachas y
   tareas sin vuelta atrás. Era el único riesgo irreversible abierto.
2. **Borrar era definitivo.** La × de una tarea no tenía deshacer.
3. **El tiempo no se medía.** Había cronómetro en dos hábitos pero no en las
   tareas, así que no había forma de saber cuánto se fue a UNI, a la agencia o a
   proyectos propios. Siendo QA, era justo el dato que faltaba.
4. **Lo que se repite se cargaba a mano** cada semana.
5. **La semana no cerraba.** Se acumulaba historial que nadie miraba.

## Decisiones tomadas

- **Resumen del domingo**: modal centrado, una vez por domingo, con botón para
  reabrirlo. Balance completo: tareas por día y por etiqueta, hábitos y rachas,
  tiempo por contexto.
- **Journaling**: debajo de los hábitos. Entrada de la semana siempre abierta,
  semanas anteriores plegadas.
- **Cronómetro de tareas**: cuenta libre hacia arriba, no pomodoro. Las tareas
  no tienen duración fija de antemano.

## Las cinco fases

**Fase 1 — Red de seguridad** (`1b733ca`)
Exportar / importar todo el localStorage como `.json`, con validación por una
marca `_app` y confirmación antes de pisar datos. Deshacer con aviso flotante de
6 segundos que reinserta la tarea **en su posición original**, no al final.

**Fase 2 — Cronómetro por tarea** (`486e13c`)
Cada tarea gana un campo `segundos`. El timer global se extiende con un campo
`tipo`: los de hábito cuentan hacia abajo contra un objetivo y auto-tildan; los
de tarea cuentan libre. Un solo cronómetro a la vez; al reemplazar uno de tarea
se **guarda su tiempo en vez de tirarlo**.

**Fase 3 — Recurrentes** (`7430c3f`)
Clave global `recurrentes` con los días de la semana de cada una. Se siembran
solas la primera vez que se abre una semana nueva. Borrar la instancia de una
semana **no cancela la recurrencia**.

**Fase 4 — Cierre de semana** (`1d521c4`)
Modal amarillo del domingo con el balance, y diario de la semana con historial
plegable en una sola clave `journal`.

**Fase 5 — Panel de progreso** (`12f097c`)
Heatmap de hábitos de los últimos 3 meses, barras de tareas cerradas por semana
y reparto por contexto. `armarHistorial()` recorre localStorage una sola vez.

## Detalle que importa

**El cronómetro guarda el momento de arranque, no los segundos restantes.** Por
eso sobrevive a cerrar la pestaña: al volver se recalcula contra el reloj. Un
timer sin parar de otro día se descarta, porque sumarle las horas que pasó la
máquina apagada sería mentira.
