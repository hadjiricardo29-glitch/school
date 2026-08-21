import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/utils/format";

export function ActivationBanner() {
  const { settings } = useSettings();

  return (
    <div className="flex flex-col items-start gap-3 rounded-[10px] border border-warning/30 bg-warning-bg p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Compte non activé</p>
          <p className="mt-0.5 text-sm text-text-secondary">
            Déposez au moins {formatCurrency(settings.accountActivationMinDeposit, settings.currencyLabel)} pour
            activer votre compte et pouvoir réclamer des missions ou retirer vos gains.
          </p>
        </div>
      </div>
      <Link to="/wallet/deposit" className="shrink-0">
        <Button size="sm">Activer mon compte</Button>
      </Link>
    </div>
  );
}
