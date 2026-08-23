import { supabase } from "@/services/supabase";
import type { SupportTicket } from "@/types/domain";

export async function createSupportTicket(subject: string, message: string): Promise<string> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ user_id: userData.user.id, subject, message })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getMyTickets(userId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}
