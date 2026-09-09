-- Motosu — la difficulté (Facile/Intermédiaire/Difficile) n'est plus
-- affichée nulle part côté produit (retirée du formulaire admin et des
-- badges utilisateur) ; on retire aussi la colonne et le type au lieu de
-- garder un placeholder 'EASY' invisible.

alter table public.tasks drop column if exists difficulty;
drop type if exists public.task_difficulty;
