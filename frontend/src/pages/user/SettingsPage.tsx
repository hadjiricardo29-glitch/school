import { useState, type FormEvent } from "react";
import { Lock, LogOut, Globe } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Tabs } from "@/components/ui/Tabs";
import { updatePassword } from "@/services/auth";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { notify } from "@/utils/toast";

export function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { settings } = useSettings();
  const t = useT().settingsPage;
  const [tab, setTab] = useState("security");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function onToggleLeaderboardVisibility(hide: boolean) {
    if (!profile) return;
    setSavingPrivacy(true);
    try {
      const { error } = await supabase.from("profiles").update({ hide_from_leaderboard: hide }).eq("id", profile.id);
      if (error) throw error;
      await refreshProfile();
      notify.success(t.leaderboardVisibilityUpdated);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t.updateError);
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    if (password.length < 8) {
      setError(t.passwordTooShort);
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      notify.success(t.passwordUpdated);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.updateError);
    } finally {
      setSaving(false);
    }
  }

  async function onLogoutAllDevices() {
    await supabase.auth.signOut({ scope: "global" });
    notify.success(t.loggedOutAllDevices);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "security", label: t.tabSecurity },
          { value: "notifications", label: t.tabNotifications },
          { value: "privacy", label: t.tabPrivacy },
          { value: "regional", label: t.tabRegional },
        ]}
      />

      {tab === "security" && (
        <Card>
          <CardHeader title={t.changePassword} />
          <form onSubmit={onChangePassword} className="flex flex-col gap-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Input label={t.newPassword} type="password" leftIcon={<Lock className="size-4" />} value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label={t.confirm} type="password" leftIcon={<Lock className="size-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button type="submit" loading={saving} className="self-start">
              {t.update}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm font-medium text-text-primary">{t.activeSessions}</p>
            <p className="mt-1 text-sm text-text-secondary">{t.activeSessionsBody}</p>
            <Button variant="outline" className="mt-3" icon={<LogOut className="size-4" />} onClick={onLogoutAllDevices}>
              {t.logoutAllDevices}
            </Button>
          </div>
        </Card>
      )}

      {tab === "notifications" && (
        <Card>
          <CardHeader title={t.notifPrefs} subtitle={t.notifPrefsSubtitle} />
          <Alert tone="info">{t.notifPrefsBody}</Alert>
        </Card>
      )}

      {tab === "privacy" && (
        <Card>
          <CardHeader title={t.leaderboardPrivacy} />
          <label className="flex items-start gap-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={profile?.hide_from_leaderboard ?? false}
              disabled={savingPrivacy}
              onChange={(e) => onToggleLeaderboardVisibility(e.target.checked)}
            />
            <span>
              {t.hideFromLeaderboard}
              <span className="mt-1 block text-xs font-normal text-text-secondary">{t.hideFromLeaderboardHint}</span>
            </span>
          </label>
        </Card>
      )}

      {tab === "regional" && (
        <Card>
          <CardHeader title={t.langCurrency} />
          <div className="flex items-center gap-3 text-sm">
            <Globe className="size-4 text-text-secondary" />
            <span className="text-text-secondary">{t.language}</span>
            <span className="font-medium text-text-primary">{settings.platformLanguage === "en" ? "English" : "Français"}</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">{t.languageNote}</p>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-text-secondary">{t.currency}</span>
            <span className="font-medium text-text-primary">{settings.currencyLabel} ({settings.currency})</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">{t.currencyNote}</p>
        </Card>
      )}
    </div>
  );
}
