import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { createDepositRequest, getDeposits, getWallet } from "@/services/wallet";
import { hasUsedDeposit, isAccountActivated } from "@/utils/activation";
import { notify } from "@/utils/toast";
import { formatCurrency } from "@/utils/format";
import { WEST_AFRICA_COUNTRIES } from "@/config/countries";
import { getOperatorsForCountry } from "@/config/operators";
import type { Deposit, Wallet } from "@/types/domain";

export function DepositPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const amount = settings.accountActivationMinDeposit;
  const [country, setCountry] = useState(WEST_AFRICA_COUNTRIES.find((c) => c.name === profile?.country)?.code ?? "CI");
  const [operator, setOperator] = useState(getOperatorsForCountry(country)[0]?.value ?? "mobile_money");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getWallet(profile.id), getDeposits(profile.id)])
      .then(([w, d]) => {
        setWallet(w);
        setDeposits(d);
      })
      .finally(() => setChecking(false));
  }, [profile]);

  useEffect(() => {
    setOperator(getOperatorsForCountry(country)[0]?.value ?? "mobile_money");
  }, [country]);

  const needsActivation = !isAccountActivated(wallet, settings, profile?.role);
  const selectedCountry = WEST_AFRICA_COUNTRIES.find((c) => c.code === country);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError("Numéro de téléphone requis — c'est ce numéro qui recevra la demande de paiement.");
      return;
    }
    setLoading(true);
    try {
      await createDepositRequest({ amount, method: operator, provider: settings.paymentProvider, country, phone: phone.trim() });
      if (settings.paymentProvider === "mock") {
        notify.success(`Frais d'activation (démo) de ${formatCurrency(amount, settings.currencyLabel)} payés — compte activé.`);
      } else {
        notify.success("Confirmez le paiement reçu sur votre téléphone pour activer votre compte.");
      }
      navigate("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paiement impossible");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <LoadingState label="Vérification de l'activation..." />;

  if (hasUsedDeposit(deposits)) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="size-4" /> Retour
        </button>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <h1 className="text-lg font-semibold text-text-primary">Compte déjà activé</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            Les frais d'activation sont déjà payés. La suite se passe du côté des retraits, une fois les conditions
            atteintes.
          </p>
          <Link to="/wallet" className="mt-2">
            <Button>Retour au portefeuille</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> Retour
      </button>

      <Card>
        <h1 className="text-lg font-semibold text-text-primary">Frais d'activation du compte</h1>
        <div className="mt-4 flex flex-col gap-3">
          {needsActivation && (
            <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-bg p-4">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Activation de compte requise</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Des frais d'activation de {formatCurrency(settings.accountActivationMinDeposit, settings.currencyLabel)} débloquent
                  votre compte. Tant que ce n'est pas payé, l'accès aux autres pages reste bloqué.
                </p>
              </div>
            </div>
          )}
          {settings.paymentProvider === "mock" ? (
            <Alert tone="warning">
              Environnement de démonstration — aucun paiement réel n'est effectué. Les frais sont crédités instantanément
              à titre de test ("Demo payment").
            </Alert>
          ) : (
            <Alert tone="info">
              Vous allez recevoir une demande de paiement directement sur votre téléphone — confirmez-la pour activer
              votre compte.
            </Alert>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <div className="flex items-baseline justify-between rounded-md border border-border bg-surface-alt px-4 py-3">
            <span className="text-sm font-medium text-text-secondary">Frais d'activation</span>
            <span className="text-lg font-semibold text-text-primary">{formatCurrency(amount, settings.currencyLabel)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Pays"
              options={WEST_AFRICA_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
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
          <Input
            label="Numéro de téléphone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${selectedCountry?.phoneCode ?? ""} 00 00 00 00`}
          />
          <p className="-mt-2 text-xs text-text-secondary">C'est ce numéro qui recevra la demande de paiement Mobile Money.</p>
          <Button type="submit" fullWidth loading={loading}>
            {settings.paymentProvider === "mock" ? "Activer mon compte (démo)" : "Activer mon compte"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
