export function formatCurrency(amount: number, currencyLabel = "FCFA"): string {
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.abs(amount));
  return `${sign}${formatted} ${currencyLabel}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
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
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

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
