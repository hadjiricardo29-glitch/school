-- Motosu — Formations (inspiré de "Trading Tutorials" chez un concurrent) :
-- un catalogue de formations gratuites et payantes, achetées avec le solde
-- du wallet existant plutôt qu'un système de paiement séparé.

create type public.course_status as enum ('DRAFT','PUBLISHED','ARCHIVED');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text,
  price bigint not null default 0 check (price >= 0),
  thumbnail_url text,
  content_url text,
  duration_minutes integer,
  status public.course_status not null default 'DRAFT',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_courses_status on public.courses (status);
create index idx_courses_category on public.courses (category);

create trigger trg_courses_updated_at
  before update on public.courses
  for each row execute function extensions.moddatetime('updated_at');

-- Ne suit que les formations PAYANTES achetées — l'accès aux formations
-- gratuites ne nécessite aucune ligne (ouvert à tout utilisateur connecté).
create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount_paid bigint not null default 0,
  purchased_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index idx_enrollments_user on public.course_enrollments (user_id);

alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;

create policy "published courses are public" on public.courses
  for select using (status = 'PUBLISHED' or public.is_staff());

create policy "staff manage courses" on public.courses
  for all using (public.is_staff()) with check (public.is_staff());

create policy "users read own enrollments" on public.course_enrollments
  for select using (auth.uid() = user_id or public.is_staff());
-- écriture uniquement via purchase_course() (SECURITY DEFINER)

-- Nouveau type de transaction pour l'achat de formation — ajouté seul dans
-- cette migration : Postgres interdit d'utiliser une valeur d'enum tout
-- juste ajoutée dans la même transaction (la fonction RPC qui l'utilise
-- suit dans la migration suivante).
alter type public.transaction_type add value if not exists 'COURSE_PURCHASE';
