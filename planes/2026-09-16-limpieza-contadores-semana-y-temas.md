# Mi Dashboard — Limpieza, contadores coherentes, semana nueva y temas

Proyecto: `PROYECTOS/Mi Dashboard/index.html` (única página, HTML+CSS+JS vanilla, 2566 líneas, PWA + localStorage + sync Supabase).

## Contexto

Franco usa el dashboard todos los días desde varios dispositivos (PWA instalada). Pidió cuatro cosas:

1. **Sacar los cronómetros de las tareas** (el ▶ por tarea) y el **botón de tareas recurrentes** (↻): no le resultan útiles.
2. **Arreglar los contadores** del hero, tarjetas y filtro, que muestran números que no cierran entre sí.
3. **Arreglar el tracker de hábitos**, que al estrenar la semana del lunes 2026-09-14 apareció con los hábitos de la semana anterior ya marcados.
4. **Un botón que rote entre 3 identidades visuales** completas (colores + tipografías + formas).

Además pidió ideas de mejora para tandas futuras (ver sección final; en esta tanda NO se implementan).

### Decisiones tomadas con el usuario
- Cronómetros: se elimina **solo el de tareas**. El cronómetro de hábitos (UNI 90min / 30min Aprendizaje, cuenta regresiva que auto-tilda) **se conserva**.
- Contadores: **el filtro de etiqueta solo oculta listas**. Todos los números (hero, tarjetas, domingo, progreso) son globales. El filtro y la etiqueta activa pasan a ser **por dispositivo** (no se sincronizan). La barra del filtro muestra cuántas tareas quedan ocultas.
- Temas: **Nocturno** (el actual, default), **Papel editorial** (claro, serif), **Terminal** (monospace, verde fósforo). Cambian también las tipografías. El tema es por dispositivo.
- Ideas: se documentan, se implementan en la próxima tanda.

### Diagnóstico (resumen de la exploración)
- **Timers**: un solo motor `timerActivo` (clave `timer_activo`) con `tipo:'habito'` y `tipo:'tarea'`. Hay que hacer cirugía dentro del bloque CRONÓMETRO (1882-2024), no borrarlo. La feature "Tiempo medido" (domingo y progreso) depende de `t.segundos` y se va con el timer de tareas.
- **Recurrentes**: bloque JS 1172-1245, CSS 147-177, HTML generado en `tareaHTML` 1373-1389. Peligro: `loadTareas` 1271 llama `generarRecurrentes()` solo al estrenar semana → si se borra la función sin editar esa línea, explota el lunes.
- **Contadores**: no existe refresco central; cada número lo escribe un render distinto con una definición distinta (hero = total de hoy con filtro; pills = no hechas de la semana sin filtro; pendientes = con filtro; domingo = sin filtro). `filtro_tag` se sincroniza a Supabase y `loadPrefs` no puede apagarlo (`''` es falsy) → filtro fantasma entre dispositivos. `renderProgreso` solo corre en init y post-sync.
- **Hábitos**: `loadHabits` (1824) no resetea `hbData` cuando la clave de la semana nueva no existe; `hbTodayIdx`/`hbDates` se calculan una vez (1822). La PWA no se recarga, cruza domingo→lunes con los ticks viejos en memoria y el primer toque los escribe en la clave nueva y los sube a la nube. Mismo problema a medianoche con el día. `loadTareas` tiene el mismo defecto de no-reset.
- **CSS**: 18 tokens en `:root` y ~119 colores literales fuera (la mayoría duplicados de variables o "tinta sobre acento"), radios sin tokens, una sola fuente. Nada de tema hoy.

---

## Plan de implementación

Todo el trabajo va en `index.html` salvo el bump de `sw.js`. Convenciones del repo: `var`, funciones globales, comentarios en español, sin build. Los números de línea son los del archivo actual; después del primer borrado corren, así que se busca por texto.

**Orden obligatorio:** A → B → C → D → E (temas) → F (sw + registro). D depende de C (`hbTodayIdx` fresco) y de A/B (`tareaHTML` simplificado). E es independiente pero se hace al final para no pelear con los diffs de A–D.

