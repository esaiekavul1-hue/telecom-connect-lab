-- =====================================================================
-- TELECOM CONNECT LAB 2.0 — Parcours des étudiants (migration ADDITIVE)
-- ---------------------------------------------------------------------
-- À exécuter après 20261108000100_v2_core.sql, puis exécuter
-- supabase/seed/assessments.generated.sql, qui remplit le référentiel.
-- Annulation : supabase/rollback/20261108000200_v2_tracks.down.sql
--
-- Le parcours appartient au compte. Il se choisit une seule fois, ne se
-- modifie que par change_track (prérequis vérifiés) et aucune validation
-- ni tentative n'est supprimée lors d'un changement.
-- =====================================================================

alter table public.profiles add column if not exists specialization text check (char_length(specialization) <= 40);
alter table public.profiles add column if not exists track_chosen_at timestamptz;

-- Le parcours ne s'écrit plus directement : uniquement par les fonctions ci-dessous.
revoke update (space) on public.profiles from authenticated;

-- Référentiel, généré depuis core/curriculum.js.
create table if not exists private.track_catalog (
  track_key      text primary key,
  space          text not null,
  specialization text,
  rank           integer,
  entry          text[] not null default '{}'
);
create table if not exists private.track_competencies (
  track_key  text not null references private.track_catalog (track_key) on delete cascade,
  competency text not null,
  primary key (track_key, competency)
);

create table if not exists public.track_history (
  id                  bigint generated always as identity primary key,
  user_id             uuid not null references auth.users (id) on delete cascade,
  from_space          text,
  from_specialization text,
  to_space            text not null,
  to_specialization   text,
  kind                text not null check (kind in ('initial','change')),
  at                  timestamptz not null default now()
);
create index if not exists track_history_user_idx on public.track_history (user_id, at desc);
alter table public.track_history enable row level security;
drop policy if exists track_history_select on public.track_history;
create policy track_history_select on public.track_history for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke all on public.track_history from anon, authenticated;
grant select on public.track_history to authenticated;

create or replace function private.track_key(p_space text, p_specialization text) returns text
language sql immutable set search_path = '' as $$
  select case when p_space = 'pro' and p_specialization is not null then p_specialization else p_space end;
$$;

