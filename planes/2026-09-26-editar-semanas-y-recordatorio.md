# Dashboard v9 — editar tareas, completar semanas pasadas y recordatorio nocturno

> **Plan real**, tal cual se aprueba antes de implementar. **Versión 2**: reemplaza a la del mismo día, que se había armado sobre una copia vieja del código (ver "Qué pasó").

**Fecha:** 2026-09-26

## Contexto

Cuatro pedidos de Franco, que usa la app todos los días en la notebook, la PC y el celular (Samsung, Android):

1. **Editar el texto de una tarea** ya creada, en Hoy, en la semana y en el recuadro rojo. Y **deshacer cuando tachás una**.
2. **Completar semanas que ya pasaron**: tildar hábitos que quedaron sin marcar y escribir el diario que no llegaste a escribir. Hoy las flechas ← → muestran las semanas viejas **en solo lectura**.
3. **La etiqueta de las tarjetas de la semana es muy chica**: un punto de **9×9px** pegado a una fila que tilda al tocarla. Si le errás, completás la tarea.
4. **Un aviso todas las noches** en el celular y en la compu, para completar los hábitos y planear el día siguiente.

### Qué pasó con la versión 1 de este plan

La notebook tenía el repo **atrasado 8 commits**: los del 16/09, hechos desde la PC. La versión 1 del plan se analizó e implementó sobre el código del 29/08, y el push lo rechazó. Nada llegó a publicarse. Ese trabajo quedó guardado en la rama local `v9-sobre-base-vieja` y `master` quedó igual a `origin/master`.

Comparado con el código real:

- **Ya no hace falta**:
  - el arreglo de las recurrentes que se pisaban el lunes: las recurrentes ya no existen
  - el cronómetro de tareas que cruzaba la medianoche: ya no existe
  - volver locales el filtro y la etiqueta activa: ya están así
  - resetear la semana nueva: ya se hace, y el "guardián de fecha" (`verificarCambioDeFecha`) cubre el cambio de día
  - escapar las comillas en `esc()`: ya está
- **Sigue haciendo falta**:
  - bajar lo nuevo mientras la app está abierta y subir antes de irse
  - guardar el diario semana por semana
  - buscar las tareas por clave e id
  - editar, deshacer y la etiqueta más grande
- **Cambia**:
  - el punto 2 ahora es "sacar el solo lectura" de lo que ya existe
  - el aviso tiene que leer los hábitos editables (`habitos_def`) y los hitos
- Del código ya probado en la rama vieja se reaprovecha lo que sirva, adaptado a esta base: la edición, los tipos nuevos de deshacer, las funciones por clave e id, la sync y el arnés de pruebas.

### Problemas encontrados en el código actual

- **Una app abierta no baja lo que cambiaste en otro dispositivo.** `bajarTodo()` solo corre al entrar. Si a la noche tildás hábitos en el celular (lo que va a pedir el aviso) y a la mañana tocás algo en la PC que quedó abierta, la PC sube su copia vieja y **pisa lo del celular**.
- **Si cerrás la app rápido, lo último no se sube.** La subida espera 1,5s y nunca se manda al pasar a segundo plano. El aviso de las 22:00 leería datos viejos.
- **Cada bajada con novedades te devuelve a la semana actual.** Lo hace `recargarDesdeStorage()`, con `_semanaVista=0`. Con bajadas cada 2 minutos te sacaría de la semana pasada mientras la estás completando.
- **El aviso de nivel te borra el "Deshacer".** `refrescarNivel()` usa `mostrarToast()`, que limpia `_undo`. Si completar una tarea te sube de nivel, el deshacer de esa misma tarea desaparece.
- **En el celular hay botones que no se ven pero se pueden tocar**: el × de las tarjetas de la semana, y el → y el × del recuadro rojo.

### Decisiones tomadas

