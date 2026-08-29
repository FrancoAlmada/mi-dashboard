# Dashboard v8 — arreglos de pantalla y primera actualización en vivo

> **Plan real**, tal cual se aprobó antes de implementar.

**Fecha:** 2026-08-29

## Contexto

Con la app ya instalada en las dos computadoras y el celular, aparecieron tres problemas de presentación. Los tres están medidos contra el sitio publicado, a 412px de ancho (el viewport de un Samsung S25) y a 1500px (la PC de escritorio).

**1. En el celular, el texto de las tareas queda espachurrado.** La fila mide 326px pero al texto solo le llegan **114px**, así que una tarea larga se parte en 9 líneas. El motivo: los botones de cronómetro, repetir y borrar están puestos para aparecer al pasar el mouse (`opacity: 0`), pero **igual reservan 72px**. En el celular no hay mouse, así que nunca se ven — y encima, al estar ahí invisibles, se pueden tocar sin querer. Hoy desde el celular no hay forma de borrar una tarea.

**2. En la PC de escritorio las tareas se abren en 4 columnas** y se ve mal. A 1500px el grid arma 4 columnas de 335px.

**3. En el celular, la tabla de la Vista Semana de hábitos no entra.** Mide **420px** contra 318px disponibles, así que hay scroll horizontal. Y los cuadraditos están **pegados**: el `border-spacing` horizontal es 0, por eso se leen como "muy juntas".

Reparto real de esos 420px: nombre del hábito **134px**, los siete días 210px, sem y racha 76px.

Decisiones tomadas:
- **Tareas en el celular**: el texto se lleva la línea completa y los controles bajan a una segunda línea, **siempre visibles**.
- **Columnas**: nunca más de 3.
- **Hábitos en el celular**: la tabla se mantiene, pero el nombre se reemplaza por su ícono y los cuadraditos se achican para que entren con aire.

Esta tanda además sirve para **ver el ciclo completo de una actualización**: editar, publicar y que llegue a los tres dispositivos.

Archivo a modificar: `index.html`.

---

## Cambio 1 — Máximo 3 columnas

Una sola línea, sin reglas por tamaño de pantalla:

```css
.hoy-grid { grid-template-columns: repeat(auto-fill, minmax(360px,1fr)); }   /* era 320px */
```

Por qué alcanza con eso: el contenido de la tarjeta nunca pasa de ~1432px (el `.main` tiene un tope de 1560px). Con un mínimo de 360px, **cuatro columnas necesitarían 1470px y no entran**, mientras que tres necesitan 1100px y entran cómodas. El propio grid deja de armar la cuarta.

Se verifica midiendo a 1920, 1500, 1280, 1024 y 768px.

---

## Cambio 2 — Las tareas en el celular

Se agrega un bloque que aplica **en pantallas táctiles o angostas**:

```css
@media (hover: none), (max-width: 720px) { ... }
```

La condición `hover: none` es la que importa conceptualmente: el problema no es el tamaño, es que **no hay mouse**, y toda la interfaz de estos botones está pensada alrededor del hover. La segunda condición cubre el caso de achicar la ventana en la compu.

Dentro:

- `.task` pasa a `flex-wrap: wrap`, y `.task-text` toma `flex: 1 1 calc(100% - 32px)` — con eso el texto llena la primera línea y **todo lo demás cae a la segunda**
- Los tres botones pasan a `opacity: 1`: dejan de ser invisibles y **se pueden usar desde el celular**, que hoy no se puede
- Se agrandan un poco (24 → 28px) para que se puedan tocar con el dedo
- El primer control de la segunda línea se indenta 32px para que quede alineado con el texto de arriba. Como puede ser el tiempo acumulado o la etiqueta según el caso, se resuelve con `.task-tiempo ~ .tag-pill { margin-left: 0 }`

Resultado esperado: el texto pasa de 114px a ~300px, y la tarea de la captura baja de 9 líneas a 4.

**Solo afecta a la tarjeta de "Tareas de hoy"** (`.hoy-grid`). Las tarjetas de la semana ya muestran la etiqueta como un puntito y no tienen estos botones.

---

## Cambio 3 — La tabla de hábitos en el celular

### Separar el ícono del nombre

Hoy la etiqueta de cada fila es un solo texto: `'🛏️ Dormir 7hrs'`. Para poder esconder el nombre y dejar el ícono hace falta que sean dos elementos:

```html
<span class="hb-row-label"><span class="hb-ico">🛏️</span><span class="hb-nombre">Dormir 7hrs</span></span>
```

Se cambia en la rama de vista semana de `renderHabits()`. El `title` de la fila lleva el nombre completo, así que manteniendo el dedo apretado se puede ver cuál es.

Se evita `::first-letter` para esconder el texto: con emojis es frágil, porque muchos ocupan más de un carácter.

### El bloque para el celular

```css
@media (max-width: 560px) {
  .hb-nombre { display: none; }
  .habit-table { border-spacing: 4px 5px; }   /* antes 0 horizontal: por eso estaban pegadas */
  .hb-cell { width: 24px; height: 24px; }
}
```

Las cuentas: se ahorran 108px del nombre y 42px de las celdas, y se gastan 44px en darles separación. **420 → ~314px**, que entra en los 318 disponibles.

Los cuadraditos quedan más chicos que ahora (24 en vez de 30) pero **con 4px de aire entre ellos**, que es justamente lo que faltaba. Se mantienen las columnas de `sem` y `racha`.

En la compu no cambia nada: sigue con los nombres completos y las celdas de 30px.

---

## Publicar y ver la actualización

Esta es la parte que sirve para aprender el ciclo:

```bash
git add -A
git commit -m "..."
git push
```

GitHub Pages tarda ~1 minuto. Después:

- **En la compu**: `Ctrl + F5` dentro de la ventana de la app
- **En el celular**: cerrar la app del todo (no minimizarla) y volver a abrirla

El service worker está configurado en *network first*, así que al abrir con internet siempre trae la última versión.

---

## Verificación

Se mide contra el sitio publicado, sin tocar los datos reales (el navegador de prueba usa un perfil aparte).

**A 412px (celular)**
1. El texto de una tarea larga pasa de 114px a ~300px, y de 9 líneas a 4
2. Los botones de borrar, cronómetro y repetir **se ven** y **se pueden tocar**
3. La tabla de hábitos entra sin scroll horizontal: ancho de tabla ≤ ancho disponible
4. Los cuadraditos tienen separación real entre sí (antes 0px)
5. Se ven los íconos de cada hábito y no los nombres

**En pantallas grandes**
6. A 1920, 1500 y 1280px: **nunca más de 3 columnas**
7. A 1024px: 2 columnas · a 768px: 1
8. En la compu, la tabla de hábitos sigue con nombres completos y celdas de 30px
9. Los botones de las tareas siguen apareciendo al pasar el mouse, como ahora

**Que no se haya roto nada**: tildar, borrar, cambiar etiqueta, cronómetro, arrastrar entre días, filtro, pendientes, rachas, diario, progreso, y la sincronización con Supabase. Consola sin errores y sin scroll horizontal en ninguno de los anchos.

Al terminar: commit, push, comprobar que el sitio publicado sirve la versión nueva, y guardar el plan en `planes/`.
