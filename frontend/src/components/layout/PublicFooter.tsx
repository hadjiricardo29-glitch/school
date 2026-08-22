import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import { useSettings } from "@/contexts/SettingsContext";
import { BRANDING } from "@/config/branding";

export function PublicFooter() {
  const { settings } = useSettings();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-text-secondary">
              La plateforme qui transforme votre temps en tâches journalières rémunérées et récompenses digitales.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Plateforme</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link to="/tasks" className="hover:text-text-primary">Tâches journalières</Link></li>
              <li><Link to="/register" className="hover:text-text-primary">Créer un compte</Link></li>
              <li><Link to="/login" className="hover:text-text-primary">Connexion</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Légal</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li><Link to="/terms" className="hover:text-text-primary">Conditions d'utilisation</Link></li>
              <li><Link to="/privacy" className="hover:text-text-primary">Confidentialité</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Contact</h4>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>{BRANDING.supportEmail}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs text-text-secondary">
          © {new Date().getFullYear()} {settings.platformName}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
