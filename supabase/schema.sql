-- =====================================================================
-- TELECOM CONNECT LAB — Stockage distant de la progression (Supabase)
-- ---------------------------------------------------------------------
-- À exécuter UNE fois dans Supabase : menu « SQL Editor » > « New query »,
-- collez tout ce fichier puis cliquez sur « Run ».
--
-- Chaque utilisateur possède une seule ligne contenant sa progression.
-- Les règles RLS (Row Level Security) garantissent qu'un utilisateur
-- connecté ne peut lire et modifier QUE sa propre ligne.
-- =====================================================================

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
drop policy if exists "progress_insert_own" on public.progress;
drop policy if exists "progress_update_own" on public.progress;

create policy "progress_select_own" on public.progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "progress_insert_own" on public.progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "progress_update_own" on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Les visiteurs non connectés (rôle anon) n'ont aucun accès.
revoke all on public.progress from anon;
grant select, insert, update on public.progress to authenticated;
