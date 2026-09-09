import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import type { Deposit, EarningBucket, PayoutAccount, Transaction, Wallet, WalletBalance, WithdrawalRequest } from "@/types/domain";

export async function getPayoutAccount(userId: string): Promise<PayoutAccount | null> {
  const { data, error } = await supabase.from("payout_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as PayoutAccount | null;
}

export async function savePayoutAccount(params: {
  accountName: string;
  country: string;
  operator: string;
  phone: string;
}): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Not authenticated");
  const { error } = await supabase.from("payout_accounts").upsert(
    {
      user_id: userData.user.id,
      account_name: params.accountName,
      country: params.country,
      operator: params.operator,
      phone: params.phone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function hasWithdrawalPin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_withdrawal_pin");
  if (error) throw error;
  return Boolean(data);
}

export async function setWithdrawalPin(newPin: string, currentPin?: string): Promise<void> {
  const { error } = await supabase.rpc("set_withdrawal_pin", { p_new_pin: newPin, p_current_pin: currentPin ?? null });
  if (error) throw error;
}

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
  pin: string;
  bucket?: EarningBucket;
}): Promise<string> {
  // Passe par l'Edge Function (comme les dépôts) plutôt que par le RPC
  // directement : c'est le seul endroit qui voit la vraie IP réseau du
  // client, capturée et transmise à la RPC pour que le staff puisse la
  // consulter en validant la demande depuis /admin/withdrawals. La
  // destination n'est plus envoyée par le client — le serveur utilise le
  // compte enregistré (payout_accounts) une fois le PIN vérifié.
  const { data, error } = await supabase.functions.invoke("payments/withdraw", {
    body: {
      amount: params.amount,
      pin: params.pin,
      bucket: params.bucket ?? "WALLET",
    },
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
  return (data as { withdrawalId: string }).withdrawalId;
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
  phone?: string;
}): Promise<string> {
  // Passe par l'Edge Function "payments" (abstraction PaymentProvider) plutôt que
  // par le RPC directement, pour que l'intégration d'un vrai fournisseur plus tard
  // (Mobile Money, carte, virement) n'ait besoin de changer que cette seule couche.
  const { data, error } = await supabase.functions.invoke("payments/deposit", {
    body: {
      amount: params.amount,
      method: params.method,
      provider: params.provider ?? "mock",
      country: params.country,
      phone: params.phone,
    },
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

export async function cancelDeposit(depositId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_own_deposit", { p_deposit_id: depositId });
  if (error) throw error;
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
