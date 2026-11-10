-- =====================================================================
-- TELECOM CONNECT LAB 2.0 — Socle serveur (migration ADDITIVE)
-- ---------------------------------------------------------------------
-- Ne modifie ni ne supprime la table public.progress ni aucun compte.
-- Annulation : supabase/rollback/20261108000100_v2_core.down.sql
--
-- Principes :
--   * public.progress reste le carnet personnel (modifiable par l'étudiant,
--     donc NON officiel).
--   * Les validations officielles (public.competency_validations) ne peuvent
--     être écrites que par les fonctions ci-dessous, après correction serveur.
--   * Les corrigés vivent dans le schéma « private », non exposé par l'API.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------
-- Profils et rôles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 120),
  space        text check (space in ('preparatoire','l1','l2','l3','master','pro')),
  role         text not null default 'student' check (role in ('student','teacher','admin')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

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

drop trigger if exists tcl_on_auth_user_created on auth.users;
create trigger tcl_on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- Comptes déjà existants : un profil étudiant est créé, rien d'autre ne change.
insert into public.profiles (id, display_name)
select u.id, left(u.raw_user_meta_data ->> 'full_name', 120) from auth.users u
on conflict (id) do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Le rôle n'est PAS modifiable par l'utilisateur : droits limités à ces colonnes.
grant update (display_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Paramètres de la plateforme
-- ---------------------------------------------------------------------
create table if not exists public.platform_settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
drop policy if exists settings_select on public.platform_settings;
create policy settings_select on public.platform_settings for select to authenticated
  using (is_public or (select public.is_admin()));
revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to authenticated;

insert into public.platform_settings (key, value, is_public) values
  ('ai_enabled',            'true',  true),
  ('ai_daily_requests',     '20',    true),
  ('ai_monthly_budget_usd', '10',    false),
  ('curriculum_overrides',  '{}',    true),
  ('min_app_version',       '"1.0.0"', true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Évaluations
-- ---------------------------------------------------------------------
create table if not exists public.assessments (
  id               text primary key,
  title            text not null,
  description      text not null default '',
  kind             text not null check (kind in ('quiz','course_final','placement','exam')),
  competency       text,
  question_count   integer not null check (question_count > 0),
  pass_percent     numeric(5,2) not null default 70 check (pass_percent between 0 and 100),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  max_attempts     integer check (max_attempts is null or max_attempts > 0),
  cooldown_minutes integer not null default 0 check (cooldown_minutes >= 0),
  requires_proctor boolean not null default false,
  show_correction  boolean not null default true,
  prerequisites    text[] not null default '{}',
  grants           text[] not null default '{}',
  status           text not null default 'draft' check (status in ('draft','published','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.assessments enable row level security;
drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments for select to authenticated
  using (status = 'published' or (select public.is_admin()));
revoke all on public.assessments from anon, authenticated;
grant select on public.assessments to authenticated;

-- Banque de questions et corrigés : schéma privé, aucun droit client.
-- variants = [{ "prompt": html, "options": [{id,label}], "answer": {...}, "explanation": html, "unit": "V" }]
--   answer selon kind : qcm {"id":"b"} ; numeric {"value":12,"abs":0.1} ou {"value":12,"rel":0.01} ;
--                       text {"accepted":["192.168.1.0"]}
create table if not exists private.questions (
  id            text primary key,
  assessment_id text not null references public.assessments (id) on delete cascade,
  skill         text not null,
  kind          text not null check (kind in ('qcm','numeric','text')),
  points        numeric(6,2) not null default 1 check (points > 0),
  active        boolean not null default true,
  variants      jsonb not null check (jsonb_typeof(variants) = 'array' and jsonb_array_length(variants) > 0)
);
create index if not exists questions_assessment_idx on private.questions (assessment_id) where active;

create table if not exists public.attempts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  assessment_id  text not null references public.assessments (id),
  status         text not null default 'in_progress' check (status in ('in_progress','submitted','expired','voided')),
  started_at     timestamptz not null default now(),
  deadline_at    timestamptz,
  submitted_at   timestamptz,
  score_points   numeric(8,2),
  max_points     numeric(8,2),
  percent        numeric(5,2),
  passed         boolean,
  proctor_status text not null default 'not_required' check (proctor_status in ('not_required','pending','approved','rejected')),
  proctor_note   text check (char_length(proctor_note) <= 500)
);
create unique index if not exists attempts_one_open on public.attempts (user_id, assessment_id) where status = 'in_progress';
create index if not exists attempts_user_idx on public.attempts (user_id, started_at desc);
alter table public.attempts enable row level security;
drop policy if exists attempts_select on public.attempts;
create policy attempts_select on public.attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke all on public.attempts from anon, authenticated;
grant select on public.attempts to authenticated;

create table if not exists private.attempt_items (
  attempt_id    uuid not null references public.attempts (id) on delete cascade,
  position      integer not null,
  question_id   text not null references private.questions (id),
  variant_index integer not null,
  response      jsonb,
  correct       boolean,
  points        numeric(6,2),
  primary key (attempt_id, position)
);

create table if not exists public.competency_validations (
  user_id      uuid not null references auth.users (id) on delete cascade,
  competency   text not null,
  source       text not null check (source in ('assessment','placement','admin')),
  attempt_id   uuid references public.attempts (id) on delete set null,
  validated_by uuid references auth.users (id) on delete set null,
  validated_at timestamptz not null default now(),
  primary key (user_id, competency)
);
alter table public.competency_validations enable row level security;
drop policy if exists validations_select on public.competency_validations;
create policy validations_select on public.competency_validations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke all on public.competency_validations from anon, authenticated;
grant select on public.competency_validations to authenticated;

-- ---------------------------------------------------------------------
-- Correction
-- ---------------------------------------------------------------------
create or replace function private.grade(p_kind text, p_answer jsonb, p_response jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  raw text := btrim(coalesce(p_response ->> 'value', ''));
  n   numeric;
  ref numeric;
begin
  if raw = '' or char_length(raw) > 200 then return false; end if;
  if p_kind = 'qcm' then
    return raw = p_answer ->> 'id';
  elsif p_kind = 'numeric' then
    raw := replace(replace(replace(raw, ',', '.'), ' ', ''), chr(160), '');
    if raw !~ '^[-+]?([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][-+]?[0-9]{1,3})?' then return false; end if;
    n := substring(raw from '^[-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][-+]?[0-9]{1,3})?')::numeric;
    -- Après le nombre, seule l'unité attendue est tolérée.
    if lower(btrim(substring(raw from '^[-+]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][-+]?[0-9]{1,3})?(.*)$'))) not in ('', lower(replace(coalesce(p_answer ->> 'unit', ''), ' ', ''))) then
      return false;
    end if;
    ref := (p_answer ->> 'value')::numeric;
    if p_answer ? 'abs' then return abs(n - ref) <= (p_answer ->> 'abs')::numeric; end if;
    return abs(n - ref) <= abs(ref) * coalesce((p_answer ->> 'rel')::numeric, 0.01);
  elsif p_kind = 'text' then
    return exists (
      select 1 from jsonb_array_elements_text(p_answer -> 'accepted') a(v)
      where lower(regexp_replace(a.v, '\s+', '', 'g')) = lower(regexp_replace(raw, '\s+', '', 'g'))
    );
  end if;
  return false;
exception when others then
  return false;
end $$;

create or replace function private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Authentification requise' using errcode = '28000'; end if;
  return uid;
end $$;

create or replace function private.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  if not public.is_admin() then raise exception 'Réservé à l''administration' using errcode = '42501'; end if;
  return uid;
end $$;

-- Note attribuée à partir des réponses enregistrées AVANT l'échéance.
create or replace function private.finalize_attempt(p_attempt public.attempts, p_status text)
returns public.attempts language plpgsql security definer set search_path = '' as $$
declare
  a      public.assessments;
  it     record;
  ok     boolean;
  score  numeric := 0;
  total  numeric := 0;
  pct    numeric;
  did_pass boolean;
  pstat  text;
  result public.attempts;
begin
  select * into a from public.assessments where id = p_attempt.assessment_id;
  for it in
    select i.position, i.response, q.kind, q.points, q.variants -> i.variant_index as v
    from private.attempt_items i join private.questions q on q.id = i.question_id
    where i.attempt_id = p_attempt.id
  loop
    ok := it.response is not null and private.grade(it.kind, (it.v -> 'answer') || jsonb_build_object('unit', it.v ->> 'unit'), it.response);
    total := total + it.points;
    if ok then score := score + it.points; end if;
    update private.attempt_items set correct = ok, points = case when ok then it.points else 0 end
      where attempt_id = p_attempt.id and position = it.position;
  end loop;
  pct := case when total > 0 then round(score / total * 100, 2) else 0 end;
  did_pass := pct >= a.pass_percent;
  pstat := case when a.requires_proctor and did_pass then 'pending' else 'not_required' end;

  update public.attempts set status = p_status, submitted_at = now(), score_points = score, max_points = total,
    percent = pct, passed = did_pass, proctor_status = pstat
    where id = p_attempt.id returning * into result;

  if did_pass and not a.requires_proctor then
    perform private.grant_competencies(result, a);
  end if;
  return result;
end $$;

create or replace function private.grant_competencies(p_attempt public.attempts, p_a public.assessments)
returns void language plpgsql security definer set search_path = '' as $$
declare c text;
begin
  foreach c in array (
    case when p_a.competency is null then p_a.grants else array_append(p_a.grants, p_a.competency) end
  ) loop
    insert into public.competency_validations (user_id, competency, source, attempt_id)
    values (p_attempt.user_id, c, case when p_a.kind = 'placement' then 'placement' else 'assessment' end, p_attempt.id)
    on conflict (user_id, competency) do nothing;
  end loop;
end $$;

-- Clôture des tentatives dont l'échéance est dépassée (marge réseau : 30 s).
create or replace function private.expire_stale(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare r public.attempts;
begin
  for r in select * from public.attempts
           where user_id = p_user and status = 'in_progress' and deadline_at is not null
             and deadline_at + interval '30 seconds' < now()
           for update skip locked
  loop
    perform private.finalize_attempt(r, 'expired');
  end loop;
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

-- ---------------------------------------------------------------------
-- API étudiante
-- ---------------------------------------------------------------------
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

create or replace function public.save_answer(p_attempt uuid, p_position integer, p_value text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_user(); t public.attempts;
begin
  if char_length(p_value) > 200 then raise exception 'Réponse trop longue' using errcode = '22001'; end if;
  select * into t from public.attempts where id = p_attempt and user_id = uid for update;
  if not found then raise exception 'Tentative introuvable' using errcode = 'P0002'; end if;
  if t.status <> 'in_progress' then raise exception 'Tentative déjà terminée' using errcode = 'P0001', hint = 'closed'; end if;
  if t.deadline_at is not null and t.deadline_at + interval '30 seconds' < now() then
    raise exception 'Temps écoulé' using errcode = 'P0001', hint = 'deadline';
  end if;
  update private.attempt_items set response = jsonb_build_object('value', p_value, 'at', now())
   where attempt_id = t.id and position = p_position;
  if not found then raise exception 'Question introuvable' using errcode = 'P0002'; end if;
  return jsonb_build_object('saved', true, 'server_now', now());
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

create or replace function public.submit_attempt(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_user(); t public.attempts; late boolean;
begin
  select * into t from public.attempts where id = p_attempt and user_id = uid for update;
  if not found then raise exception 'Tentative introuvable' using errcode = 'P0002'; end if;
  if t.status = 'in_progress' then
    late := t.deadline_at is not null and t.deadline_at + interval '30 seconds' < now();
    perform private.finalize_attempt(t, case when late then 'expired' else 'submitted' end);
  end if;
  return public.attempt_result(p_attempt);
end $$;

-- Journal d'erreurs côté client (longueurs bornées, 30 par heure et par compte).
create table if not exists public.error_log (
  id       bigint generated always as identity primary key,
  user_id  uuid references auth.users (id) on delete set null,
  at       timestamptz not null default now(),
  kind     text not null,
  message  text not null,
  context  jsonb not null default '{}'
);
create index if not exists error_log_at_idx on public.error_log (at desc);
alter table public.error_log enable row level security;
drop policy if exists error_log_admin on public.error_log;
create policy error_log_admin on public.error_log for select to authenticated using ((select public.is_admin()));
revoke all on public.error_log from anon, authenticated;
grant select on public.error_log to authenticated;

create or replace function public.log_client_error(p_kind text, p_message text, p_context jsonb default '{}') returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  if (select count(*) from public.error_log where user_id = uid and at > now() - interval '1 hour') >= 30 then return; end if;
  insert into public.error_log (user_id, kind, message, context)
  values (uid, left(p_kind, 40), left(p_message, 1000), case when pg_column_size(p_context) > 4000 then '{}'::jsonb else p_context end);
end $$;

-- ---------------------------------------------------------------------
-- Assistant IA : quotas et coûts (appelés UNIQUEMENT par la fonction serveur)
-- ---------------------------------------------------------------------
create table if not exists public.ai_usage_daily (
  user_id       uuid not null references auth.users (id) on delete cascade,
  day           date not null default (now() at time zone 'utc')::date,
  requests      integer not null default 0,
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd      numeric(12,6) not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage_daily enable row level security;
drop policy if exists ai_usage_select on public.ai_usage_daily;
create policy ai_usage_select on public.ai_usage_daily for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke all on public.ai_usage_daily from anon, authenticated;
grant select on public.ai_usage_daily to authenticated;

create or replace function public.ai_reserve_request(p_user uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  enabled boolean;
  daily integer;
  budget numeric;
  spent numeric;
  used integer;
begin
  select (value)::text::boolean into enabled from public.platform_settings where key = 'ai_enabled';
  if not coalesce(enabled, false) then return jsonb_build_object('allowed', false, 'reason', 'disabled'); end if;

  -- L'assistant est coupé pendant toute évaluation formelle en cours.
  if exists (
    select 1 from public.attempts t join public.assessments a on a.id = t.assessment_id
    where t.user_id = p_user and t.status = 'in_progress' and a.kind <> 'quiz'
      and (t.deadline_at is null or t.deadline_at + interval '30 seconds' > now())
  ) then return jsonb_build_object('allowed', false, 'reason', 'exam_active'); end if;

  select (value)::text::numeric into budget from public.platform_settings where key = 'ai_monthly_budget_usd';
  select coalesce(sum(cost_usd), 0) into spent from public.ai_usage_daily where day >= date_trunc('month', today)::date;
  if budget is not null and spent >= budget then return jsonb_build_object('allowed', false, 'reason', 'budget'); end if;

  select (value)::text::integer into daily from public.platform_settings where key = 'ai_daily_requests';
  insert into public.ai_usage_daily as u (user_id, day, requests) values (p_user, today, 1)
  on conflict (user_id, day) do update set requests = u.requests + 1
    where u.requests < coalesce(daily, 20)
  returning requests into used;
  if used is null then return jsonb_build_object('allowed', false, 'reason', 'daily_limit', 'limit', daily); end if;
  return jsonb_build_object('allowed', true, 'used', used, 'limit', daily);
end $$;

create or replace function public.ai_record_usage(p_user uuid, p_input bigint, p_output bigint, p_cost numeric) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage_daily set input_tokens = input_tokens + greatest(p_input, 0),
    output_tokens = output_tokens + greatest(p_output, 0), cost_usd = cost_usd + greatest(p_cost, 0)
   where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

-- Rend une demande restée sans réponse (limite ou panne du fournisseur).
create or replace function public.ai_release_request(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage_daily set requests = greatest(requests - 1, 0)
   where user_id = p_user and day = (now() at time zone 'utc')::date;
$$;

-- ---------------------------------------------------------------------
-- Administration
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  actor    uuid references auth.users (id) on delete set null,
  action   text not null,
  target   text,
  details  jsonb not null default '{}'
);
alter table public.audit_log enable row level security;
drop policy if exists audit_admin on public.audit_log;
create policy audit_admin on public.audit_log for select to authenticated using ((select public.is_admin()));
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function private.audit(p_action text, p_target text, p_details jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor, action, target, details) values (auth.uid(), p_action, p_target, p_details);
$$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'active_7d', (select count(*) from public.progress where updated_at > now() - interval '7 days'),
    'attempts', (select count(*) from public.attempts where status in ('submitted','expired')),
    'pass_rate', (select round(avg(case when passed then 100 else 0 end), 1) from public.attempts where status in ('submitted','expired')),
    'pending_reviews', (select count(*) from public.attempts where proctor_status = 'pending'),
    'validations', (select count(*) from public.competency_validations),
    'errors_24h', (select count(*) from public.error_log where at > now() - interval '24 hours'),
    'ai_requests_30d', (select coalesce(sum(requests), 0) from public.ai_usage_daily where day > (now() at time zone 'utc')::date - 30),
    'ai_cost_month', (select coalesce(sum(cost_usd), 0) from public.ai_usage_daily where day >= date_trunc('month', now() at time zone 'utc')::date));
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

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := private.require_admin();
begin
  if p_role not in ('student','teacher','admin') then raise exception 'Rôle inconnu' using errcode = '22023'; end if;
  if p_user = me and p_role <> 'admin' then raise exception 'Vous ne pouvez pas retirer votre propre rôle d''administration' using errcode = 'P0001', hint = 'self_demote'; end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user;
  if not found then raise exception 'Utilisateur introuvable' using errcode = 'P0002'; end if;
  perform private.audit('set_role', p_user::text, jsonb_build_object('role', p_role));
end $$;

create or replace function public.admin_set_setting(p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.platform_settings set value = p_value, updated_at = now() where key = p_key;
  if not found then raise exception 'Paramètre inconnu' using errcode = 'P0002'; end if;
  perform private.audit('set_setting', p_key, jsonb_build_object('value', p_value));
end $$;

create or replace function public.admin_pending_reviews() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(row_to_json(r)) from (
    select t.id, u.email, a.title, t.percent, t.submitted_at from public.attempts t
    join auth.users u on u.id = t.user_id join public.assessments a on a.id = t.assessment_id
    where t.proctor_status = 'pending' order by t.submitted_at) r), '[]'::jsonb);
end $$;

create or replace function public.admin_review_attempt(p_attempt uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.attempts; a public.assessments;
begin
  perform private.require_admin();
  select * into t from public.attempts where id = p_attempt and proctor_status = 'pending' for update;
  if not found then raise exception 'Aucune supervision en attente pour cette tentative' using errcode = 'P0002'; end if;
  select * into a from public.assessments where id = t.assessment_id;
  update public.attempts set proctor_status = case when p_approve then 'approved' else 'rejected' end, proctor_note = left(p_note, 500) where id = t.id;
  if p_approve then perform private.grant_competencies(t, a); end if;
  perform private.audit('review_attempt', t.id::text, jsonb_build_object('approve', p_approve));
end $$;

-- Paramètres d'une évaluation (la banque de questions se gère séparément).
create or replace function public.admin_update_assessment(p_id text, p_patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.assessments set
    status           = coalesce(p_patch ->> 'status', status),
    pass_percent     = coalesce((p_patch ->> 'pass_percent')::numeric, pass_percent),
    question_count   = coalesce((p_patch ->> 'question_count')::integer, question_count),
    duration_seconds = case when p_patch ? 'duration_seconds' then (p_patch ->> 'duration_seconds')::integer else duration_seconds end,
    max_attempts     = case when p_patch ? 'max_attempts' then (p_patch ->> 'max_attempts')::integer else max_attempts end,
    cooldown_minutes = coalesce((p_patch ->> 'cooldown_minutes')::integer, cooldown_minutes),
    requires_proctor = coalesce((p_patch ->> 'requires_proctor')::boolean, requires_proctor),
    show_correction  = coalesce((p_patch ->> 'show_correction')::boolean, show_correction),
    updated_at = now()
  where id = p_id;
  if not found then raise exception 'Évaluation inconnue' using errcode = 'P0002'; end if;
  perform private.audit('update_assessment', p_id, p_patch);
end $$;

create or replace function public.admin_list_questions(p_assessment text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'skill', skill, 'kind', kind, 'points', points, 'active', active,
    'variant_count', jsonb_array_length(variants), 'sample', variants -> 0) order by id)
    from private.questions where assessment_id = p_assessment), '[]'::jsonb);
end $$;

create or replace function public.admin_set_question_active(p_id text, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update private.questions set active = p_active where id = p_id;
  if not found then raise exception 'Question inconnue' using errcode = 'P0002'; end if;
  perform private.audit('set_question_active', p_id, jsonb_build_object('active', p_active));
end $$;

create or replace function public.admin_recent_errors(p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((select jsonb_agg(row_to_json(r)) from (
    select at, kind, message, context from public.error_log order by at desc limit least(p_limit, 200)) r), '[]'::jsonb);
end $$;

create or replace function public.admin_set_validation(p_user uuid, p_competency text, p_granted boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := private.require_admin();
begin
  if p_granted then
    insert into public.competency_validations (user_id, competency, source, validated_by)
    values (p_user, p_competency, 'admin', me) on conflict (user_id, competency) do nothing;
  else
    delete from public.competency_validations where user_id = p_user and competency = p_competency;
  end if;
  perform private.audit('set_validation', p_user::text, jsonb_build_object('competency', p_competency, 'granted', p_granted));
end $$;

-- ---------------------------------------------------------------------
-- Droits d'exécution : tout est fermé, puis ouvert fonction par fonction.
-- ---------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'is_admin','start_attempt','save_answer','attempt_result','submit_attempt','log_client_error',
      'ai_reserve_request','ai_record_usage','ai_release_request','admin_stats','admin_list_users','admin_set_role','admin_set_setting',
      'admin_pending_reviews','admin_review_attempt','admin_update_assessment','admin_list_questions',
      'admin_set_question_active','admin_recent_errors','admin_set_validation')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.start_attempt(text) to authenticated;
grant execute on function public.save_answer(uuid, integer, text) to authenticated;
grant execute on function public.attempt_result(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid) to authenticated;
grant execute on function public.log_client_error(text, text, jsonb) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_set_setting(text, jsonb) to authenticated;
grant execute on function public.admin_pending_reviews() to authenticated;
grant execute on function public.admin_review_attempt(uuid, boolean, text) to authenticated;
grant execute on function public.admin_update_assessment(text, jsonb) to authenticated;
grant execute on function public.admin_list_questions(text) to authenticated;
grant execute on function public.admin_set_question_active(text, boolean) to authenticated;
grant execute on function public.admin_recent_errors(integer) to authenticated;
grant execute on function public.admin_set_validation(uuid, text, boolean) to authenticated;
-- Les fonctions IA ne sont accessibles qu'à la clé de service de la fonction serveur.
grant execute on function public.ai_reserve_request(uuid) to service_role;
grant execute on function public.ai_record_usage(uuid, bigint, bigint, numeric) to service_role;
grant execute on function public.ai_release_request(uuid) to service_role;
