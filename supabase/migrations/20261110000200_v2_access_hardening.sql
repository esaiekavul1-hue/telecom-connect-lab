-- =====================================================================
-- TELECOM CONNECT LAB 2.0 — Sécurisation des accès (migration ADDITIVE)
-- ---------------------------------------------------------------------
-- À exécuter UNE fois, après les migrations 1 à 3 et
-- supabase/seed/assessments.generated.sql (déjà installés sur le projet).
-- Reprend les corrections de sécurité antérieures : inutile de rejouer 1 à 3.
-- Rejouable sans effet de bord. Aucune donnée supprimée, public.progress intacte.
-- Annulation : supabase/rollback/20261110000200_v2_access_hardening.down.sql
--
--   1. Premier parcours : Préparatoire ou Licence 1 uniquement.
--   2. Monde professionnel à l'inscription : sur demande, approuvée par l'administration.
--      Les comptes déjà inscrits en professionnel gardent leurs droits (« legacy »)
--      et apparaissent dans la liste à vérifier.
--   3. Corrigés : évaluations finales après réussite seulement ; jamais pour un positionnement.
--   4. Contre la mémorisation : autres questions et autres versions qu'à la tentative
--      précédente, ordre des choix mélangé, attente croissante après des échecs répétés.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Corrections antérieures (sans effet si elles sont déjà en place)
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(new.raw_user_meta_data ->> 'full_name', 120))
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Un profil manquant se recrée au premier choix de parcours : ne jamais bloquer une inscription (V1 comprise).
  raise warning 'tcl_on_auth_user_created : %', sqlerrm;
  return new;
end $$;

