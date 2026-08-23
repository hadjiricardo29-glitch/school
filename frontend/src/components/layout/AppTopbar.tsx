import { useNavigate } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, Settings, UserCircle } from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/shared/Logo";
import { useT } from "@/i18n/useT";
import avatarMascot from "@/assets/avatar-mascot.png";

const STAFF_ROLES = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export function AppTopbar({ title, onMenuClick }: { title?: string; onMenuClick?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();
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
              <Avatar username={profile?.username} src={avatarMascot} size="sm" className="object-top" />
            </button>
          }
          items={[
            ...(isStaff
              ? [{ label: t.topbar.administration, icon: <LayoutDashboard className="size-4" />, onClick: () => navigate("/admin") }]
              : []),
            { label: t.topbar.myProfile, icon: <UserCircle className="size-4" />, onClick: () => navigate("/profile") },
            { label: t.topbar.settings, icon: <Settings className="size-4" />, onClick: () => navigate("/settings") },
            { label: t.topbar.logout, icon: <LogOut className="size-4" />, onClick: signOut, danger: true },
          ]}
        />
      </div>
    </header>
  );
}
