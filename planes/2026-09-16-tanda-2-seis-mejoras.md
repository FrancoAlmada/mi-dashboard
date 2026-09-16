# Mi Dashboard — Tanda 2: seis mejoras

Proyecto: `PROYECTOS/Mi Dashboard/index.html` (única página, HTML+CSS+JS vanilla, ~2640 líneas, PWA en PC y celular, localStorage + sync Supabase). Convenciones: `var`, funciones globales, comentarios en español, sin build, CSS solo con tokens `var(--…)` para heredar los 3 temas.

## Contexto

La tanda 1 (2026-09-16, commits d1e72c4 → a59c5a7) dejó el dashboard limpio, con contadores coherentes, guardián de fecha y 3 temas. Franco eligió seis mejoras de la lista de ideas para esta tanda:

1. **Tres grandes de la semana** — 3 objetivos semanales arriba de las tareas, visibles en el resumen del domingo.
2. **Próximos hitos** — tarjeta propia con cuenta regresiva a parciales, entregas y fechas clave.
3. **Notas rápidas** — botón flotante siempre visible (también en celular) que abre un panel lateral con captura rápida y las notas como post-its lindos, con fijar, buscar, borrar y "pasar a tarea".
4. **Hábitos editables** — agregar, renombrar, ícono, color, reordenar, pausar, prioridad y minutos de cronómetro desde la UI.
5. **Navegar semanas pasadas** — flechas ← → en semana, hábitos y diario, **solo lectura**.
6. **Gamificación discreta** — puntos, nivel semanal con título en un chip del hero, confetti al día perfecto, puntaje en el resumen del domingo.

Descartadas para esta tanda: paleta Ctrl+K, base técnica, y todo lo que necesita backend (WhatsApp con recordatorios y edición por mensajes/audios queda anotado como tanda propia futura).

### Decisiones tomadas con el usuario
- Semanas pasadas: **solo lectura**. Hoy sigue siendo hoy; al volver al offset 0 todo es editable otra vez.
- Notas: **botón flotante + panel lateral**. El acceso principal es el botón (celular); la tecla N es un atajo extra.
- Gamificación: **discreta** (chip en el hero, confetti, resumen del domingo). Sin tarjeta de logros.
- Hitos: **tarjeta propia**.

### Decisiones técnicas (de la exploración)
- **Hábitos:** se mantiene el formato `wk_*` = `{checks:[[7 bools] x N], priorities:[7]}`. `h.id` es un casillero fijo que nunca se reutiliza; alta nueva = `max(id)+1`; **pausar en vez de borrar**. Cero migración. Definición en clave nueva sincronizada `habitos_def`, cargada antes de `loadHabits` (INIT y `recargarDesdeStorage`). Se corrigen los 3 puntos donde se mezclaba id con posición (rachas) y los 6 lugares con el 9 hardcodeado.
- **Semanas:** variantes de vista de las primitivas de fecha (no se tocan `getWeekKey`/`getMonday`); una sola variable `_semanaVista`; `tareaHTML` gana un parámetro `soloLectura` (es el único generador de handlers de tarea); guardas `if(_semanaVista!==0) return;` en `saveTareas`/`saveHabits`; el guardián y la sync resetean a 0.
- **Storage nuevo:** claves únicas con mapa interno, patrón `journal`: `grandes` (por semana), `hitos`, `notas`, `habitos_def`. Todas sincronizan solas vía `lsSet` y entran solas en exportar/importar. Ninguna choca con los regex `^wk_\d+_\d+_\d+$` / `^tareas_wk_…`.
- **Puntos:** se calculan siempre desde los datos (espejo del estado), no se acumulan.
- **Nuevos `loadX()`/`renderX()`** deben sumarse a INIT, `recargarDesdeStorage` (1087) y `verificarCambioDeFecha` (1924).
- **Atajos:** el único keydown (2476) se extiende con filtro `INPUT|TEXTAREA`.
- **Toast compartido:** `mostrarToast` y `mostrarUndo` usan el mismo elemento y timer; la gamificación no debe pisar un "Deshacer" pendiente.

---

## Plan de implementación

