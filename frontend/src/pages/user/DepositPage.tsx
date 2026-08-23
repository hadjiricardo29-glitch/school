import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { cancelDeposit, createDepositRequest, getDeposits, getWallet } from "@/services/wallet";
import { isAccountActivated } from "@/utils/activation";
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
  const [cancelling, setCancelling] = useState(false);

  async function reload() {
    if (!profile) return;
    const [w, d] = await Promise.all([getWallet(profile.id), getDeposits(profile.id)]);
    setWallet(w);
    setDeposits(d);
  }

  useEffect(() => {
    reload().finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    setOperator(getOperatorsForCountry(country)[0]?.value ?? "mobile_money");
  }, [country]);

  const needsActivation = !isAccountActivated(wallet, settings, profile?.role);
  const selectedCountry = WEST_AFRICA_COUNTRIES.find((c) => c.code === country);
  const activeDeposit = deposits.find((d) => d.status === "PENDING" || d.status === "COMPLETED");

  // Pendant l'attente, on ne veut pas laisser l'utilisateur planté sur un
  // écran figé : on sonde le statut toutes les 4s pour rediriger dès que
  // le paiement est confirmé (webhook) ou échoue/expire (cron ou timeout
  // local de secours à 5 min sans confirmation).
  const PENDING_TIMEOUT_MS = 5 * 60 * 1000;
  useEffect(() => {
    if (activeDeposit?.status !== "PENDING" || !profile) return;
    const depositId = activeDeposit.id;
    const startedAt = new Date(activeDeposit.created_at).getTime();
    let stopped = false;

    async function tick() {
      if (stopped) return;
      if (Date.now() - startedAt >= PENDING_TIMEOUT_MS) {
        await cancelDeposit(depositId).catch(() => {});
      }
      const d = await getDeposits(profile!.id);
      if (stopped) return;
      setDeposits(d);
      const updated = d.find((x) => x.id === depositId);
      if (updated?.status === "COMPLETED") {
        notify.success("Paiement confirmé — compte activé !");
        navigate("/wallet");
      } else if (updated?.status === "FAILED") {
        notify.error("Le paiement a échoué ou a expiré — vous pouvez réessayer.");
      }
    }

    const intervalId = window.setInterval(tick, 4000);
    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDeposit?.id, activeDeposit?.status]);

  async function handleCancel() {
    if (!activeDeposit) return;
    setCancelling(true);
    try {
      await cancelDeposit(activeDeposit.id);
      await reload();
      notify.success("Paiement annulé — vous pouvez réessayer.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Annulation impossible");
    } finally {
      setCancelling(false);
    }
  }

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
      }
      // Reste sur place plutôt que de rediriger à l'aveugle vers /wallet :
      // reload() fait apparaître l'écran "en attente" (saspay) ou "activé"
      // (mock, instantané) selon le vrai statut, avec le suivi en direct.
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paiement impossible");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <LoadingState label="Vérification de l'activation..." />;

  if (activeDeposit?.status === "COMPLETED") {
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

  if (activeDeposit?.status === "PENDING") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="size-4" /> Retour
        </button>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Clock className="size-10 text-warning" />
          <h1 className="text-lg font-semibold text-text-primary">Paiement en attente de confirmation</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            Votre demande de {formatCurrency(activeDeposit.amount, settings.currencyLabel)} a été envoyée — confirmez-la
            sur votre téléphone. Le compte s'active automatiquement dès que le paiement est confirmé. Sans réponse sous
            5 minutes, la demande est annulée automatiquement et vous pourrez réessayer.
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" loading={cancelling} onClick={handleCancel}>Annuler et réessayer</Button>
            <Link to="/wallet">
              <Button>Retour au portefeuille</Button>
            </Link>
          </div>
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
