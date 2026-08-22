import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Share2, Users, Network, Coins, MessageCircle, Send, MoonStar, UploadCloud } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Avatar } from "@/components/ui/Avatar";
import {
  getCommissionRules,
  getDirectReferralsWithStatus,
  getReferralStats,
  type ReferralStats,
  type ReferralWithStatus,
} from "@/services/referrals";
import type { CommissionRule } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";
import { notify } from "@/utils/toast";
import { parseVcf, type VcfContact } from "@/utils/vcf";

export function ReferralsPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralWithStatus[]>([]);
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("active");
  const [contacts, setContacts] = useState<VcfContact[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getReferralStats(profile.id), getDirectReferralsWithStatus(profile.id), getCommissionRules()])
      .then(([s, refs, r]) => {
        setStats(s);
        setReferrals(refs);
        setRules(r.filter((rule) => rule.active));
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const activeReferrals = useMemo(() => referrals.filter((r) => r.activated), [referrals]);
  const dormantReferrals = useMemo(() => referrals.filter((r) => !r.activated), [referrals]);
  const shownReferrals = tab === "active" ? activeReferrals : dormantReferrals;

  const referralLink = profile ? `${window.location.origin}/register?ref=${profile.referral_code}` : "";

  async function copyLink() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    notify.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  }

  async function onImportVcf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseVcf(text);
    if (parsed.length === 0) {
      notify.error("Aucun contact avec numéro de téléphone trouvé dans ce fichier");
      return;
    }
    setContacts(parsed);
    notify.success(`${parsed.length} contact(s) importé(s)`);
  }

  function whatsappInviteUrl(contact: VcfContact) {
    const message = `Salut ${contact.name} ! Rejoins-moi sur ${settings.platformName} et commence à gagner des récompenses : ${referralLink}`;
    return `https://wa.me/${contact.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
  }

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Parrainage</h1>
        <p className="mt-1 text-sm text-text-secondary">Invitez votre réseau et gagnez des commissions à chaque mission complétée.</p>
      </div>

      <Card>
        <CardHeader title="Mon lien de parrainage" subtitle={`Code : ${profile?.referral_code}`} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 truncate rounded-md border border-border bg-surface-alt px-3.5 py-2.5 text-sm text-text-secondary">
            {referralLink}
          </div>
          <Button onClick={copyLink} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button
            variant="outline"
            icon={<Share2 className="size-4" />}
            onClick={() => navigator.share?.({ title: settings.platformName, url: referralLink }).catch(() => {})}
          >
            Partager
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Importer des contacts" subtitle="Depuis un fichier .vcf exporté de votre téléphone" />
        <input ref={fileInputRef} type="file" accept=".vcf,text/vcard" className="hidden" onChange={onImportVcf} />
        <Button variant="outline" icon={<UploadCloud className="size-4" />} onClick={() => fileInputRef.current?.click()}>
          Choisir un fichier .vcf
        </Button>
        {contacts && (
          <div className="mt-4 flex max-h-80 flex-col divide-y divide-border overflow-y-auto">
            {contacts.map((c, i) => (
              <div key={`${c.phone}-${i}`} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.name}</p>
                  <p className="text-xs text-text-secondary">{c.phone}</p>
                </div>
                <a href={whatsappInviteUrl(c)} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" icon={<MessageCircle className="size-3.5" />}>
                    Inviter
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Filleuls directs" value={stats?.directCount ?? 0} icon={Users} tone="primary" />
        <StatCard label="Taille du réseau" value={stats?.networkSize ?? 0} icon={Network} />
        <StatCard label="Commissions générées" value={formatCurrency(stats?.totalCommissions ?? 0, settings.currencyLabel)} icon={Coins} />
      </div>

      <Card>
        <CardHeader title="Barème de commissions" subtitle="Configuré par l'administration" />
        <div className="flex flex-col divide-y divide-border">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-text-secondary">Niveau {rule.level}</span>
              <span className="font-semibold text-primary">
                {rule.percentage}%{rule.fixed_amount > 0 ? ` + ${formatCurrency(rule.fixed_amount, settings.currencyLabel)}` : ""}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {(settings.communityTelegramUrl || settings.communityWhatsappUrl) && (
        <Card>
          <CardHeader title="Rejoindre la communauté" subtitle="Échangez avec les autres membres et l'équipe support" />
          <div className="flex flex-col gap-2 sm:flex-row">
            {settings.communityTelegramUrl && (
              <a href={settings.communityTelegramUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="outline" fullWidth icon={<Send className="size-4" />}>Groupe Telegram</Button>
              </a>
            )}
            {settings.communityWhatsappUrl && (
              <a href={settings.communityWhatsappUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="outline" fullWidth icon={<MessageCircle className="size-4" />}>Groupe WhatsApp</Button>
              </a>
            )}
          </div>
        </Card>
      )}

      <Card padded={false}>
        <div className="px-5 pt-4">
          <CardHeader title="Filleuls directs" />
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "active", label: "Actifs", count: activeReferrals.length },
              { value: "dormant", label: "Dormants", count: dormantReferrals.length },
            ]}
          />
        </div>
        <div className="p-5">
          {shownReferrals.length === 0 ? (
            tab === "active" ? (
              <EmptyState title="Aucun filleul actif" description="Partagez votre lien pour commencer à inviter votre réseau." />
            ) : (
              <EmptyState title="Aucun filleul dormant" description="Tous vos filleuls ont activé leur compte." />
            )
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {shownReferrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={r.first_name} lastName={r.last_name} username={r.username} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">@{r.username}</p>
                      <p className="text-xs text-text-secondary">Membre depuis le {formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  {!r.activated && (
                    <Badge tone="warning">
                      <MoonStar className="size-3" /> Dormant
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
