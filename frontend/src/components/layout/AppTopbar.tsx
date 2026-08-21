import { useNavigate } from "react-router-dom";
import { LogOut, Settings, UserCircle } from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/shared/Logo";

export function AppTopbar({ title }: { title?: string }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
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
            { label: "Mon profil", icon: <UserCircle className="size-4" />, onClick: () => navigate("/profile") },
            { label: "Paramètres", icon: <Settings className="size-4" />, onClick: () => navigate("/settings") },
            { label: "Déconnexion", icon: <LogOut className="size-4" />, onClick: signOut, danger: true },
          ]}
        />
      </div>
    </header>
  );
}
