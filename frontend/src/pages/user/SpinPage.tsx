import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { getWallet } from "@/services/wallet";
import { claimDailySpin, getNextSpinAt } from "@/services/spin";
import { isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { formatCurrency } from "@/utils/format";
import { notify } from "@/utils/toast";
import type { Wallet } from "@/types/domain";

const SEGMENT_COLORS = ["#820000", "#B7791F", "#16803C", "#A00000", "#6B7280", "#820000", "#16803C", "#B7791F"];

export function SpinPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [nextSpinAt, setNextSpinAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastReward, setLastReward] = useState<number | null>(null);

  async function load() {
    if (!profile) return;
    const [w, next] = await Promise.all([getWallet(profile.id), getNextSpinAt(profile.id)]);
    setWallet(w);
    setNextSpinAt(new Date(next));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const canSpin = !!nextSpinAt && nextSpinAt <= new Date();

  async function handleSpin() {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setLastReward(null);
    const extraTurns = 4 + Math.floor(Math.random() * 3);
    const randomOffset = Math.floor(Math.random() * 360);
    setRotation((r) => r + extraTurns * 360 + randomOffset);

    try {
      const reward = await claimDailySpin();
      setTimeout(async () => {
        setLastReward(reward);
        notify.success(`Vous avez gagné ${formatCurrency(reward, settings.currencyLabel)} !`);
        await load();
        setSpinning(false);
      }, 2200);
    } catch (err) {
      setSpinning(false);
      notify.error(err instanceof Error ? err.message : "Impossible de tourner la roue pour le moment");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Roue de la chance</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Un tirage gratuit toutes les {settings.spinCooldownHours} heures, montant entre{" "}
          {formatCurrency(settings.spinMinReward, settings.currencyLabel)} et{" "}
          {formatCurrency(settings.spinMaxReward, settings.currencyLabel)}.
        </p>
      </div>

      {!settings.spinEnabled ? (
        <Alert tone="info">La roue de la chance n'est pas disponible pour le moment.</Alert>
      ) : !isAccountActivated(wallet, settings) ? (
        <ActivationBanner />
      ) : (
        <Card className="flex flex-col items-center gap-6 py-10">
          <div className="relative flex size-64 items-center justify-center">
            <motion.svg
              viewBox="0 0 200 200"
              className="size-64"
              animate={{ rotate: rotation }}
              transition={{ duration: 2.2, ease: [0.17, 0.67, 0.3, 0.99] }}
            >
              {SEGMENT_COLORS.map((color, i) => {
                const angle = (360 / SEGMENT_COLORS.length) * i;
                return (
                  <path
                    key={i}
                    d="M100,100 L100,4 A96,96 0 0,1 167.9,32.1 Z"
                    fill={color}
                    opacity={0.9}
                    transform={`rotate(${angle} 100 100)`}
                  />
                );
              })}
              <circle cx="100" cy="100" r="28" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
            </motion.svg>
            <div className="absolute -top-1 left-1/2 size-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent border-t-[#171717]" />
            <span className="absolute flex size-14 items-center justify-center rounded-full bg-surface shadow-sm">
              <Sparkles className="size-6 text-primary" />
            </span>
          </div>

          {lastReward !== null && !spinning && (
            <Alert tone="success">Bravo ! +{formatCurrency(lastReward, settings.currencyLabel)} ajoutés à votre solde.</Alert>
          )}

          {canSpin ? (
            <Button size="lg" loading={spinning} onClick={handleSpin}>
              {spinning ? "Ça tourne..." : "Tourner la roue"}
            </Button>
          ) : (
            <p className="text-sm text-text-secondary">
              Prochain tir disponible le {nextSpinAt?.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
