import { supabase } from "@/services/supabase";
import type { CommissionRule, LeaderboardEntry, Profile } from "@/types/domain";

export interface ReferralStats {
  directCount: number;
  networkSize: number;
  totalCommissions: number;
}

export async function getDirectReferrals(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const { count: directCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("referred_by", userId);

  const { data: commissions } = await supabase.from("commissions").select("amount").eq("beneficiary_id", userId);
  const totalCommissions = (commissions ?? []).reduce((sum, c) => sum + (c.amount as number), 0);

  // taille du réseau complet (tous niveaux) via une fonction récursive côté client
  const network = await getTeamTree(userId, 10);
  const networkSize = countNodes(network) - 1;

  return { directCount: directCount ?? 0, networkSize, totalCommissions };
}

export interface TeamNode extends Profile {
  children: TeamNode[];
}

function countNodes(node: TeamNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

/** Construit l'arbre d'équipe jusqu'à `maxDepth` niveaux à partir du user racine. */
export async function getTeamTree(rootId: string, maxDepth = 5): Promise<TeamNode> {
  const { data: root, error } = await supabase.from("profiles").select("*").eq("id", rootId).single();
  if (error) throw error;

  async function buildChildren(parentId: string, depth: number): Promise<TeamNode[]> {
    if (depth >= maxDepth) return [];
    const { data } = await supabase.from("profiles").select("*").eq("referred_by", parentId);
    if (!data || data.length === 0) return [];
    const children = await Promise.all(
      data.map(async (p) => ({ ...(p as Profile), children: await buildChildren(p.id, depth + 1) })),
    );
    return children;
  }

  const children = await buildChildren(rootId, 0);
  return { ...(root as Profile), children };
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
