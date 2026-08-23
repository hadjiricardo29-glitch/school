import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { USER_SIDEBAR_NAV } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import { cn } from "@/utils/cn";

export function AppSidebar() {
  const { signOut } = useAuth();
  const t = useT();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {USER_SIDEBAR_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md py-2.5 text-sm font-medium transition-colors",
                item.indent ? "ml-3 pl-4 pr-3 border-l border-border" : "px-3",
                isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
              )
            }
          >
            <item.icon className={item.indent ? "size-4" : "size-[18px]"} />
            {item.labelKey ? t.nav[item.labelKey] : item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-text-primary"
        >
          <LogOut className="size-[18px]" />
          {t.nav.logout}
        </button>
      </div>
    </aside>
  );
}