Orden: **0 registro → A hábitos base → B editor de hábitos → C historial base → D historial hábitos/diario → E flechas y banner → F tres grandes → G hitos → H notas → I gamificación → J cierre**. Cada fase se prueba sola (servidor `node serve.js` + Playwright headless con el Chromium local, bloqueando `supabase.js`) y se commitea por separado. Los números de línea son del archivo actual; se busca por texto.

### Paso 0 — Registro
Copiar este plan a `planes/2026-09-16-tanda-2-seis-mejoras.md` y sumar la fila al índice de `planes/README.md`.

### Fase A — Hábitos: definición viva, sin UI todavía (el dashboard debe verse idéntico)

Cuatro correcciones que salieron del relevamiento y condicionan el diseño:
- **Siembra sin `lsSet`.** Si `habitos_def` no existe, se siembra desde la lista actual con `localStorage.setItem` plano. Con `lsSet` quedaría marca de tiempo y `bajarTodo` pisaría la definición que ya está en la nube desde otro dispositivo. La primera edición real sí usa `lsSet`.
- **`esc()` (1142) no escapa comillas** y ya se usa dentro de `value=""`. Agregar `.replace(/"/g,'&quot;')`.
- **`h.icon` va sin `esc()`** en 2153 y 2173. Con ícono editable pasa a `esc(h.icon)`.
- **Nunca `return` ciego en `saveTareas`/`saveHabits` por historial**: la tarjeta Hoy sigue editable y perdería tildes. Las guardas van solo en `toggleHabit`, `setPriority`, `onDiarioInput`.

A1. Reemplazar el bloque `HABITS` (1850-1860) por: `HABITOS_DEF_KEY='habitos_def'`, `PALETA` (los 9 tokens `var(--coral|lime|butter|peri|sky|tang|azul|menta|oro)`), `HABITS_SEMILLA` (la lista actual, con `prio:true` en el id 8), `var HABITS=[]`, `normalizarHabito(h)` (tipos y límites: name ≤40, icon ≤16, color ∈ PALETA, minutos entero ≥0, pausado/prio bool), `loadHabitosDef()`, `saveHabitosDef()`, `habitPorId(id)`, `habitosActivos()`, `maxSlot()`, `slotsNecesarios()` (= maxSlot+1), `tilde(D,id,d)` (lectura segura: semanas viejas tienen menos filas).
A2. `mkDefault` (1862): `length: slotsNecesarios()`. `loadHabits` (1877): padear hasta `slotsNecesarios()`.
A3. `toggleHabit` (1892): guarda `enHistorial()` con toast, padear `checks` si el id es nuevo, luego igual. `setPriority`: guarda `enHistorial()`.
A4. `calcularRachas` (1951-1986): `hid<data.checks.length` en 1965; devolver **objeto por id** (`out[h.id]=racha`). `mejorRacha` (2179) se calcula iterando `lista`.
A5. Cronómetro: `loadTimer` 2005 valida con `habitPorId` (existe, no pausado, tiene minutos); `liberarTimer` 2033 y `arrancarTimer` 2041 usan `habitPorId` con guarda; `completarTimer` 2055 escribe `hbData.checks[hId][hbTodayIdx]=true` directo (no pasa por `toggleHabit`).
A6. `renderHabits` (2100-2191): al inicio `var D=hbData, lista=habitosActivos()`; `dayTotals`/`habTotals` (objeto por id)/`total`/`maxSem` calculados sobre `lista` con `tilde`. Cambios puntuales: 2110 denominador `lista.length||1`; 2125 `'/'+lista.length`; 2128 y 2164 `lista.map`; 2129 `isPrio=!!h.prio`; 2131-2132, 2166 `tilde(D,…)`; 2153, 2173 `esc(h.icon)`; 2158, 2184, 2186 `D.priorities`. Mensaje si `lista` está vacía. Al final escribe `hb-pct`/`hb-bar` con `total/maxSem` (se quitan de `refrescarStats`) y llama `refrescarStats()`.
A7. `refrescarStats` (1470-1482): `hbHoy` sobre `habitosActivos()` con `tilde`; quitar `hb-pct`, `hb-bar` y `semana-count` (los escriben `renderHabits` y `renderSemana`, porque pueden mostrar otra semana). Actualizar el comentario.
A8. Progreso y resumen: 2284 `h<dh.checks.length`; `nivelHeat` (2311-2317) proporcional a `habitosActivos().length` (≤25/50/75%); 2339 tooltip `n+' hábito(s)'`; `armarResumen` 2411-2414 sobre activos con `tilde`, `hbMax` en el objeto devuelto, `rachas[h.id]`; 2438 `esc(v.icon)`; 2451 `r.hbMax`.
A9. INIT: `loadHabitosDef()` entre `loadPrefs()` (2597) y `loadTareas()` (2598). `recargarDesdeStorage` (1088): `loadHabitosDef()` primero.

