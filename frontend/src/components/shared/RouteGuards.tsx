import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { LoadingState } from "@/components/ui/LoadingState";
import { getWallet } from "@/services/wallet";
import { isAccountActivated } from "@/utils/activation";
import type { UserRole, Wallet } from "@/types/domain";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState className="min-h-dvh" label="Chargement de votre session..." />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

const ACTIVATION_EXEMPT_PATHS = ["/wallet/deposit"];

export function RequireActivation({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const location = useLocation();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setWalletLoading(true);
    getWallet(profile.id)
      .then(setWallet)
      .finally(() => setWalletLoading(false));
    // Se rafraîchit à chaque navigation pour détecter un dépôt qui vient d'activer le compte.
  }, [profile, location.pathname]);

  if (settingsLoading || walletLoading) {
    return <LoadingState className="min-h-dvh" label="Vérification de votre compte..." />;
  }

  if (!isAccountActivated(wallet, settings) && !ACTIVATION_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/wallet/deposit" replace />;
  }

  return <>{children}</>;
}

const STAFF_ROLES: UserRole[] = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export function RequireStaff({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingState className="min-h-dvh" label="Vérification des accès..." />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile || !STAFF_ROLES.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingState className="min-h-dvh" label="Vérification des accès..." />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile || !roles.includes(profile.role)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