### Paso 0 — Registro del plan (convención del repo)
Copiar este plan a `planes/2026-09-16-limpieza-contadores-semana-y-temas.md` y agregar la fila en `planes/README.md` **antes** de implementar (así lo hace el repo desde el 2026-08-28).

### Paso A — Eliminar tareas recurrentes (+ `loadTareas` con reset)

A.1 **Primero** reescribir `loadTareas` (1255-1272) para que arranque con `tareasData=mkTareasDefault()` y solo lo pise si hay clave válida (`Array.isArray(d.dias)`, rellenar hasta 7 días). Esto elimina la llamada a `generarRecurrentes()` de 1271 (bomba: si se borra la función sin editar esto, explota el lunes) y de paso resuelve el no-reset de tareas al estrenar semana.
A.2 Borrar el bloque JS 1172-1246 completo (REC_KEY, recurrentes, _repAbierto, _repBorrador, load/saveRecurrentes, recDeTexto, toggleRepPicker, toggleRepDia, guardarRep, quitarRep, generarRecurrentes).
A.3 Llamadas sueltas: 973 quitar `loadRecurrentes();`; 2525 borrar la línea; 1595-1596 borrar el `if(_repAbierto===tareaId)`. Lo de `tareaHTML` se resuelve en B.4.
A.4 CSS: borrar 147-177 (`.task-rep`, `.rep-picker`, `.rep-dia`, `.rep-acc`).
A.5 La clave `recurrentes` queda huérfana en localStorage y Supabase: **se deja** (nadie la lee, `lsDel` no propaga borrados). Opcional a mano en el SQL editor: `delete from datos where clave in ('recurrentes','filtro_tag','tag_activa');`

### Paso B — Eliminar el cronómetro de tareas (conservar el de hábitos)

B.1 CSS: borrar 195-212 (`.task-play`, `.task-crono`, `.task-tiempo`). En el media query móvil 605-613 borrar 606, 607, 611, 613 y conservar `.hoy-grid .task .task-del {...}` y `.hoy-grid .task .tag-pill { margin-left: 32px; }`. **No tocar** 418-439 (timer de hábitos).
B.2 Sección CRONÓMETRO (1882-2024):
- `loadTimer` 1899-1901: descartar cualquier timer guardado con `tipo==='tarea'` o sin `habitId` numérico (`localStorage.removeItem(TIMER_KEY)`).
- Borrar `segundosTranscurridos`, `fmtCrono`, `fmtDuracion`, `buscarTarea` (1925-1948), `guardarTiempoTarea` (1966-1971), `arrancarTimerTarea` y `pararTimerTarea` (1980-1990), la rama `tipo==='tarea'` de `arrancarTick` (2013-2017).
- `liberarTimer` queda solo con la rama de hábito (confirm "ya tenés el cronómetro corriendo en el hábito X").
- `arrancarTimer`: `timerActivo={habitId,inicio,objetivoMin}` sin `tipo`, y sin el `renderTareas()` de 1978.
- Init 2538-2541: `if(timerActivo){ if(segundosRestantes()<=0) completarTimer(); else arrancarTick(); }`.
B.3 Datos: 1315 quitar `segundos: 0`; `moverTareaADia` 1585-1594 queda solo `splice` + `push`; `deshacer` 1719-1721 borrar el `if(timerActivo...)`. El campo `segundos` huérfano en `tareas_wk_*` viejas **se ignora, no se migra**.
B.4 `tareaHTML` (1353-1412): nueva firma `tareaHTML(diaIdx,t,i,arrastrable)` sin `conTimer`, sin `cronoHTML/tiempoHTML/repHTML/pickerHTML`, y sin el `<div>` envoltorio (verificado: `.hoy-grid` y `.dia-tareas` no dependen de él y `contarOcultas` usa `children`). Callers: 1448 `tareaHTML(hoyIdx,x.t,x.i,false)`, 1475 `tareaHTML(d,x.t,x.i,true)`.
B.5 "Tiempo medido": `armarHistorial` quitar `segPorTag` (2247, 2255); `renderProgreso` quitar `totSeg` (2319, 2323) y el sufijo `fmtDuracion` en 2332; `armarResumen` quitar `segPorTag` (2346, 2357, 2368-2369); `abrirResumen` borrar `chipsTiempo` (2381-2384) y la sección 'Tiempo medido' (2407).