### Fase B — Editor de hábitos (modal)

B1. HTML 886-889: envolver `.habit-toggle` en `.habit-toolbar` (flex space-between) y sumar `<button class="habit-toggle-btn hb-editar-btn" onclick="abrirEditorHabitos()">✎ Editar</button>`.
B2. HTML después de 969: `#hb-editor-fondo.modal-fondo` > `.modal.neutra#hb-editor` con cerrar, label "· Hábitos ·", título, sub ("Cada cambio se guarda solo. Pausar esconde el hábito sin borrar su historial."), cabecera `.hbe-cab`, `#hb-editor-lista`, botón `.hbe-add` "+ Agregar hábito", `#hbe-pausados`.
B3. CSS después de 574: variante `.modal.neutra` (fondo `--surf`, texto `--t1`, para que los swatches se lean); `.habit-toolbar`, `.hb-editar-btn`; grilla `.hbe-cab/.hbe-fila` (`46px minmax(120px,1fr) auto 84px 34px auto`); inputs estilo `.login-input`; `.hbe-swatches/.hbe-sw` (círculo con `--sw`, `.activo` con anillo); `.hbe-min`; `.hbe-prio` (radio oculto + ★ en `--oro`); `.hbe-btn` (↑ ↓ Pausar / Reactivar); `.hbe-add` punteado; `details.hbe-pausados`; `.hbe-fila.pausada{opacity:.6}`; móvil ≤700px: cabecera oculta, grilla `46px 1fr auto`, swatches y minutos a ancho completo. Solo tokens.
B4. JS después de `selectHabitDay` (1914): `editorAbierto()`, `abrirEditorHabitos()`, `cerrarEditorHabitos()`, `filaEditorHTML(h,pos,n)` (valores del usuario solo en `value=""` con `esc`; en los `onclick` viajan solo ids numéricos y tokens de PALETA), `renderEditorHabitos()` (activos + `<details>` de pausados con estado `_hbePausadosAbierto`), `setHabitCampo(id,campo,valor)` (name vacío se descarta; icon; minutos con cancelación del timer si corre en ese hábito; color redibuja el editor), `setHabitPrio(id)` (uno solo), `moverHabito(id,dir)` (reordena dentro de activos, pausados al final), `pausarHabito(id)` (quita prio, cancela timer, toast), `reactivarHabito(id)`, `agregarHabito()` (id = `maxSlot()+1`, padea `hbData.checks`, foco en el nombre). **Guardado inmediato con `lsSet` en cada cambio confirmado** (`onchange`, no `oninput`): es lo que hace todo el dashboard, no hay estado sucio al cerrar con Escape, y la sync ya agrupa subidas. Los campos de texto no redibujan la lista (perderían el foco).
B5. Keydown (2476-2478) versión final: Escape cierra resumen o editor; ←/→ llaman `irSemana(±1)` solo si no hay modal ni editor, el target no es INPUT/TEXTAREA/SELECT y no hay modificadores.
B6. `recargarDesdeStorage`: `if(editorAbierto()) renderEditorHabitos();`

### Fase C — Historial de semanas: base (tareas)