- **Deshacer al tachar**: en todas las listas.
- **Semanas pasadas**: se vuelven editables **hábitos y diario**. La grilla de tareas vieja sigue en solo lectura: lo que quedó sin hacer se maneja desde el recuadro rojo.
- **Domingos**: no se planea el lunes. El aviso del domingo es para cerrar la semana.
- **Aviso**: todas las noches a las **22:00**, siempre, con el detalle de lo que falta **y los hitos que vencen mañana**.
- **Canal**: notificación real de la app (**Web Push**) desde Supabase. n8n no sirve: no está prendido siempre.

**Archivos:** `index.html`, `sw.js`, `config.js`, `supabase.sql`, `SETUP.md`, `.gitignore`, `planes/README.md`.
**Nuevos:** `supabase/functions/recordatorio/index.ts`, `supabase/config.toml`, `icono-badge.png`.

**Reglas de la casa que valen para todo lo nuevo:**
- CSS **solo con tokens** (`var(--…)`, incluidos los `--on-*`), para que funcione en los 3 temas (Nocturno, Papel, Terminal).
- En Terminal, los puntos van cuadrados.
- Servidor de desarrollo: `node serve.js`. El de Python recorta los archivos grandes en esta PC.

---

## Fase 0 — Sincronización: bajar seguido, subir antes de irse

### 0.1 Bajar y subir

- `bajarTodo()` gana dos variables: `_bajando` (para no bajar dos veces a la vez) y `_ultimaBajada`. Cuando gana la nube, se borra `_pendientes[clave]`.
- `bajarSiHaceFalta(minMs)`:
  - al volver a la app (`visibilitychange` → visible y `focus`): primero `verificarCambioDeFecha()` y después baja, con 30s de mínimo entre bajadas
  - en el intervalo de 60s que ya existe, si la app está a la vista: baja con 110s de mínimo. Con 120s caería cada 3 minutos, porque el intervalo nunca coincide justo.
- `subirYa()`: en `visibilitychange` → hidden y en `pagehide`, sube lo pendiente **en el momento**.
- `subirPendientes()`: solo da por subida una clave si su fecha no cambió mientras viajaba. Si la tocaste en el medio, queda pendiente para la próxima.
- `recargarDesdeStorage()` **deja de volver a la semana actual**: conserva `_semanaVista`, la tarea en edición (Fase 1) y el "grande" en edición. Para los dos últimos se usa la misma guarda `_renderizando`: el blur de un input que se redibuja no cuenta.
- `verificarCambioDeFecha()` vuelve a la semana actual **solo si cambió la semana**. Si cambió el día, no te saca de donde estás.

### 0.2 El diario se guarda por semana

- El textarea lleva en `data-key` la semana que muestra, y escribe **en esa clave**.
- Al guardar se relee `journal` del almacenamiento y se cambia **solo esa semana**. Hoy se sube el objeto entero que está en memoria y pisaría una semana que escribiste en otro dispositivo.
- Lo que tipeaste y falta guardar (`_diarioPend`) se vuelve a aplicar después de una bajada, así no se pierden las últimas teclas.
- `_diarioAbiertas` se indexa por **clave de semana**, no por posición.

### 0.3 Tareas de cualquier semana, por clave e id

Hoy hay dos caminos duplicados: `key===null` para la actual y `leerSemanaKey()` para las viejas, en `quitarDeOrigen`, `togglePend`, `descartarPend` y `deshacer`. Se reemplazan por tres funciones:

- `semanaPorKey(key)`
- `guardarSemanaPorKey(key, data)`
- `buscarPorId(data, dia, id)`, que busca en su día y, si no está, en toda la semana

`_pendCache` guarda el `id`. `_undo` guarda siempre la **clave real** de la semana, nunca `null`: un deshacer que cae justo después de un cambio de semana va a la semana correcta. Las ramas `grande`, `hito` y `nota` de `deshacer()` no cambian.

---

## Fase 1 — Editar tareas y deshacer al tachar

### 1.1 Modo edición

Un solo estado: `_edit = {donde:'hoy'|'semana'|'pend', key, dia, id, borrador}`. El `donde` hace falta porque la misma tarea se dibuja en dos lugares a la vez; sin él se abrirían dos inputs.

