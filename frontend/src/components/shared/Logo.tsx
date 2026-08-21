import { Link } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/utils/cn";

export function Logo({ to = "/", className }: { to?: string; className?: string }) {
  const { settings } = useSettings();
  return (
    <Link to={to} className={cn("flex items-center gap-2 select-none", className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-white">
        {settings.platformName.slice(0, 1).toUpperCase()}
      </span>
      <span className="text-lg font-semibold tracking-tight text-text-primary">{settings.platformName}</span>
    </Link>
  );
}
