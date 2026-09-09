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
import { useT } from "@/i18n/useT";
import { cancelDeposit, createDepositRequest, getDeposits, getWallet } from "@/services/wallet";
import { isAccountActivated } from "@/utils/activation";
import { notify } from "@/utils/toast";
import { formatCurrency } from "@/utils/format";
import { WEST_AFRICA_COUNTRIES } from "@/config/countries";
import { getOperatorsForCountry } from "@/config/operators";
import type { Deposit, Wallet } from "@/types/domain";
import { cn } from "@/utils/cn";

// Paliers de recharge proposés une fois le compte déjà activé (les frais
// d'activation eux restent un montant fixe, non lié à ces paliers). Les noms
// sont purement décoratifs (distinguer visuellement les montants) — aucun
// statut, aucun avantage ni récompense différenciée n'y est associé.
const TOP_UP_TIERS: { amount: number; label: string }[] = [
  { amount: 8800, label: "Bronze" },
  { amount: 38000, label: "Argent" },
  { amount: 98000, label: "Or" },
  { amount: 315000, label: "Platine" },
  { amount: 720000, label: "Diamant" },
];

export function DepositPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const td = useT().deposit;
  const [selectedTier, setSelectedTier] = useState(TOP_UP_TIERS[0].amount);
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
  const amount = needsActivation ? settings.accountActivationMinDeposit : selectedTier;
  const selectedCountry = WEST_AFRICA_COUNTRIES.find((c) => c.code === country);
  // Une fois activé, un dépôt COMPLETED passé (l'activation elle-même, ou une
  // recharge précédente) ne doit plus bloquer la page — seul un dépôt encore
  // PENDING justifie l'écran d'attente/suivi.
  const activeDeposit = deposits.find((d) => (needsActivation ? d.status === "PENDING" || d.status === "COMPLETED" : d.status === "PENDING"));

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
        notify.success(td.paidConfirmed);
        navigate("/wallet");
      } else if (updated?.status === "FAILED") {
        notify.error(td.failedOrExpired);
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
      notify.success(td.cancelled);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : td.cancelError);
    } finally {
      setCancelling(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!phone.trim()) {
      setError(td.phoneRequired);
      return;
    }
    setLoading(true);
    try {
      await createDepositRequest({ amount, method: operator, provider: settings.paymentProvider, country, phone: phone.trim() });
      if (settings.paymentProvider === "mock") {
        notify.success(td.demoPaid.replace("{amount}", formatCurrency(amount, settings.currencyLabel)));
      }
      // Reste sur place plutôt que de rediriger à l'aveugle vers /wallet :
      // reload() fait apparaître l'écran "en attente" (saspay) ou "activé"
      // (mock, instantané) selon le vrai statut, avec le suivi en direct.
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : td.paymentError);
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <LoadingState label={td.checking} />;

  if (activeDeposit?.status === "COMPLETED") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="size-4" /> {td.back}
        </button>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-success" />
          <h1 className="text-lg font-semibold text-text-primary">{td.alreadyActivatedTitle}</h1>
          <p className="max-w-sm text-sm text-text-secondary">{td.alreadyActivatedBody}</p>
          <Link to="/wallet" className="mt-2">
            <Button>{td.backToWallet}</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (activeDeposit?.status === "PENDING") {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="size-4" /> {td.back}
        </button>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Clock className="size-10 text-warning" />
          <h1 className="text-lg font-semibold text-text-primary">{td.pendingTitle}</h1>
          <p className="max-w-sm text-sm text-text-secondary">
            {td.pendingBody.replace("{amount}", formatCurrency(activeDeposit.amount, settings.currencyLabel))}
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" loading={cancelling} onClick={handleCancel}>{td.cancelRetry}</Button>
            <Link to="/wallet">
              <Button>{td.backToWallet}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> {td.back}
      </button>

      <Card>
        <h1 className="text-lg font-semibold text-text-primary">{needsActivation ? td.title : td.topUpTitle}</h1>
        <div className="mt-4 flex flex-col gap-3">
          {needsActivation && (
            <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-bg p-4">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{td.activationRequired}</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {td.activationRequiredBody.replace("{amount}", formatCurrency(settings.accountActivationMinDeposit, settings.currencyLabel))}
                </p>
              </div>
            </div>
          )}
          {settings.paymentProvider === "mock" ? (
            <Alert tone="warning">{td.demoNotice}</Alert>
          ) : (
            <Alert tone="info">{td.realNotice}</Alert>
          )}
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          {needsActivation ? (
            <div className="flex items-baseline justify-between rounded-md border border-border bg-surface-alt px-4 py-3">
              <span className="text-sm font-medium text-text-secondary">{td.fee}</span>
              <span className="text-lg font-semibold text-text-primary">{formatCurrency(amount, settings.currencyLabel)}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">{td.chooseAmount}</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TOP_UP_TIERS.map((tier) => (
                  <button
                    type="button"
                    key={tier.amount}
                    onClick={() => setSelectedTier(tier.amount)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors",
                      selectedTier === tier.amount ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary hover:bg-surface-alt",
                    )}
                  >
                    <span>{tier.label}</span>
                    <span className="text-xs font-normal opacity-80">{formatCurrency(tier.amount, settings.currencyLabel)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={td.country}
              options={WEST_AFRICA_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
            <Select
              label={td.operator}
              options={getOperatorsForCountry(country)}
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
            />
          </div>
          <Input
            label={td.phone}
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${selectedCountry?.phoneCode ?? ""} 00 00 00 00`}
          />
          <p className="-mt-2 text-xs text-text-secondary">{td.phoneHint}</p>
          <Button type="submit" fullWidth loading={loading}>
            {needsActivation ? (settings.paymentProvider === "mock" ? td.activateDemo : td.activate) : td.topUp}
          </Button>
        </form>
      </Card>
    </div>
  );
}
