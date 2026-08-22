import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/utils/cn";

type Tone = "info" | "success" | "error" | "warning";

const config: Record<Tone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: "bg-surface-alt text-text-primary border-border" },
  success: { icon: CheckCircle2, classes: "bg-success-bg text-success border-success/20" },
  error: { icon: XCircle, classes: "bg-error-bg text-error border-error/20" },
  warning: { icon: AlertTriangle, classes: "bg-warning-bg text-warning border-warning/20" },
};

export function Alert({ tone = "info", title, children }: { tone?: Tone; title?: string; children: ReactNode }) {
  const { icon: Icon, classes } = config[tone];
  return (
    <div className={cn("flex gap-3 rounded-md border p-4 text-sm", classes)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>
      </div>
    </div>
  );
}
