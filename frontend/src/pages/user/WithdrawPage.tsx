import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, Smartphone, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { createWithdrawalRequest, getPayoutAccount, getWallet, getWalletBalances, hasWithdrawalPin } from "@/services/wallet";
import { countActivatedReferrals } from "@/services/referrals";
import { formatCurrency } from "@/utils/format";
import { notify } from "@/utils/toast";
import type { EarningBucket, PayoutAccount, Wallet, WalletBalance } from "@/types/domain";
import { CURRENT_EARNING_BUCKETS } from "@/types/domain";
import { isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { COUNTRIES } from "@/config/countries";
import { getOperatorsForCountry } from "@/config/operators";

export function WithdrawPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const t = useT();
  const tw = t.withdraw;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);
  const [amount, setAmount] = useState("");
  const [bucket, setBucket] = useState<EarningBucket>("WALLET");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activatedReferrals, setActivatedReferrals] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) return;
    getWallet(profile.id).then(setWallet);
    getWalletBalances(profile.id).then(setBalances).catch(() => setBalances([]));
    getPayoutAccount(profile.id).then(setPayoutAccount).catch(() => setPayoutAccount(null));
    hasWithdrawalPin().then(setPinConfigured).catch(() => setPinConfigured(false));
    countActivatedReferrals(profile.id).then(setActivatedReferrals).catch(() => setActivatedReferrals(0));
  }, [profile]);

  // N'affiche que les catégories actuelles, sauf une ancienne (TikTok...)
  // qui garderait encore un solde — jamais stranded, toujours retirable.
  const bucketOptions = (Object.keys(t.enums.earningBucket) as EarningBucket[])
    .filter((b) => CURRENT_EARNING_BUCKETS.includes(b) || (balances.find((wb) => wb.bucket === b)?.available_balance ?? 0) > 0)
    .map((b) => {
      const balance = balances.find((wb) => wb.bucket === b)?.available_balance ?? 0;
      return { value: b, label: `${t.enums.earningBucket[b]} — ${formatCurrency(balance, settings.currencyLabel)}` };
    });
  const bucketBalance = balances.find((wb) => wb.bucket === bucket)?.available_balance ?? 0;

  const referralsRequired = settings.withdrawalMinReferrals;
  const referralsMissing = referralsRequired > 0 && (activatedReferrals ?? 0) < referralsRequired;

  const operatorLabel = payoutAccount
    ? getOperatorsForCountry(payoutAccount.country).find((o) => o.value === payoutAccount.operator)?.label ?? payoutAccount.operator
    : "";
  const countryLabel = payoutAccount ? COUNTRIES.find((c) => c.code === payoutAccount.country)?.name ?? payoutAccount.country : "";

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
      setError(tw.minAmountError.replace("{min}", formatCurrency(settings.withdrawalMinAmount, settings.currencyLabel)));
      return;
    }
    if (numericAmount > bucketBalance) {
      setError(
        tw.insufficientBalanceError
          .replace("{bucket}", t.enums.earningBucket[bucket])
          .replace("{available}", formatCurrency(bucketBalance, settings.currencyLabel)),
      );
      return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setError(tw.pinInvalid);
      return;
    }

    setLoading(true);
    try {
      await createWithdrawalRequest({ amount: numericAmount, pin, bucket });
      notify.success(tw.requestSent);
      navigate("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : tw.requestError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> {tw.back}
      </button>

      <Card>
        <h1 className="text-lg font-semibold text-text-primary">{tw.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {tw.availableBalance} <strong className="text-text-primary">{formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)}</strong>
        </p>

        {!isAccountActivated(wallet, settings, profile?.role) ? (
          <div className="mt-5">
            <ActivationBanner />
          </div>
        ) : referralsMissing ? (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-md border border-warning/30 bg-warning-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Users className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{tw.insufficientReferralsTitle}</p>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {tw.insufficientReferralsBody
                    .replace("{required}", String(referralsRequired))
                    .replace("{current}", String(activatedReferrals ?? 0))}
                </p>
              </div>
            </div>
            <Link to="/referrals" className="shrink-0">
              <Button size="sm">{tw.inviteFriends}</Button>
            </Link>
          </div>
        ) : !payoutAccount || !pinConfigured ? (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-md border border-warning/30 bg-warning-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Smartphone className="mt-0.5 size-5 shrink-0 text-warning" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{!payoutAccount ? tw.noAccountTitle : tw.noPinTitle}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{!payoutAccount ? tw.noAccountBody : tw.noPinBody}</p>
              </div>
            </div>
            <Link to="/profile" className="shrink-0">
              <Button size="sm">{tw.goToProfile}</Button>
            </Link>
          </div>
        ) : (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}

          <Select
            label={tw.withdrawFrom}
            options={bucketOptions}
            value={bucket}
            onChange={(e) => setBucket(e.target.value as EarningBucket)}
            hint={tw.withdrawFromHint}
          />

          <Input
            label={tw.amount.replace("{currency}", settings.currencyLabel)}
            type="number"
            min={settings.withdrawalMinAmount}
            max={bucketBalance}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={tw.amountHint
              .replace("{min}", formatCurrency(settings.withdrawalMinAmount, settings.currencyLabel))
              .replace("{available}", formatCurrency(bucketBalance, settings.currencyLabel))}
          />

          <div className="flex items-center gap-3 rounded-md border border-border bg-surface-alt p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-white">
              <Smartphone className="size-4" />
            </span>
            <div className="flex-1 text-sm">
              <p className="font-medium text-text-primary">{payoutAccount.account_name}</p>
              <p className="text-text-secondary">{operatorLabel} — {payoutAccount.phone} ({countryLabel})</p>
            </div>
            <Link to="/profile" className="shrink-0 text-xs font-medium text-primary hover:underline">
              {tw.change}
            </Link>
          </div>

          <Input
            label={tw.pin}
            type="password"
            inputMode="numeric"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            leftIcon={<KeyRound className="size-4" />}
            hint={tw.pinHint}
          />

          {numericAmount > 0 && (
            <div className="flex flex-col gap-1.5 rounded-md bg-surface-alt p-4 text-sm">
              <div className="flex justify-between text-text-secondary">
                <span>{tw.requested}</span>
                <span>{formatCurrency(numericAmount, settings.currencyLabel)}</span>
              </div>
              <div className="flex justify-between text-text-secondary">
                <span>{tw.fees}</span>
                <span>-{formatCurrency(fee, settings.currencyLabel)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-text-primary">
                <span>{tw.youWillReceive}</span>
                <span>{formatCurrency(net, settings.currencyLabel)}</span>
              </div>
            </div>
          )}

          <Button type="submit" fullWidth loading={loading}>
            {tw.submit}
          </Button>
        </form>
        )}
      </Card>
    </div>
  );
}