**El botón ✎ (`.task-edit`)** usa el mismo glifo y el mismo estilo que el ✎ de los Tres grandes (`.grande-edit`): en la compu aparece al pasar el mouse, en el celular está siempre visible.
- **Hoy**: `[✎][×]`.
- **Semana**: el ✎ **ocupa el lugar del ×**, y el × pasa **adentro de la edición**. Así el texto no pierde lugar, y en el celular por fin se puede borrar desde la semana. **Cambio de costumbre en la compu**: borrar desde la semana pasa a ser ✎ y después ×. En semanas viejas la grilla sigue en solo lectura, sin ✎.
- **Recuadro rojo**: `[✎][→][×]`.

**En edición** la fila pasa a `[input][✓][×]`, sin el click que tilda y sin `draggable`.
- Enter o ✓ guarda · Esc cancela · click afuera guarda.
- Texto vacío cancela, no borra.

**Trampas del redibujado con `innerHTML`, ya resueltas en la rama vieja:**
- ✓, × y ✎ llevan `onmousedown="event.preventDefault()"` para que el click no caiga en un botón que ya no existe.
- El blur no cuenta mientras se está redibujando (`_renderizando`) ni cuando la ventana perdió el foco.
- `_edit=null` se pone antes de redibujar.
- Después de cada render, `enfocarEdicion()` devuelve el foco al input con el borrador.

### 1.2 Deshacer al tachar, en todas las listas

- `toggleTarea`: al **completar** → *"Tarea completada · Deshacer"*. El deshacer pone `hecha=false`, no invierte. Destildar no avisa, y si era la del aviso, lo cierra.
- `togglePend`: igual para cualquier semana. Hoy, con la semana actual, va a `toggleTarea`; se unifica. La tarea desaparece del recuadro y el deshacer la trae de vuelta.
- `moverPendAHoy` (→): también se puede deshacer (`a-hoy`).
- `deshacer()` suma los tipos `tildar`, `editar` y `a-hoy`, y todo se ubica por clave real e id.
- **Los avisos de nivel y de día perfecto no pisan un Deshacer**: si hay uno pendiente, `mostrarToast()` pone su aviso en espera y lo muestra cuando se cierra el toast del deshacer.

### 1.3 Recuadro rojo

- **Compu**: como máximo 3 columnas (`minmax(min(360px,100%),1fr)`, el mismo truco de `.hoy-grid`), así al texto le quedan al menos 150px.
- **Celular** (`hover: none` / `720px`): el texto va en la primera línea y el día, la etiqueta y los botones en la segunda. Los botones quedan visibles y miden 28px.

---

## Fase 2 — La etiqueta de la semana, más grande

- `.dia-card .tag-pill`: la zona tocable pasa de **9×9 a 28×28px**, con un punto visible de 12px dibujado con `::before`. Los márgenes negativos (`-5px -9px`) meten esa zona en los huecos de la fila, así ni la fila crece ni el texto pierde lugar (medido en la rama vieja: mismo alto, ±1px de texto). Al pasar el mouse aparece un anillo suave.
- La variante "sin etiqueta" es un anillo punteado. En **Terminal**, el punto y el anillo van cuadrados: la regla actual `[data-tema="terminal"] .dia-card .tag-pill` se extiende a `::before`.
- En el celular, el ✎ de la semana mide 28px pero ocupa lo mismo que el × de 24 (con margen negativo), y la etiqueta de Hoy sube a 28px de alto.
- Sigue ciclando como ahora. Si igual le errás, el deshacer lo arregla con un toque.

---

## Fase 3 — Completar semanas pasadas: hábitos y diario

`_semanaVista` y las flechas ← → quedan como están. Lo que cambia es que **en una semana pasada, hábitos y diario se pueden editar**.

