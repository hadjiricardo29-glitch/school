-- Motosu — les missions YOUTUBE créditent maintenant leur propre bucket.

create or replace function public.task_category_bucket(p_category public.task_category)
returns public.earning_bucket
language sql
immutable
as $$
  select case p_category
    when 'TIKTOK' then 'TIKTOK'::public.earning_bucket
    when 'YOUTUBE' then 'YOUTUBE'::public.earning_bucket
    when 'VIDEOS' then 'VIDEOS'::public.earning_bucket
    when 'ADS' then 'ADS'::public.earning_bucket
    when 'SURVEYS' then 'SURVEYS'::public.earning_bucket
    else 'WALLET'::public.earning_bucket
  end;
$$;
