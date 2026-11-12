-- =====================================================================
-- TELECOM CONNECT LAB 2.0 — Limites de la progression (migration ADDITIVE)
-- ---------------------------------------------------------------------
-- À exécuter UNE fois, après 20261111000100_v2_level_choice.sql. Rejouable.
-- Aucune donnée modifiée ni supprimée. Annulation :
-- supabase/rollback/20261112000100_v2_progress_limits.down.sql
--
--   1. Taille d'une progression limitée à 1 Mo par compte. Sans limite, un compte
--      connecté pouvait remplir la base gratuite, partagée avec la V1. Une progression
--      complète des 40 modules pèse quelques dizaines de kilo-octets.
--      NOT VALID : les lignes existantes ne sont pas contrôlées, seules les écritures
--      suivantes le sont. Aucune ligne existante ne peut donc être rejetée ou perdue.
--   2. TRUNCATE retiré : cette commande contourne la sécurité ligne par ligne (RLS).
--      Elle n'est utilisée ni par la V1 ni par la V2.
-- =====================================================================

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'progress_data_size' and conrelid = 'public.progress'::regclass) then
    alter table public.progress add constraint progress_data_size check (pg_column_size(data) <= 1048576) not valid;
  end if;
end $$;

revoke truncate on public.progress from anon, authenticated;