**Hábitos**
- `habitsDeVista()` ya relee la semana vieja del almacenamiento en cada llamada, así que no guarda copias viejas. Suma el relleno de `checks` hasta `slotsNecesarios()`.
- `toggleHabit()` y `setPriority()` en una semana pasada: releen esa semana, cambian y guardan con **su clave** (`guardarHabitosDe(key, D)` → `lsSet` + `programarProgreso()`). Se sacan las guardas `enHistorial()` y su toast.
- `renderHabits()`: en el historial vuelven los `onclick` de `.hb-body` y `.hb-cell`, y la prioridad se puede escribir ("Prioridad de ese día…"). **Siguen afuera en el historial**:
  - el cronómetro
  - las marcas de "hoy"
  - las rachas, que se cuentan desde hoy
  - el confetti de día perfecto (`detectarDiaPerfecto` solo en la semana actual)
- `completarTimer()` ya escribe directo en `hbData`. Solo falta que marque la tarjeta con `listo` únicamente si estás mirando la semana actual.
- Tildar un domingo olvidado **arregla la racha**: `calcularRachas()` relee todo al volver a la semana actual. El heatmap se actualiza con `programarProgreso()`.
- Solo mirar no crea claves: una semana sin datos se guarda recién cuando tildás algo.

**Diario**
- En el historial el textarea **deja de ser readonly** y escribe en la clave de esa semana (0.2). El placeholder cambia a *"¿Cómo te fue la semana del 15 sep?"*.
- Cada entrada del historial de abajo suma **"Editar"**: lleva las flechas a esa semana y pone el foco en el textarea. `irAlDiario()` vuelve primero a la semana actual.

**Banner**: *"Viendo la semana del 15 al 21 sep (la semana pasada) · podés completar hábitos y diario"*. El borde punteado se queda, porque es la señal de que estás en otra semana. La grilla de tareas vieja sigue en solo lectura.

---

## Fase 4 — Recordatorio nocturno (Web Push)

```
Supabase Cron — 22:00 Argentina (01:00 UTC)
      ↓  POST con un secreto
Edge Function "recordatorio"   ← lee tus datos: hábitos de hoy, tareas y hitos de mañana, diario
      ↓  Web Push firmado (VAPID)
Servicio de push del navegador (Google en Android y Chrome, Microsoft en Edge)
      ↓
sw.js muestra la notificación → al tocarla abre el dashboard en los hábitos
```

Todo queda dentro de lo que ya usás: Supabase (plan gratis) y la propia app.

### 4.1 En la app

- **Un botón nuevo en el pie: 🔔 Recordatorio nocturno.** El estado es por dispositivo y se lee de `pushManager.getSubscription()`: *Activar* / *Activado · Probar · Desactivar* / *Bloqueado*. Solo aparece con la sesión iniciada y el service worker disponible, así que abierta con doble click no se ve.
- **Activar**: tiene que salir de un click. Pide el permiso → `serviceWorker.ready` → `pushManager.subscribe` → se guarda en `suscripciones`, con el nombre del dispositivo. Cada vez que abre la app vuelve a guardar la suscripción (upsert), porque el navegador a veces la renueva.
- **Probar**: `sb.functions.invoke('recordatorio', {body:{prueba:true, endpoint}})`. Viaja con tu sesión y llega solo a este dispositivo.
- **Tocar el aviso** lleva a `#card-habitos`. Si el aviso era de un día que ya pasó (el del domingo, tocado a las 00:30), **lleva las flechas a esa semana y a ese día**, que ahora se puede editar (Fase 3).
- `config.js` suma `VAPID_PUBLIC_KEY`, que es pública por diseño.

### 4.2 `sw.js`

- `push` → `waitUntil(showNotification(...))`. Si el contenido no se puede leer, igual muestra un aviso genérico.
- `notificationclick` → `clients.matchAll({type:'window', includeUncontrolled:true})`: si la app ya está abierta, `focus()` + `postMessage({semana, dia})`; si no, abre `./#card-habitos`.
- `CACHE` pasa a `dashboard-v4`, e `icono-badge.png` (la grilla en blanco, de 96px) se suma a `ESENCIALES`.

### 4.3 Supabase

