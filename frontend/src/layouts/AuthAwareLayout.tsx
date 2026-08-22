import { useAuth } from "@/contexts/AuthContext";
import { LoadingState } from "@/components/ui/LoadingState";
import { AppLayout } from "@/layouts/AppLayout";
import { PublicLayout } from "@/layouts/PublicLayout";

/**
 * Pour les pages accessibles aux visiteurs ET aux utilisateurs connectés
 * (missions publiques) : garde le chrome de l'app (sidebar, topbar, bottom
 * nav) pour un utilisateur connecté au lieu de le faire sortir vers le
 * header/footer public — sinon cliquer sur "Missions" depuis la sidebar de
 * l'app perd toute la navigation de l'app.
 */
export function AuthAwareLayout() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState className="min-h-dvh" label="Chargement..." />;
  return session ? <AppLayout /> : <PublicLayout />;
}
