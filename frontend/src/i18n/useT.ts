import { useSettings } from "@/contexts/SettingsContext";
import { translations } from "./translations";

/** Traductions selon la langue globale de la plateforme (Admin > Paramètres). */
export function useT() {
  const { settings } = useSettings();
  return translations[settings.platformLanguage] ?? translations.en;
}
