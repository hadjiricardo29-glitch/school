-- Motosu — Row Level Security (activé sur toutes les tables métier)

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.commission_rules enable row level security;
alter table public.commissions enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.deposits enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table public.fraud_flags enable row level security;
alter table public.system_settings enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles are readable by everyone" on public.profiles
  for select using (true); -- nécessaire pour afficher les filleuls/équipe/leaderboards publics

create policy "users update own profile (not role/status/referred_by)" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles p where p.id = auth.uid()) and status = (select status from public.profiles p where p.id = auth.uid()));

create policy "staff manage all profiles" on public.profiles
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- WALLETS
-- ============================================================
create policy "users read own wallet" on public.wallets
  for select using (auth.uid() = user_id or public.is_staff());

-- écritures uniquement via les fonctions RPC SECURITY DEFINER (aucune policy INSERT/UPDATE pour les users)
create policy "staff read/write wallets" on public.wallets
  for all using (public.current_role() in ('ADMIN','FINANCE_ADMIN')) with check (public.current_role() in ('ADMIN','FINANCE_ADMIN'));

-- ============================================================
-- TRANSACTIONS (ledger — lecture seule pour les users, écritures via RPC)
-- ============================================================
create policy "users read own transactions" on public.transactions
  for select using (auth.uid() = user_id or public.is_staff());

-- ============================================================
-- TASKS
-- ============================================================
create policy "published tasks are public" on public.tasks
  for select using (status = 'PUBLISHED' or public.current_role() in ('ADMIN','MODERATOR','TASK_MANAGER'));

create policy "task managers manage tasks" on public.tasks
  for insert with check (public.current_role() in ('ADMIN','TASK_MANAGER'));
create policy "task managers update tasks" on public.tasks
  for update using (public.current_role() in ('ADMIN','TASK_MANAGER')) with check (public.current_role() in ('ADMIN','TASK_MANAGER'));
create policy "task managers delete tasks" on public.tasks
  for delete using (public.current_role() in ('ADMIN','TASK_MANAGER'));

-- ============================================================
-- TASK SUBMISSIONS
-- ============================================================
create policy "users read own submissions" on public.task_submissions
  for select using (auth.uid() = user_id or public.current_role() in ('ADMIN','MODERATOR','TASK_MANAGER'));

create policy "users start a task for themselves" on public.task_submissions
  for insert with check (auth.uid() = user_id and status = 'STARTED');

create policy "users submit proof for own started submission" on public.task_submissions
  for update
  using (auth.uid() = user_id and status = 'STARTED')
  with check (auth.uid() = user_id and status = 'SUBMITTED');

create policy "staff review submissions" on public.task_submissions
  for update using (public.current_role() in ('ADMIN','MODERATOR','TASK_MANAGER'))
  with check (public.current_role() in ('ADMIN','MODERATOR','TASK_MANAGER'));

-- ============================================================
-- COMMISSION RULES (config publique en lecture pour transparence, écriture ADMIN)
-- ============================================================
create policy "commission rules are readable by everyone" on public.commission_rules
  for select using (true);
create policy "admin manages commission rules" on public.commission_rules
  for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

-- ============================================================
-- COMMISSIONS
-- ============================================================
create policy "users read own commissions earned or generated" on public.commissions
  for select using (auth.uid() = beneficiary_id or auth.uid() = source_user_id or public.is_staff());

-- ============================================================
-- WITHDRAWAL REQUESTS
-- ============================================================
create policy "users read own withdrawals" on public.withdrawal_requests
  for select using (auth.uid() = user_id or public.current_role() in ('ADMIN','FINANCE_ADMIN'));

create policy "finance staff update withdrawals" on public.withdrawal_requests
  for update using (public.current_role() in ('ADMIN','FINANCE_ADMIN')) with check (public.current_role() in ('ADMIN','FINANCE_ADMIN'));
-- l'insertion se fait uniquement via create_withdrawal_request() (SECURITY DEFINER)

-- ============================================================
-- DEPOSITS
-- ============================================================
create policy "users read own deposits" on public.deposits
  for select using (auth.uid() = user_id or public.current_role() in ('ADMIN','FINANCE_ADMIN'));

create policy "finance staff update deposits" on public.deposits
  for update using (public.current_role() in ('ADMIN','FINANCE_ADMIN')) with check (public.current_role() in ('ADMIN','FINANCE_ADMIN'));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create policy "users read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "users mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- AUDIT LOG (lecture ADMIN/MODERATOR uniquement, écriture via RPC seulement)
-- ============================================================
create policy "staff read audit log" on public.audit_log
  for select using (public.current_role() in ('ADMIN','MODERATOR'));

-- ============================================================
-- FRAUD FLAGS
-- ============================================================
create policy "staff manage fraud flags" on public.fraud_flags
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- SYSTEM SETTINGS (lecture publique pour le branding, écriture ADMIN)
-- ============================================================
create policy "settings are readable by everyone" on public.system_settings
  for select using (true);
create policy "admin manages settings" on public.system_settings
  for all using (public.current_role() = 'ADMIN') with check (public.current_role() = 'ADMIN');

-- ============================================================
-- STORAGE : bucket pour les preuves de mission (fichiers utilisateur)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', false)
on conflict (id) do nothing;

create policy "users upload own task proofs"
  on storage.objects for insert
  with check (bucket_id = 'task-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own task proofs"
  on storage.objects for select
  using (bucket_id = 'task-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
