-- Motosu — dernier correctif de la fenêtre 0024-0026 : Supabase applique un
-- grant EXECUTE direct à anon sur toute fonction nouvellement créée OU
-- remplacée, indépendamment de ce que "revoke ... from public" (le pattern
-- qui suffisait pour les fonctions plus anciennes, où anon héritait via
-- PUBLIC) peut retirer. task_category_bucket et
-- prevent_task_submission_reassignment ont été recréées dans 0025 pour
-- fixer leur search_path et ont récupéré ce grant direct au passage.
-- Règle retenue pour la suite : toujours révoquer "from anon, public"
-- ensemble, jamais l'un sans l'autre.

revoke execute on function public.prevent_task_submission_reassignment() from anon, public;
revoke execute on function public.task_category_bucket(public.task_category) from anon, public;
