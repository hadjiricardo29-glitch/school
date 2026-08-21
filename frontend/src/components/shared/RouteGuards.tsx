import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/ui/LoadingState";
import type { UserRole } from "@/types/domain";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState className="min-h-dvh" label="Chargement de votre session..." />;
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
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
