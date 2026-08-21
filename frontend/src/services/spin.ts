import { supabase } from "@/services/supabase";

export async function getNextSpinAt(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_spin_at", { p_user_id: userId });
  if (error) throw error;
  return data as string;
}

export async function claimDailySpin(): Promise<number> {
  const { data, error } = await supabase.rpc("claim_daily_spin");
  if (error) throw error;
  return data as number;
}
