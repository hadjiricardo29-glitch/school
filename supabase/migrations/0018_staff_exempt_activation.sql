-- Motosu — les comptes staff (ADMIN/MODERATOR/FINANCE_ADMIN/TASK_MANAGER)
-- sont exemptés du palier d'activation par dépôt. Cette règle existe pour
-- s'assurer que les USERS ont un minimum d'engagement avant de gagner de
-- l'argent — elle n'a aucun sens pour un compte qui gère la plateforme et
-- doit pouvoir y accéder immédiatement après création, sans jamais déposer.

create or replace function public.is_account_activated(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select role from public.profiles where id = p_user_id) in ('ADMIN','MODERATOR','FINANCE_ADMIN','TASK_MANAGER') then true
    when not public.get_setting_bool('account_activation_enabled', false) then true
    else coalesce(
      (select total_deposited from public.wallets where user_id = p_user_id) >=
      public.get_setting_numeric('account_activation_min_deposit', 0),
      false
    )
  end;
$$;