-- Seul le nom d'affichage reste modifiable par l'étudiant.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 1. Statut professionnel
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists pro_status text;
alter table public.profiles add column if not exists pro_specialization text;
alter table public.profiles add column if not exists pro_message text;
alter table public.profiles add column if not exists pro_requested_at timestamptz;
alter table public.profiles add column if not exists pro_decided_at timestamptz;
alter table public.profiles add column if not exists pro_decided_by uuid references auth.users (id) on delete set null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pro_status_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_pro_status_check check (pro_status in ('pending','approved','rejected','legacy'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_pro_message_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_pro_message_check check (char_length(pro_message) <= 300);
  end if;
end $$;

-- Comptes inscrits directement en professionnel avant cette migration : droits conservés, à vérifier.
update public.profiles p set pro_status = 'legacy'
 where p.pro_status is null
   and exists (select 1 from public.track_history h where h.user_id = p.id and h.kind = 'initial' and h.to_space = 'pro');

-- Accès libre à tous les niveaux : professionnel approuvé, ou ancien compte en attente de vérification.
create or replace function private.is_direct_pro(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = p_user and p.pro_status in ('approved','legacy'));
$$;

-- Premier choix : une seule fois, Préparatoire ou Licence 1.
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

-- Changement volontaire (règles de la migration 3, statut professionnel vérifié).
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

-- Demande d'accès professionnel. Ne donne aucun droit avant l'approbation.
create or replace function public.request_pro(p_specialization text default null, p_message text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := private.require_user();
  spec text := private.check_track('pro', p_specialization);
  msg  text := nullif(left(btrim(coalesce(p_message, '')), 300), '');
  prof public.profiles;
begin
  select * into prof from public.profiles where id = uid for update;
  if prof.space is null then raise exception 'Choisissez d''abord votre parcours' using errcode = 'P0001', hint = 'no_track'; end if;
  if prof.pro_status in ('approved','legacy') then
    return jsonb_build_object('pro_status', prof.pro_status, 'pro_specialization', prof.pro_specialization);
  end if;
  if prof.pro_status = 'rejected' and prof.pro_decided_at > now() - interval '1 day' then
    raise exception 'Une nouvelle demande sera possible 24 heures après la décision précédente.' using errcode = 'P0001', hint = 'pro_cooldown';
  end if;
  update public.profiles set pro_status = 'pending', pro_specialization = spec, pro_message = coalesce(msg, case when prof.pro_status = 'pending' then prof.pro_message end),
      pro_requested_at = case when prof.pro_status = 'pending' then prof.pro_requested_at else now() end,
      pro_decided_at = null, pro_decided_by = null, updated_at = now()
    where id = uid returning * into prof;
  return jsonb_build_object('pro_status', prof.pro_status, 'pro_specialization', prof.pro_specialization, 'pro_requested_at', prof.pro_requested_at);
end $$;

create or replace function public.admin_list_pro_requests() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(row_to_json(r)) from (
    select p.id, u.email, p.display_name, p.space, p.specialization, p.pro_status, p.pro_specialization, p.pro_message,
      p.pro_requested_at, p.created_at,
      (select count(*) from public.competency_validations v where v.user_id = p.id) as validations
    from public.profiles p join auth.users u on u.id = p.id
    where p.pro_status in ('pending','legacy')
    order by (p.pro_status = 'pending') desc, coalesce(p.pro_requested_at, p.created_at)) r), '[]'::jsonb);
end $$;

-- Décision de l'administration. Approuver : Monde professionnel et accès libre.
-- Refuser un compte qui avait l'accès libre : retour au plus haut niveau, au plus son niveau
-- actuel, dont il a validé les compétences d'entrée. Aucune validation ni tentative supprimée.
create or replace function public.admin_decide_pro(p_user uuid, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me   uuid := private.require_admin();
  prof public.profiles;
  cur_rank integer;
  back text;
  new_status text := case when p_approve then 'approved' else 'rejected' end;
begin
  select * into prof from public.profiles where id = p_user for update;
  if not found then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  if prof.pro_status is null then raise exception 'Aucune demande professionnelle pour ce compte' using errcode = 'P0002'; end if;

  if p_approve and prof.pro_status = 'pending' and prof.space is distinct from 'pro' then
    insert into public.track_history (user_id, from_space, from_specialization, to_space, to_specialization, kind)
    values (p_user, prof.space, prof.specialization, 'pro', prof.pro_specialization, 'change');
    update public.profiles set space = 'pro', specialization = prof.pro_specialization where id = p_user;
  elsif not p_approve and prof.pro_status in ('approved','legacy') and prof.space is not null then
    select c.rank into cur_rank from private.track_catalog c where c.track_key = private.track_key(prof.space, prof.specialization);
    select c.space into back from private.track_catalog c
     where c.rank is not null and (cur_rank is null or c.rank <= cur_rank)
       and not exists (select 1 from unnest(c.entry) e
                       where not exists (select 1 from public.competency_validations v where v.user_id = p_user and v.competency = e))
     order by c.rank desc limit 1;
    back := coalesce(back, 'preparatoire');
    if back is distinct from prof.space or prof.specialization is not null then
      insert into public.track_history (user_id, from_space, from_specialization, to_space, to_specialization, kind)
      values (p_user, prof.space, prof.specialization, back, null, 'change');
      update public.profiles set space = back, specialization = null where id = p_user;
    end if;
  end if;

  update public.profiles set pro_status = new_status, pro_decided_at = now(), pro_decided_by = me, updated_at = now() where id = p_user;
  perform private.audit('decide_pro', p_user::text, jsonb_build_object('approve', p_approve, 'previous', prof.pro_status, 'note', left(p_note, 300)));
  return jsonb_build_object('pro_status', new_status);
end $$;

create or replace function public.admin_list_users(p_search text default '', p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(row_to_json(r)) from (
    select p.id, u.email, p.display_name, p.space, p.specialization, p.role, p.pro_status, p.created_at,
      (select count(*) from public.competency_validations v where v.user_id = p.id) as validations,
      (select count(*) from public.attempts t where t.user_id = p.id and t.status <> 'in_progress') as attempts,
      (select updated_at from public.progress g where g.user_id = p.id) as last_sync
    from public.profiles p join auth.users u on u.id = p.id
    where p_search = '' or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%'
    order by p.created_at desc limit least(p_limit, 200) offset greatest(p_offset, 0)) r), '[]'::jsonb);
end $$;

-- ---------------------------------------------------------------------
-- 2. Évaluations : corrigés et mémorisation
-- ---------------------------------------------------------------------
alter table private.attempt_items add column if not exists option_order jsonb;

-- Les tests de positionnement ne communiquent jamais leur corrigé.
update public.assessments set show_correction = false where kind = 'placement' and show_correction;

create or replace function private.options_in_order(p_options jsonb, p_order jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when p_order is null or p_options is null or jsonb_typeof(p_options) <> 'array' then p_options else coalesce((
    select jsonb_agg(o.value order by x.ord)
    from jsonb_array_elements(p_options) o
    join jsonb_array_elements(p_order) with ordinality x(id, ord) on x.id = o.value -> 'id'), p_options) end;
$$;

create or replace function private.attempt_payload(p_attempt public.attempts, p_a public.assessments)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attempt_id', p_attempt.id, 'assessment_id', p_a.id, 'title', p_a.title,
    'kind', p_a.kind, 'status', p_attempt.status,
    'deadline_at', p_attempt.deadline_at, 'server_now', now(),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', i.position, 'kind', q.kind, 'skill', q.skill,
        'prompt', v.v -> 'prompt', 'options', private.options_in_order(v.v -> 'options', i.option_order), 'unit', v.v -> 'unit',
        'response', i.response -> 'value') order by i.position)
      from private.attempt_items i
      join private.questions q on q.id = i.question_id
      cross join lateral (select q.variants -> i.variant_index as v) v
      where i.attempt_id = p_attempt.id), '[]'::jsonb));
