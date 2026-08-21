import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { createWithdrawalRequest, getWallet } from "@/services/wallet";
import { countActivatedReferrals } from "@/services/referrals";
import { formatCurrency } from "@/utils/format";
import { notify } from "@/utils/toast";
import type { Wallet } from "@/types/domain";
import { isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { COUNTRIES } from "@/config/countries";

export function WithdrawPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState(COUNTRIES.find((c) => c.name === profile?.country)?.code ?? "CI");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatedReferrals, setActivatedReferrals] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    getWallet(profile.id).then(setWallet);
    countActivatedReferrals(profile.id).then(setActivatedReferrals).catch(() => setActivatedReferrals(0));
  }, [profile]);

  const referralsRequired = settings.withdrawalMinReferrals;
  const referralsMissing = referralsRequired > 0 && (activatedReferrals ?? 0) < referralsRequired;

  const numericAmount = Number(amount) || 0;
  const fee = useMemo(
    () => Math.floor((numericAmount * settings.withdrawalFeePercentage) / 100) + settings.withdrawalFeeFixed,
    [numericAmount, settings],
  );
  const net = Math.max(numericAmount - fee, 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (numericAmount < settings.withdrawalMinAmount) {
      setError(`Le montant minimum de retrait est de ${formatCurrency(settings.withdrawalMinAmount, settings.currencyLabel)}`);
      return;
    }
    if (wallet && numericAmount > wallet.available_balance) {
      setError("Solde disponible insuffisant");
      return;
    }
    if (!phone) {
      setError("Le numéro de téléphone est requis");
      return;
    }

    setLoading(true);
    try {
      await createWithdrawalRequest({
        amount: numericAmount,
        method: "mobile_money",
        destination: { phone, country },
      });
      notify.success("Demande de retrait envoyée. Elle sera traitée par notre équipe.");
      navigate("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrait impossible");
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
        <h1 className="text-lg font-semibold text-text-primary">Demander un retrait</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Solde disponible : <strong className="text-text-primary">{formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)}</strong>
        </p>

        {!isAccountActivated(wallet, settings) ? (
          <div className="mt-5">
            <ActivationBanner />
          </div>
        ) : referralsMissing ? (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-[10px] border border-warning/30 bg-warning-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Users className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">Parrainage insuffisant</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  Il vous faut au moins {referralsRequired} filleuls activés pour demander un retrait. Vous en avez
                  actuellement {activatedReferrals ?? 0}.
                </p>
              </div>
            </div>
            <Link to="/referrals" className="shrink-0">
              <Button size="sm">Inviter des amis</Button>
            </Link>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Input
            label={`Montant (${settings.currencyLabel})`}
            type="number"
            min={settings.withdrawalMinAmount}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={`Minimum ${formatCurrency(settings.withdrawalMinAmount, settings.currencyLabel)}`}
          />

          <Input label="Méthode" value="Mobile Money" disabled />

          <Select
            label="Pays"
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />

          <Input
            label="Numéro de téléphone"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={`${COUNTRIES.find((c) => c.code === country)?.phoneCode ?? ""} 00 00 00 00`}
          />

          {numericAmount > 0 && (
            <div className="flex flex-col gap-1.5 rounded-[10px] bg-surface-alt p-4 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>Demandé</span>
                <span>{formatCurrency(numericAmount, settings.currencyLabel)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>Frais</span>
                <span>-{formatCurrency(fee, settings.currencyLabel)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-text-primary">
                <span>Vous recevrez</span>
                <span>{formatCurrency(net, settings.currencyLabel)}</span>
              </div>
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Demander le retrait
          </Button>
        </form>
        )}
      </Card>
    </div>
  );
}
