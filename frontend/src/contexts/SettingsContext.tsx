import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/services/supabase";
import { BRANDING } from "@/config/branding";

interface Settings {
  platformName: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  currencyLabel: string;
  withdrawalMinAmount: number;
  withdrawalFeePercentage: number;
  withdrawalFeeFixed: number;
  withdrawalMaxAmount: number;
  withdrawalMinReferrals: number;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  accountActivationEnabled: boolean;
  accountActivationMinDeposit: number;
  welcomeBonusAmount: number;
  communityTelegramUrl: string;
  communityWhatsappUrl: string;
  spinEnabled: boolean;
  spinMinReward: number;
  spinMaxReward: number;
  spinCooldownHours: number;
  spinMaxPerWindow: number;
  spinWindowDays: number;
}

const DEFAULT_SETTINGS: Settings = {
  platformName: BRANDING.platformName,
  primaryColor: BRANDING.primaryColor,
  secondaryColor: BRANDING.secondaryColor,
  currency: BRANDING.currency,
  currencyLabel: BRANDING.currencyLabel,
  withdrawalMinAmount: 1000,
  withdrawalFeePercentage: 5,
  withdrawalFeeFixed: 0,
  withdrawalMaxAmount: 500000,
  withdrawalMinReferrals: 10,
  maintenanceMode: false,
  registrationEnabled: true,
  accountActivationEnabled: true,
  accountActivationMinDeposit: 2000,
  welcomeBonusAmount: 200,
  communityTelegramUrl: "",
  communityWhatsappUrl: "",
  spinEnabled: true,
  spinMinReward: 25,
  spinMaxReward: 275,
  spinCooldownHours: 24,
  spinMaxPerWindow: 3,
  spinWindowDays: 5,
};

const SettingsContext = createContext<{ settings: Settings; loading: boolean; refresh: () => Promise<void> }>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  refresh: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase.from("system_settings").select("key, value");
    if (error || !data) {
      setLoading(false);
      return;
    }
    const map = new Map(data.map((row) => [row.key, row.value]));
    setSettings({
      platformName: (map.get("platform_name") as string) ?? DEFAULT_SETTINGS.platformName,
      primaryColor: (map.get("primary_color") as string) ?? DEFAULT_SETTINGS.primaryColor,
      secondaryColor: (map.get("secondary_color") as string) ?? DEFAULT_SETTINGS.secondaryColor,
      currency: (map.get("currency") as string) ?? DEFAULT_SETTINGS.currency,
      currencyLabel: (map.get("currency_label") as string) ?? DEFAULT_SETTINGS.currencyLabel,
      withdrawalMinAmount: Number(map.get("withdrawal_min_amount") ?? DEFAULT_SETTINGS.withdrawalMinAmount),
      withdrawalFeePercentage: Number(map.get("withdrawal_fee_percentage") ?? DEFAULT_SETTINGS.withdrawalFeePercentage),
      withdrawalFeeFixed: Number(map.get("withdrawal_fee_fixed") ?? DEFAULT_SETTINGS.withdrawalFeeFixed),
      withdrawalMaxAmount: Number(map.get("withdrawal_max_amount") ?? DEFAULT_SETTINGS.withdrawalMaxAmount),
      withdrawalMinReferrals: Number(map.get("withdrawal_min_referrals") ?? DEFAULT_SETTINGS.withdrawalMinReferrals),
      maintenanceMode: Boolean(map.get("maintenance_mode") ?? DEFAULT_SETTINGS.maintenanceMode),
      registrationEnabled: Boolean(map.get("registration_enabled") ?? DEFAULT_SETTINGS.registrationEnabled),
      accountActivationEnabled: Boolean(map.get("account_activation_enabled") ?? DEFAULT_SETTINGS.accountActivationEnabled),
      accountActivationMinDeposit: Number(map.get("account_activation_min_deposit") ?? DEFAULT_SETTINGS.accountActivationMinDeposit),
      welcomeBonusAmount: Number(map.get("welcome_bonus_amount") ?? DEFAULT_SETTINGS.welcomeBonusAmount),
      communityTelegramUrl: (map.get("community_telegram_url") as string) || DEFAULT_SETTINGS.communityTelegramUrl,
      communityWhatsappUrl: (map.get("community_whatsapp_url") as string) || DEFAULT_SETTINGS.communityWhatsappUrl,
      spinEnabled: Boolean(map.get("spin_enabled") ?? DEFAULT_SETTINGS.spinEnabled),
      spinMinReward: Number(map.get("spin_min_reward") ?? DEFAULT_SETTINGS.spinMinReward),
      spinMaxReward: Number(map.get("spin_max_reward") ?? DEFAULT_SETTINGS.spinMaxReward),
      spinCooldownHours: Number(map.get("spin_cooldown_hours") ?? DEFAULT_SETTINGS.spinCooldownHours),
      spinMaxPerWindow: Number(map.get("spin_max_per_window") ?? DEFAULT_SETTINGS.spinMaxPerWindow),
      spinWindowDays: Number(map.get("spin_window_days") ?? DEFAULT_SETTINGS.spinWindowDays),
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: load }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
