# Dashboard v7 — app instalable y datos sincronizados

> **Plan real**, tal cual se aprobó antes de implementar.

**Fecha:** 2026-08-28

## Contexto

El dashboard guarda todo en `localStorage`, que es una cajita del navegador **atada a ese dispositivo**. El Chrome de la notebook tiene la suya, el de la PC de escritorio otra, y el del celular otra. Nunca se hablan, así que una tarea cargada en un lado no existe en los otros.

Además el archivo vive en el disco de la notebook: el celular no puede abrirlo.

Objetivo: un ícono en el escritorio (y en el celular) que abra el dashboard como una app, con **las mismas tareas, hábitos y diario en los tres dispositivos**.

Decisiones tomadas:
- **Hosting**: GitHub Pages, repo público.
- **Acceso**: mail + contraseña, una sola vez por dispositivo. La sesión queda guardada.
- **Ícono**: grilla de cuatro cuadrados con los colores de las etiquetas sobre fondo negro.

### Las tres piezas

```
    GitHub Pages          ← donde vive la página, con HTTPS
          ↓
    Dashboard (PWA)       ← se instala con ícono en notebook, PC y celular
          ↓
    Supabase              ← donde viven tus datos, detrás de tu contraseña
```

**El plan va en fases y cada una sirve por sí sola.** Después de la Fase 2 ya tenés el ícono y podés abrirlo desde cualquier dispositivo, aunque cada uno con sus propios datos. La Fase 3 es la que los une.

---

## Fase 1 — Convertirlo en app instalable (PWA)

Una PWA es una página web con dos archivos extra que le avisan al navegador "esto es una app". Nada más que eso.

### El ícono

Se genera un SVG con la grilla 2×2 (sky `#7FC4F5`, coral `#F0512E`, lime `#86E88F`, peri `#7B7BF0`) sobre `#0A0A0A`, y de ahí salen los PNG que pide el sistema, renderizándolo en el navegador con playwright y capturándolo:

- `icono-192.png` y `icono-512.png` — para la barra de tareas y la pantalla de inicio
- `icono-maskable.png` — igual pero con margen, porque Android recorta los íconos en círculo y sin margen se comen las esquinas
- `favicon.svg` — la pestaña del navegador

### `manifest.json`

El archivo que describe la app: nombre (`Mi Dashboard`), nombre corto, los íconos, el color de fondo (`#050505`), el color de la barra y `display: standalone` — que es lo que hace que se abra **sin la barra de direcciones**, como una app de verdad.

### `sw.js` (service worker)

Es un archivo que el navegador ejecuta aparte y que puede responder pedidos cuando no hay internet. Gracias a él la app abre aunque estés sin conexión.

**Estrategia deliberada**: *network first* para el HTML y cache para lo demás. Un service worker mal hecho es la causa clásica de "hago cambios y no los veo nunca": cachea el HTML para siempre. Con network-first siempre traés la última versión si hay internet, y caés al cache solo si no hay. El nombre del cache se versiona para poder invalidarlo.

### En el HTML

Se agregan las etiquetas del manifest, el `theme-color` y el registro del service worker. **El dashboard sigue funcionando exactamente igual** si abrís el archivo con doble click: la PWA no rompe nada.

### Renombrar a `index.html`

`dashboard-estilo-dos.html` pasa a llamarse `index.html`, que es el nombre que los servidores web sirven por defecto. Sin eso la URL sería `.../dashboard-estilo-dos.html` en vez de solo `.../mi-dashboard/`. Git lo registra como renombrado, así que **no se pierde el historial**.

---

## Fase 2 — Publicarlo en internet

### Lo que hacés vos (unos 3 minutos)

1. Crear un repositorio en github.com llamado `mi-dashboard`, **público**, vacío (sin README)
2. Pasarme la URL que te da

### Lo que hago yo

3. `git remote add origin` + `git push`
4. Activar GitHub Pages en la rama `master`

Queda publicado en `https://TU-USUARIO.github.io/mi-dashboard/`, con HTTPS, que es un requisito para que la PWA se pueda instalar.

### Instalarlo

- **Notebook y PC de escritorio**: abrís la URL en Chrome o Edge y aparece un ícono de instalar en la barra de direcciones. Queda en el menú Inicio y podés anclarlo a la barra de tareas.
- **Celular**: abrís la URL y elegís "Agregar a pantalla de inicio".

De acá en adelante, cada `git push` actualiza la app en los tres dispositivos.

---

## Fase 3 — Sincronizar los datos con Supabase

### Qué es Supabase

Una base de datos Postgres en la nube, con una API lista para usar y manejo de usuarios incluido. Plan gratis de sobra para esto. Postgres es SQL de verdad, así que lo que aprendas acá te sirve en cualquier lado.

