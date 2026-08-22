import { supabase } from "@/services/supabase";
import type {
  AuditLogEntry,
  Course,
  Deposit,
  FraudFlag,
  Profile,
  Task,
  TaskSubmission,
  UserRole,
  WithdrawalRequest,
} from "@/types/domain";

// ---------- Users ----------
export async function listUsers(params?: { search?: string; role?: UserRole; page?: number; pageSize?: number }) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  let query = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (params?.search) query = query.or(`username.ilike.%${params.search}%`);
  if (params?.role) query = query.eq("role", params.role);
  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []) as Profile[], count: count ?? 0 };
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
  const { error } = await supabase.rpc("admin_set_user_status", { p_user_id: userId, p_status: status });
  if (error) throw error;
}

export async function changeUserRole(userId: string, role: UserRole) {
  const { error } = await supabase.rpc("admin_change_role", { p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function adjustBalance(userId: string, amount: number, description: string) {
  const { error } = await supabase.rpc("admin_adjust_balance", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
  });
  if (error) throw error;
}

// ---------- Tasks ----------
export async function listAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createTask(task: Partial<Task>) {
  const { data, error } = await supabase.from("tasks").insert(task).select("*").single();
  if (error) throw error;
  return data as Task;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { data, error } = await supabase.from("tasks").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Task;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Courses ----------
export async function listAllCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function createCourse(course: Partial<Course>) {
  const { data, error } = await supabase.from("courses").insert(course).select("*").single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(id: string, patch: Partial<Course>) {
  const { data, error } = await supabase.from("courses").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadCourseThumbnail(file: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("course-thumbnails").upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from("course-thumbnails").getPublicUrl(path).data.publicUrl;
}

// ---------- Submissions ----------
export async function listSubmissions(status?: string): Promise<TaskSubmission[]> {
  let query = supabase
    .from("task_submissions")
    .select("*, task:tasks(*), user:profiles!task_submissions_user_id_fkey(*)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TaskSubmission[];
}

export async function approveSubmission(id: string, note?: string) {
  const { error } = await supabase.rpc("approve_submission", { p_submission_id: id, p_review_note: note ?? null });
  if (error) throw error;
}

export async function rejectSubmission(id: string, note?: string) {
  const { error } = await supabase.rpc("reject_submission", { p_submission_id: id, p_review_note: note ?? null });
  if (error) throw error;
}

// ---------- Withdrawals ----------
export async function listWithdrawals(status?: string): Promise<WithdrawalRequest[]> {
  let query = supabase
    .from("withdrawal_requests")
    .select("*, user:profiles!withdrawal_requests_user_id_fkey(*)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as WithdrawalRequest[];
}

export async function approveWithdrawal(id: string) {
  const { error } = await supabase.rpc("approve_withdrawal", { p_withdrawal_id: id });
  if (error) throw error;
}

export async function rejectWithdrawal(id: string, reason?: string) {
  const { error } = await supabase.rpc("reject_withdrawal", { p_withdrawal_id: id, p_reason: reason ?? null });
  if (error) throw error;
}

// ---------- Deposits ----------
export async function listDeposits(status?: string): Promise<Deposit[]> {
  let query = supabase
    .from("deposits")
    .select("*, user:profiles!deposits_user_id_fkey(*)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Deposit[];
}

export async function approveDeposit(id: string) {
  const { error } = await supabase.rpc("approve_deposit", { p_deposit_id: id });
  if (error) throw error;
}

export async function rejectDeposit(id: string, reason?: string) {
  const { error } = await supabase.rpc("reject_deposit", { p_deposit_id: id, p_reason: reason ?? null });
  if (error) throw error;
}

// ---------- Audit log & fraud ----------
export async function listAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*, actor:profiles!audit_log_actor_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AuditLogEntry[];
}

export async function listFraudFlags(status?: string): Promise<FraudFlag[]> {
  let query = supabase
    .from("fraud_flags")
    .select("*, user:profiles!fraud_flags_user_id_fkey(*)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as FraudFlag[];
}

export async function resolveFraudFlag(id: string, status: "RESOLVED" | "DISMISSED") {
  const { error } = await supabase
    .from("fraud_flags")
    .update({ status, resolved_by: (await supabase.auth.getUser()).data.user?.id, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---------- Referrals (admin overview) ----------
export async function getTopReferrers(limit = 10): Promise<{ profile: Profile; directCount: number }[]> {
  // Un embed profiles!profiles_referred_by_fkey (auto-jointure sur profiles)
  // renvoie systématiquement PGRST200 "Could not find a relationship between
  // 'profiles' and 'profiles'" côté PostgREST malgré la contrainte réelle —
  // deux requêtes + comptage côté client évitent complètement ce problème.
  const [{ data: profiles, error: profilesError }, { data: referred, error: referredError }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("profiles").select("referred_by").not("referred_by", "is", null),
  ]);
  if (profilesError) throw profilesError;
  if (referredError) throw referredError;

  const counts = new Map<string, number>();
  for (const row of referred ?? []) {
    const referrerId = (row as { referred_by: string }).referred_by;
    counts.set(referrerId, (counts.get(referrerId) ?? 0) + 1);
  }

  const withCounts = (profiles ?? []).map((p) => ({
    profile: p as unknown as Profile,
    directCount: counts.get((p as unknown as Profile).id) ?? 0,
  }));
  return withCounts.sort((a, b) => b.directCount - a.directCount).slice(0, limit);
}

export async function getRecentCommissions(limit = 20) {
  const { data, error } = await supabase
    .from("commissions")
    .select("*, beneficiary:profiles!commissions_beneficiary_id_fkey(*), source_user:profiles!commissions_source_user_id_fkey(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ---------- Settings ----------
export async function updateSetting(key: string, value: unknown) {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("system_settings")
    .update({ value, updated_by: userData.user?.id, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}

export async function upsertCommissionRule(rule: { level: number; percentage: number; fixed_amount: number; active: boolean }) {
  const { error } = await supabase.from("commission_rules").upsert(rule, { onConflict: "level" });
  if (error) throw error;
}

// ---------- Dashboard stats ----------
export async function getAdminStats() {
  const [users, tasks, pendingSubs, pendingWithdrawals, deposits, withdrawals] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
    supabase.from("task_submissions").select("id", { count: "exact", head: true }).in("status", ["SUBMITTED", "UNDER_REVIEW"]),
    supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("deposits").select("amount").eq("status", "COMPLETED"),
    supabase.from("withdrawal_requests").select("net_amount").eq("status", "COMPLETED"),
  ]);

  const totalDeposits = (deposits.data ?? []).reduce((s, d) => s + (d.amount as number), 0);
  const totalWithdrawals = (withdrawals.data ?? []).reduce((s, w) => s + (w.net_amount as number), 0);

  return {
    totalUsers: users.count ?? 0,
    totalTasks: tasks.count ?? 0,
    pendingSubmissions: pendingSubs.count ?? 0,
    pendingWithdrawals: pendingWithdrawals.count ?? 0,
    totalDeposits,
    totalWithdrawals,
  };
}
