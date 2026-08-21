import { useState, type FormEvent } from "react";
import { Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/services/supabase";
import { formatDate } from "@/utils/format";
import { notify } from "@/utils/toast";

export function ProfilePage() {
  const { profile, session, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName, setLastName] = useState(profile?.last_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

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
      notify.success("Profil mis à jour");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Mon profil</h1>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <Avatar firstName={profile.first_name} lastName={profile.last_name} username={profile.username} src={profile.avatar_url} size="lg" />
          <div>
            <p className="text-lg font-semibold text-text-primary">@{profile.username}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone="primary">{profile.role}</Badge>
              <Badge tone={profile.status === "ACTIVE" ? "success" : "error"}>{profile.status}</Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
          <div>
            <p className="text-text-secondary">Pays</p>
            <p className="mt-0.5 font-medium text-text-primary">{profile.country ?? "—"}</p>
          </div>
          <div>
            <p className="text-text-secondary">Membre depuis</p>
            <p className="mt-0.5 font-medium text-text-primary">{formatDate(profile.created_at)}</p>
          </div>
          <div>
            <p className="text-text-secondary">Code de parrainage</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(profile.referral_code);
                notify.success("Code copié");
              }}
              className="mt-0.5 flex items-center gap-1.5 font-medium text-primary"
            >
              {profile.referral_code} <Copy className="size-3.5" />
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Informations personnelles" subtitle="Modifiable à tout moment" />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input label="Email" value={session?.user.email ?? ""} disabled hint="Géré depuis les paramètres de sécurité" />
          <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" loading={saving} className="self-start">
            Enregistrer
          </Button>
        </form>
      </Card>
    </div>
  );
}