### Paso C — Hábitos: reset de semana, guardián de fecha, reparación

C.1 `loadHabits` (1824): arrancar con `hbData=mkDefault()`, pisar solo si hay clave con `checks` array; rellenar `checks` hasta `HABITS.length` y **también `priorities`** (objetos viejos sin `priorities` hacen explotar `setPriority`).
C.2 **Guardián de fecha** (nuevo bloque después de 1834):
```js
var _semanaEnMemoria=getWeekKey(), _diaEnMemoria=getTodayIdx();
function verificarCambioDeFecha(){
  // devuelve false | 'dia' | 'semana'
  // si cambió: recalcula hbDates/hbTodayIdx/hbActiveDay, setupHeader();
  // si cambió la semana: loadTareas(); loadHabits(); loadDiario();
  // siempre: renderTareas(); renderHabits(); renderDiario(); renderProgreso(); quizasAbrirResumen();
}
```
C.3 Blindar guardados: primera línea de `saveTareas` (1274) y `saveHabits` (1825): `if(verificarCambioDeFecha()==='semana'){ toast('Cambió la semana: volvé a cargar eso'); return; }`. Nunca más se escribe la semana vieja bajo la clave nueva. Ventana de pérdida: una mutación hecha en los ≤60 s posteriores al lunes 00:00 con la pestaña abierta; se avisa con toast. `saveDiario` no necesita blindaje (mapa por semana, clave resuelta al teclear).
C.4 Disparadores (init 2559-2563): `setInterval(verificarCambioDeFecha,60*1000)`, `visibilitychange` (si no hidden: verificar + mails), `window.addEventListener('focus',verificarCambioDeFecha)`. En `recargarDesdeStorage` 974 actualizar también `_semanaEnMemoria`/`_diaEnMemoria` para no re-disparar.
C.5 **Reparación de la semana en curso** (`wk_2026_8_14`, hoy es miércoles): función de consola `limpiarHabitosFuturos()` que destilda solo los días posteriores a hoy y guarda con `lsSet` (así llega a la nube y a los otros dispositivos). Lunes a miércoles se destildan a mano en Vista Semana porque solo Franco sabe cuáles son legítimos. Queda en el código como red por si un dispositivo con caché vieja re-contamina.

### Paso D — Contadores coherentes (regla: todos globales, el filtro solo oculta listas)

D.1 Semántica única por número:

| Elemento | Significado |
|---|---|
| `s-tasks` (hero, label pasa a **"Faltan hoy"**, línea 704) | tareas de hoy sin hacer |
| `s-pendientes` | no hechas de días pasados de esta semana + semanas anteriores, sin filtro |
| `s-habits` | hábitos tildados hoy con `hbTodayIdx` fresco |
| `hoy-count`/`hoy-bar`, `semana-count`, `dia-cant` | hechas / total, sin filtro |
| `hb-pct`/`hb-bar` | tildes / `HABITS.length*7` (reemplaza el 63 en 2055, 2363, 2408) |
| pills del filtro | tareas **no hechas** de la semana por etiqueta; "Todas" = suma, con pill "—" para las sin etiqueta cuando existan |
| `filtro-nota` | "Filtrando por X — N tareas ocultas esta semana (M de hoy)", conteo real |

