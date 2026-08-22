import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type Tone = "neutral" | "primary" | "success" | "error" | "warning" | "oled";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-alt text-text-secondary border border-border",
  primary: "bg-primary/10 text-primary border border-primary/20",
  success: "bg-success-bg text-success border border-success/20",
  error: "bg-error-bg text-error border border-error/20",
  warning: "bg-warning-bg text-warning border border-warning/20",
  // Néon bleu sur noir — réservé aux tâches réseaux sociaux (TikTok, YouTube)
  // pour les distinguer visuellement des autres catégories.
  oled: "bg-black text-oled-blue border border-oled-blue/40 shadow-[0_0_10px_-2px_rgba(0,217,255,0.55)]",
};

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  COMPLETED: "success",
  APPROVED: "success",
  PUBLISHED: "success",
  PENDING: "warning",
  PENDING_VERIFICATION: "warning",
  PROCESSING: "warning",
  SUBMITTED: "warning",
  UNDER_REVIEW: "warning",
  STARTED: "neutral",
  DRAFT: "neutral",
  PAUSED: "neutral",
  SUSPENDED: "error",
  REJECTED: "error",
  FAILED: "error",
  CANCELLED: "error",
  EXPIRED: "error",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}
