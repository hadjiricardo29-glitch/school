import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import type { Deposit, EarningBucket, Transaction, Wallet, WalletBalance, WithdrawalRequest } from "@/types/domain";

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as Wallet | null;
}

export async function getWalletBalances(userId: string): Promise<WalletBalance[]> {
  const { data, error } = await supabase.from("wallet_balances").select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as WalletBalance[];
}

export async function getTransactions(userId: string, limit = 50): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Transaction[];
}

export async function createWithdrawalRequest(params: {
  amount: number;
  method: string;
  destination: Record<string, unknown>;
  bucket?: EarningBucket;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_withdrawal_request", {
    p_amount: params.amount,
    p_method: params.method,
    p_destination: params.destination,
    p_bucket: params.bucket ?? "WALLET",
  });
  if (error) throw error;
  return data as string;
}

export async function getWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WithdrawalRequest[];
}

export async function createDepositRequest(params: {
  amount: number;
  method: string;
  provider?: string;
  country?: string;
}): Promise<string> {
  // Passe par l'Edge Function "payments" (abstraction PaymentProvider) plutôt que
  // par le RPC directement, pour que l'intégration d'un vrai fournisseur plus tard
  // (Mobile Money, carte, virement) n'ait besoin de changer que cette seule couche.
  const { data, error } = await supabase.functions.invoke("payments/deposit", {
    body: { amount: params.amount, method: params.method, provider: params.provider ?? "mock", country: params.country },
  });
  if (error) {
    // Le SDK ne remonte que "Edge Function returned a non-2xx status code" par
    // défaut — le vrai message ({ error }) vit dans le corps de la réponse HTTP.
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      throw new Error(body?.error ?? error.message);
    }
    throw error;
  }
  return (data as { depositId: string }).depositId;
}

export async function getDeposits(userId: string): Promise<Deposit[]> {
  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Deposit[];
}
