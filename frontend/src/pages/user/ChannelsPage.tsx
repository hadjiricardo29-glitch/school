import { Radio } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TelegramIcon, WhatsAppIcon, InstagramIcon, FacebookIcon, TikTokIcon } from "@/components/shared/SocialIcons";

export function ChannelsPage() {
  const { settings } = useSettings();
  const t = useT().channels;
  const hasGroups = !!(settings.communityTelegramUrl || settings.communityWhatsappUrl);

  const SOCIAL_PLACEHOLDERS = [
    { label: "Telegram", icon: TelegramIcon },
    { label: "Instagram", icon: InstagramIcon },
    { label: "Facebook", icon: FacebookIcon },
    { label: "TikTok", icon: TikTokIcon },
  ];

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.subtitle}</p>
      </div>

      <Card>
        <CardHeader title={t.groups} subtitle={t.groupsSubtitle} />
        {hasGroups ? (
          <div className="flex flex-col gap-3">
            {settings.communityTelegramUrl && (
              <a href={settings.communityTelegramUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" fullWidth icon={<TelegramIcon className="size-4" />}>{t.telegramGroup}</Button>
              </a>
            )}
            {settings.communityWhatsappUrl && (
              <a href={settings.communityWhatsappUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" fullWidth icon={<WhatsAppIcon className="size-4" />}>{t.whatsappGroup}</Button>
              </a>
            )}
          </div>
        ) : (
          <EmptyState icon={Radio} title={t.noGroups} description={t.noGroupsBody} />
        )}
      </Card>

      <Card>
        <CardHeader title={t.socialMedia} subtitle={t.comingSoon} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SOCIAL_PLACEHOLDERS.map(({ label, icon: Icon }) => (
            <div key={label} className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border py-4 text-text-secondary opacity-60">
              <Icon className="size-6" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
        <Badge tone="neutral" className="mt-4 self-start">{t.accountsComingSoon}</Badge>
      </Card>
    </div>
  );
}
