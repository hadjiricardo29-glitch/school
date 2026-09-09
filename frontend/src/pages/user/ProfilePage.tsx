import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Copy, Smartphone, ShieldCheck, KeyRound, Award } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/services/supabase";
import { getPayoutAccount, getWallet, hasWithdrawalPin, savePayoutAccount, setWithdrawalPin } from "@/services/wallet";
import { formatCurrency, formatDate } from "@/utils/format";
import { notify } from "@/utils/toast";
import { cn } from "@/utils/cn";
import { WEST_AFRICA_COUNTRIES } from "@/config/countries";
import { getOperatorsForCountry } from "@/config/operators";
import { currentTier, nextTier } from "@/config/depositTiers";
import type { PayoutAccount, Wallet } from "@/types/domain";

const GRADE_COLORS: Record<string, string> = {
  Bronze: "bg-[#a3672f]/10 text-[#a3672f] border border-[#a3672f]/30",
  Argent: "bg-slate-400/10 text-slate-500 border border-slate-400/30",
  Or: "bg-warning-bg text-warning border border-warning/30",
  Platine: "bg-accent/10 text-accent border border-accent/30",
  Diamant: "bg-purple/10 text-purple border border-purple/30",
};

export function ProfilePage() {
  const { profile, session, refreshProfile } = useAuth();
  const { settings } = useSettings();
  const t = useT().profile;

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [pinConfigured, setPinConfigured] = useState<boolean | null>(null);

  const [editingAccount, setEditingAccount] = useState(false);
  const [accName, setAccName] = useState("");
  const [accCountry, setAccCountry] = useState("CI");
  const [accOperator, setAccOperator] = useState("");
  const [accPhone, setAccPhone] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [editingPin, setEditingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  useEffect(() => {
    if (!profile) return;
    getWallet(profile.id).then(setWallet);
    getPayoutAccount(profile.id).then((a) => {
      setPayoutAccount(a);
      if (a) {
        setAccName(a.account_name);
        setAccCountry(a.country);
        setAccOperator(a.operator);
        setAccPhone(a.phone);
      } else {
        setAccOperator(getOperatorsForCountry(accCountry)[0]?.value ?? "");
      }
    });
    hasWithdrawalPin().then(setPinConfigured).catch(() => setPinConfigured(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) return null;

  const grade = currentTier(wallet?.total_deposited ?? 0);
  const next = nextTier(wallet?.total_deposited ?? 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ first_name: firstName, last_name: lastName, phone })
        .eq("id", profile!.id);
      if (error) throw error;
      await refreshProfile();
      notify.success(t.updated);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t.updateError);
    } finally {
      setSaving(false);
    }
  }

  function openAccountEdit() {
    setAccName(payoutAccount?.account_name ?? "");
    setAccCountry(payoutAccount?.country ?? "CI");
    setAccOperator(payoutAccount?.operator ?? getOperatorsForCountry(payoutAccount?.country ?? "CI")[0]?.value ?? "");
    setAccPhone(payoutAccount?.phone ?? "");
    setEditingAccount(true);
  }

  async function onSaveAccount(e: FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    try {
      await savePayoutAccount({ accountName: accName.trim(), country: accCountry, operator: accOperator, phone: accPhone.trim() });
      const updated = await getPayoutAccount(profile!.id);
      setPayoutAccount(updated);
      setEditingAccount(false);
      notify.success(t.accountSaved);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t.updateError);
    } finally {
      setSavingAccount(false);
    }
  }

  async function onSavePin(e: FormEvent) {
    e.preventDefault();
    if (!/^[0-9]{4,6}$/.test(newPin)) {
      notify.error(t.pinFormatError);
      return;
    }
    if (newPin !== confirmPin) {
      notify.error(t.pinMismatch);
      return;
    }
    setSavingPin(true);
    try {
      await setWithdrawalPin(newPin, pinConfigured ? currentPin : undefined);
      setPinConfigured(true);
      setEditingPin(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      notify.success(t.pinSaved);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t.updateError);
    } finally {
      setSavingPin(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} username={profile.username} src={profile.avatar_url} size="lg" />
          <div>
            <p className="text-lg font-semibold text-text-primary">@{profile.username}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone="primary">{profile.role}</Badge>
              <Badge tone={profile.status === "ACTIVE" ? "success" : "error"}>{profile.status}</Badge>
              {grade && (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", GRADE_COLORS[grade.label])}>
                  <Award className="size-3" /> {grade.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
          <div>
            <p className="text-text-secondary">{t.country}</p>
            <p className="mt-0.5 font-medium text-text-primary">{profile.country ?? "—"}</p>
          </div>
          <div>
            <p className="text-text-secondary">{t.memberSince}</p>
            <p className="mt-0.5 font-medium text-text-primary">{formatDate(profile.created_at)}</p>
          </div>
          <div>
            <p className="text-text-secondary">{t.referralCode}</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code);
                notify.success(t.codeCopied);
              }}
              className="mt-0.5 flex items-center gap-1.5 font-medium text-primary"
            >
              {profile.referral_code} <Copy className="size-3.5" />
            </button>
          </div>
          <div>
            <p className="text-text-secondary">{t.grade}</p>
            <p className="mt-0.5 font-medium text-text-primary">
              {grade ? grade.label : t.noGrade}
              {next && <span className="ml-1 font-normal text-text-secondary">— {t.nextGradeAt.replace("{grade}", next.label).replace("{amount}", formatCurrency(next.amount, settings.currencyLabel))}</span>}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t.personalInfo} subtitle={t.personalInfoSubtitle} />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label={t.firstName} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label={t.lastName} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input label={t.email} value={session?.user.email ?? ""} disabled hint={t.emailHint} />
          <Input label={t.phone} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" loading={saving} className="self-start">
            {t.save}
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title={t.payoutAccount}
          subtitle={t.payoutAccountSubtitle}
          action={!editingAccount && <Button variant="outline" size="sm" onClick={openAccountEdit}>{t.edit}</Button>}
        />
        {editingAccount ? (
          <form onSubmit={onSaveAccount} className="flex flex-col gap-4">
            <Input label={t.accountName} required value={accName} onChange={(e) => setAccName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t.country}
                options={WEST_AFRICA_COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
                value={accCountry}
                onChange={(e) => {
                  const c = e.target.value;
                  setAccCountry(c);
                  setAccOperator(getOperatorsForCountry(c)[0]?.value ?? "");
                }}
              />
              <Select
                label={t.operator}
                options={getOperatorsForCountry(accCountry)}
                value={accOperator}
                onChange={(e) => setAccOperator(e.target.value)}
              />
            </div>
            <Input
              label={t.phone}
              required
              value={accPhone}
              onChange={(e) => setAccPhone(e.target.value)}
              placeholder={`${WEST_AFRICA_COUNTRIES.find((c) => c.code === accCountry)?.phoneCode ?? ""} 00 00 00 00`}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingAccount(false)}>{t.cancel}</Button>
              <Button type="submit" loading={savingAccount}>{t.saveAccount}</Button>
            </div>
          </form>
        ) : payoutAccount ? (
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-white">
              <Smartphone className="size-4" />
            </span>
            <div className="text-sm">
              <p className="font-medium text-text-primary">{payoutAccount.account_name}</p>
              <p className="text-text-secondary">
                {getOperatorsForCountry(payoutAccount.country).find((o) => o.value === payoutAccount.operator)?.label ?? payoutAccount.operator} — {payoutAccount.phone}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{t.notConfigured}</p>
        )}
      </Card>

      <Card>
        <CardHeader title={t.security} subtitle={t.securitySubtitle} />
        <div className="flex flex-col gap-4">
          <Link to="/settings" className="flex items-center gap-3 rounded-md border border-border p-3 text-sm hover:bg-surface-alt">
            <ShieldCheck className="size-4 text-text-secondary" />
            <span className="flex-1 font-medium text-text-primary">{t.changePasswordLink}</span>
          </Link>

          {editingPin ? (
            <form onSubmit={onSavePin} className="flex flex-col gap-3 rounded-md border border-border p-4">
              {pinConfigured && (
                <Input label={t.currentPin} type="password" inputMode="numeric" required value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              )}
              <Input label={t.newPin} type="password" inputMode="numeric" required value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <Input label={t.confirmPin} type="password" inputMode="numeric" required value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingPin(false)}>{t.cancel}</Button>
                <Button type="submit" loading={savingPin}>{t.savePin}</Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-border p-3">
              <KeyRound className="size-4 shrink-0 text-text-secondary" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-text-primary">{t.withdrawalPin}</p>
                <p className="text-text-secondary">{pinConfigured ? t.pinConfiguredLabel : t.pinNotConfiguredLabel}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditingPin(true)}>
                {pinConfigured ? t.changePin : t.setPin}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
