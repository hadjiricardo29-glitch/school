import { supabase } from "@/services/supabase";
import type { QuizQuestionPublic, QuizResult, Task, TaskCategory, TaskSubmission } from "@/types/domain";

export async function listPublishedTasks(params?: { category?: TaskCategory; search?: string }): Promise<Task[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("status", "PUBLISHED")
    .or(`deadline.is.null,deadline.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });
  if (params?.category) query = query.eq("category", params.category);
  if (params?.search) query = query.ilike("title", `%${params.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Task | null;
}

export async function startTask(taskId: string, userId: string): Promise<TaskSubmission> {
  const { data, error } = await supabase
    .from("task_submissions")
    .insert({ task_id: taskId, user_id: userId, status: "STARTED" })
    .select("*")
    .single();
  if (error) throw error;
  return data as TaskSubmission;
}

export interface WatchHeartbeatResult {
  watched_seconds: number;
  required_seconds: number;
  completed: boolean;
}

export async function recordWatchHeartbeat(submissionId: string): Promise<WatchHeartbeatResult> {
  const { data, error } = await supabase.rpc("record_watch_heartbeat", { p_submission_id: submissionId });
  if (error) throw error;
  return (data as WatchHeartbeatResult[])[0];
}

export async function getQuizQuestions(taskId: string): Promise<QuizQuestionPublic[]> {
  const { data, error } = await supabase.rpc("get_task_quiz_questions", { p_task_id: taskId });
  if (error) throw error;
  return (data ?? []) as QuizQuestionPublic[];
}

export async function submitQuizAnswers(submissionId: string, answers: Record<string, number>): Promise<QuizResult> {
  const { data, error } = await supabase.rpc("submit_quiz_answers", { p_submission_id: submissionId, p_answers: answers });
  if (error) throw error;
  return (data as QuizResult[])[0];
}

export async function getMySubmissions(userId: string): Promise<TaskSubmission[]> {
  const { data, error } = await supabase
    .from("task_submissions")
    .select("*, task:tasks(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TaskSubmission[];
}