D.2 Función central `refrescarStats()` (insertar después de `renderTareas` 1432): único lugar que escribe hero + `hoy-count/bar` + `semana-count` + `hb-pct/bar`, leyendo `tareasData`, `hbData` y `_pendTotal` (que llena `renderPendientes`). Llamarla como última línea de `renderTareas` y de `renderHabits`. Quitar las escrituras dispersas: `renderHoy` 1438-1439/1443-1445, `renderSemana` 1454-1457/1460 (y `dia-cant` sobre `tareas`, no `visibles`), `renderHabits` 2055/2058-2060.
D.3 `renderPendientes` (1612-1661): `_pendCache` sin filtro → `_pendTotal=_pendCache.length`; la lista visible se filtra después conservando el índice real (`{p,i}`) para que `togglePend(i)` siga apuntando bien.
D.4 `renderProgreso` tras mutaciones: `programarProgreso()` con debounce 300 ms, llamado al final de `saveTareas`, `saveHabits` y `guardarSemanaKey` (1291-1293). Init y `recargarDesdeStorage` siguen llamando `renderProgreso()` directo.
D.5 Preferencias por dispositivo: agregar `'filtro_tag','tag_activa'` a `NO_SINCRONIZAR` (864); **además** filtrar con `seSincroniza` en la bajada (`bajarTodo` 928, primera línea del forEach) y en la subida (`subirPendientes` 955), porque las filas viejas en Supabase seguirían bajando y `sync_meta` de dispositivos viejos las tiene anotadas. `loadPrefs` 1118-1119: `''` o clave inválida = sin filtro (`if(f!==null) filtroTag = (f==='_'||tagById(f)) ? f : null`).
D.6 Filtro "sin etiqueta": valor `'_'` (mismo literal que ya usa `t.tag||'_'`), `setFiltro(-2)`. Helpers junto a `pasaFiltro` (1135): `pasaFiltroTag(tag)`, `pasaFiltro(t)`, `nombreFiltro()`. Reemplazar `tagById(filtroTag).label` en 1169, 1449, 1477 por `nombreFiltro()` (con `'_'` explotaría). Reescribir `renderFiltro` (1148-1170) con el conteo de ocultas.

### Paso E — Tres temas con un botón (Nocturno / Papel / Terminal)

Principio: **Nocturno queda pixel-perfect** (mismos valores, solo pasan a tokens). Los otros dos temas redefinen tokens en `[data-tema="papel"]` y `[data-tema="terminal"]` más un puñado de reglas propias.

