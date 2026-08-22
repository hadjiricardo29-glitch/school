import { useState, type FormEvent } from "react";
import { Lock, LogOut, Globe } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Tabs } from "@/components/ui/Tabs";
import { updatePassword } from "@/services/auth";
import { supabase } from "@/services/supabase";
import { useSettings } from "@/contexts/SettingsContext";
import { notify } from "@/utils/toast";

export function SettingsPage() {
  const { settings } = useSettings();
  const [tab, setTab] = useState("security");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      notify.success("Mot de passe mis à jour");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoutAllDevices() {
    await supabase.auth.signOut({ scope: "global" });
    notify.success("Déconnecté de tous les appareils");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Paramètres</h1>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "security", label: "Sécurité" },
          { value: "notifications", label: "Notifications" },
          { value: "regional", label: "Langue & devise" },
        ]}
      />

      {tab === "security" && (
        <Card>
          <CardHeader title="Changer le mot de passe" />
          <form onSubmit={onChangePassword} className="flex flex-col gap-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Input label="Nouveau mot de passe" type="password" leftIcon={<Lock className="size-4" />} value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input label="Confirmer" type="password" leftIcon={<Lock className="size-4" />} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button type="submit" loading={saving} className="self-start">
              Mettre à jour
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm font-medium text-text-primary">Sessions actives</p>
            <p className="mt-1 text-sm text-text-secondary">Déconnectez-vous de tous les appareils connectés à votre compte.</p>
            <Button variant="outline" className="mt-3" icon={<LogOut className="size-4" />} onClick={onLogoutAllDevices}>
              Déconnecter tous les appareils
            </Button>
          </div>
        </Card>
      )}

      {tab === "notifications" && (
        <Card>
          <CardHeader title="Préférences de notification" subtitle="Bientôt disponible" />
          <Alert tone="info">
            Les notifications importantes (tâches, retraits, commissions) sont toujours envoyées dans l'application.
            La configuration fine par canal (email, SMS) arrivera dans une prochaine mise à jour.
          </Alert>
        </Card>
      )}

      {tab === "regional" && (
        <Card>
          <CardHeader title="Langue & devise" />
          <div className="flex items-center gap-3 text-sm">
            <Globe className="size-4 text-text-secondary" />
            <span className="text-text-secondary">Langue : </span>
            <span className="font-medium text-text-primary">Français</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-text-secondary">Devise : </span>
            <span className="font-medium text-text-primary">{settings.currencyLabel} ({settings.currency})</span>
          </div>
          <p className="mt-4 text-xs text-text-secondary">La devise de la plateforme est définie par l'administration.</p>
        </Card>
      )}
    </div>
  );
}
