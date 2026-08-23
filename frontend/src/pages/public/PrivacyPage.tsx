import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { getLocale } from "@/utils/format";

export function PrivacyPage() {
  const { settings } = useSettings();
  const t = useT().privacy;
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold text-text-primary">{t.title}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {t.lastUpdated} {new Intl.DateTimeFormat(getLocale(), { dateStyle: "long" }).format(new Date())} — {settings.platformName}
      </p>
      <div className="mt-8 flex flex-col gap-6">
        {t.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-semibold text-text-primary">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
