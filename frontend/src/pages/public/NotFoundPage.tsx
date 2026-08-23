import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useT } from "@/i18n/useT";

export function NotFoundPage() {
  const t = useT().common;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-alt px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-text-secondary">{t.pageNotFound}</p>
      <Link to="/accueil">
        <Button>{t.backHome}</Button>
      </Link>
    </div>
  );
}
