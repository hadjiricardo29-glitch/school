import type { Profile, Wallet } from "@/types/domain";

const STAFF_ROLES: Profile["role"][] = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export function isAccountActivated(
  wallet: Pick<Wallet, "total_deposited"> | null | undefined,
  settings: { accountActivationEnabled: boolean; accountActivationMinDeposit: number },
  role?: Profile["role"],
): boolean {
  // Le palier d'activation vise les USERS gagnant de l'argent, pas le staff
  // qui doit pouvoir gérer la plateforme sans jamais déposer — même exception
  // qu'is_account_activated() côté serveur (migration 0018).
  if (role && STAFF_ROLES.includes(role)) return true;
  if (!settings.accountActivationEnabled) return true;
  return (wallet?.total_deposited ?? 0) >= settings.accountActivationMinDeposit;
}
