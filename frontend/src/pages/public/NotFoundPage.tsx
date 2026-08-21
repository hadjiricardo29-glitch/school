import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-alt px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-text-secondary">Cette page n'existe pas ou plus.</p>
      <Link to="/">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