C1. Después de 1173: `var _semanaVista=0` (nunca se persiste), `enHistorial()`, `getMondayVista()`, `getWeekKeyVista()`, `getWeekDatesVista()`, `tareasDeVista()` (offset 0 → `tareasData` vivo; historial → copia leída con `leerSemanaKey('tareas_'+key)` o default vacío), `habitsDeVista()` (ídem con `wk_*`, repara `priorities`), `habitosParaVista(D)` (activos + pausados que esa semana tuvieron algún tilde), `irSemana(delta)` (nunca >0), `volverAHoy()`, `renderVista()` (único redibujo: `renderSemana(getTodayIdx(),getWeekDatesVista())`, `renderHabits()`, `renderDiario()`, `renderNavSemana()`).
C2. `renderTareas` 1447: `renderSemana(hoyIdx,getWeekDatesVista())`. `renderHoy` no cambia: hoy siempre es hoy.
C3. `tareaHTML` (1410) gana 5º parámetro `soloLectura`: devuelve `.task.ro` sin onclick, sin `.task-del`, sin drag, etiqueta como `<span class="tag-pill ro">`.
C4. `renderSemana` (1499-1534): `ro=enHistorial()`, `datos=tareasDeVista()`; escribe `#semana-count` (hechas/total de la semana vista); en historial las tarjetas llevan `.historial` (ni `.es-hoy` ni `.pasado`, chip con DS3), sin `ondragover/ondrop`, sin `.add-wrap`; `tareaHTML(d,x.t,x.i,!ro,ro)`; `_focusDia` solo si `!ro`.
C5. CSS después de 293: `.dia-card.historial{padding-bottom:14px}`, `.task.ro`/`.tag-pill.ro` sin hover ni cursor.

### Fase D — Historial: hábitos y diario

D1. `renderHabits`: `var ro=enHistorial(), D=habitsDeVista(), lista=habitosParaVista(D); fechas = ro?getWeekDatesVista():hbDates; hoyI = ro?-1:hbTodayIdx;` y reemplazar `hbDates`→`fechas`, `hbTodayIdx`→`hoyI` en 2105, 2109, 2110, 2124, 2163, 2166, 2167, 2181, 2186. Rachas 0 en historial (2135, 2170) y `_rachasCache = ro?{}:calcularRachas()` (2101). Sin cronómetro (2142 `!ro`). `.hb-body` sin onclick y `.hb-cell` sin onclick + clase `.ro` si `ro`. Input de prioridad `readonly` con placeholder "Sin prioridad ese día". CSS: `.hb-item.ro, .hb-cell.ro { cursor:default }`.
D2. `renderDiario` (2233): usa `getWeekDatesVista()`/`getWeekKeyVista()`, `el.readOnly=ro`, pisa el valor siempre en historial, placeholder "No escribiste nada esa semana.". `onDiarioInput` (2211): `if(enHistorial()) return;`. `renderDiarioHistorial` excluye también la semana vista. CSS: `.diario-txt[readonly]{border-style:dashed;color:var(--t2);cursor:default}`.
D3. Resets: `recargarDesdeStorage` primera línea `_semanaVista=0` y al final `renderNavSemana()`; `verificarCambioDeFecha` después de actualizar `_semanaEnMemoria/_diaEnMemoria`: `_semanaVista=0`, y `renderNavSemana()` junto a los renders.

### Fase E — Flechas, botón Hoy y banner

E1. HTML: envolver las tres tarjetas (antes de 862 … después de 905) en `#zona-vista.zona-vista` con un `#vista-banner.vista-banner` sticky arriba (ícono ◷, texto `#vista-banner-txt`, botón `.status-btn` "Volver a hoy →"). Widget `.sem-nav` (← / Hoy / →, el → con clase `.sem-nav-sig` y `disabled` en offset 0) en los tres headers: semana 868 (envolver con `.card-hd-der` junto a `#semana-count`), hábitos 880-883 (agregar `id="card-habitos"` a la tarjeta), diario 901.
E2. CSS después de 182: `.card-hd-der`, `.sem-nav` (píldora `--surf3`), `.sem-nav-btn`, `.sem-nav-hoy` (oculto salvo `.sem-nav.historial`), `.zona-vista{position:relative}`, `.vista-banner` (sticky top 10px, z 5, borde punteado `--butter`, `--shadow-toast`; `position:static` en ≤700px), `.card.historial, .habit-card.historial, .diario-card.historial { border: dashed var(--butter) }`. Solo tokens.
E3. JS `renderNavSemana()`: toggle `.historial` en los `.sem-nav` y en las 3 tarjetas, habilita `→`, arma el texto "Viendo la semana del 8 sep al 14 sep (la semana pasada / hace N semanas) · solo lectura" y muestra el banner.
E4. INIT después de `renderDiario()`: `renderNavSemana()`.