**Tabla** en `supabase.sql`: `suscripciones (endpoint pk, user_id, sub jsonb, dispositivo, creado)`, con RLS de **select, insert, update y delete** de las propias. Sin la de update, el upsert falla.

**Función** `supabase/functions/recordatorio/index.ts`, en Deno con `npm:web-push` (o `jsr:@negrel/webpush` si el runtime se queja).
- **Modos**:
  - noche: header `x-cron-secret` igual a `CRON_SECRET` → manda a todas las suscripciones
  - prueba: token validado con `auth.getUser()` → solo la suscripción con ese `endpoint` **y** ese `user_id`
  - cualquier otra cosa → 401
- **Seguridad**: la verificación de JWT de Supabase va apagada, fija en `supabase/config.toml`. La anon key está publicada y ella misma es un JWT válido, así que esa verificación sola no protege nada; la función hace su propio control.
- **CORS**: responde el `OPTIONS` y manda los headers en todas las respuestas, incluidas las 401.
- **Fechas**: año, mes y día se sacan con `Intl` en `America/Argentina/Buenos_Aires`, y las cuentas se hacen con `Date.UTC`. A las 01:00 UTC el runtime ya está en el día siguiente.
- **Las claves copian el formato de la app**: `wk_AAAA_M_D` y `tareas_wk_…` (mes desde 0, día del lunes sin ceros), `habitos_def`, `journal` y `hitos` (con `fecha:'AAAA-MM-DD'`). `valor` es texto y se pasa por `JSON.parse`.
- **El texto**:
  - **Lunes a sábado**: *"Te faltan 4 de 8 hábitos · Mañana (viernes) tenés 2 tareas · Vence: Entrega TP2"*.
    - Los hábitos que cuentan son los **activos** de `habitos_def`. Si la clave no existe, se toman los 9 de la semilla.
    - Si no hay tareas: *"no tenés nada planeado para mañana"*.
    - Si está todo: *"8 de 8 ✓ …"*. **Sale siempre.**
  - **Domingo**: *"Cerrá la semana: te faltan 2 hábitos · todavía no escribiste el diario"*, más los hitos del lunes si hay.
  - En `data` van la semana y el día, para 4.1.
- **Entrega**: TTL de 3 horas y `urgency: high`. Las suscripciones que responden 404/410 se borran solas. El subject de VAPID es la URL del sitio.

