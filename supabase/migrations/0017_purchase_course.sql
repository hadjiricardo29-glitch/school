-- Motosu — achat d'une formation payante avec le solde du wallet.

create or replace function public.purchase_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_course public.courses%rowtype;
  v_wallet public.wallets%rowtype;
  v_remaining bigint;
  v_take bigint;
  v_bucket record;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_course from public.courses where id = p_course_id and status = 'PUBLISHED';
  if not found then
    raise exception 'Course not found';
  end if;
  if v_course.price <= 0 then
    raise exception 'This course is free — no purchase needed';
  end if;
  if exists (select 1 from public.course_enrollments where user_id = v_user and course_id = p_course_id) then
    raise exception 'You already own this course';
  end if;

  select * into v_wallet from public.wallets where user_id = v_user for update;
  if v_wallet.available_balance < v_course.price then
    raise exception 'Insufficient available balance';
  end if;

  update public.wallets
  set available_balance = available_balance - v_course.price, updated_at = now()
  where user_id = v_user;

  -- Draine les buckets pour rester cohérent avec l'agrégat ci-dessus, quelle
  -- que soit la catégorie d'où vient l'argent (WALLET en priorité, puis les
  -- autres) — un achat n'est pas rattaché à une seule catégorie de gain.
  v_remaining := v_course.price;
  for v_bucket in
    select bucket, available_balance
    from public.wallet_balances
    where user_id = v_user and available_balance > 0
    order by case bucket when 'WALLET' then 0 else 1 end, available_balance desc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_bucket.available_balance, v_remaining);
    update public.wallet_balances
    set available_balance = available_balance - v_take, updated_at = now()
    where user_id = v_user and bucket = v_bucket.bucket;
    v_remaining := v_remaining - v_take;
  end loop;

  insert into public.course_enrollments (user_id, course_id, amount_paid)
  values (v_user, p_course_id, v_course.price);

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (v_user, 'COURSE_PURCHASE', -v_course.price, 'XOF', 'COMPLETED',
    'Formation : ' || v_course.title, jsonb_build_object('course_id', p_course_id));

  insert into public.notifications (user_id, type, title, message, metadata)
  values (v_user, 'SYSTEM', 'Formation débloquée', 'Vous avez accès à "' || v_course.title || '".',
    jsonb_build_object('course_id', p_course_id));
end;
$$;

grant execute on function public.purchase_course(uuid) to authenticated;
