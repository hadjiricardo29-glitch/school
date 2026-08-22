import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  /** Logo/image affiché à la place de `icon` (ex: le logo Motosu) en haut de la carte. */
  iconImage?: string;
  trend?: number;
  tone?: "primary" | "neutral" | "success" | "info";
  hint?: string;
  /** "filled" teinte toute la carte dans la couleur du tone, pour la mettre en avant visuellement. */
  variant?: "default" | "filled";
}

// Fond plein, même couleur que les boutons pleins (Button variant="primary"/"success"/"info") —
// pas une simple teinte légère, une vraie carte colorée comme demandé.
// `!` (important) force la couleur pleine à l'emporter sur le bg-surface par
// défaut de <Card> — deux classes bg-* de même poids en CSS, sinon c'est
// l'ordre de génération de Tailwind (pas l'ordre dans le className) qui
// décide laquelle gagne, ce qui rendait la carte "transparente"/blanche.
const SOLID_CLASSES: Record<string, string> = {
  primary: "!bg-primary !border-primary text-white",
  success: "!bg-success !border-success text-white",
  info: "!bg-accent !border-accent text-white",
  neutral: "!bg-surface-alt text-text-primary",
};

const ICON_CLASSES: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-accent/10 text-accent",
  neutral: "bg-surface-alt text-text-secondary",
};

export function StatCard({ label, value, icon: Icon, iconImage, trend, tone = "neutral", hint, variant = "default" }: StatCardProps) {
  const filled = variant === "filled";
  return (
    <Card className={cn("flex flex-col gap-2", filled && SOLID_CLASSES[tone])}>
      <div className="flex items-center justify-between">
        <span className={cn("text-xs font-medium uppercase tracking-wide", filled ? "text-white/80" : "text-text-secondary")}>
          {label}
        </span>
        {iconImage ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-white/20 p-1">
            <img src={iconImage} alt="" className="size-full rounded-full object-cover" />
          </span>
        ) : (
          Icon && (
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full",
                filled ? "bg-white/20 text-white" : ICON_CLASSES[tone],
              )}
            >
              <Icon className="size-4" />
            </span>
          )
        )}
      </div>
      <span className={cn("text-2xl font-semibold tracking-tight", filled ? "text-white" : "text-text-primary")}>{value}</span>
      {(trend !== undefined || hint) && (
        <div className="flex items-center gap-1 text-xs">
          {trend !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 font-medium",
                filled ? "text-white" : trend >= 0 ? "text-success" : "text-error",
              )}
            >
              {trend >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(trend)}%
            </span>
          )}
          {hint && <span className={filled ? "text-white/80" : "text-text-secondary"}>{hint}</span>}
        </div>
      )}
    </Card>
  );
}