### Lo que hacés vos

1. Crear cuenta en supabase.com y un proyecto
2. Pegar en el editor SQL el script que te dejo en `SETUP.md` (crea la tabla y la protección)
3. Crear tu usuario con tu mail y una contraseña
4. Copiar dos valores (la URL del proyecto y la `anon key`) a un archivo `config.js`

### La tabla

```sql
create table datos (
  user_id     uuid references auth.users not null,
  clave       text not null,
  valor       jsonb not null,
  actualizado timestamptz default now(),
  primary key (user_id, clave)
);
```

Una fila por cada cosa que hoy guardás en `localStorage`. No hace falta una tabla por tema: la app ya trabaja con "clave → valor", así que la base copia esa forma y **no hay que reescribir cómo funciona el dashboard**.

### La protección (esto es lo importante)

Se activa **Row Level Security**: una regla que vive en la base y dice *"cada fila solo la puede leer y escribir el usuario dueño"*. No es una validación en el código de la página — es la base la que se niega.

Por eso la `anon key` puede estar publicada en GitHub sin problema: **es una llave que no abre nada por sí sola**. Sin tu contraseña, quien la tenga no ve ni una fila. Así está diseñado Supabase para usarse.

### La pantalla de login

Una pantalla simple sobre el dashboard: mail y contraseña. Supabase guarda la sesión, así que **la ponés una vez por dispositivo y nunca más**. Al abrir la app entra sola.

### Cómo sincroniza

No se reescribe el acceso a datos. Se agrega una capa encima:

- Todas las escrituras pasan a usar un envoltorio `lsSet(clave, valor)` que hace lo de siempre en `localStorage`, anota **cuándo** cambió, y encola la subida (agrupada, para no mandar un pedido por tecla)
- Al abrir y loguearse, baja todo y compara clave por clave: **gana la versión más nueva**
- Todo lo demás sigue leyendo de `localStorage`, así que el dashboard anda igual de rápido y **funciona sin internet**; cuando vuelve la conexión, sincroniza

### Qué NO se sincroniza, y por qué

| Clave | Motivo |
|---|---|
| `timer_activo` | Es del dispositivo. Si arrancás un cronómetro en la notebook, no tiene sentido que corra en el celular |
| `mails_cache` | Son los mails de ejemplo, descartables |
| `ultima_frase` | Trivial, y está bueno que cada dispositivo tenga su frase del día |

### Qué pasa si edito en dos lados a la vez

Gana **el último que guardó**, clave por clave. Como las claves están separadas por semana y por tema (`tareas_wk_2026_7_24`, `journal`, `recurrentes`), editar la notebook y el celular al mismo tiempo casi nunca toca la misma clave. Es la estrategia simple y predecible; resolver conflictos de verdad (fusionar cambios) es un problema mucho más grande y acá no hace falta.

---

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | El dashboard (renombrado, con las etiquetas de PWA y la capa de sync) |
| `manifest.json` | La descripción de la app |
| `sw.js` | Service worker, para que abra sin internet |
| `config.js` | Tus dos valores de Supabase. **Archivo aparte** para que se vea claro qué es tuyo |
| `icono-*.png`, `favicon.svg` | El ícono |
| `SETUP.md` | Los pasos que hacés vos, con el SQL listo para pegar |

---

## Verificación

**Fase 1** (con `python -m http.server` local)
1. El navegador ofrece instalar la app
2. Instalada, abre en ventana propia sin barra de direcciones y con el ícono correcto
3. Cortando internet, la app sigue abriendo
4. Cambiar el HTML y recargar → **se ve el cambio** (que el service worker no deje la versión vieja pegada)
5. Abrir `index.html` con doble click sigue funcionando como siempre

**Fase 2**
6. La URL pública carga con HTTPS
7. Se instala en la notebook y en el celular
8. Un `git push` se refleja en la app instalada

**Fase 3**
9. Login con mail y contraseña; cerrar y volver a abrir → **no vuelve a pedir nada**
10. Cargar una tarea en un navegador, abrir en otro → aparece
11. Tildar un hábito en uno, recargar el otro → aparece
12. Escribir en el diario en uno → aparece en el otro
13. **Sin internet**: la app abre, podés cargar tareas, y al volver la conexión se suben
14. El cronómetro corriendo en un dispositivo **no** se propaga al otro
15. **La prueba de la protección**: con la sesión cerrada, pedirle datos a la API con la `anon key` sola → la base devuelve vacío

**Que no se haya roto nada**: tareas, arrastre entre días, etiquetas, filtro, pendientes, cronómetros, recurrentes, hábitos, rachas, diario, progreso, respaldo y deshacer.

Al terminar cada fase: commit propio. Al final, guardar el plan en `planes/`.
