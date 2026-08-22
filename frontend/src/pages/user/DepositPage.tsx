import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { createDepositRequest, getWallet } from "@/services/wallet";
import { isAccountActivated } from "@/utils/activation";
import { notify } from "@/utils/toast";
import { formatCurrency } from "@/utils/format";
import { COUNTRIES } from "@/config/countries";
import { getOperatorsForCountry } from "@/config/operators";
import type { Wallet } from "@/types/domain";

export function DepositPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState(COUNTRIES.find((c) => c.name === profile?.country)?.code ?? "CI");
  const [operator, setOperator] = useState(getOperatorsForCountry(country)[0]?.value ?? "mobile_money");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    if (!profile) return;
    getWallet(profile.id).then(setWallet).catch(() => setWallet(null));
  }, [profile]);

  useEffect(() => {
    setOperator(getOperatorsForCountry(country)[0]?.value ?? "mobile_money");
  }, [country]);

  const needsActivation = !isAccountActivated(wallet, settings, profile?.role);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Montant invalide");
      return;
    }
    setLoading(true);
    try {
      await createDepositRequest({ amount: value, method: operator, provider: "mock" });
      notify.success(`Dépôt démo de ${formatCurrency(value, settings.currencyLabel)} crédité sur votre solde.`);
      navigate("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dépôt impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> Retour
      </button>

      <Card>
        <h1 className="text-lg font-semibold text-text-primary">Effectuer un dépôt</h1>
        <div className="mt-4 flex flex-col gap-3">
          {needsActivation && (
            <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-bg p-4">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Activation de compte requise</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Déposez au moins {formatCurrency(settings.accountActivationMinDeposit, settings.currencyLabel)} pour
                  activer votre compte. Tant que ce n'est pas fait, l'accès aux autres pages reste bloqué.
                </p>
              </div>
            </div>
          )}
          <Alert tone="warning">
            Environnement de démonstration — aucun paiement réel n'est effectué. Le montant est crédité instantanément à
            titre de test ("Demo payment").
          </Alert>
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label={`Montant (${settings.currencyLabel})`}
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Pays"
              options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <Select
              label="Opérateur"
              options={getOperatorsForCountry(country)}
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
          <Button type="submit" fullWidth loading={loading}>
            Déposer (démo)
          </Button>
        </form>
      </Card>
    </div>
  );
}
