import { useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, Settings, UserCircle } from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/shared/Logo";

const STAFF_ROLES = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export function AppTopbar({ title, onMenuClick }: { title?: string; onMenuClick?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isStaff = !!profile && STAFF_ROLES.includes(profile.role);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-full p-1.5 text-text-secondary hover:bg-surface-alt"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </button>
        )}
        <Logo />
      </div>
      {title && <h1 className="hidden text-lg font-semibold text-text-primary lg:block">{title}</h1>}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-alt">
              <Avatar firstName={profile?.first_name} lastName={profile?.last_name} username={profile?.username} src={profile?.avatar_url} size="sm" />
            </button>
          }
          items={[
            ...(isStaff
              ? [{ label: "Administration", icon: <LayoutDashboard className="size-4" />, onClick: () => navigate("/admin") }]
              : []),
            { label: "Mon profil", icon: <UserCircle className="size-4" />, onClick: () => navigate("/profile") },
            { label: "Paramètres", icon: <Settings className="size-4" />, onClick: () => navigate("/settings") },
            { label: "Déconnexion", icon: <LogOut className="size-4" />, onClick: signOut, danger: true },
          ]}
        />
      </div>
    </header>
  );
}
