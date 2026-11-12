-- Annulation de 20261111000100_v2_level_choice.sql : rétablit les règles de la migration 4
-- (premier parcours Préparatoire ou Licence 1, montée de niveau sur compétences d'entrée,
-- tous les prérequis bloquants). Aucune donnée n'est supprimée : les parcours déjà choisis restent.

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
  if p_space not in ('preparatoire', 'l1') then
    raise exception 'Le premier parcours est Préparatoire ou Licence 1. Les niveaux supérieurs s''ouvrent par les évaluations ou les tests de positionnement, le Monde professionnel par une demande approuvée par l''administration.'
      using errcode = 'P0001', hint = 'initial_restricted';
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

  -- Un étudiant ne rejoint le Monde professionnel qu'après toutes les évaluations
  -- du niveau le plus élevé qu'il a occupé (une descente ne réduit pas l'exigence).
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

create or replace function public.start_attempt(p_assessment text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := private.require_user();
  a    public.assessments;
  t    public.attempts;
  prof public.profiles;
  used integer;
  last_end timestamptz;
  last_id uuid;
  fails integer;
  wait_min integer;
  missing text[];
  pos  integer := 0;
  q    record;
  n    integer;
  prev integer;
  vi   integer;
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

  -- Évaluation finale : après 2 échecs consécutifs, 2 h d'attente ; après 3, 24 h. Une réussite remet à zéro.
  wait_min := a.cooldown_minutes;
  if a.kind = 'course_final' and a.cooldown_minutes > 0 then
    select count(*) into fails from public.attempts x
     where x.user_id = uid and x.assessment_id = a.id and x.status in ('submitted','expired') and x.passed is not true
       and x.submitted_at > coalesce((select max(y.submitted_at) from public.attempts y
                                       where y.user_id = uid and y.assessment_id = a.id and y.passed), '-infinity'::timestamptz);
    wait_min := case when fails >= 3 then greatest(a.cooldown_minutes, 1440)
                     when fails = 2 then greatest(a.cooldown_minutes, 120)
                     else a.cooldown_minutes end;
  end if;
  if wait_min > 0 and last_end is not null and last_end + make_interval(mins => wait_min) > now() then
    raise exception 'Nouvelle tentative possible à partir de %', to_char(last_end + make_interval(mins => wait_min), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') using errcode = 'P0001', hint = 'cooldown';
  end if;

  select x.id into last_id from public.attempts x
   where x.user_id = uid and x.assessment_id = a.id and x.status <> 'in_progress' order by x.started_at desc limit 1;

  insert into public.attempts (user_id, assessment_id, deadline_at)
  values (uid, a.id, case when a.duration_seconds is null then null else now() + make_interval(secs => a.duration_seconds) end)
  returning * into t;

  -- D'abord les questions absentes de la tentative précédente, puis une autre version que la dernière vue.
  for q in
    select qq.id, qq.kind, qq.variants from private.questions qq
    where qq.assessment_id = a.id and qq.active
    order by exists (select 1 from private.attempt_items i where i.attempt_id = last_id and i.question_id = qq.id), random()
    limit a.question_count
  loop
    pos := pos + 1;
    n := jsonb_array_length(q.variants);
    select i.variant_index into prev from private.attempt_items i join public.attempts x on x.id = i.attempt_id
     where x.user_id = uid and i.question_id = q.id and x.id <> t.id order by x.started_at desc limit 1;
    vi := case when prev is null or n < 2 then floor(random() * n)::int else (prev + 1 + floor(random() * (n - 1))::int) % n end;
    insert into private.attempt_items (attempt_id, position, question_id, variant_index, option_order)
    values (t.id, pos, q.id, vi, case when q.kind = 'qcm' then (
      select jsonb_agg(o.value -> 'id' order by random()) from jsonb_array_elements(q.variants -> vi -> 'options') o) end);
  end loop;
  if pos = 0 then raise exception 'Cette évaluation ne contient aucune question' using errcode = 'P0002'; end if;

  return private.attempt_payload(t, a);
end $$;

revoke all on function public.choose_initial_track(text, text) from public, anon, authenticated;
revoke all on function public.change_track(text, text) from public, anon, authenticated;
revoke all on function public.start_attempt(text) from public, anon, authenticated;
grant execute on function public.choose_initial_track(text, text) to authenticated;
grant execute on function public.change_track(text, text) to authenticated;
grant execute on function public.start_attempt(text) to authenticated;
