# Poner la app online y sincronizada

Dos partes independientes. La **A** te da el ícono y el acceso desde cualquier
dispositivo. La **B** hace que los datos sean los mismos en todos.

Podés hacer solo la A y funciona perfecto (cada dispositivo con sus datos).

---

## Parte A — Publicar la app (unos 5 minutos)

### A1. Crear el repositorio

1. Entrá a [github.com/new](https://github.com/new)
2. Nombre: `mi-dashboard`
3. Marcá **Public**
4. **No** marques nada de "Add a README" ni ".gitignore" — tiene que quedar vacío
5. Create repository
6. Copiá la URL que te muestra, del estilo `https://github.com/TU-USUARIO/mi-dashboard.git`

Pasame esa URL y yo hago el `push`. Si querés hacerlo vos:

```bash
git remote add origin https://github.com/TU-USUARIO/mi-dashboard.git
git push -u origin master
```

### A2. Activar GitHub Pages

1. En tu repo: **Settings** → **Pages** (menú de la izquierda)
2. En *Source* elegí **Deploy from a branch**
3. Branch: **master**, carpeta: **/ (root)** → **Save**
4. Esperá 1 o 2 minutos

Tu dashboard queda en: `https://TU-USUARIO.github.io/mi-dashboard/`

### A3. Instalarlo como app

- **Notebook y PC (Chrome o Edge)**: abrí la URL. En la barra de direcciones
  aparece un ícono de instalar (una pantallita con una flecha). Clic → *Instalar*.
  Queda en el menú Inicio y lo podés anclar a la barra de tareas.
- **Celular (Android)**: abrí la URL en Chrome → menú de los tres puntos →
  *Agregar a pantalla de inicio*.
- **iPhone**: Safari → botón de compartir → *Agregar a inicio*.

De acá en más, cada `git push` actualiza la app en los tres dispositivos.

---

## Parte B — Sincronizar los datos (unos 10 minutos)

### B1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta (podés usar tu GitHub)
2. **New project**
   - Name: `mi-dashboard`
   - Database Password: poné una y guardala en algún lado (no es la que vas a usar para entrar)
   - Region: **South America (São Paulo)**, que es la más cerca
3. Esperá un par de minutos a que se cree

### B2. Crear la tabla

En el menú de la izquierda: **SQL Editor** → **New query**.

Abrí el archivo **`supabase.sql`** de este proyecto, copiá todo su contenido y
pegalo ahí. Dale **Run**.

> Si preferís copiarlo de acá abajo, copiá **solo lo que está adentro del
> recuadro**. Las triples comillas de arriba y de abajo son formato de este
> documento, no son parte del código: si las pegás, Supabase da un error de
> sintaxis en la primera línea.

```sql
-- Una fila por cada cosa que el dashboard guarda.
-- La app trabaja con "clave -> valor", así que la tabla copia esa forma.
create table if not exists datos (
  user_id     uuid references auth.users on delete cascade not null,
  clave       text not null,
  valor       text not null,
  actualizado timestamptz not null default now(),
  primary key (user_id, clave)
);

-- ESTO ES LO IMPORTANTE: Row Level Security.
-- Es una regla que vive DENTRO de la base y dice "cada fila solo la puede
-- tocar su dueño". No es una validación de la página: es la base la que se
-- niega. Por eso la clave puede estar publicada en GitHub sin riesgo.
alter table datos enable row level security;

create policy "cada uno lee lo suyo"      on datos for select using (auth.uid() = user_id);
create policy "cada uno inserta lo suyo"  on datos for insert with check (auth.uid() = user_id);
create policy "cada uno actualiza lo suyo" on datos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cada uno borra lo suyo"    on datos for delete using (auth.uid() = user_id);
```

### B3. Crear tu usuario

1. Menú izquierdo: **Authentication** → **Users** → **Add user** → *Create new user*
2. Poné tu mail y una contraseña (esta sí es la que vas a usar para entrar)
3. Marcá **Auto Confirm User**, para no tener que confirmar por mail

### B4. Copiar tus dos valores

1. Menú izquierdo: **Project Settings** (el engranaje) → **API**
2. Copiá **Project URL** y **anon public**
3. Pegalos en el archivo `config.js` de este proyecto:

```js
window.CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGci...'
};
```

4. Guardá, y subilo:

```bash
git add config.js
git commit -m "Conectar con Supabase"
git push
```

### B5. Entrar

Abrí la app: ahora te pide mail y contraseña. La ponés **una sola vez por
dispositivo** — después entra sola.

Repetí el login en la PC de escritorio y en el celular, y los tres van a ver
lo mismo.

---

## Cosas que conviene saber

**Qué NO se sincroniza, a propósito**

| Cosa | Por qué |
|---|---|
| El cronómetro andando | Es de este dispositivo. No tendría sentido que un timer que arrancaste en la notebook corra en el celular |
| Los mails de ejemplo | Son de prueba, descartables |
| La frase del día | Está bueno que cada dispositivo tenga la suya |

**Si editás en dos lados a la vez**, gana el último que guardó, tema por tema.
Como las tareas se guardan separadas por semana, y el diario y los hábitos van
por su lado, es muy difícil que se pisen.

**Sin internet la app funciona igual.** Guarda en el dispositivo y sube cuando
vuelve la conexión. Abajo de todo, al lado de la hora, dice en qué estado está:
*Sincronizado*, *Guardando...* o *Sin conexión*.

**El respaldo sigue existiendo.** Los botones de Exportar e Importar del pie
siguen andando y son tu red de seguridad, ahora además de la nube.

---

## Instalar la app en cada dispositivo

Hay que hacerlo **una vez por dispositivo**, y en cada uno entrar con tu mail
y contraseña (después queda recordado).

**Windows (Chrome o Edge)**
1. Abrí la URL del dashboard
2. En el extremo derecho de la barra de direcciones hay un ícono de pantalla
   con una flecha → clic → **Instalar**
3. Si no aparece: menú **⋮** → *Guardar y compartir* → *Instalar página como aplicación*
4. Botón derecho sobre el ícono → **Anclar a la barra de tareas**

**Android**: Chrome → menú **⋮** → *Agregar a pantalla de inicio*

**iPhone**: tiene que ser **Safari** → botón compartir → *Agregar a inicio*
(en iPhone, Chrome no puede instalar apps)

---

## Cómo hacer cambios al dashboard

Guardar el archivo **no alcanza**: el cambio vive en tu notebook hasta que lo subís.

```
Editás index.html  →  git push  →  GitHub Pages (~1 min)  →  se ve en los 3 dispositivos
```

```bash
git add -A
git commit -m "Lo que cambiaste"
git push
```

**Para probar antes de subir**, no abras el archivo con doble click: desde un
archivo local Supabase no puede conectarse y no vas a ver tus datos. Levantá
un servidor:

```bash
python -m http.server 5599
```

y entrá a `http://localhost:5599`. Ahí funciona igual que el sitio real,
sincronización incluida.

**Si la app instalada no muestra el cambio**: cerrala y volvé a abrirla, o
hacé `Ctrl + F5` dentro de su ventana.
