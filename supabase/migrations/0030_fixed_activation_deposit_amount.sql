-- Motosu — le dépôt (unique, 1 par compte) n'est plus un minimum librement
-- choisi par l'utilisateur mais un montant fixe = account_activation_min_deposit.
-- Le front-end ne propose déjà plus de champ montant ; ce garde-fou empêche
-- un appel RPC direct (contournant l'UI) de déposer un montant différent.

drop function if exists public.create_deposit_request(bigint, text, text, text);

create or replace function public.create_deposit_request(
  p_amount bigint, p_method text, p_provider text default 'mock', p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
  v_fixed_amount bigint;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select (value #>> '{}')::bigint into v_fixed_amount
  from public.system_settings where key = 'account_activation_min_deposit';

  if v_fixed_amount is null or p_amount <> v_fixed_amount then
    raise exception 'Deposit amount must be exactly %', v_fixed_amount;
  end if;

  if exists (
    select 1 from public.deposits
    where user_id = v_user and status in ('PENDING', 'COMPLETED')
  ) then
    raise exception 'Only one deposit is allowed per account, and you already made yours';
  end if;

  insert into public.deposits (user_id, amount, method, provider, status, reference)
  values (
    v_user, p_amount, p_method, p_provider, 'PENDING',
    coalesce(p_reference, 'DEP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
  )
  returning id into v_id;

  -- MockPaymentProvider : confirmation instantanée pour la démo
  if p_provider = 'mock' then
    perform public.approve_deposit(v_id);
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_deposit_request(bigint, text, text, text) from anon, public;
