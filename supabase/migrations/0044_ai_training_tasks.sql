-- Motosu — bascule vers des tâches d'entraînement IA (annotation / évaluation
-- de réponses), en remplacement de TikTok/YouTube/Quiz/Ads côté produit.
-- Non destructif : les anciennes catégories/tâches/soumissions restent en
-- base (historique, commissions déjà versées) — seule la création de
-- nouvelles tâches est réorientée côté admin (voir AdminTasksPage).

alter type public.task_category add value if not exists 'LABELING';
alter type public.task_category add value if not exists 'AI_EVALUATION';

-- Contenu spécifique au type de tâche, défini par l'admin :
--   LABELING      { content, content_type: 'text'|'image'|'audio', label_options: string[] }
--   AI_EVALUATION { prompt, responses: string[] }
alter table public.tasks add column if not exists ai_payload jsonb;

insert into public.system_settings (key, value, type) values
  ('daily_task_limit', '5', 'number')
on conflict (key) do nothing;

-- Étend le garde-fou de soumission existant (activation, statut, deadline,
-- places, unicité) avec un plafond de tâches par jour et par utilisateur,
-- toutes catégories confondues. 0 = désactivé.
create or replace function public.check_submission_allowed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_existing_count int;
  v_daily_limit int;
  v_today_count int;
begin
  if not public.is_account_activated(new.user_id) then
    raise exception 'Account not activated — please make a deposit to start earning';
  end if;

  select * into v_task from public.tasks where id = new.task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;
  if v_task.status <> 'PUBLISHED' then
    raise exception 'This task is not currently available';
  end if;
  if v_task.deadline is not null and v_task.deadline < now() then
    raise exception 'This task deadline has passed';
  end if;
  if v_task.max_completions is not null and v_task.completions_count >= v_task.max_completions then
    raise exception 'This task has no remaining slots';
  end if;

  if v_task.single_submission_per_user then
    select count(*) into v_existing_count
    from public.task_submissions
    where task_id = new.task_id and user_id = new.user_id and status <> 'REJECTED';
    if v_existing_count > 0 then
      raise exception 'You have already claimed this task';
    end if;
  end if;

  v_daily_limit := public.get_setting_numeric('daily_task_limit', 0)::int;
  if v_daily_limit > 0 then
    select count(*) into v_today_count
    from public.task_submissions
    where user_id = new.user_id
      and status <> 'REJECTED'
      and created_at >= date_trunc('day', now());
    if v_today_count >= v_daily_limit then
      raise exception 'Daily task limit reached (% per day) — come back tomorrow', v_daily_limit;
    end if;
  end if;

  return new;
end;
$$;