-- Vérifie le couple parcours / spécialisation et renvoie la spécialisation retenue.
create or replace function private.check_track(p_space text, p_specialization text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare spec text := case when p_space = 'pro' then nullif(btrim(p_specialization), '') else null end;
begin
  if not exists (
    select 1 from private.track_catalog c
    where c.space = p_space and c.specialization is not distinct from spec
  ) then
    raise exception 'Parcours inconnu' using errcode = '22023', hint = 'unknown_track';
  end if;
  return spec;
end $$;

create or replace function private.track_payload(p_profile public.profiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('space', p_profile.space, 'specialization', p_profile.specialization, 'track_chosen_at', p_profile.track_chosen_at);
$$;

-- Premier choix : une seule fois. Rejouer le même choix ne produit aucune erreur
-- (double clic, nouvel essai après une coupure).
create or replace function public.choose_initial_track(p_space text, p_specialization text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := private.require_user();
  spec text := private.check_track(p_space, p_specialization);
  prof public.profiles;
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;
  select * into prof from public.profiles where id = uid for update;
  if prof.space is not null then
    if prof.space = p_space and prof.specialization is not distinct from spec then return private.track_payload(prof); end if;
    raise exception 'Votre parcours est déjà enregistré. Utilisez le changement de parcours.' using errcode = 'P0001', hint = 'already_chosen';
  end if;
  update public.profiles set space = p_space, specialization = spec, track_chosen_at = now(), updated_at = now()
    where id = uid returning * into prof;
  insert into public.track_history (user_id, to_space, to_specialization, kind) values (uid, p_space, spec, 'initial');
  return private.track_payload(prof);
end $$;

-- Changement volontaire. Monter de niveau exige les compétences d'entrée ;
-- redescendre ou rejoindre le monde professionnel reste libre.
create or replace function public.change_track(p_space text, p_specialization text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid     uuid := private.require_user();
  spec    text := private.check_track(p_space, p_specialization);
  prof    public.profiles;
  cur_row private.track_catalog;
  tgt_row private.track_catalog;
  missing text[];
begin
  perform private.expire_stale(uid);
  select * into prof from public.profiles where id = uid for update;
  if prof.space is null then raise exception 'Choisissez d''abord votre parcours' using errcode = 'P0001', hint = 'no_track'; end if;
  if prof.space = p_space and prof.specialization is not distinct from spec then return private.track_payload(prof); end if;
  if exists (
    select 1 from public.attempts t join public.assessments a on a.id = t.assessment_id
    where t.user_id = uid and t.status = 'in_progress' and a.kind <> 'quiz'
  ) then
    raise exception 'Terminez d''abord votre évaluation en cours' using errcode = 'P0001', hint = 'attempt_open';
  end if;

  select * into cur_row from private.track_catalog where track_key = private.track_key(prof.space, prof.specialization);
  select * into tgt_row from private.track_catalog where track_key = private.track_key(p_space, spec);

  if tgt_row.rank is not null and (cur_row.rank is null or tgt_row.rank > cur_row.rank) then
    select coalesce(array_agg(e), '{}') into missing from unnest(tgt_row.entry) e
     where not exists (select 1 from public.competency_validations v where v.user_id = uid and v.competency = e);
    if array_length(missing, 1) > 0 then
      raise exception 'Compétences à valider avant ce parcours : %', array_to_string(missing, ', ') using errcode = 'P0001', hint = 'entry_missing';
    end if;
  end if;

  insert into public.track_history (user_id, from_space, from_specialization, to_space, to_specialization, kind)
  values (uid, prof.space, prof.specialization, p_space, spec, 'change');
  update public.profiles set space = p_space, specialization = spec, updated_at = now()
    where id = uid returning * into prof;
  return private.track_payload(prof);
end $$;

-- Les évaluations sont réservées au parcours actif et à ses prérequis.
-- Les tests de positionnement restent ouverts à tout compte ayant un parcours.
create or replace function public.start_attempt(p_assessment text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  a   public.assessments;
  t   public.attempts;
  prof public.profiles;
  used integer;
  last_end timestamptz;
  missing text[];
  pos integer := 0;
  q   record;
begin
  perform pg_advisory_xact_lock(hashtextextended(uid::text || p_assessment, 0));
  perform private.expire_stale(uid);

  select * into a from public.assessments where id = p_assessment and status = 'published';
  if not found then raise exception 'Évaluation indisponible' using errcode = 'P0002'; end if;

  select * into t from public.attempts where user_id = uid and assessment_id = a.id and status = 'in_progress';
  if found then return private.attempt_payload(t, a); end if;

  select * into prof from public.profiles where id = uid;
  if prof.space is null then
    raise exception 'Choisissez d''abord votre parcours' using errcode = 'P0001', hint = 'no_track';
  end if;
  if a.kind <> 'placement' and a.competency is not null and not exists (
    select 1 from private.track_competencies c
    where c.track_key = private.track_key(prof.space, prof.specialization) and c.competency = a.competency
  ) then
    raise exception 'Cette évaluation ne fait pas partie de votre parcours' using errcode = 'P0001', hint = 'out_of_track';
  end if;

  select coalesce(array_agg(p), '{}') into missing from unnest(a.prerequisites) p
   where not exists (select 1 from public.competency_validations v where v.user_id = uid and v.competency = p);
  if array_length(missing, 1) > 0 then
    raise exception 'Prérequis non validés : %', array_to_string(missing, ', ') using errcode = 'P0001', hint = 'prerequisites';
  end if;

  select count(*), max(submitted_at) into used, last_end from public.attempts
   where user_id = uid and assessment_id = a.id and status in ('submitted','expired');
  if a.max_attempts is not null and used >= a.max_attempts then
    raise exception 'Nombre maximal de tentatives atteint' using errcode = 'P0001', hint = 'max_attempts';
  end if;
  if a.cooldown_minutes > 0 and last_end is not null and last_end + make_interval(mins => a.cooldown_minutes) > now() then
    raise exception 'Nouvelle tentative possible à partir de %', to_char(last_end + make_interval(mins => a.cooldown_minutes), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') using errcode = 'P0001', hint = 'cooldown';
  end if;

  insert into public.attempts (user_id, assessment_id, deadline_at)
  values (uid, a.id, case when a.duration_seconds is null then null else now() + make_interval(secs => a.duration_seconds) end)
  returning * into t;

  for q in select id, variants from private.questions where assessment_id = a.id and active order by random() limit a.question_count loop
    pos := pos + 1;
    insert into private.attempt_items (attempt_id, position, question_id, variant_index)
    values (t.id, pos, q.id, floor(random() * jsonb_array_length(q.variants))::int);
  end loop;
  if pos = 0 then raise exception 'Cette évaluation ne contient aucune question' using errcode = 'P0002'; end if;

  return private.attempt_payload(t, a);
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.choose_initial_track(text, text) from public, anon, authenticated;
revoke all on function public.change_track(text, text) from public, anon, authenticated;
revoke all on function public.start_attempt(text) from public, anon, authenticated;
grant execute on function public.choose_initial_track(text, text) to authenticated;
grant execute on function public.change_track(text, text) to authenticated;
grant execute on function public.start_attempt(text) to authenticated;