E.1 **Tokenizar `:root`** (22-30). Además de los 18 actuales: `--muted:#525252`; `--azul/--menta/--oro` (los 3 colores de HABITS que no eran variables); `--lime-hover:#A2F0A9`, `--link-hover:#A6D7FA`; tinta sobre acento `--on-accent:#0A0A0A`, `--on-coral:#140502`, `--on-coral-hi:#FFF0EC`, `--on-lime:#0A1A0C`, `--on-butter:#16150A`, `--on-peri:#F2F2FF`, `--on-tang:#1A0E02`; **tripletas RGB** para los rgba (`--coral-rgb:240,81,46`, `--lime-rgb`, `--tang-rgb`, `--on-coral-rgb`, `--on-butter-rgb`, `--on-accent-rgb:0,0,0`, `--scrim-rgb:0,0,0`) usadas como `rgba(var(--coral-rgb),.16)` — se eligió tripletas porque hay 12 alphas distintas de negro y así el alpha queda en la regla; heatmap `--heat-1..4` (#1F4A28 #2F7A3D #4FB25C #86E88F); tipografías `--font-display`, `--font-ui`, `--font-mono` y `--ui:var(--font-ui)` como alias (los 23 usos de `var(--ui)` no se tocan); radios con la escala exacta de hoy `--r:26px --r-md:20 --r-in:18 --r-sm:14 --r-xs:12 --r-ctl:10 --r-box:7 --r-mini:6 --r-pill:100px`; `--shadow-card:none`, `--shadow-toast`, `--shadow-modal`; `--title-grad:linear-gradient(...)` y `--title-fill:transparent`.
E.2 **Mapa de reemplazos** por `sed` con rango de líneas (31-693 para CSS, 694-2566 para HTML/JS; nunca tocar `:root` ni la línea 9). Orden: primero los dos velos que son texto sobre acento (417 `rgba(0,0,0,0.6)` y 447 `rgba(0,0,0,0.45)` → `--on-accent-rgb`), después tinta sobre acento (`#0A0A0A`→`--on-accent` ×20 incl. JS 2064/2069/2078/2086/2110; `#140502`, `#FFF0EC`, `#0A1A0C`, `#16150A`, `#F2F2FF`, `#1A0E02`, `rgba(20,5,2,` y `rgba(22,21,10,`), después sombras completas (527→`--shadow-modal`, 675→`--shadow-toast`), después `rgba(0,0,0,`→`rgba(var(--scrim-rgb),` y los rgba de coral/tang/lime, después sueltos (`#A2F0A9`, `#A6D7FA`, heatmap 495-496, `#767676` en 1144→`var(--t4)`), después radios (`100px`/`99px`→`--r-pill`, `20px`→`--r-md`, etc.; quedan literales adrede 3px, `5px 5px 2px 2px`, 1px, 50%). Agregar `box-shadow:var(--shadow-card)` a `.stat .card .habit-card .mail-card .prog-card .diario-card .login-caja` y `font-family:var(--font-display)` a `.hero-title .stat-num .frase-txt .card-title .habit-pct-num .modal-titulo .login-titulo`. `.hero-title` 61-63 pasa a `background:var(--title-grad); -webkit-text-fill-color:var(--title-fill); color:var(--title-fill)`.
  Verificación del mapa: `grep -nE "#[0-9A-Fa-f]{6}\b" index.html` debe listar solo la línea 9, `:root` y los dos bloques de tema; `grep -c "var(--ui)"` sigue en 23.
E.3 **Colores en JS → `var(--x)`** (todos van a `style=""` inline, así que aceptan `var()`): TAGS 1105-1108, chip Todas 1144, HABITS 1809-1817, anillo SVG 2044 (mover el stroke a `style="stroke:var(--line2)"`), 2064/2069 ringColor, 2078 badge HOY (también quitar `font-family:sans-serif` → `var(--ui)`), 2086, 2110, 2123 escala 7/5/3, 2131-2140 rachas (`--tang`/`--lime`/`--muted`), login 838-839.
E.4 **Bloques de tema** antes de `</style>` (693):
- `[data-tema="papel"]`: `color-scheme:light`; fondo `--ink:#F4EFE6`, surfaces `#FBF8F2 #F7F2E9 #EFE8DB #E5DCCB`, líneas `#DCD3C2/#C6BBA6`, texto `#2B2118 #4A3E33 #66584A #7A6C5D`, `--muted:#B8AE9C`; acentos como tintas oscuras legibles sobre crema: terracota `#B0471F`, oliva `#55753A`, ocre `#8A6508` (la mostaza pura no da contraste como texto), lavanda `#6A5AA8`, azul tinta `#3B5BA5`, naranja quemado `#9E5410`; `--on-*` claros (papel); `--scrim-rgb:43,33,24` (velos sepia); heat verdes oliva; `--font-display:'Fraunces',Georgia,serif`, `--font-ui:'Inter',...`; radios 10/8/8/6/6/4/4/3/pill; `--shadow-card` suave de hoja apoyada; `--title-grad:none; --title-fill:var(--t1)`. Reglas propias: pesos 600 y tracking serif en los display (Fraunces se carga 500..700), regla fina bajo `.hero`, fecha y cronómetro de hábito en mono, `.dia-card.pasado{opacity:.78}`.
- `[data-tema="terminal"]`: fondo `#0B0F0C`, surfaces `#0F1510 #121A13 #172117 #1E2B1F`, líneas `#1F2E21/#2E4430`, texto `#CFF5CF #8FBF8F #6FA070 #5E8A60`, `--muted:#3E5540`; verde fósforo `--lime:#4AF626`, ámbar `--tang:#FFB000`, rojo `#FF4D4D`, amarillo `#FFD447`, magenta `#FF5FD2`, cyan `#22D3EE`; heat verdes fósforo; las tres fuentes = JetBrains Mono; radios 4/3/3/2/2/2/0/0/pill 2px; sombras tipo glow con borde de 1px; `--title-fill:var(--lime)`. Reglas propias: `.hero-title` con `font-size:clamp(34px,6.5vw,88px)` (mono es ancha: "> Dashboard_" desborda a 400px con el clamp original), `::before` con `"> "` en `--t3` y `::after` con `_` parpadeante (`@keyframes cursor-parpadeo`), `.card-title::before{content:'$ '}`, labels en minúscula sin tracking, puntos y celdas de heatmap con `border-radius:0`, `caret-color` y `::selection` verdes, scanlines sutiles con `body::after{position:fixed;z-index:999;pointer-events:none}`.
E.5 **Fuentes** (línea 20): una sola URL con `family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,500..700&family=Inter:wght@400..800&family=JetBrains+Mono:wght@400..800&display=swap`. El navegador solo descarga las caras que se usan, así que Nocturno no paga las otras. Offline: hoy el SW ignora Google Fonts; agregar en `sw.js` un cache-first para `fonts.googleapis.com` y `fonts.gstatic.com` en un caché aparte `fuentes-v1` (mejora los 3 temas).
E.6 **Botón y switch**:
- HTML después de 699: `<button class="tema-btn" id="tema-btn" onclick="cicloTema()" aria-label="Cambiar tema">◐ <span id="tema-nombre">Nocturno</span></button>`.
- CSS junto a `.date-pill`: `.hero{position:relative}` y `.tema-btn` absoluto `top:40px;right:40px` (móvil `28px/18px`), mismo tono que la píldora de fecha. Absoluto para no mover ni un píxel el layout actual.
- Script inline en `<head>` antes de `<style>`: lee `localStorage.getItem('tema')` y pone `data-tema` en `<html>` antes del primer pintado (sin flash).
- JS nuevo bloque antes de INIT: `TEMAS=['nocturno','papel','terminal']`, `temaActual()`, `aplicarTema(n)` (setea/quita `data-tema`, guarda con `localStorage.setItem` directo, actualiza `<meta name="theme-color">` con el `--ink` computado, actualiza el nombre del botón), `cicloTema()` con toast "Tema: X". Un `mostrarToast(texto,ms)` sin botón reutilizando `#toast` (limpia `_undo` para no dejar un deshacer huérfano) + CSS `.toast.sin-boton{padding:11px 20px}`.
- `'tema'` en `NO_SINCRONIZAR` (864): aunque se escriba directo, `importarDatos` (1797) marca para subir todo lo que pasa `seSincroniza`.
- Primera línea del INIT: `aplicarTema(temaActual())`.
E.7 Aceptados sin cambio: `manifest.json` `theme_color` estático (el `<meta>` sí se actualiza en vivo), `favicon.svg` con hex fijos, `apple-mobile-web-app-status-bar-style` (línea 13) se lee al lanzar.

### Paso F — Cierre
F.1 `sw.js`: `CACHE='dashboard-v2'` + caché de fuentes (E.5). **Importante:** el bug de hábitos vive en el cliente; un dispositivo que siga con la versión vieja re-contamina la semana el próximo lunes y lo sube. Después de publicar, abrir el dashboard en la notebook, la PC y el celular.
F.2 `SETUP.md`: cambiar la recomendación de `python -m http.server` por un servidor Node (`npx http-server -p 5599 -c-1 .`), porque en esta PC el de Python trunca archivos grandes.
F.3 Commit por paso (A, B, C, D, E, F) con mensajes en español como los del historial.

---

## Verificación end-to-end

Servir con Node (`npx http-server -p 5599 -c-1 .` o el `serve.js` que ya existe en otro proyecto), abrir `http://localhost:5599/`, consola sin errores en cada paso.

1. **Recurrentes y timers fuera**: ninguna tarea muestra ↻ ni ▶ ni tiempo; el cronómetro de "UNI 90min" arranca, sobrevive a un F5 y pide confirmación si se arranca otro; el resumen del domingo (`abrirResumen()`) no tiene "Tiempo medido"; el panel de progreso no muestra "· 1h 12m". Agregar una tarea en hoy y en otro día, moverla arrastrando, borrarla y deshacer.
2. **Semana y día**: en consola `localStorage.removeItem(getWeekKey()); loadHabits(); renderHabits()` → 0 tildes. `_diaEnMemoria=(getTodayIdx()+6)%7; verificarCambioDeFecha()` → devuelve `'dia'` y el badge HOY se mueve. `_semanaEnMemoria='x'; verificarCambioDeFecha()` → `'semana'` y recarga todo. `limpiarHabitosFuturos()` devuelve el conteo y `hb-pct` baja; después Franco destilda a mano lun-mié en Vista Semana.
3. **Contadores**: con un filtro activo, `Faltan hoy`, `hoy-count`, `semana-count`, `Pendientes` y los `dia-cant` no cambian; la nota dice "N tareas ocultas esta semana (M de hoy)"; la pill "Todas" es la suma de las demás pills (incluida "—" si hay sin etiqueta); elegir "Todas", recargar → sin filtro. Tildar un hábito actualiza `hb-pct`, el hero y el heatmap a los 300 ms; tildar una tarea actualiza las barras del panel. Con Supabase configurado: cambiar el filtro en un dispositivo no cambia el otro, y `sync_meta` no contiene `filtro_tag`, `tag_activa` ni `tema`.
4. **Temas**: Nocturno idéntico al actual (comparar con captura previa). Click ◐ → Papel: crema, título serif sólido, tarjetas con sombra suave, modal ocre con texto crema, login tematizado, `meta theme-color` = `#F4EFE6`. Click → Terminal: todo mono, `> Dashboard_` con cursor parpadeando, `$ Hoy`, radios casi nulos, anillo con stroke correcto. Click → vuelve a Nocturno. F5 en cada tema: aparece sin flash. Exportar e importar respaldo: `tema` no se sube.
5. **Móvil**: DevTools a 400 px en los 3 temas: el título no desborda, el botón ◐ no pisa el brand, stats 2×2, tabla de hábitos, toast y modal legibles.
6. **Offline** (opcional): tras visitar los 3 temas, DevTools → Offline → recargar: fuentes desde caché.

---

## Ideas para próximas tandas (no se implementan ahora)

Ordenadas por relación valor/esfuerzo, con una línea de cómo se haría:

1. **Paleta de comandos (Ctrl+K) y atajos de teclado** — overlay con búsqueda: "agregar tarea", "ir a jueves", "tildar Ejercicio", "cambiar tema". Todo en index.html, sin dependencias.
2. **Tres grandes de la semana** — 3 objetivos semanales arriba de las tareas, clave `grandes_wk_*`, se muestran en el resumen del domingo.
3. **Hábitos editables desde la UI** — hoy `HABITS` está hardcodeado en 1808-1818 y el "9" en 6 lugares. Pasarlo a una clave `habitos_def` sincronizada, con alta/renombre/pausa.
4. **Navegar semanas pasadas** con ← → — reutiliza `parseSemanaKey` y las claves `wk_*`/`tareas_wk_*`/`journal` que ya existen.
5. **Próximos hitos** — tarjeta con cuenta regresiva a parciales, entregas y fechas clave (clave `hitos`).
6. **Inbox de ideas** — captura rápida sin fecha; un botón la convierte en tarea de hoy.
7. **Gamificación liviana** — puntos por hábitos/tareas, nivel semanal con título, confetti al día perfecto.
8. **Briefing de la mañana con Claude** — al abrir, un párrafo con lo pendiente, rachas en riesgo y una prioridad sugerida; cierre de semana reflexivo desde el diario. Vía n8n webhook (la API key no puede vivir en el front).
9. **Entrada por WhatsApp vía n8n** — mandar "tarea: X" al bot y que aparezca en Supabase → dashboard. Caso de estudio para Apollo Dynamics.
10. **Mails reales** — la tarjeta de mails es mock; conectar Gmail → n8n → Supabase.
11. **Notificaciones push** — recordatorio nocturno si faltan hábitos; requiere backend (n8n + web-push).
12. **Base técnica** — partir index.html en css/js sin build; smoke tests con Playwright; sync con timestamps del servidor (hoy usa `Date.now()` del dispositivo).
