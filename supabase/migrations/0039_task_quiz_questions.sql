-- Motosu — les tâches journalières (hors réseaux sociaux TikTok/YouTube,
-- qui restent des tâches vidéo) deviennent des quiz : l'utilisateur répond
-- à une série de questions à choix unique, la correction est automatique
-- et instantanée (même mécanisme de crédit que la vérification vidéo).

create table public.task_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_option int not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index task_quiz_questions_task_id_idx on public.task_quiz_questions(task_id);

alter table public.task_quiz_questions enable row level security;

-- Aucune policy SELECT pour les utilisateurs normaux : le bonne réponse ne
-- doit jamais être lisible côté client. L'accès public passe uniquement par
-- get_task_quiz_questions ci-dessous, qui ne renvoie pas correct_option.
create policy "staff manage quiz questions" on public.task_quiz_questions
  for all using (public.is_staff()) with check (public.is_staff());

revoke all on public.task_quiz_questions from anon;

create or replace function public.get_task_quiz_questions(p_task_id uuid)
returns table(id uuid, question text, options jsonb, sort_order int)
language sql
stable
security definer
set search_path = public
as $$
  select q.id, q.question, q.options, q.sort_order
  from public.task_quiz_questions q
  where q.task_id = p_task_id
  order by q.sort_order, q.created_at;
$$;

revoke execute on function public.get_task_quiz_questions(uuid) from anon, public;

create or replace function public.submit_quiz_answers(p_submission_id uuid, p_answers jsonb)
returns table(score_pct int, correct_count int, total_count int, passed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_submission public.task_submissions%rowtype;
  v_task public.tasks%rowtype;
  v_total int;
  v_correct int := 0;
  v_q record;
  v_selected int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id for update;
  if not found or v_submission.user_id <> v_user then
    raise exception 'Submission not found';
  end if;
  if v_submission.status <> 'STARTED' then
    raise exception 'Submission is not in progress';
  end if;

  select * into v_task from public.tasks where id = v_submission.task_id;
  if v_task.category <> 'QUIZ' then
    raise exception 'This task is not a quiz';
  end if;

  select count(*) into v_total from public.task_quiz_questions where task_id = v_task.id;
  if v_total = 0 then
    raise exception 'This quiz has no questions';
  end if;

  for v_q in select tq.id, tq.correct_option from public.task_quiz_questions tq where tq.task_id = v_task.id loop
    v_selected := nullif(p_answers ->> v_q.id::text, '')::int;
    if v_selected = v_q.correct_option then
      v_correct := v_correct + 1;
    end if;
  end loop;

  update public.task_submissions
  set submitted_at = now(), proof_text = p_answers::text
  where id = p_submission_id;

  if v_correct = v_total then
    perform public._finalize_task_approval(
      p_submission_id, v_user,
      'Quiz réussi (' || v_correct || '/' || v_total || ')', true
    );
  else
    update public.task_submissions
    set status = 'REJECTED', reviewed_at = now(),
        review_note = 'Quiz échoué (' || v_correct || '/' || v_total || ' bonnes réponses)'
    where id = p_submission_id;
  end if;

  return query select
    (v_correct * 100 / v_total), v_correct, v_total, (v_correct = v_total);
end;
$$;

revoke execute on function public.submit_quiz_answers(uuid, jsonb) from anon, public;
