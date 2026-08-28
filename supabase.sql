-- ═══════════════════════════════════════════════════════════════════
-- Pegá TODO este archivo en el SQL Editor de Supabase y dale Run.
-- Las lineas que empiezan con dos guiones son comentarios: no hacen
-- nada, solo explican. Podés dejarlas.
-- ═══════════════════════════════════════════════════════════════════

-- Una fila por cada cosa que el dashboard guarda.
-- La app trabaja con "clave -> valor", asi que la tabla copia esa forma.
create table if not exists datos (
  user_id     uuid references auth.users on delete cascade not null,
  clave       text not null,
  valor       text not null,
  actualizado timestamptz not null default now(),
  primary key (user_id, clave)
);

-- ESTO ES LO IMPORTANTE: Row Level Security.
-- Es una regla que vive DENTRO de la base y dice "cada fila solo la puede
-- tocar su dueño". No es una validacion de la pagina que se pueda saltear:
-- es la base la que se niega. Por eso la clave anon puede estar publicada
-- en GitHub sin riesgo.
alter table datos enable row level security;

create policy "cada uno lee lo suyo"
  on datos for select using (auth.uid() = user_id);

create policy "cada uno inserta lo suyo"
  on datos for insert with check (auth.uid() = user_id);

create policy "cada uno actualiza lo suyo"
  on datos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cada uno borra lo suyo"
  on datos for delete using (auth.uid() = user_id);
