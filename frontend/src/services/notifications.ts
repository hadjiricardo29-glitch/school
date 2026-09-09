import { supabase } from "@/services/supabase";
import type { AppNotification } from "@/types/domain";

export async function getNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

// userId n'est plus utilisé (la RPC scope sur auth.uid() côté serveur) —
// gardé dans la signature pour ne pas toucher les appelants. Passe par une
// RPC plutôt qu'une requête HEAD + count PostgREST : cette dernière échoue
// silencieusement ("Fetch failed loading", pas une erreur HTTP) dans
// certains navigateurs/bloqueurs de pub/proxys.
export async function getUnreadCount(_userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}
