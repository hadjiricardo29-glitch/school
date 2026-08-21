import { supabase } from "@/services/supabase";
import type {
  AuditLogEntry,
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
  const { data, error } = await supabase
    .from("profiles")
    .select("*, referrals:profiles!profiles_referred_by_fkey(count)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const withCounts = (data ?? []).map((p) => ({
    profile: p as unknown as Profile,
    directCount: ((p as unknown as { referrals: { count: number }[] }).referrals?.[0]?.count as number) ?? 0,
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