**Secretos** (`VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `CRON_SECRET`): **nunca al repo, que es público.**
- Un script los escribe directo en `supabase/functions/.env`, que se ignora en Git **desde antes de crearlo**, y en pantalla muestra solo la clave pública.
- Se cargan con `npx supabase secrets set --env-file …`.

**Deploy**: `npx supabase functions deploy recordatorio --project-ref fwfaecdrgavcewrmijaz`. Antes, `npx supabase login` **lo hacés vos**, porque abre el navegador. Después el deploy y los secretos los puedo correr yo.

**Cron**: Integrations → Cron → `recordatorio-noche`, `0 1 * * *` (el cron corre en UTC), tipo Edge Function, con el header del secreto. En `supabase.sql` queda también la versión SQL, comentada.

`.gitignore` suma `supabase/.temp/` y `supabase/functions/.env`.

### 4.4 `SETUP.md` — Parte C

Los pasos que hacés vos: `npx supabase login`, crear el cron, y activar el recordatorio en cada dispositivo (con "Probar").

Lo que hay que saber:
- **Android** llega con la app cerrada. Conviene sacar a Chrome de las "apps en suspensión" de Samsung.
- **PC**: llega solo si la compu está prendida y Chrome o Edge siguen corriendo en segundo plano (*Configuración → Sistema → "Seguir ejecutando apps en segundo plano"*).
- **Supabase gratis** pausa el proyecto tras 7 días sin uso.

---

## Límites que quedan

- La sincronización sigue siendo "gana el último que guardó", por clave. Para pisarse, ahora hay que editar la misma semana en dos dispositivos dentro del mismo par de minutos.
- Si cargás algo en el primer segundo, antes de que termine la primera bajada, le gana a la nube. Es lo mismo que pasa hoy.

---

## Orden, commits y ramas

1. Guardar este plan en `planes/2026-09-26-editar-semanas-y-recordatorio.md`, sumarlo a `planes/README.md` y completar ahí los commits de la Tanda 2.
2. Fases 0 → 1 → 2 → 3, con un commit por fase.
3. Push al terminar la 3, que es un bloque que se puede usar solo.
4. Probar unos días con los dispositivos reales y después la Fase 4, en dos commits: la app y el `sw.js`, y después Supabase.

Antes de cada sesión de trabajo: `git fetch` y comparar con `origin/master`.

Cuando esté todo publicado, se borra la rama `v9-sobre-base-vieja`. Lo pregunto antes.

---

## Verificación

Con `node serve.js` y Playwright usando el Chromium local, en un perfil aparte:
- `config.js` interceptado: en modo local o con una **nube de Supabase falsa**, compartida entre "dispositivos" y armada del lado de Node. **Nunca contra tus datos reales.**
- Reloj falso para simular medianoche y los intervalos.
- Medición a 412px (S25) y a 1500px.
- Capturas en **los 3 temas**.

**Regresión** (todo lo que ya anda):
- tareas: alta, tildar, etiqueta, borrar y deshacer, arrastrar y deshacer, filtro, contadores del hero
- recuadro rojo: → y descartar
- Tres grandes (incluida su edición), hitos, notas y "pasar a tarea"
- hábitos: tildar, editor, cronómetro
- diario, progreso, nivel y confetti, resumen del domingo
- temas, flechas y banner, respaldo (exportar e importar)

**Fase 0**
1. Ocultar la app con algo pendiente → se sube en el momento.
2. Con la app a la vista, un cambio en la nube aparece solo en ≤2 minutos.
3. Una bajada con novedades **no** te saca de la semana pasada ni cierra una edición abierta.
4. El diario escrito en la PC no pisa la semana que escribiste en el celular, y no se pierden las últimas teclas.

**Fase 1**
5. Editar en Hoy, en la semana y en el recuadro rojo (también una tarea de una semana vieja) con Enter, ✓, Esc, click afuera y texto vacío. Un solo input a la vez.
6. En modo celular, ✓, × y el ✎ de otra fila responden al primer toque. Ahora se puede borrar desde la semana. Arrastrar sigue andando.
7. Completar en cada lista → aviso → el deshacer la deja como estaba. Si completar te sube de nivel, el deshacer igual está y el aviso de nivel aparece después.
8. Recuadro rojo: como máximo 3 columnas y texto de al menos 150px en la compu; en el celular, → × ✎ visibles.

**Fase 2**
9. La zona tocable mide al menos 28×28px a 412 y a 1500. La fila tiene el mismo alto y el texto el mismo ancho (±1px). 4 toques alrededor del punto ciclan la etiqueta y no tildan.
10. En Terminal, el punto es cuadrado.

**Fase 3**
11. ← a la semana pasada: se tilda el domingo y se guarda en **su** clave. Al volver, la racha y el heatmap cambian; "Hábitos hoy" y el nivel no.
12. En el historial no hay cronómetro, ni marcas de hoy, ni confetti. La grilla de tareas sigue en solo lectura.
13. Escribir el diario de una semana pasada lo guarda ahí y no toca las demás. "Editar" en el historial lleva las flechas a esa semana.
14. Solo navegar no crea claves. Una semana vieja con menos hábitos se ve sin errores.

**Fase 4**
15. La función responde 401 sin el secreto, y con el secreto manda. Desde el sitio publicado, "Probar" no da error de CORS.
16. "Probar" en el celular, la notebook y la PC: llega, y al tocarlo abre en los hábitos. Si era de ayer, abre en ese día.
17. La primera noche, a las 22:00, llega solo y con el texto correcto (hábitos activos, tareas y hitos de mañana).
18. Una suscripción vencida se borra de la tabla. Abierta con doble click, el botón no aparece.
