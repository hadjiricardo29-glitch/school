// Locale courante de formatage (dates/nombres) — suit platform_language.
// Variable module-level plutôt qu'un paramètre sur chaque fonction : évite
// de modifier les centaines d'appels existants à formatDate/formatCurrency
// dans toute l'app. SettingsContext appelle setLocale() à chaque chargement
// des réglages ; comme ces fonctions sont invoquées au rendu (jamais
// mémoïsées en dehors du composant), un changement de langue se répercute
// dès le prochain rendu déclenché par la mise à jour du contexte.
let currentLocale = "fr-FR";
export function setLocale(lang: "en" | "fr") {
  currentLocale = lang === "en" ? "en-US" : "fr-FR";
}
export function getLocale(): string {
  return currentLocale;
}

export function formatCurrency(amount: number, currencyLabel = "FCFA"): string {
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat(currentLocale, { maximumFractionDigits: 0 }).format(Math.abs(amount));
  return `${sign}${formatted} ${currencyLabel}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLocale).format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(currentLocale, { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(currentLocale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: "auto" });

  const steps: [number, number, Intl.RelativeTimeFormatUnit][] = [
    [60, 1, "second"],
    [60 * 60, 60, "minute"],
    [60 * 60 * 24, 60 * 60, "hour"],
    [60 * 60 * 24 * 30, 60 * 60 * 24, "day"],
    [60 * 60 * 24 * 365, 60 * 60 * 24 * 30, "month"],
    [Infinity, 60 * 60 * 24 * 365, "year"],
  ];

  const absSec = Math.abs(diffSec);
  const [, divisor, unit] = steps.find(([limit]) => absSec < limit) ?? steps[steps.length - 1];
  return rtf.format(Math.round(diffSec / divisor), unit);
}

export function initials(firstName?: string | null, lastName?: string | null, username?: string | null): string {
  if (firstName || lastName) {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
  }
  return (username?.slice(0, 2) ?? "??").toUpperCase();
}
