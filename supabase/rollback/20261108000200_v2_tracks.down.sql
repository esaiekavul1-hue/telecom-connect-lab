-- =====================================================================
-- Annulation de 20261108000200_v2_tracks.sql
-- ⚠ Supprime la spécialisation et l'historique des changements de parcours.
-- Le parcours principal (profiles.space), les comptes, les progressions,
-- les tentatives et les validations sont conservés.
-- =====================================================================
drop function if exists public.change_track(text, text);
drop function if exists public.choose_initial_track(text, text);

-- Version de start_attempt d'avant les parcours.
create or replace function public.start_attempt(p_assessment text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  a   public.assessments;
  t   public.attempts;
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
revoke all on function public.start_attempt(text) from public, anon, authenticated;
grant execute on function public.start_attempt(text) to authenticated;

drop function if exists private.track_payload(public.profiles);
drop function if exists private.check_track(text, text);
drop function if exists private.track_key(text, text);
drop table if exists public.track_history;
drop table if exists private.track_competencies;
drop table if exists private.track_catalog;

grant update (space) on public.profiles to authenticated;
alter table public.profiles drop column if exists track_chosen_at;
alter table public.profiles drop column if exists specialization;
