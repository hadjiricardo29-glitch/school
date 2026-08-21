import { Link } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/utils/cn";
import logoImage from "@/assets/logo.svg";

export function Logo({ to = "/", className }: { to?: string; className?: string }) {
  const { settings } = useSettings();
  return (
    <Link to={to} className={cn("flex items-center gap-2 select-none", className)}>
      <img src={logoImage} alt={settings.platformName} className="size-8 rounded-[10px] object-cover" />
      <span className="text-lg font-semibold tracking-tight text-text-primary">{settings.platformName}</span>
    </Link>
  );
}
