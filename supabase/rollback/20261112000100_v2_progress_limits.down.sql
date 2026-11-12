-- Annulation de 20261112000100_v2_progress_limits.sql. Aucune donnée supprimée.
alter table public.progress drop constraint if exists progress_data_size;
-- Le droit TRUNCATE n'est pas rendu : il n'est utilisé par aucune version de la plateforme.
