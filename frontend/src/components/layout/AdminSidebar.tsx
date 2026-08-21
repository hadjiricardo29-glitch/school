import { NavLink } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ADMIN_SIDEBAR_NAV } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

export function AdminSidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-l border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Logo />
        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Admin
        </span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ADMIN_SIDEBAR_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
              )
            }
          >
            <item.icon className="size-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-border p-3">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-text-primary"
        >
          <ArrowLeft className="size-[18px]" />
          Retour à l'app
        </NavLink>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-alt hover:text-text-primary"
        >
          <LogOut className="size-[18px]" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
