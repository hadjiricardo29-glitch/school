import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export function LoadingState({ label = "Chargement...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-16 text-text-secondary", className)}>
      <Loader2 className="size-6 animate-spin text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-alt", className)} />;
}
