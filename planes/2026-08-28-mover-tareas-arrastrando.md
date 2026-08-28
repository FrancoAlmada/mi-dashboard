# Dashboard v6 — mover tareas entre días arrastrando

> **Plan real**, tal cual se aprobó antes de implementar.

**Fecha:** 2026-08-28 · **Commit:** ver `git log`

## Contexto

Hoy una tarea vive en el día donde la cargaste y no hay forma de cambiarla de lugar: para pasarla del miércoles al jueves hay que borrarla y volver a escribirla, perdiendo su etiqueta y el tiempo que le hayas medido.

La única forma parecida que existe es el `→` del bloque rojo de Tareas No Completadas, pero solo manda a hoy y solo aplica a lo que ya venció.

Objetivo: poder **arrastrar una tarea de un día a otro dentro del grid de "Toda la Semana"**, y que todo lo que depende del día se recalcule solo.

Decisiones tomadas:
- **Mecanismo**: arrastrar y soltar.
- **Alcance**: los siete días de la semana en curso.
- **Dónde**: únicamente en la sección "Toda la Semana". La tarjeta de "Tareas de hoy" y el bloque de pendientes quedan como están.

Archivo a modificar: `dashboard-estilo-dos.html`.

---

## Paso 1 — Hacer arrastrable la tarea

Las filas de tarea del grid semanal pasan a ser `draggable="true"`. Se usa **HTML5 drag & drop** (`dragstart` / `dragover` / `drop` / `dragend`), que ya distingue solo entre un click y un arrastre: si arrastrás, el `onclick` que tilda la tarea **no se dispara**.

`tareaHTML()` recibe hoy un cuarto parámetro `conTimer` que solo activa el cronómetro en la tarjeta de hoy. Se suma uno análogo, `arrastrable`, que solo activan las tarjetas de la semana. Así el marcado de arrastre no aparece donde no corresponde.

Como el estado del arrastre vive en dos variables globales (`_dragDia`, `_dragId`), los handlers no necesitan pasar datos por `dataTransfer` más allá de lo mínimo para que el navegador considere válido el arrastre.

**Se identifica la tarea por `id`, no por índice.** Al soltar, el array de origen se reordena, y un índice ya no apuntaría a la misma tarea — el mismo problema de índices que resolvimos al mandar las completadas al fondo.

---

## Paso 2 — La zona donde soltar

**El destino es la tarjeta del día entera (`.dia-card`), no la lista de tareas.**

Es la decisión importante del diseño: las tarjetas cargadas tienen scroll interno y su lista está llena, así que si la zona de drop fuera solo la lista no habría dónde soltar. Con la tarjeta entera siempre hay lugar — incluido el espacio vacío de abajo y la fila del `+ agregar`.

Al pasar por encima con una tarea agarrada, la tarjeta destino se resalta (borde y fondo con el verde `--lime`) para que se vea dónde va a caer. El resalte se limpia en `dragleave` y en `dragend`.

La tarjeta de origen muestra la tarea a media opacidad mientras dura el arrastre.

---

## Paso 3 — Mover, y actualizar todo lo que depende del día

`moverTareaADia(diaOrigen, tareaId, diaDestino)`:

1. Si origen y destino son el mismo, no hace nada
2. Saca la tarea del array del día de origen y la mete en el de destino
3. **La tarea viaja entera**: conserva su texto, su etiqueta, si está tildada y los segundos que le mediste
4. Guarda y vuelve a dibujar

### Lo que se recalcula solo

Un `renderTareas()` ya deja al día correspondiente al día: contadores de cada tarjeta, contador de la semana, la tarjeta de "hoy" (si moviste algo hacia o desde hoy), el stat "Tareas hoy", el bloque rojo de pendientes y su stat, los contadores del filtro, la barra de progreso y los avisos de "N más" de las dos tarjetas afectadas.

### Lo que hay que tocar a mano

**El cronómetro.** `timerActivo` guarda `{tipo:'tarea', diaIdx, tareaId, inicio}` y `buscarTarea(diaIdx, id)` lo usa para encontrar la tarea. Si movés una tarea con el cronómetro corriendo y no se actualiza `diaIdx`, la búsqueda falla y **al parar el cronómetro el tiempo medido se pierde en silencio**. Al mover, si la tarea movida es la que está siendo cronometrada, se actualiza `timerActivo.diaIdx` y se vuelve a guardar.

**El selector de recurrencia.** Si `_repAbierto` es la tarea que se movió, se cierra: quedaría colgado sobre una fila que ya no está ahí.

**El deshacer.** El movimiento se suma al sistema que ya existe (`_undo` + `mostrarUndo()`), con el aviso *"Tarea movida al jueves — Deshacer"*. Deshacer la devuelve a su día y a su posición original. Hace falta un tipo de entrada nuevo en `_undo`, porque hoy solo contempla borrados.

---

## Fuera de alcance

- **Reordenar dentro del mismo día**: soltar una tarea en su propio día no hace nada. El orden lo define la carga, y las completadas ya se van al fondo solas.
- **Mover a otra semana**: los siete días de la semana en curso, como se decidió.
- **Táctil**: HTML5 drag & drop no funciona con el dedo en celular. En pantallas chicas el grid pasa a una columna y arrastrar entre días implicaría scrollear igual, así que no se pierde gran cosa. Si más adelante hace falta, se resuelve con el selector de días que quedó descartado hoy.

---

## Verificación

Server local temporal (`python -m http.server 5599`) + playwright-cli, disparando los eventos de arrastre con `DataTransfer` real.

**Mover**
1. Arrastrar una tarea del miércoles al jueves → aparece en el jueves y desaparece del miércoles, **en los datos**, no solo en pantalla
2. La tarea conserva etiqueta, tildado y segundos medidos
3. Soltar en su propio día → no pasa nada, no se duplica ni se pierde
4. Soltar sobre el espacio vacío de una tarjeta llena (abajo del todo) → funciona igual

**Que se actualice lo demás**
5. Mover una tarea **a hoy** → aparece en la tarjeta de "Tareas de hoy" y suben el stat y la barra de progreso
6. Mover una tarea sin completar **de un día pasado a uno futuro** → sale del bloque rojo y baja el stat "Pendientes"
7. Mover al revés (de futuro a un día pasado) → entra al bloque rojo
8. Los contadores de las dos tarjetas afectadas quedan bien
9. Mover a una tarjeta que ya estaba llena → aparece el aviso "N más" recalculado

**Los casos que se rompen callados**
10. **Con el cronómetro corriendo sobre esa tarea**: moverla, después pararlo, y confirmar que **los segundos se sumaron a la tarea** en su día nuevo
11. Con el selector de recurrencia abierto en esa tarea: moverla y ver que se cierra
12. Deshacer un movimiento → vuelve a su día y posición original

**Que no se haya roto nada**: click para tildar (que el arrastre no lo dispare de más ni de menos), borrar, cambiar etiqueta, cronómetro, recurrentes, agregar desde un día con el foco, filtro, alturas parejas por fila, scroll interno sin saltos. Consola sin errores y sin scroll horizontal a 1500 / 1100 / 700 / 420px.

Al terminar: guardar el plan en `planes/`, borrar temporales, matar el server y commitear.