### Convenciones para F–I (features nuevas)
- **JS**: un bloque por feature, insertados antes de `/* ═══ RESUMEN DE LA SEMANA (domingo) ═══ */` (2393), empezando por helpers compartidos: `nuevoId()` (mismo formato que las tareas), `esCampoDeTexto(el)`, `hoyCero()`.
- **CSS**: un bloque por feature antes de `/* ══════════ TEMA: PAPEL EDITORIAL ══════════ */` (698); los ajustes de Terminal (radios 0 en puntos, minúsculas en labels nuevos) al final del bloque Terminal (después de 804).
- **Ids** base36 en los `onclick`, nunca índices (las listas se reordenan al dibujar).
- **Fechas `AAAA-MM-DD`** se parsean como fecha local (`new Date(a,m-1,d)`); `new Date('2026-09-20')` es UTC y en Argentina cae el día anterior.
- **`deshacer` (1755)** gana ramas `tipo:'grande'|'hito'|'nota'` justo después de `clearTimeout(_undoTimer); ocultarUndo();`.
- **z-index**: velo de notas 49, panel 50, toast 60 (queda), botón flotante 70, modal 80, confetti 85, login 90. El panel va debajo del toast a propósito: en celular ocupa toda la pantalla y el "Nota borrada · Deshacer" tiene que verse.

### Fase F — Tres grandes de la semana
- Storage: clave `grandes` = `{ "wk_A_M_D": [ {id,texto,hecha} ] }`, máximo 3. Las mutaciones resuelven `getWeekKey()` en el momento: nunca escriben en la semana equivocada. Es la tarjeta de "esta semana", queda fuera de la zona de historial.
- HTML después del filtro-bar (837): `.card#card-grandes` con label naranja "· Tres grandes de la semana ·", título "Lo que tiene que pasar", `#grandes-count` (n / 3), `#grandes-lista`, `.add-wrap#grandes-add` con `#add-grande` (Enter agrega) y `#grandes-nota`.
- CSS: `.grande` (fila clickeable), `.grande-num` (aro naranja con 1·2·3 que se llena con ✓), `.grande-txt` 16px (tachado si hecha), `.grande-edit` ✎ y `.task-del` que aparecen al hover (siempre visibles en celular), `.grande-input` para edición inline. Terminal: `.grande-num{border-radius:0}`.
- JS: `loadGrandes/saveGrandes/grandesSemana(crear)/buscarGrande/addGrande` (toast "Tres y no más: si todo es importante, nada lo es" al 4º), `toggleGrande`, `deleteGrande` (undo), `editarGrande`/`guardarEdicionGrande`/`onGrandeEditKey` (Enter guarda, Escape cancela con `stopPropagation`, blur guarda; `_grandeEditando`), `onGrandeAddKey`, `renderGrandes()` (oculta el input al llegar a 3 y termina en `refrescarStats()` porque los puntos dependen de los grandes).
- Resumen del domingo: `armarResumen` devuelve `tresGrandes`; `abrirResumen` inserta la sección "Tres grandes · N de 3" entre la barra (2446) y "Lo que hiciste" (2447), con `.modal-grande/.modal-grande-num` sobre butter.

