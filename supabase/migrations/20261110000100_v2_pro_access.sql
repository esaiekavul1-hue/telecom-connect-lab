-- TELECOM CONNECT LAB 2.0 — Accès au Monde professionnel.
-- Inscrit directement en professionnel : accès libre à tous les niveaux.
-- Étudiant : Monde professionnel fermé tant que les évaluations de son parcours ne sont pas réussies.
-- Les règles entre niveaux étudiants sont inchangées. Aucune donnée n'est modifiée.
-- À exécuter après 20261108000200_v2_tracks.sql. Annulation : supabase/rollback/.

create or replace function private.is_direct_pro(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.track_history h where h.user_id = p_user and h.kind = 'initial' and h.to_space = 'pro');
$$;
revoke all on function private.is_direct_pro(uuid) from public;

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

  -- Un étudiant ne rejoint le Monde professionnel qu'après toutes les évaluations de son parcours.
  if not direct and p_space = 'pro' and prof.space <> 'pro' then
    select coalesce(array_agg(c.competency order by c.competency), '{}') into missing from private.track_competencies c
     where c.track_key = cur_row.track_key
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
