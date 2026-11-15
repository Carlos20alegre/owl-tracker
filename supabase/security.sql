-- OWL Lifting - endurecimiento de seguridad (ejecutar en Supabase > SQL Editor)
-- Antes de ejecutar, sustituye __SIGNUP_CODE__ por el codigo de acceso del gimnasio.
-- NO subas el codigo real a GitHub (el repo es publico).

-- 1) Entrenadores y configuracion
create table if not exists public.trainers (email text primary key);
alter table public.trainers enable row level security;
insert into public.trainers(email) values ('karls_d2@hotmail.com'),('carlosalecas@gmail.com')
  on conflict do nothing;

create table if not exists public.app_config (key text primary key, value text not null);
alter table public.app_config enable row level security;
insert into public.app_config(key,value) values ('signup_code','__SIGNUP_CODE__')
  on conflict (key) do update set value = excluded.value;

create or replace function public.is_trainer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trainers t
                 where lower(t.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;
revoke all on function public.is_trainer() from public;
grant execute on function public.is_trainer() to authenticated;

-- 2) Borrar TODAS las politicas antiguas de las tres tablas
do $$ declare p record; begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname='public' and tablename in ('weeks','sessions','athlete_logs','trainers','app_config')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;

alter table public.weeks enable row level security;
alter table public.sessions enable row level security;
alter table public.athlete_logs enable row level security;

-- 3) weeks / sessions: leer todos los logueados, escribir solo entrenadores
create policy weeks_read on public.weeks for select to authenticated using (true);
create policy weeks_ins  on public.weeks for insert to authenticated with check (public.is_trainer());
create policy weeks_upd  on public.weeks for update to authenticated using (public.is_trainer()) with check (public.is_trainer());
create policy weeks_del  on public.weeks for delete to authenticated using (public.is_trainer());

create policy sessions_read on public.sessions for select to authenticated using (true);
create policy sessions_ins  on public.sessions for insert to authenticated with check (public.is_trainer());
create policy sessions_upd  on public.sessions for update to authenticated using (public.is_trainer()) with check (public.is_trainer());
create policy sessions_del  on public.sessions for delete to authenticated using (public.is_trainer());

-- 4) athlete_logs: cada atleta solo lo suyo; el entrenador lee todo
create policy logs_read on public.athlete_logs for select to authenticated
  using (user_id = auth.uid() or public.is_trainer());
create policy logs_ins on public.athlete_logs for insert to authenticated
  with check (user_id = auth.uid());
create policy logs_upd on public.athlete_logs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy logs_del on public.athlete_logs for delete to authenticated
  using (user_id = auth.uid());

-- 5) get_users solo para entrenadores
drop function if exists public.get_users();
create function public.get_users()
returns table (id uuid, email text, raw_user_meta_data jsonb, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, u.raw_user_meta_data, u.created_at
  from auth.users u where public.is_trainer() order by u.created_at desc;
$$;
revoke all on function public.get_users() from public, anon;
grant execute on function public.get_users() to authenticated;

-- 6) Codigo de acceso obligatorio al registrarse
create or replace function public.check_signup_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare expected text;
begin
  select value into expected from public.app_config where key='signup_code';
  if expected is null or coalesce(new.raw_user_meta_data ->> 'access_code','') <> expected then
    raise exception 'Codigo de acceso incorrecto';
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'access_code';
  return new;
end $$;

drop trigger if exists owl_check_signup_code on auth.users;
create trigger owl_check_signup_code before insert on auth.users
  for each row execute function public.check_signup_code();