### Fase G — Próximos hitos
- Storage: `hitos` = `[{id,texto,fecha:'AAAA-MM-DD',tag}]`. Vencidos: se muestran 1 día ("ayer", coral), se ocultan desde 2 días y se borran del storage a los 7 (no alimentan historial). Constantes `HITO_OCULTAR=-1`, `HITO_BORRAR=-7`.
- HTML después de `#lista-pendientes` (859) y **antes** de la zona de historial, así hoy → pendientes → hitos → semana y la zona con banner sticky queda contigua: `.card#card-hitos` label celeste "· Próximos hitos ·", título "Lo que se viene", `#hitos-count` ("N próximos"), `#hitos-lista`, `.hito-add` con texto + `input[type=date]` + botón "Agregar" (Enter en cualquiera agrega; sin fecha → toast "Ponéle fecha al hito").
- CSS: `.hito` con chip `.hito-dias` (hoy / mañana / N días / ayer / hace N días), `.hito-txt`, `.hito-fecha` ("SÁB 20 sep", con año si no es el actual), tag-pill ciclable, `.task-del`. Estados: `.es-hoy` (lime), `.cerca` ≤3 días (tang con `rgba(var(--tang-rgb),…)`), `.vencido` (coral, opacidad). Celular: wrap. El `input[type=date]` toma el `color-scheme` de cada tema. Terminal: `.hito-dias, .hito-add-btn` en minúscula.
- JS: `loadHitos/saveHitos/parseFechaLocal/diasHasta/textoFaltan/fmtFechaHito/buscarHito/addHito/deleteHito(undo)/cambiarTagHito/agregarHitoDesdeInputs/onHitoKey/renderHitos()` (limpia vencidos >7 días, ordena por cercanía).

### Fase H — Notas rápidas (botón flotante + panel lateral)
- Storage: `notas` = `[{id,texto,color:'butter'|'lime'|'sky'|'peri'|'tang',fijada,creada:ISO}]`.
- HTML después del toast (946): `#notas-fondo` (velo, click cierra), `<aside #notas-panel>` con header (label "· Notas rápidas ·", título "Anotá y seguí", `.notas-cerrar`), `#notas-form` (textarea `#notas-txt` autosize, fila con 5 círculos de color `#notas-colores`, 📌 `#notas-fijar`, botón Guardar), `#notas-buscar` (type=search), `#notas-grid`; y el botón flotante `#notas-fab` (✎, con badge `#notas-badge` con la cantidad total; cuando el panel está abierto pasa a × y sirve para cerrar, sobre todo en celular).
- CSS: FAB 54px fijo abajo-derecha (`--lime`/`--on-lime`, `--shadow-toast`; en ≤560px `bottom:74px` para no tapar el toast que ahí va a todo el ancho); panel `width:min(440px,100%)`, `100dvh`, desliza desde la derecha con `transform`, `--surf` + `--shadow-modal`; caja de escribir con borde superior de 3px del color elegido (`--nc`); grilla masonry con `columns: 2 170px` (2 columnas también a 400px); `.nota` post-it con borde superior del color y tinte por `::before` con `background:var(--nc); opacity:.07` (no hay tripletas RGB para sky/butter/peri, y así funciona en los 3 temas); acciones 📌 → × siempre visibles; `body.notas-abiertas{overflow:hidden}` en ≤560px; `.main{padding-bottom:130px}` en celular para que el FAB no tape los botones del pie; `prefers-reduced-motion` sin transiciones. Terminal: círculos y badge cuadrados, FAB con halo verde.
- JS: `loadNotas/saveNotas/colorNota/buscarNota`, `abrirNotas/cerrarNotas/toggleNotas/notasAbiertas` (foco en el textarea solo con `(hover: hover)`: en celular levantaría el teclado), `autosizeNota`, `onNotaKey` (Enter guarda, Shift+Enter salto), `setNotaColor/renderNotasColores`, `toggleFijarNueva`, `guardarNotaDesdeInput` (unshift; fijar no queda pegado para la siguiente), `toggleFijarNota`, `borrarNota` (undo), `notaATarea` (agrega la primera línea a hoy con `addTarea(getTodayIdx(),texto,tagActiva)` y saca la nota; el undo devuelve la nota **y** quita la tarea creada por id), `onNotasBuscar`, `renderNotas()` (fijadas arriba, más nueva primero, badge con el total no filtrado, `relDate` para la fecha).

