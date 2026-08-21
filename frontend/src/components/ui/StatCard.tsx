import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  trend?: number;
  tone?: "primary" | "neutral";
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, trend, tone = "neutral", hint }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">{label}</span>
        {Icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              tone === "primary" ? "bg-primary/10 text-primary" : "bg-surface-alt text-text-secondary",
            )}
          >
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
          {hint && <span className="text-text-secondary">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
