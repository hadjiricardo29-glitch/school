import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  trend?: number;
  tone?: "primary" | "neutral" | "success" | "info";
  hint?: string;
  /** "filled" teinte toute la carte dans la couleur du tone, pour la mettre en avant visuellement. */
  variant?: "default" | "filled";
}

const FRAME_CLASSES: Record<string, string> = {
  primary: "bg-primary/5 border-primary/40",
  success: "bg-success/5 border-success/40",
  info: "bg-accent/5 border-accent/40",
  neutral: "bg-surface-alt border-border",
};

const ICON_CLASSES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-accent/10 text-accent",
  neutral: "bg-surface-alt text-text-secondary",
};

export function StatCard({ label, value, icon: Icon, trend, tone = "neutral", hint, variant = "default" }: StatCardProps) {
  const filled = variant === "filled";
  return (
    <Card className={cn("flex flex-col gap-2", filled && cn("border-2", FRAME_CLASSES[tone]))}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</span>
        {Icon && (
          <span className={cn("flex size-8 items-center justify-center rounded-full", ICON_CLASSES[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <span className="text-2xl font-semibold tracking-tight text-text-primary">{value}</span>
      {(trend !== undefined || hint) && (
        <div className="flex items-center gap-1 text-xs">
          {trend !== undefined && (
            <span className={cn("flex items-center gap-0.5 font-medium", trend >= 0 ? "text-success" : "text-error")}>
              {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className={filled ? "opacity-80" : "text-text-secondary"}>{hint}</span>}
        </div>
      )}
    </Card>
  );
}
