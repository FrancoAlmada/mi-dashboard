# Dashboard v5 — tarjetas de la semana parejas

> **Plan real**, tal cual se aprobó antes de implementar (no es una
> reconstrucción como los cuatro anteriores).

**Fecha:** 2026-08-28

## Contexto

En el grid de "Toda la semana" cada tarjeta mide lo que ocupa su contenido, así que dentro de una misma fila conviven tarjetas de alturas distintas y el bloque se ve desprolijo.

Eso viene de la v3: puse `align-items: start` en `.semana-grid` (línea 245) porque con el `stretch` por defecto un día con 1 tarea quedaba tan alto como uno con 6 y sobraba un hueco enorme. Franco prefiere la prolijidad de las filas parejas, y además encontró la forma de que el hueco no se dispare: ponerle un techo a la tarjeta.

Objetivo: **todas las tarjetas de una misma fila con la misma altura**, con la fila incompleta (el domingo solo) quedándose con su propio tamaño chico hasta que se complete.

Decisiones tomadas:
- **Techo**: entran ~6 tareas antes de que aparezca el scroll interno.
- **Aviso**: cuando quedan tareas fuera de la vista, se indica cuántas.
- **Orden**: las tareas completadas se van al fondo, **tanto en la semana como en la tarjeta de hoy**.

Archivo a modificar: `dashboard-estilo-dos.html`. Además se suma una carpeta `planes/` al repo (ver el último paso).

---

## Paso 1 — Filas parejas

En `.semana-grid` (línea 245) se saca `align-items: start`. Vuelve al `stretch` por defecto del grid, que es exactamente el comportamiento pedido: **cada fila iguala la altura de su tarjeta más alta, y cada fila se calcula por separado**. La fila donde queda el domingo solo no se ve afectada por lo alta que sea la fila de arriba.

De paso se limpian los dos comentarios encimados de las líneas 240-244, que quedaron duplicados de una edición anterior y ahora dicen lo contrario de lo que hace el código.

No hace falta tocar nada más para que el `+ agregar` quede prolijo: `.dia-card` ya es `flex-direction: column` y `.dia-card .add-wrap` ya tiene `margin-top: auto`, así que el input se pega al fondo de la tarjeta y el espacio sobrante queda entre las tareas y el input.

**`.dia-vacio`** ("Sin tareas") pasa a centrarse verticalmente en el espacio disponible (`flex: 1` + centrado), para que en una tarjeta estirada no quede el texto pegado arriba con un vacío raro debajo.

---

## Paso 2 — Techo con scroll interno

`.dia-tareas` (el contenedor de las tareas de cada día, que ya existe) suma:

```css
max-height: 250px;      /* ~6 tareas; se ajusta contra la realidad al verificar */
overflow-y: auto;
scrollbar-width: thin;  /* barra fina, con su versión webkit */
```

Así una tarjeta muy cargada deja de estirar toda su fila: las tareas de más quedan detrás del scroll en vez de empujar la altura.

---

## Paso 3 — Aviso de que hay más abajo

Al pie de la tarjeta, **fuera** del área scrolleable, una línea `▾ N más` cuando quedan tareas sin ver.

**El número se mide, no se supone.** Contar "tareas menos 6" fallaría, porque una tarea de dos líneas ocupa el doble que una de una. Después de dibujar la semana se recorre cada `.dia-tareas` y se cuentan las `.task` cuyo borde inferior queda por debajo del área visible (`offsetTop + offsetHeight > clientHeight`). Si el resultado es 0, el aviso no se dibuja.

Se engancha un listener de scroll liviano en cada `.dia-tareas` para recalcular: al llegar al fondo el aviso desaparece, y vuelve al subir.

Se agrega también un degradado sutil al pie del área scrolleable, para que se lea que el contenido sigue.

---

## Paso 4 — Completadas al fondo

Hoy los renders hacen `tareas.map(function(t,i){ ... tareaHTML(d,t,i) ... })`, donde `i` es la posición real en el array y es lo que reciben `toggleTarea`, `deleteTarea`, `cambiarTag` y `arrancarTimerTarea`.

