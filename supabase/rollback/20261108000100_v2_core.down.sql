-- =====================================================================
-- Annulation de 20261108000100_v2_core.sql
-- ⚠ Supprime les données propres à la V2 : profils, tentatives, validations
-- officielles, compteurs IA, journaux. Sauvegardez-les avant toute exécution.
-- Ne touche NI aux comptes (auth.users) NI à la table public.progress.
-- =====================================================================
drop trigger if exists tcl_on_auth_user_created on auth.users;

drop function if exists public.admin_set_validation(uuid, text, boolean);
drop function if exists public.admin_recent_errors(integer);
drop function if exists public.admin_set_question_active(text, boolean);
drop function if exists public.admin_list_questions(text);
drop function if exists public.admin_update_assessment(text, jsonb);
drop function if exists public.admin_review_attempt(uuid, boolean, text);
drop function if exists public.admin_pending_reviews();
drop function if exists public.admin_set_setting(text, jsonb);
drop function if exists public.admin_set_role(uuid, text);
drop function if exists public.admin_list_users(text, integer, integer);
drop function if exists public.admin_stats();
drop function if exists public.ai_record_usage(uuid, bigint, bigint, numeric);
drop function if exists public.ai_release_request(uuid);
drop function if exists public.ai_reserve_request(uuid);
drop function if exists public.log_client_error(text, text, jsonb);
drop function if exists public.submit_attempt(uuid);
drop function if exists public.attempt_result(uuid);
drop function if exists public.save_answer(uuid, integer, text);
drop function if exists public.start_attempt(text);

-- Le schéma privé en premier : ses fonctions et tables dépendent des tables publiques.
drop schema if exists private cascade;

drop table if exists public.audit_log;
drop table if exists public.ai_usage_daily;
drop table if exists public.error_log;
drop table if exists public.competency_validations;
drop table if exists public.attempts;
drop table if exists public.assessments;
drop table if exists public.platform_settings;

drop function if exists public.is_admin() cascade;
drop table if exists public.profiles;
