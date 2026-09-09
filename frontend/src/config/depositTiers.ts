/**
 * Paliers de recharge (voir DepositPage) — noms purement décoratifs, aucun
 * avantage ni récompense différenciée n'y est associé. Réutilisés pour
 * afficher le "grade" atteint sur le profil (basé sur le cumul des dépôts).
 */
export interface DepositTier {
  amount: number;
  label: string;
}

export const DEPOSIT_TIERS: DepositTier[] = [
  { amount: 8800, label: "Bronze" },
  { amount: 38000, label: "Argent" },
  { amount: 98000, label: "Or" },
  { amount: 315000, label: "Platine" },
  { amount: 720000, label: "Diamant" },
];

/** Le plus haut palier atteint par ce cumul de dépôts, ou null si aucun. */
export function currentTier(totalDeposited: number): DepositTier | null {
  let current: DepositTier | null = null;
  for (const tier of DEPOSIT_TIERS) {
    if (totalDeposited >= tier.amount) current = tier;
  }
  return current;
}

/** Le prochain palier à atteindre, ou null si le dernier est déjà atteint. */
export function nextTier(totalDeposited: number): DepositTier | null {
  return DEPOSIT_TIERS.find((t) => totalDeposited < t.amount) ?? null;
}
