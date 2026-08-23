import { supabase } from "@/services/supabase";
import type { CommissionRule, LeaderboardEntry, MyRank } from "@/types/domain";

export interface ReferralStats {
  directCount: number;
  networkSize: number;
  totalCommissions: number;
}

export interface ReferralWithStatus {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  activated: boolean;
}

export async function getDirectReferralsWithStatus(userId: string): Promise<ReferralWithStatus[]> {
  const { data, error } = await supabase.rpc("get_direct_referrals_with_status", { p_user_id: userId });
  if (error) throw error;
  return (data ?? []) as ReferralWithStatus[];
}

/** @deprecated garde le même nom pour compat — délègue à getDirectReferralsWithStatus */
export const getDirectReferrals = getDirectReferralsWithStatus;

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const [direct, network, { data: commissions }] = await Promise.all([
    getDirectReferralsWithStatus(userId),
    getTeamTree(userId, 10),
    supabase.from("commissions").select("amount").eq("beneficiary_id", userId),
  ]);
  const totalCommissions = (commissions ?? []).reduce((sum, c) => sum + (c.amount as number), 0);
  const networkSize = countNodes(network) - 1;

  return { directCount: direct.length, networkSize, totalCommissions };
}

export interface TeamNode {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  activated: boolean;
  children: TeamNode[];
}

interface TeamTreeRow {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  created_at: string;
  referred_by: string | null;
  depth: number;
  activated: boolean;
}

function countNodes(node: TeamNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

/**
 * Construit l'arbre d'équipe jusqu'à `maxDepth` niveaux à partir du user
 * racine, via get_my_team_tree — toujours ancrée sur auth.uid() côté
 * serveur (aucun id arbitraire possible), un seul aller-retour réseau au
 * lieu d'un appel récursif par niveau.
 */
export async function getTeamTree(rootId: string, maxDepth = 5): Promise<TeamNode> {
  const { data, error } = await supabase.rpc("get_my_team_tree", { p_max_depth: maxDepth });
  if (error) throw error;
  const rows = (data ?? []) as TeamTreeRow[];

  const byParent = new Map<string, TeamTreeRow[]>();
  for (const r of rows) {
    if (r.referred_by == null) continue;
    if (!byParent.has(r.referred_by)) byParent.set(r.referred_by, []);
    byParent.get(r.referred_by)!.push(r);
  }

  function build(row: TeamTreeRow): TeamNode {
    return { ...row, children: (byParent.get(row.id) ?? []).map(build) };
  }

  const root = rows.find((r) => r.id === rootId) ?? rows.find((r) => r.depth === 0);
  if (!root) throw new Error("Team tree unavailable");
  return build(root);
}

export async function getCommissionRules(): Promise<CommissionRule[]> {
  const { data, error } = await supabase.from("commission_rules").select("*").order("level", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommissionRule[];
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function getMyRank(): Promise<MyRank | null> {
  const { data, error } = await supabase.rpc("get_my_rank");
  if (error) throw error;
  return ((data as MyRank[])?.[0]) ?? null;
}

export async function countActivatedReferrals(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("count_activated_referrals", { p_user_id: userId });
  if (error) throw error;
  return (data ?? 0) as number;
}
