import type { Wallet } from "@/types/domain";

export function isAccountActivated(
  wallet: Pick<Wallet, "total_deposited"> | null | undefined,
  settings: { accountActivationEnabled: boolean; accountActivationMinDeposit: number },
): boolean {
  if (!settings.accountActivationEnabled) return true;
  return (wallet?.total_deposited ?? 0) >= settings.accountActivationMinDeposit;
}
