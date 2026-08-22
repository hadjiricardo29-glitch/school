import type { Deposit, Profile, Wallet } from "@/types/domain";

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

/**
 * Un seul dépôt est autorisé à vie par compte (voir create_deposit_request
 * côté serveur, migration 0022) — même condition ici pour masquer la page/
 * les boutons "Déposer" une fois que ce dépôt unique a été fait.
 */
export function hasUsedDeposit(deposits: Pick<Deposit, "status">[]): boolean {
  return deposits.some((d) => d.status === "PENDING" || d.status === "COMPLETED");
}