### Fase I — Gamificación discreta
- **Puntos derivados, no acumulados**: es la misma filosofía de `refrescarStats` (espejo del estado), no hay carrera de sync entre dispositivos, destildar resta solo, nada nuevo que exportar. `PTS={tarea:10, habito:5, grande:30, diaPerfecto:25}`.
- `NIVELES` con umbrales 0/60/140/240/360/500 y títulos **Arrancando · Metiendo pila · Constante · Prendido fuego · Máquina · Leyenda**. Escala: hábitos máx 315 + grandes 90 + días perfectos 175 + tareas 10 c/u; nivel 3 es una semana normal.
- HTML: `.date-pill.nivel-pill#nivel-pill` después de `#date-pill` (813) con `#nivel-txt` ("Nivel 3 · Constante · 180 pts") y mini barra `.nivel-bar > i#nivel-bar-fill` hacia el próximo nivel; `title` con el desglose. En Terminal ya cae en la regla de minúsculas.
- JS: `habitosDelDia(d)` (**sobre `habitosActivos()` con `tilde`**), `calcularPuntos()` (tareas hechas, hábitos tildados, grandes hechos, días perfectos = `n===habitosActivos().length && n>0`), `nivelDe(pts)`, `refrescarNivel()` (escribe el chip; toast "Subiste a Nivel N · Nombre" solo en transición ascendente, `_nivelPrevio`), `lanzarConfetti()` (canvas propio z 85, 140 partículas con los tokens del tema activo, 1.5 s, se borra solo, nada con `prefers-reduced-motion`), `detectarDiaPerfecto(antes,dIdx)` (si `dIdx===hbTodayIdx` y pasó de N-1 a N activos: confetti + toast "Día perfecto +25 🎉").
- Integración: `refrescarStats` termina en `refrescarNivel()`; `toggleHabit` (ya con guarda de historial de A3) mide `antes`/`después` y llama `detectarDiaPerfecto`; `completarTimer` también (escribe directo y luego detecta). `armarResumen` devuelve `puntos` y `nivel`; `abrirResumen` inserta la sección "Puntos · Nivel N · Nombre" con chips Total / Tareas / Hábitos (+ Tres grandes, Días perfectos si hay) entre "Hábitos" (2452) y los botones (2453).

### Integraciones compartidas (una sola vez, al final)
- **Keydown único (2476-2478)**, versión definitiva: `Escape` cierra en orden resumen → editor de hábitos → notas; `N` (sin modificadores, fuera de campos de texto) `toggleNotas()`; `←/→` `irSemana(∓1)` solo si no hay resumen, editor ni notas abiertos, fuera de campos de texto y sin modificadores. En `onGrandeEditKey` el Escape hace `stopPropagation`.
- **`recargarDesdeStorage` (1087)**: `_semanaVista=0; loadHabitosDef(); loadPrefs(); loadTareas(); loadHabits(); loadDiario(); loadGrandes(); loadHitos(); loadNotas();` + fechas + `renderTareas(); renderHabits(); renderDiario(); renderProgreso(); renderGrandes(); renderHitos(); renderNotas(); renderNavSemana(); if(editorAbierto()) renderEditorHabitos();`.
- **`verificarCambioDeFecha` (1924)**: `_semanaVista=0` al detectar cambio; en los renders sumar `renderGrandes(); renderHitos(); renderNotas(); renderNavSemana();` (sin loads nuevos: `grandes` es un mapa con todas las semanas, `hitos`/`notas` no son semanales).
- **INIT (2593-2619)**: `loadHabitosDef()` después de `loadPrefs()`; `loadGrandes(); loadHitos(); loadNotas();` después de `loadTimer()` (antes de `renderTareas`, que llama `refrescarStats → refrescarNivel → grandesSemana`); después de `renderHabits()`: `renderGrandes(); renderHitos(); renderNotasColores(); renderNotas();`; después de `renderDiario()`: `renderNavSemana()`.
- **`esc()` (1142)**: `+ .replace(/"/g,'&quot;')`.

### Fase J — Cierre
- `sw.js`: `CACHE='dashboard-v3'`.
- `SETUP.md`: sin cambios. `planes/README.md`: la fila del Paso 0 apunta a este plan.
- Un commit por fase (A+B "Hábitos editables", C+D+E "Historial de semanas en solo lectura", F "Tres grandes", G "Hitos", H "Notas rápidas", I "Nivel semanal y confetti", J cierre). Push al final si Franco lo pide.

---

## Verificación

