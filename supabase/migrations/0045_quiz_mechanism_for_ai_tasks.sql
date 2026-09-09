-- Motosu — les tâches LABELING/AI_EVALUATION réutilisent le mécanisme QUIZ
-- tel quel (questions à choix unique, correction et crédit automatiques) au
-- lieu d'un flux de révision manuelle séparé — plus simple, un seul chemin
-- de soumission/crédit pour toutes les tâches journalières.

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
  if v_task.category not in ('QUIZ', 'LABELING', 'AI_EVALUATION') then
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