$$;

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

-- Résultat : le détail (énoncé, réponse attendue, explication) seulement après une réussite
-- validée d'une évaluation finale. Sinon : juste ou faux par question et notion concernée.
create or replace function public.attempt_result(p_attempt uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid   uuid := private.require_user();
  adm   boolean := public.is_admin();
  t     public.attempts;
  a     public.assessments;
  items jsonb;
  show_all boolean;
begin
  select * into t from public.attempts where id = p_attempt and (user_id = uid or adm);
  if not found then raise exception 'Tentative introuvable' using errcode = 'P0002'; end if;
  if t.status = 'in_progress' then raise exception 'Tentative en cours' using errcode = 'P0001', hint = 'open'; end if;
  select * into a from public.assessments where id = t.assessment_id;
  show_all := adm or (a.show_correction and a.kind <> 'placement' and t.passed is true and t.proctor_status in ('not_required','approved'));
  select jsonb_agg(case when show_all then jsonb_build_object(
      'position', i.position, 'skill', q.skill, 'kind', q.kind, 'correct', coalesce(i.correct, false),
      'prompt', v.v -> 'prompt', 'options', private.options_in_order(v.v -> 'options', i.option_order), 'unit', v.v -> 'unit',
      'response', i.response -> 'value', 'answer', v.v -> 'answer', 'explanation', v.v -> 'explanation')
    else jsonb_build_object('position', i.position, 'skill', q.skill, 'kind', q.kind, 'correct', coalesce(i.correct, false)) end
    order by i.position)
    into items
    from private.attempt_items i join private.questions q on q.id = i.question_id
    cross join lateral (select q.variants -> i.variant_index as v) v
   where i.attempt_id = t.id;
  return jsonb_build_object('attempt_id', t.id, 'assessment_id', t.assessment_id, 'title', a.title, 'kind', a.kind,
    'competency', a.competency, 'status', t.status, 'percent', t.percent, 'passed', t.passed, 'pass_percent', a.pass_percent,
    'score_points', t.score_points, 'max_points', t.max_points, 'submitted_at', t.submitted_at,
    'proctor_status', t.proctor_status, 'show_correction', show_all,
    'correction_policy', case when a.kind = 'placement' or not a.show_correction then 'never' else 'after_pass' end,
    'items', coalesce(items, '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------
-- 3. Droits d'exécution : tout est fermé, puis ouvert fonction par fonction
-- ---------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.request_pro(text, text) from public, anon, authenticated;
revoke all on function public.admin_list_pro_requests() from public, anon, authenticated;
revoke all on function public.admin_decide_pro(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.choose_initial_track(text, text) from public, anon, authenticated;
revoke all on function public.change_track(text, text) from public, anon, authenticated;
revoke all on function public.start_attempt(text) from public, anon, authenticated;
revoke all on function public.attempt_result(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_users(text, integer, integer) from public, anon, authenticated;
grant execute on function public.request_pro(text, text) to authenticated;
grant execute on function public.admin_list_pro_requests() to authenticated;
grant execute on function public.admin_decide_pro(uuid, boolean, text) to authenticated;
grant execute on function public.choose_initial_track(text, text) to authenticated;
grant execute on function public.change_track(text, text) to authenticated;
grant execute on function public.start_attempt(text) to authenticated;
grant execute on function public.attempt_result(uuid) to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
