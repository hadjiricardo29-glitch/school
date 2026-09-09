import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { LoadingState } from "@/components/ui/LoadingState";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getWallet } from "@/services/wallet";
import { isAccountActivated } from "@/utils/activation";
import type { UserRole, Wallet } from "@/types/domain";

// Bloque tout accès protégé dès que profiles.status = SUSPENDED — vérifié à
// chaque chargement de session/navigation (comme RequireActivation),
// affiche le motif choisi par l'admin plutôt qu'un simple refus muet. Le
// blocage côté serveur (RPC) reste la vraie barrière — ceci n'est que l'UI.
function SuspendedScreen({ reason }: { reason: string | null }) {
  const t = useT();
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-alt p-4">
      <Card className="flex max-w-md flex-col items-center gap-3 py-10 text-center">
        <ShieldAlert className="size-10 text-error" />
        <h1 className="text-lg font-semibold text-text-primary">{t.common.accountSuspendedTitle}</h1>
        <p className="text-sm text-text-secondary">{reason ?? t.common.accountSuspendedDefaultBody}</p>
        <Button variant="outline" className="mt-2" onClick={signOut}>{t.nav.logout}</Button>
      </Card>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const t = useT().common;

  if (loading) return <LoadingState className="min-h-dvh" label={t.loadingSession} />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (profile?.status === "SUSPENDED") return <SuspendedScreen reason={profile.suspension_reason} />;
  return <>{children}</>;
}

const ACTIVATION_EXEMPT_PATHS = ["/wallet/deposit"];

export function RequireActivation({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const t = useT().common;
  const location = useLocation();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    // Se rafraîchit en arrière-plan à chaque navigation pour détecter un dépôt
    // qui vient d'activer le compte — mais ne réaffiche l'écran de chargement
    // plein écran qu'une seule fois (au montage), pas à chaque changement de
    // page, sinon toute navigation dans l'app clignote.
    getWallet(profile.id)
      .then(setWallet)
      .finally(() => setInitialLoading(false));
  }, [profile, location.pathname]);

  if (settingsLoading || initialLoading) {
    return <LoadingState className="min-h-dvh" label={t.checkingAccount} />;
  }

  if (!isAccountActivated(wallet, settings, profile?.role) && !ACTIVATION_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/wallet/deposit" replace />;
  }

  return <>{children}</>;
}

const STAFF_ROLES: UserRole[] = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const t = useT().common;

  if (loading) return <LoadingState className="min-h-dvh" label={t.checkingAccess} />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile || !STAFF_ROLES.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const t = useT().common;

  if (loading) return <LoadingState className="min-h-dvh" label={t.checkingAccess} />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
