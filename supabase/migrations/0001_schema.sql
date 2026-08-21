-- Motosu — schéma initial
-- Extensions
create extension if not exists pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================
create type public.user_role as enum ('USER','ADMIN','MODERATOR','FINANCE_ADMIN','TASK_MANAGER');
create type public.account_status as enum ('ACTIVE','SUSPENDED','PENDING_VERIFICATION');
create type public.task_status as enum ('DRAFT','PUBLISHED','PAUSED','COMPLETED','EXPIRED');
create type public.task_difficulty as enum ('EASY','MEDIUM','HARD');
create type public.task_category as enum ('SOCIAL_MEDIA','CONTENT','SURVEYS','MARKETING','APP_TESTING','DATA','DIGITAL','OTHER');
create type public.submission_status as enum ('STARTED','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED');
create type public.transaction_type as enum ('TASK_REWARD','REFERRAL_COMMISSION','DEPOSIT','WITHDRAWAL','BONUS','REFUND','ADJUSTMENT');
create type public.transaction_status as enum ('PENDING','COMPLETED','FAILED','CANCELLED');
create type public.withdrawal_status as enum ('PENDING','PROCESSING','COMPLETED','REJECTED','CANCELLED');
create type public.deposit_status as enum ('PENDING','COMPLETED','FAILED','CANCELLED');
create type public.notification_type as enum ('TASK_APPROVED','TASK_REJECTED','PAYMENT_RECEIVED','WITHDRAWAL_APPROVED','WITHDRAWAL_REJECTED','REFERRAL_JOINED','COMMISSION_RECEIVED','SYSTEM');
create type public.fraud_severity as enum ('LOW','MEDIUM','HIGH','CRITICAL');
create type public.fraud_status as enum ('OPEN','REVIEWING','RESOLVED','DISMISSED');

-- ============================================================
-- PROFILES (business user record, 1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  first_name text,
  last_name text,
  country text,
  phone_code text,
  phone text,
  role public.user_role not null default 'USER',
  status public.account_status not null default 'ACTIVE',
  referral_code text not null unique,
  referred_by uuid references public.profiles(id),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referred_by_not_self check (referred_by is null or referred_by <> id)
);
create index idx_profiles_username on public.profiles (username);
create index idx_profiles_referral_code on public.profiles (referral_code);
create index idx_profiles_referred_by on public.profiles (referred_by);
create index idx_profiles_role on public.profiles (role);

-- ============================================================
-- WALLETS
-- ============================================================
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  available_balance bigint not null default 0,
  pending_balance bigint not null default 0,
  total_earned bigint not null default 0,
  total_withdrawn bigint not null default 0,
  total_deposited bigint not null default 0,
  currency text not null default 'XOF',
  updated_at timestamptz not null default now(),
  constraint balances_non_negative check (
    available_balance >= 0 and pending_balance >= 0 and total_earned >= 0
    and total_withdrawn >= 0 and total_deposited >= 0
  )
);

-- ============================================================
-- TRANSACTIONS (ledger — append-only source of truth)
-- ============================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.transaction_type not null,
  amount bigint not null, -- signed: positive = credit, negative = debit
  currency text not null default 'XOF',
  status public.transaction_status not null default 'COMPLETED',
  reference text not null unique default ('TXN-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_transactions_user_id on public.transactions (user_id);
create index idx_transactions_type on public.transactions (type);
create index idx_transactions_created_at on public.transactions (created_at desc);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category public.task_category not null default 'OTHER',
  reward bigint not null check (reward > 0),
  currency text not null default 'XOF',
  estimated_time text,
  difficulty public.task_difficulty not null default 'EASY',
  instructions text,
  requirements text,
  max_completions integer,
  completions_count integer not null default 0,
  single_submission_per_user boolean not null default true,
  deadline timestamptz,
  status public.task_status not null default 'DRAFT',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_tasks_status on public.tasks (status);
create index idx_tasks_category on public.tasks (category);
create index idx_tasks_deadline on public.tasks (deadline);

-- ============================================================
-- TASK SUBMISSIONS
-- ============================================================
create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  status public.submission_status not null default 'STARTED',
  proof_text text,
  proof_url text,
  proof_file_path text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create index idx_submissions_status on public.task_submissions (status);
create index idx_submissions_task_user on public.task_submissions (task_id, user_id);
create index idx_submissions_user on public.task_submissions (user_id);

-- ============================================================
-- COMMISSION RULES (admin-configurable, never hardcoded)
-- ============================================================
create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  level integer not null unique check (level > 0),
  percentage numeric(5,2) not null default 0 check (percentage >= 0 and percentage <= 100),
  fixed_amount bigint not null default 0 check (fixed_amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COMMISSIONS (record of each commission payout, links to ledger)
-- ============================================================
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.profiles(id) on delete cascade,
  source_user_id uuid not null references public.profiles(id) on delete cascade,
  source_transaction_id uuid references public.transactions(id),
  transaction_id uuid references public.transactions(id),
  level integer not null,
  amount bigint not null,
  created_at timestamptz not null default now()
);
create index idx_commissions_beneficiary on public.commissions (beneficiary_id);
create index idx_commissions_source_user on public.commissions (source_user_id);

-- ============================================================
-- WITHDRAWAL REQUESTS
-- ============================================================
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount > 0),
  fee bigint not null default 0,
  net_amount bigint not null,
  method text not null,
  destination jsonb not null default '{}'::jsonb,
  status public.withdrawal_status not null default 'PENDING',
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);
create index idx_withdrawals_status on public.withdrawal_requests (status);
create index idx_withdrawals_user on public.withdrawal_requests (user_id);
create index idx_withdrawals_created_at on public.withdrawal_requests (created_at desc);

-- ============================================================
-- DEPOSITS
-- ============================================================
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null check (amount > 0),
  method text not null,
  provider text not null default 'mock',
  reference text not null unique default ('DEP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  status public.deposit_status not null default 'PENDING',
  metadata jsonb not null default '{}'::jsonb,
  processed_by uuid references public.profiles(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_deposits_status on public.deposits (status);
create index idx_deposits_user on public.deposits (user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications (user_id);
create index idx_notifications_unread on public.notifications (user_id, read);
create index idx_notifications_created_at on public.notifications (created_at desc);

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_actor on public.audit_log (actor_id);
create index idx_audit_entity on public.audit_log (entity_type, entity_id);
create index idx_audit_created_at on public.audit_log (created_at desc);

-- ============================================================
-- FRAUD FLAGS
-- ============================================================
create table public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  severity public.fraud_severity not null default 'LOW',
  description text,
  status public.fraud_status not null default 'OPEN',
  created_by uuid references public.profiles(id),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_fraud_user on public.fraud_flags (user_id);
create index idx_fraud_status on public.fraud_flags (status);

-- ============================================================
-- SYSTEM SETTINGS (admin-editable platform configuration)
-- ============================================================
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  type text not null default 'string',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
