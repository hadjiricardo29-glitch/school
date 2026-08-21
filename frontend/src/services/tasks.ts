import { supabase } from "@/services/supabase";
import type { Task, TaskCategory, TaskSubmission } from "@/types/domain";

export async function listPublishedTasks(params?: { category?: TaskCategory; search?: string }): Promise<Task[]> {
  let query = supabase.from("tasks").select("*").eq("status", "PUBLISHED").order("created_at", { ascending: false });
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

export async function submitTaskProof(
  submissionId: string,
  proof: { proofText?: string; proofUrl?: string; proofFilePath?: string },
): Promise<void> {
  const { error } = await supabase
    .from("task_submissions")
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
      proof_text: proof.proofText ?? null,
      proof_url: proof.proofUrl ?? null,
      proof_file_path: proof.proofFilePath ?? null,
    })
    .eq("id", submissionId);
  if (error) throw error;
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

export async function uploadTaskProofFile(userId: string, submissionId: string, file: File): Promise<string> {
  const path = `${userId}/${submissionId}/${file.name}`;
  const { error } = await supabase.storage.from("task-proofs").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
