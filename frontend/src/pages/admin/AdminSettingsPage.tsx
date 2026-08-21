import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useSettings } from "@/contexts/SettingsContext";
import { getCommissionRules } from "@/services/referrals";
import { updateSetting, upsertCommissionRule } from "@/services/admin";
import { supabase } from "@/services/supabase";
import type { CommissionRule } from "@/types/domain";
import { notify } from "@/utils/toast";

export function AdminSettingsPage() {
  const { settings, refresh } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [currencyLabel, setCurrencyLabel] = useState("");
  const [withdrawalMin, setWithdrawalMin] = useState("");
  const [withdrawalFeePct, setWithdrawalFeePct] = useState("");
  const [withdrawalFeeFixed, setWithdrawalFeeFixed] = useState("");
  const [withdrawalMax, setWithdrawalMax] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [activationEnabled, setActivationEnabled] = useState(true);
  const [activationMinDeposit, setActivationMinDeposit] = useState("");
  const [welcomeBonus, setWelcomeBonus] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [spinEnabled, setSpinEnabled] = useState(true);
  const [spinMin, setSpinMin] = useState("");
  const [spinMax, setSpinMax] = useState("");
  const [spinCooldown, setSpinCooldown] = useState("");
  const [rules, setRules] = useState<CommissionRule[]>([]);

  useEffect(() => {
    getCommissionRules().then(setRules).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPlatformName(settings.platformName);
    setCurrencyLabel(settings.currencyLabel);
    setWithdrawalMin(String(settings.withdrawalMinAmount));
    setWithdrawalFeePct(String(settings.withdrawalFeePercentage));
    setWithdrawalFeeFixed(String(settings.withdrawalFeeFixed));
    setWithdrawalMax(String(settings.withdrawalMaxAmount));
    setMaintenanceMode(settings.maintenanceMode);
    setRegistrationEnabled(settings.registrationEnabled);
    setActivationEnabled(settings.accountActivationEnabled);
    setActivationMinDeposit(String(settings.accountActivationMinDeposit));
    setWelcomeBonus(String(settings.welcomeBonusAmount));
    setTelegramUrl(settings.communityTelegramUrl);
    setWhatsappUrl(settings.communityWhatsappUrl);
    setSpinEnabled(settings.spinEnabled);
    setSpinMin(String(settings.spinMinReward));
    setSpinMax(String(settings.spinMaxReward));
    setSpinCooldown(String(settings.spinCooldownHours));
  }, [settings]);

  async function saveGeneral() {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("platform_name", platformName),
        updateSetting("currency_label", currencyLabel),
        updateSetting("maintenance_mode", maintenanceMode),
        updateSetting("registration_enabled", registrationEnabled),
      ]);
      await refresh();
      notify.success("Paramètres généraux enregistrés");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function saveWithdrawalSettings() {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("withdrawal_min_amount", Number(withdrawalMin)),
        updateSetting("withdrawal_fee_percentage", Number(withdrawalFeePct)),
        updateSetting("withdrawal_fee_fixed", Number(withdrawalFeeFixed)),
        updateSetting("withdrawal_max_amount", Number(withdrawalMax)),
      ]);
      await refresh();
      notify.success("Paramètres de retrait enregistrés");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function saveActivationSettings() {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("account_activation_enabled", activationEnabled),
        updateSetting("account_activation_min_deposit", Number(activationMinDeposit)),
      ]);
      await refresh();
      notify.success("Paramètres d'activation enregistrés");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function saveEngagementSettings() {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("welcome_bonus_amount", Number(welcomeBonus)),
        updateSetting("community_telegram_url", telegramUrl),
        updateSetting("community_whatsapp_url", whatsappUrl),
      ]);
      await refresh();
      notify.success("Paramètres d'engagement enregistrés");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function saveSpinSettings() {
    setSaving(true);
    try {
      await Promise.all([
        updateSetting("spin_enabled", spinEnabled),
        updateSetting("spin_min_reward", Number(spinMin)),
        updateSetting("spin_max_reward", Number(spinMax)),
        updateSetting("spin_cooldown_hours", Number(spinCooldown)),
      ]);
      await refresh();
      notify.success("Paramètres de la roue enregistrés");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  function updateRuleField(index: number, field: keyof CommissionRule, value: string | boolean) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRule() {
    const nextLevel = (rules.at(-1)?.level ?? 0) + 1;
    setRules((prev) => [...prev, { id: `new-${nextLevel}`, level: nextLevel, percentage: 0, fixed_amount: 0, active: true, created_at: "", updated_at: "" }]);
  }

  async function saveRules() {
    setSaving(true);
    try {
      await Promise.all(
        rules.map((r) => upsertCommissionRule({ level: r.level, percentage: Number(r.percentage), fixed_amount: Number(r.fixed_amount), active: r.active })),
      );
      notify.success("Barème de commissions enregistré");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(index: number) {
    const rule = rules[index];
    if (!rule.id.startsWith("new-")) {
      await supabase.from("commission_rules").delete().eq("level", rule.level);
    }
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Paramètres de la plateforme</h1>
      </div>

      <Card>
        <CardHeader title="Général" subtitle="Nom, devise et disponibilité de la plateforme" />
        <div className="flex flex-col gap-4">
          <Input label="Nom de la plateforme" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          <Input label="Libellé de devise" value={currencyLabel} onChange={(e) => setCurrencyLabel(e.target.value)} hint="Ex: FCFA" />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={registrationEnabled} onChange={(e) => setRegistrationEnabled(e.target.checked)} />
            Inscriptions ouvertes
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
            Mode maintenance
          </label>
          {maintenanceMode && <Alert tone="warning">Le mode maintenance masque la plateforme aux utilisateurs non-admin (à brancher sur le middleware applicatif).</Alert>}
          <Button className="self-start" loading={saving} onClick={saveGeneral}>Enregistrer</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Retraits" subtitle="Montant minimum, frais et plafond" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Montant minimum" type="number" value={withdrawalMin} onChange={(e) => setWithdrawalMin(e.target.value)} />
          <Input label="Montant maximum" type="number" value={withdrawalMax} onChange={(e) => setWithdrawalMax(e.target.value)} />
          <Input label="Frais (%)" type="number" value={withdrawalFeePct} onChange={(e) => setWithdrawalFeePct(e.target.value)} />
          <Input label="Frais fixes" type="number" value={withdrawalFeeFixed} onChange={(e) => setWithdrawalFeeFixed(e.target.value)} />
        </div>
        <Button className="mt-4 self-start" loading={saving} onClick={saveWithdrawalSettings}>Enregistrer</Button>
      </Card>

      <Card>
        <CardHeader title="Activation de compte" subtitle="Exige un dépôt minimum avant de pouvoir réclamer une mission ou retirer" />
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={activationEnabled} onChange={(e) => setActivationEnabled(e.target.checked)} />
            Activer ce palier
          </label>
          {activationEnabled && (
            <Input
              label={`Dépôt minimum d'activation (${settings.currencyLabel})`}
              type="number"
              value={activationMinDeposit}
              onChange={(e) => setActivationMinDeposit(e.target.value)}
            />
          )}
          <Alert tone="info">
            Le dashboard, les missions et l'équipe restent visibles pour tous — seules la réclamation d'une mission et
            la demande de retrait sont bloquées tant que le compte n'est pas activé. Vérifié côté serveur, pas
            seulement dans l'interface.
          </Alert>
          <Button className="self-start" loading={saving} onClick={saveActivationSettings}>Enregistrer</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Engagement" subtitle="Bonus de bienvenue et liens communauté (repris pour le classement/community hub)" />
        <div className="flex flex-col gap-4">
          <Input
            label={`Bonus de bienvenue (${settings.currencyLabel})`}
            type="number"
            value={welcomeBonus}
            onChange={(e) => setWelcomeBonus(e.target.value)}
            hint="0 pour désactiver — crédité automatiquement à l'inscription"
          />
          <Input label="Lien groupe Telegram (optionnel)" value={telegramUrl} onChange={(e) => setTelegramUrl(e.target.value)} placeholder="https://t.me/..." />
          <Input label="Lien groupe WhatsApp (optionnel)" value={whatsappUrl} onChange={(e) => setWhatsappUrl(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
          <Button className="self-start" loading={saving} onClick={saveEngagementSettings}>Enregistrer</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Roue de la chance" subtitle="Tirage gratuit périodique, montant aléatoire entre deux bornes" />
        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={spinEnabled} onChange={(e) => setSpinEnabled(e.target.checked)} />
            Activer la roue
          </label>
          {spinEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <Input label={`Min (${settings.currencyLabel})`} type="number" value={spinMin} onChange={(e) => setSpinMin(e.target.value)} />
              <Input label={`Max (${settings.currencyLabel})`} type="number" value={spinMax} onChange={(e) => setSpinMax(e.target.value)} />
              <Input label="Cooldown (heures)" type="number" value={spinCooldown} onChange={(e) => setSpinCooldown(e.target.value)} />
            </div>
          )}
          <Button className="self-start" loading={saving} onClick={saveSpinSettings}>Enregistrer</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Barème de commissions de parrainage" subtitle="Par niveau, jamais codé en dur" action={<Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={addRule}>Ajouter un niveau</Button>} />
        <div className="flex flex-col gap-3">
          {rules.map((rule, i) => (
            <div key={rule.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-end gap-3">
              <div className="pb-2.5 text-sm font-medium text-text-secondary">Niveau {rule.level}</div>
              <Input label="Pourcentage" type="number" value={rule.percentage} onChange={(e) => updateRuleField(i, "percentage", e.target.value)} />
              <Input label="Montant fixe" type="number" value={rule.fixed_amount} onChange={(e) => updateRuleField(i, "fixed_amount", e.target.value)} />
              <label className="flex items-center gap-1.5 pb-2.5 text-sm text-text-primary">
                <input type="checkbox" className="size-4 accent-primary" checked={rule.active} onChange={(e) => updateRuleField(i, "active", e.target.checked)} />
                Actif
              </label>
              <button onClick={() => deleteRule(i)} className="mb-2.5 rounded-full p-2 text-error hover:bg-error-bg" aria-label="Supprimer"><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
        <Button className="mt-4 self-start" loading={saving} onClick={saveRules}>Enregistrer le barème</Button>
      </Card>
    </div>
  );
}
