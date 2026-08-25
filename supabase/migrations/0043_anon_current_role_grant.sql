-- Motosu — corrige un accès public cassé par le durcissement 0025/0027
--
-- La policy "published tasks are public" sur `tasks` évalue
-- `public.current_role() in (...)` pour autoriser aussi le staff à lire les
-- brouillons. Postgres exige le droit EXECUTE sur cette fonction pour
-- planifier la policy, même quand la branche `status = 'PUBLISHED'` suffirait
-- (pas de court-circuit garanti). 0025_revoke_from_public.sql a révoqué
-- l'exécution de current_role() sur `public` (donc `anon` inclus), ce qui
-- fait échouer TOUTE lecture anonyme de `tasks` avec "permission denied for
-- function current_role" — cassant la navigation des tâches pour les
-- visiteurs non connectés (fonctionnalité explicitement voulue, voir
-- TaskDetailPage). La fonction ne fait que renvoyer le rôle de
-- l'utilisateur courant (null pour un anonyme) : aucune donnée sensible
-- exposée, sûr à regranter à anon.

grant execute on function public.current_role() to anon;
