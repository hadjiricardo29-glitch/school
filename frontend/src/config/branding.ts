/**
 * Valeurs de marque par défaut (fallback avant chargement de system_settings,
 * et pour tout ce qui doit être connu avant le premier rendu : <title>, favicon...).
 * L'admin peut surcharger platformName/couleurs/devise depuis /admin/settings —
 * voir src/hooks/useSettings.ts pour les valeurs effectives à l'exécution.
 */
export const BRANDING = {
  platformName: "Motosu",
  tagline: "Missions digitales, récompenses et parrainage",
  primaryColor: "#820000",
  secondaryColor: "#A00000",
  currency: "XOF",
  currencyLabel: "FCFA",
  supportEmail: "support@motosu.app",
} as const;
