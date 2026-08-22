-- Motosu — un seul dépôt autorisé par compte (celui qui active le compte,
-- 4000 FCFA minimum) ; au-delà, le seul mouvement possible est le retrait
-- une fois les conditions atteintes. Ajuste aussi le barème de retrait :
-- minimum 4500 FCFA, frais fixes de 500 FCFA (remplace le pourcentage).

create or replace function public.create_deposit_request(
  p_amount bigint, p_method text, p_provider text default 'mock'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  if exists (
    select 1 from public.deposits
    where user_id = v_user and status in ('PENDING', 'COMPLETED')
  ) then
    raise exception 'Only one deposit is allowed per account, and you already made yours';
  end if;

  insert into public.deposits (user_id, amount, method, provider, status)
  values (v_user, p_amount, p_method, p_provider, 'PENDING')
  returning id into v_id;

  -- MockPaymentProvider : confirmation instantanée pour la démo
  if p_provider = 'mock' then
    perform public.approve_deposit(v_id);
  end if;

  return v_id;
end;
$$;

update public.system_settings set value = '4500'::jsonb where key = 'withdrawal_min_amount';
update public.system_settings set value = '500'::jsonb where key = 'withdrawal_fee_fixed';
update public.system_settings set value = '0'::jsonb where key = 'withdrawal_fee_percentage';
