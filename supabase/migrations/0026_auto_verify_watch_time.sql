-- Motosu — remplace la soumission manuelle de preuve par une vérification
-- automatique basée sur le temps d'engagement : l'utilisateur démarre la
-- tâche, reste sur la page (vidéo le cas échéant) pendant la durée requise,
-- des "heartbeats" authentifiés sont envoyés au serveur toutes les
-- quelques secondes, et la tâche est créditée automatiquement une fois le
-- temps requis atteint — sans jamais faire confiance à un minuteur côté
-- client (l'incrément à chaque heartbeat est borné par le temps RÉEL
-- écoulé côté serveur depuis le heartbeat précédent, donc rejouer/spammer
-- l'appel ne fait pas avancer le compteur plus vite que le temps réel).

alter table public.tasks
  add column auto_verify_seconds int not null default 30 check (auto_verify_seconds > 0);

alter table public.task_submissions
  add column watched_seconds int not null default 0,
  add column last_heartbeat_at timestamptz;

-- Logique de crédit extraite d'approve_submission pour être partagée avec
-- le nouveau chemin de validation automatique, sans dupliquer la cascade
-- de commissions de parrainage.
create or replace function public._finalize_task_approval(
  p_submission_id uuid, p_actor uuid, p_review_note text, p_auto boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.task_submissions%rowtype;
  v_task public.tasks%rowtype;
  v_txn_id uuid;
  v_upline_id uuid;
  v_level int;
  v_max_level int;
  v_rule public.commission_rules%rowtype;
  v_commission_amount bigint;
  v_commission_txn_id uuid;
  v_bucket public.earning_bucket;
begin
  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  select * into v_task from public.tasks where id = v_submission.task_id for update;
  v_bucket := public.task_category_bucket(v_task.category);

  update public.task_submissions
  set status = 'APPROVED', reviewed_by = p_actor, reviewed_at = now(), review_note = p_review_note
  where id = p_submission_id;

  update public.tasks set completions_count = completions_count + 1 where id = v_task.id;

  insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
  values (
    v_submission.user_id, 'TASK_REWARD', v_task.reward, v_task.currency, 'COMPLETED',
    'Récompense: ' || v_task.title,
    jsonb_build_object('task_id', v_task.id, 'submission_id', p_submission_id, 'bucket', v_bucket, 'auto', p_auto)
  ) returning id into v_txn_id;

  update public.wallets
  set available_balance = available_balance + v_task.reward,
      total_earned = total_earned + v_task.reward,
      updated_at = now()
  where user_id = v_submission.user_id;

  perform public.credit_wallet_bucket(v_submission.user_id, v_bucket, v_task.reward);

  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    v_submission.user_id, 'TASK_APPROVED', 'Mission approuvée',
    'Votre mission "' || v_task.title || '" a été approuvée. +' || v_task.reward || ' ' || v_task.currency,
    jsonb_build_object('task_id', v_task.id, 'submission_id', p_submission_id)
  );

  insert into public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
  values (p_actor, case when p_auto then 'AUTO_APPROVE_TASK' else 'APPROVE_TASK' end, 'task_submission', p_submission_id,
    jsonb_build_object('status', v_submission.status), jsonb_build_object('status', 'APPROVED'));

  select coalesce(max(level), 0) into v_max_level from public.commission_rules where active = true;
  v_upline_id := v_submission.user_id;
  for v_level in 1..v_max_level loop
    select referred_by into v_upline_id from public.profiles where id = v_upline_id;
    exit when v_upline_id is null;

    select * into v_rule from public.commission_rules where level = v_level and active = true;
    if not found then
      continue;
    end if;

    v_commission_amount := floor(v_task.reward * v_rule.percentage / 100.0)::bigint + v_rule.fixed_amount;
    if v_commission_amount <= 0 then
      continue;
    end if;

    insert into public.transactions (user_id, type, amount, currency, status, description, metadata)
    values (
      v_upline_id, 'REFERRAL_COMMISSION', v_commission_amount, v_task.currency, 'COMPLETED',
      'Commission niveau ' || v_level || ' — ' || v_task.title,
      jsonb_build_object('source_user_id', v_submission.user_id, 'task_id', v_task.id, 'level', v_level)
    ) returning id into v_commission_txn_id;

    update public.wallets
    set available_balance = available_balance + v_commission_amount,
        total_earned = total_earned + v_commission_amount,
        updated_at = now()
    where user_id = v_upline_id;

    perform public.credit_wallet_bucket(v_upline_id, 'WALLET', v_commission_amount);

    insert into public.commissions (beneficiary_id, source_user_id, source_transaction_id, level, amount, transaction_id)
    values (v_upline_id, v_submission.user_id, v_txn_id, v_level, v_commission_amount, v_commission_txn_id);

    insert into public.notifications (user_id, type, title, message, metadata)
    values (
      v_upline_id, 'COMMISSION_RECEIVED', 'Commission reçue',
      '+' || v_commission_amount || ' ' || v_task.currency || ' de commission (niveau ' || v_level || ')',
      jsonb_build_object('level', v_level, 'source_user_id', v_submission.user_id)
    );
  end loop;
end;
$$;

create or replace function public.approve_submission(p_submission_id uuid, p_review_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role public.user_role;
  v_submission public.task_submissions%rowtype;
begin
  select role into v_actor_role from public.profiles where id = v_actor;
  if v_actor_role is null or v_actor_role not in ('ADMIN','MODERATOR','TASK_MANAGER') then
    raise exception 'Not authorized to approve submissions';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found';
  end if;
  if v_submission.status not in ('SUBMITTED','UNDER_REVIEW') then
    raise exception 'Submission is not pending review';
  end if;

  perform public._finalize_task_approval(p_submission_id, v_actor, p_review_note, false);
end;
$$;

create or replace function public.record_watch_heartbeat(p_submission_id uuid)
returns table(watched_seconds int, required_seconds int, completed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_submission public.task_submissions%rowtype;
  v_task public.tasks%rowtype;
  v_increment int;
  v_now timestamptz := now();
  v_new_watched int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  if not found or v_submission.user_id <> v_user then
    raise exception 'Submission not found';
  end if;

  select * into v_task from public.tasks where id = v_submission.task_id;

  if v_submission.status <> 'STARTED' then
    return query select v_submission.watched_seconds, v_task.auto_verify_seconds, (v_submission.status = 'APPROVED');
    return;
  end if;

  if v_submission.last_heartbeat_at is null then
    v_increment := least(5, v_task.auto_verify_seconds);
  else
    v_increment := greatest(0, least(extract(epoch from v_now - v_submission.last_heartbeat_at)::int, 10));
  end if;

  v_new_watched := least(v_submission.watched_seconds + v_increment, v_task.auto_verify_seconds);

  update public.task_submissions
  set watched_seconds = v_new_watched, last_heartbeat_at = v_now
  where id = p_submission_id;

  if v_new_watched >= v_task.auto_verify_seconds then
    perform public._finalize_task_approval(p_submission_id, v_user, 'Vérification automatique (temps d''engagement)', true);
    return query select v_new_watched, v_task.auto_verify_seconds, true;
  else
    return query select v_new_watched, v_task.auto_verify_seconds, false;
  end if;
end;
$$;

-- _finalize_task_approval fait aveuglément confiance à p_actor : elle ne
-- doit JAMAIS être appelable directement par un client, seulement via les
-- appels internes ci-dessus (un appel interne depuis une fonction SECURITY
-- DEFINER s'exécute sous les droits du propriétaire de la fonction, pas de
-- l'appelant d'origine — donc révoquer authenticated ici ne casse rien).
revoke execute on function public._finalize_task_approval(uuid, uuid, text, boolean) from anon, public, authenticated;
revoke execute on function public.record_watch_heartbeat(uuid) from anon, public;
