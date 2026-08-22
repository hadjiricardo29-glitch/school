import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { ADMIN_SIDEBAR_NAV } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

export function AdminMobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useAuth();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col bg-surface shadow-md"
          >
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
                  onClick={onClose}
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
                onClick={onClose}
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
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
