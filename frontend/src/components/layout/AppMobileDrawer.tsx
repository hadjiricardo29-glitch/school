import { useMemo, useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, ChevronDown } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { USER_SIDEBAR_NAV, type NavItem } from "@/config/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import { cn } from "@/utils/cn";

interface NavGroup {
  item: NavItem;
  children: NavItem[];
}

// Regroupe les items `indent: true` sous l'item non-indenté juste au-dessus
// (ex: "Réseaux sociaux"/"Quiz"/"Ads" sous "Tâches journalières") pour un
// rendu en accordéon — sans dupliquer la config de USER_SIDEBAR_NAV.
function groupNav(items: NavItem[]): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const item of items) {
    if (item.indent && groups.length > 0) {
      groups[groups.length - 1].children.push(item);
    } else {
      groups.push({ item, children: [] });
    }
  }
  return groups;
}

export function AppMobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signOut } = useAuth();
  const t = useT();
  const pathname = useLocation().pathname;
  const groups = useMemo(() => groupNav(USER_SIDEBAR_NAV), []);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.filter((g) => g.children.some((c) => c.to === pathname)).map((g) => g.item.to)),
  );

  function toggle(to: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to);
      else next.add(to);
      return next;
    });
  }

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
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {groups.map(({ item, children }) => (
                <div key={item.to}>
                  <div className="flex items-center gap-1">
                    {item.expandOnly ? (
                      <button
                        type="button"
                        onClick={() => toggle(item.to)}
                        className="flex flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"
                      >
                        <item.icon className="size-[18px]" />
                        {item.labelKey ? t.nav[item.labelKey] : item.label}
                        <ChevronDown className={cn("ml-auto size-4 transition-transform", expanded.has(item.to) && "rotate-180")} />
                      </button>
                    ) : (
                      <>
                        <NavLink
                          to={item.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              "flex flex-1 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
                            )
                          }
                        >
                          <item.icon className="size-[18px]" />
                          {item.labelKey ? t.nav[item.labelKey] : item.label}
                        </NavLink>
                        {children.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggle(item.to)}
                            aria-label={expanded.has(item.to) ? "Réduire" : "Développer"}
                            className="shrink-0 rounded-md p-2.5 text-text-secondary hover:bg-surface-alt hover:text-text-primary"
                          >
                            <ChevronDown className={cn("size-4 transition-transform", expanded.has(item.to) && "rotate-180")} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {children.length > 0 && expanded.has(item.to) && (
                    <div className="mt-1 flex flex-col gap-1 border-l border-border pl-3">
                      {children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-surface-alt hover:text-text-primary",
                            )
                          }
                        >
                          <child.icon className="size-4" />
                          {child.labelKey ? t.nav[child.labelKey] : child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
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
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
