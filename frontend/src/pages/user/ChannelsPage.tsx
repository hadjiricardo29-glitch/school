import { Radio } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TelegramIcon, WhatsAppIcon, InstagramIcon, FacebookIcon, TikTokIcon } from "@/components/shared/SocialIcons";

const SOCIAL_PLACEHOLDERS = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "Facebook", icon: FacebookIcon },
  { label: "TikTok", icon: TikTokIcon },
];

export function ChannelsPage() {
  const { settings } = useSettings();
  const hasGroups = !!(settings.communityTelegramUrl || settings.communityWhatsappUrl);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Canal de diffusion</h1>
        <p className="mt-1 text-sm text-text-secondary">Rejoignez nos groupes pour ne rien manquer.</p>
      </div>

      <Card>
        <CardHeader title="Groupes" subtitle="Annonces, support et échanges avec la communauté" />
        {hasGroups ? (
          <div className="flex flex-col gap-3">
            {settings.communityTelegramUrl && (
              <a href={settings.communityTelegramUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" fullWidth icon={<TelegramIcon className="size-4" />}>Groupe Telegram</Button>
              </a>
            )}
            {settings.communityWhatsappUrl && (
              <a href={settings.communityWhatsappUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" fullWidth icon={<WhatsAppIcon className="size-4" />}>Groupe WhatsApp</Button>
              </a>
            )}
          </div>
        ) : (
          <EmptyState icon={Radio} title="Aucun groupe pour le moment" description="Revenez bientôt." />
        )}
      </Card>

      <Card>
        <CardHeader title="Réseaux sociaux" subtitle="Bientôt disponible" />
        <div className="flex gap-3">
          {SOCIAL_PLACEHOLDERS.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-2 rounded-md border border-dashed border-border py-4 text-text-secondary opacity-60">
              <Icon className="size-6" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
        <Badge tone="neutral" className="mt-4 self-start">Comptes à venir</Badge>
      </Card>
    </div>
  );
}
