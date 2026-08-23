import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { LoadingState } from "@/components/ui/LoadingState";
import { getWallet } from "@/services/wallet";
import { isAccountActivated } from "@/utils/activation";
import type { UserRole, Wallet } from "@/types/domain";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const t = useT().common;

  if (loading) return <LoadingState className="min-h-dvh" label={t.loadingSession} />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
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
