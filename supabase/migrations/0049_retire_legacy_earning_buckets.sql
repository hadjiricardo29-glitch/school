-- Motosu — retire les catégories de gains TikTok/YouTube/Vidéos/Publicités/
-- Sondages du tableau de bord (categories de tâches qui n'existent plus côté
-- création), remplacées par les nouvelles LABELING/AI_EVALUATION. Aucun
-- argent perdu : les soldes déjà accumulés dans ces buckets legacy sont
-- fusionnés dans le bucket générique WALLET avant de les retirer de l'UI.

-- 1) Fusionne tout solde legacy non nul dans WALLET (même utilisateur).
insert into public.wallet_balances (user_id, bucket, available_balance, total_earned)
select user_id, 'WALLET'::public.earning_bucket, sum(available_balance), sum(total_earned)
from public.wallet_balances
where bucket in ('TIKTOK','YOUTUBE','VIDEOS','ADS','SURVEYS')
  and (available_balance > 0 or total_earned > 0)
group by user_id
on conflict (user_id, bucket) do update
set available_balance = public.wallet_balances.available_balance + excluded.available_balance,
    total_earned = public.wallet_balances.total_earned + excluded.total_earned,
    updated_at = now();

-- 2) Vide les lignes legacy (gardées, pas supprimées, pour ne pas casser de
-- clé étrangère éventuelle ni l'historique) une fois fusionnées.
update public.wallet_balances
set available_balance = 0, total_earned = 0, updated_at = now()
where bucket in ('TIKTOK','YOUTUBE','VIDEOS','ADS','SURVEYS');

-- 3) Nouveaux buckets segmentés pour les tâches d'entraînement IA.
alter type public.earning_bucket add value if not exists 'LABELING';
alter type public.earning_bucket add value if not exists 'AI_EVALUATION';
