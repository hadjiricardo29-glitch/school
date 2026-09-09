-- Motosu — les tâches LABELING/AI_EVALUATION créditent désormais leur propre
-- bucket segmenté (comme TikTok/YouTube avant elles), au lieu de tomber
-- dans le bucket générique WALLET.

create or replace function public.task_category_bucket(p_category public.task_category)
returns public.earning_bucket
language sql
immutable
set search_path = public
as $$
  select case p_category
    when 'TIKTOK' then 'TIKTOK'::public.earning_bucket
    when 'YOUTUBE' then 'YOUTUBE'::public.earning_bucket
    when 'VIDEOS' then 'VIDEOS'::public.earning_bucket
    when 'ADS' then 'ADS'::public.earning_bucket
    when 'SURVEYS' then 'SURVEYS'::public.earning_bucket
    when 'LABELING' then 'LABELING'::public.earning_bucket
    when 'AI_EVALUATION' then 'AI_EVALUATION'::public.earning_bucket
    else 'WALLET'::public.earning_bucket
  end;
$$;
