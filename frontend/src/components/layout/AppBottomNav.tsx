import { NavLink } from "react-router-dom";
import { USER_BOTTOM_NAV } from "@/config/navigation";
import { cn } from "@/utils/cn";

export function AppBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur lg:hidden">
      {USER_BOTTOM_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              isActive ? "text-primary" : "text-text-secondary",
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={cn("size-5", isActive && "stroke-[2.5]")} />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
