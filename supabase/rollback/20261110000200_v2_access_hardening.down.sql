-- Annulation de 20261110000200_v2_access_hardening.sql : rétablit les fonctions des migrations 1 à 3.
-- Conserve les colonnes ajoutées (statut professionnel, ordre des choix) : aucune donnée supprimée.
-- Les tests de positionnement restent sans corrigé. Le déclencheur de profil protégé est conservé.

drop function if exists public.request_pro(text, text);
drop function if exists public.admin_list_pro_requests();
drop function if exists public.admin_decide_pro(uuid, boolean, text);

create or replace function private.is_direct_pro(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.track_history h where h.user_id = p_user and h.kind = 'initial' and h.to_space = 'pro');
$$;

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

create or replace function public.change_track(p_space text, p_specialization text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid     uuid := private.require_user();
  spec    text := private.check_track(p_space, p_specialization);
  prof    public.profiles;
  cur_row private.track_catalog;
  tgt_row private.track_catalog;
  missing text[];
  direct  boolean;
  ref_key text;
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

  direct := private.is_direct_pro(uid);

  -- Un étudiant ne rejoint le Monde professionnel qu'après toutes les évaluations de son parcours :
  -- le niveau le plus élevé qu'il a occupé, pour qu'une descente ne réduise pas l'exigence.
  if not direct and p_space = 'pro' and prof.space <> 'pro' then
    select coalesce((
      select c.track_key from public.track_history h
      join private.track_catalog c on c.track_key = private.track_key(h.to_space, h.to_specialization)
      where h.user_id = uid and c.rank is not null order by c.rank desc limit 1
    ), cur_row.track_key) into ref_key;
    select coalesce(array_agg(c.competency order by c.competency), '{}') into missing from private.track_competencies c
     where c.track_key = ref_key
       and not exists (select 1 from public.competency_validations v where v.user_id = uid and v.competency = c.competency);
    if array_length(missing, 1) > 0 then
      raise exception 'Compétences à valider avant ce parcours : %', array_to_string(missing, ', ') using errcode = 'P0001', hint = 'entry_missing';
    end if;
  end if;

  if not direct and tgt_row.rank is not null and (cur_row.rank is null or tgt_row.rank > cur_row.rank) then
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

create or replace function private.attempt_payload(p_attempt public.attempts, p_a public.assessments)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id, 'assessment_id', p_a.id, 'title', p_a.title,
    'kind', p_a.kind, 'status', p_attempt.status,
    'deadline_at', p_attempt.deadline_at, 'server_now', now(),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', i.position, 'kind', q.kind, 'skill', q.skill,
        'prompt', v.v -> 'prompt', 'options', v.v -> 'options', 'unit', v.v -> 'unit',
        'response', i.response -> 'value') order by i.position)
      from private.attempt_items i
      join private.questions q on q.id = i.question_id
      cross join lateral (select q.variants -> i.variant_index as v) v
      where i.attempt_id = p_attempt.id), '[]'::jsonb));
$$;

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

create or replace function public.attempt_result(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.require_user(); t public.attempts; a public.assessments; items jsonb;
begin
  select * into t from public.attempts where id = p_attempt and (user_id = uid or public.is_admin());
  if not found then raise exception 'Tentative introuvable' using errcode = 'P0002'; end if;
  if t.status = 'in_progress' then raise exception 'Tentative en cours' using errcode = 'P0001', hint = 'open'; end if;
  select * into a from public.assessments where id = t.assessment_id;
  select jsonb_agg(jsonb_build_object(
      'position', i.position, 'skill', q.skill, 'kind', q.kind, 'correct', coalesce(i.correct, false),
      'prompt', v.v -> 'prompt', 'options', v.v -> 'options', 'unit', v.v -> 'unit',
      'response', i.response -> 'value',
      'answer', case when a.show_correction then v.v -> 'answer' end,
      'explanation', case when a.show_correction then v.v -> 'explanation' end) order by i.position)
    into items
    from private.attempt_items i join private.questions q on q.id = i.question_id
    cross join lateral (select q.variants -> i.variant_index as v) v
   where i.attempt_id = t.id;
  return jsonb_build_object('attempt_id', t.id, 'assessment_id', t.assessment_id, 'title', a.title, 'kind', a.kind,
    'competency', a.competency, 'status', t.status, 'percent', t.percent, 'passed', t.passed, 'pass_percent', a.pass_percent,
    'score_points', t.score_points, 'max_points', t.max_points, 'submitted_at', t.submitted_at,
    'proctor_status', t.proctor_status, 'show_correction', a.show_correction,
    'items', coalesce(items, '[]'::jsonb));
end $$;

create or replace function public.admin_list_users(p_search text default '', p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(row_to_json(r)) from (
    select p.id, u.email, p.display_name, p.space, p.role, p.created_at,
      (select count(*) from public.competency_validations v where v.user_id = p.id) as validations,
      (select count(*) from public.attempts t where t.user_id = p.id and t.status <> 'in_progress') as attempts,
      (select updated_at from public.progress g where g.user_id = p.id) as last_sync
    from public.profiles p join auth.users u on u.id = p.id
    where p_search = '' or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
    order by p.created_at desc limit least(p_limit, 200) offset greatest(p_offset, 0)) r), '[]'::jsonb);
end $$;

drop function if exists private.options_in_order(jsonb, jsonb);

revoke all on all functions in schema private from public, anon, authenticated;
