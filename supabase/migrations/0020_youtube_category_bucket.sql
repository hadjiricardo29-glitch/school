-- Motosu — YouTube devient sa propre catégorie de mission et son propre
-- bucket de gain, distinct de TikTok (déjà séparé) — les calculs de gains
-- par plateforme se différencient progressivement, YouTube et TikTok d'abord.
-- Valeurs d'enum ajoutées seules dans cette migration : Postgres interdit
-- de les utiliser dans la même transaction que leur ajout (la fonction qui
-- s'en sert suit dans la migration suivante).

alter type public.task_category add value if not exists 'YOUTUBE';
alter type public.earning_bucket add value if not exists 'YOUTUBE';
