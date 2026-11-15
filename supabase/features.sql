-- OWL Lifting - nuevas funciones (series, ejercicios extra, historial de PRs, plantillas)
-- Requiere haber ejecutado antes security.sql (usa public.is_trainer()).

-- 1) Series marcadas dentro de cada sesion
alter table public.athlete_logs add column if not exists sets jsonb not null default '{}'::jsonb;

-- 2) Ejercicios extra del deportista
create table if not exists public.athlete_extras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_id uuid not null,
  nombre text not null,
  series int not null check (series > 0),
  reps int not null check (reps > 0),
  peso numeric not null check (peso >= 0),
  created_at timestamptz not null default now()
);
create index if not exists athlete_extras_user_idx on public.athlete_extras(user_id, created_at);

-- 3) Historial de PRs
create table if not exists public.pr_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clave text not null,
  valor numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists pr_history_user_idx on public.pr_history(user_id, created_at);

-- 4) Plantillas de dia (solo entrenadores)
create table if not exists public.plantillas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contenido jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.athlete_extras enable row level security;
alter table public.pr_history enable row level security;
alter table public.plantillas enable row level security;

do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname='public' and tablename in ('athlete_extras','pr_history','plantillas')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;

create policy extras_read on public.athlete_extras for select to authenticated using (user_id = auth.uid() or public.is_trainer());
create policy extras_ins  on public.athlete_extras for insert to authenticated with check (user_id = auth.uid());
create policy extras_upd  on public.athlete_extras for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy extras_del  on public.athlete_extras for delete to authenticated using (user_id = auth.uid());

create policy prh_read on public.pr_history for select to authenticated using (user_id = auth.uid() or public.is_trainer());
create policy prh_ins  on public.pr_history for insert to authenticated with check (user_id = auth.uid());
create policy prh_del  on public.pr_history for delete to authenticated using (user_id = auth.uid());

create policy plant_all on public.plantillas for all to authenticated using (public.is_trainer()) with check (public.is_trainer());