Al reordenar hay que **separar el orden visual del índice real**, o los botones van a operar sobre la tarea equivocada:

```js
var items = tareas.map(function(t,i){ return {t:t, i:i}; })   /* i = índice REAL */
                  .filter(function(x){ return pasaFiltro(x.t); });
items.sort(function(a,b){ return (a.t.hecha?1:0) - (b.t.hecha?1:0); });
/* al dibujar se sigue pasando x.i, no la posición en el orden nuevo */
items.map(function(x){ return tareaHTML(diaIdx, x.t, x.i, conTimer); })
```

`Array.prototype.sort` es estable, así que **dentro de cada grupo se conserva el orden de carga**: las pendientes quedan en el orden en que las escribiste y las completadas también.

Se aplica igual en `renderHoy()` y en `renderSemana()`.

**Efecto conocido**: al tildar una tarea de hoy, salta al final de la lista debajo del cursor. Es el precio de tener siempre lo pendiente arriba, y está aceptado.

---

## Paso 5 — Registro de planes en el repo

Los planes viven hoy en `~/.claude/plans/`, **un archivo por conversación que se sobrescribe cada vez**. De esta charla solo sobrevive el plan actual: los cuatro anteriores ya se pisaron. Lo único que quedó es el mensaje de cada commit.

Se crea una carpeta `planes/` dentro del proyecto, versionada con Git, con un archivo por plan:

```
planes/
  README.md
  2026-08-12-dashboard-funcional.md
  2026-08-24-etiquetas-arrastre-rachas.md
  2026-08-27-layout-hoy-y-semana.md
  2026-08-27-respaldo-tiempo-y-cierre-de-semana.md
  2026-08-28-tarjetas-parejas.md      ← este plan, tal cual
```

**Los cuatro primeros son reconstrucciones**, no los originales: se arman a partir de los mensajes de commit y del diff de cada uno. Cada archivo lo dice arriba de todo, para que quede claro que son un resumen a posteriori y no el documento que se aprobó en su momento. Incluyen el problema que resolvían, las decisiones tomadas y el commit correspondiente.

El de esta tanda sí es el plan real, copiado tal cual.

`README.md` explica para qué está la carpeta y lista los planes con su fecha y su commit.

De acá en adelante, cada plan nuevo se guarda ahí como archivo propio antes de empezar a implementar, así no se pisa nunca más.

---

## Verificación

Server local temporal (`python -m http.server 5599`) + playwright-cli.

**Alturas**
1. Con días de 1, 3 y 8 tareas: medir todas las `.dia-card` y confirmar que **las de una misma fila tienen la misma altura**
2. Confirmar que la última fila (incompleta) tiene **su propia altura**, menor que la de arriba
3. Una tarjeta con 8 tareas no supera el techo: su altura es la misma que la de sus vecinas

**Scroll y aviso**
4. Día con 8 tareas → `scrollHeight > clientHeight` y aparece `▾ N más` con el número correcto
5. Scrollear hasta el fondo → el aviso desaparece; subir → vuelve
6. Día con 3 tareas → sin scroll y sin aviso

**Orden**
7. Tildar una tarea del medio → se va al fondo, en hoy y en la tarjeta del día
8. Las pendientes conservan entre sí el orden de carga
9. **Índices** (lo más importante): con la lista reordenada, tildar / borrar / cambiar etiqueta de una tarea afecta **a esa** y no a otra. Se prueba con textos distinguibles y verificando el array de datos, no solo el DOM

**Que no se haya roto nada**: agregar desde hoy y desde un día, foco en el input, filtro por etiqueta, bloque de pendientes con → y ×, deshacer, cronómetro por tarea, recurrentes, hábitos, diario, panel de progreso, modal del domingo. Consola sin errores y sin scroll horizontal a 1500 / 1100 / 700 / 420px.

Al terminar: borrar temporales, matar el server y commitear.