Servidor `node serve.js` (5599) + Playwright headless con el Chromium local, `route('**/supabase.js', abort)`, consola sin errores en cada fase, capturas desktop y 400px en los 3 temas. Además de las aserciones automáticas, revisar las capturas a ojo.

1. **Fase A** (nada visible cambia): `JSON.parse(localStorage.getItem('habitos_def')).length===9`, `calcularRachas()` es objeto `{0..8}`, `maxSlot()===8`; Vista Día/Semana, %, hero y resumen ("de 63") idénticos; cronómetro UNI sobrevive a F5.
2. **Fase B**: "✎ Editar" abre el modal en los 3 temas; agregar → "Nuevo hábito" con foco, `maxSlot()===9`, tildarlo → `checks.length===10`; renombrar a `Prueba "<b>"` se ve literal; ↑↓ reordena; Pausar → "Pausados (1)", % y anillos bajan de denominador; Reactivar recupera tildes; pausar el hábito con timer corriendo → `timerActivo===null`; ★ se muda y no explota al pausar al que la tiene; Escape y click afuera cierran; F5 persiste; borrar `habitos_def` y recargar siembra igual.
3. **Fases C–E**: sembrar una semana vieja desde consola (`tareas_wk_*`, `wk_*`, `journal`). Click ← → las tres tarjetas cambian juntas, banner "Viendo la semana del … (la semana pasada) · solo lectura", bordes punteados, `→` habilitado, botón Hoy visible. `document.querySelectorAll('#lista-semana [onclick],#lista-semana input,#lista-semana [draggable],#lista-semana .pasado,#lista-semana .es-hoy').length===0`; en hábitos ningún onclick mutador, sin 🔥, sin ▶, prioridad `readOnly`; diario `readOnly` con el texto viejo y el historial no la repite. **La tarjeta Hoy sigue editable y persiste tras F5.** Semanas sin datos → tarjetas vacías; `→` nunca pasa de 0. Teclado: ←/→ con foco en body sí, dentro de un input no, con modal abierto no. `recargarDesdeStorage()` y F5 vuelven a 0.
4. **Fase F**: cargar 3 grandes → el input desaparece y aparece la nota; borrar → vuelve; Deshacer reinserta en su lugar; click tilda (aro → ✓) y el chip suma 30; ✎ Enter/Escape/blur; el resumen muestra "Tres grandes · N de 3".
5. **Fase G**: sin fecha → toast; hoy → chip verde "hoy"; mañana y +3 → naranja; +10 → gris; ayer → coral; hace 2 días no se ve pero está en storage; hace 8 → desaparece del storage al renderizar; pill cicla; × con undo.
6. **Fase H**: FAB visible sin scroll en desktop y 400px, badge oculto con 0; N abre/cierra, N dentro de `#add-hoy` escribe; Escape y velo cierran; Enter guarda, Shift+Enter crece; colores cambian el borde; 📌 sube la nota; buscar filtra sin tocar el badge; × → toast visible **encima** del panel y **debajo** del FAB en 400px, Deshacer devuelve; "→" crea la tarea de hoy y saca la nota, Deshacer revierte ambas (`#hoy-count`); 3 temas; en 400px panel a todo el ancho, body sin scroll detrás, 2 columnas, última nota no tapada.
7. **Fase I**: chip "Nivel 1 · Arrancando · 0 pts"; `nivelDe(0).n===1, nivelDe(60).n===2, nivelDe(139).n===2, nivelDe(140).n===3, nivelDe(999).pct===100`; tildar todos los hábitos activos de hoy → confetti + toast, `calcularPuntos().perfectos===25`; destildar y volver a tildar → confetti otra vez; el mismo en otro día en Vista Semana suma sin confetti; cruzar 60 → toast de nivel; con `prefers-reduced-motion` no hay canvas; resumen con la sección Puntos.
8. **Transversal**: `exportarDatos()` incluye `habitos_def`, `grandes`, `hitos`, `notas`; `sync_meta` tiene `grandes` tras un cambio real y **no** tiene `habitos_def` tras la siembra (sí tras editar); `calcularPuntos().total` = suma de partes y responde ±10 al tildar/destildar una tarea.
