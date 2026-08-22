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

const SEGMENT_COLORS = ["#DC2626", "#0EA5E9", "#16A34A", "#F59E0B", "#7C3AED", "#EC4899", "#059669", "#EA580C"];
const SEGMENT_VALUES = [25, 30, 35, 40, 50, 60, 75, 100];
const BULB_COUNT = 24;

function angleForSegment(i: number) {
  const segmentAngle = 360 / SEGMENT_COLORS.length;
  const center = i * segmentAngle + segmentAngle / 2;
  return (360 - center) % 360;
}

function nearestSegmentIndex(reward: number) {
  return SEGMENT_VALUES.reduce(
    (best, v, i) => (Math.abs(v - reward) < Math.abs(SEGMENT_VALUES[best] - reward) ? i : best),
    0,
  );
}

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

    try {
      const reward = await claimDailySpin();
      const target = angleForSegment(nearestSegmentIndex(reward));
      const extraTurns = 4 + Math.floor(Math.random() * 3);
      setRotation((prev) => {
        const currentMod = ((prev % 360) + 360) % 360;
        const delta = target - currentMod <= 0 ? target - currentMod + 360 : target - currentMod;
        return prev + extraTurns * 360 + delta;
      });
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
          {settings.spinMaxPerWindow} tirages gratuits tous les {settings.spinWindowDays} jours, montant entre{" "}
          {formatCurrency(settings.spinMinReward, settings.currencyLabel)} et{" "}
          {formatCurrency(settings.spinMaxReward, settings.currencyLabel)}.
        </p>
      </div>

      {!settings.spinEnabled ? (
        <Alert tone="info">La roue de la chance n'est pas disponible pour le moment.</Alert>
      ) : !isAccountActivated(wallet, settings, profile?.role) ? (
        <ActivationBanner />
      ) : (
        <Card className="flex flex-col items-center gap-6 py-10">
        <div className="relative flex size-72 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.25)_0%,rgba(220,38,38,0.18)_45%,transparent_75%)] blur-xl" />

          <svg viewBox="0 0 200 200" className="absolute size-72">
            {Array.from({ length: BULB_COUNT }).map((_, i) => {
              const a = (360 / BULB_COUNT) * i * (Math.PI / 180);
              return (
                <circle
                  key={i}
                  cx={100 + 94 * Math.sin(a)}
                  cy={100 - 94 * Math.cos(a)}
                  r={i % 2 === 0 ? 3.4 : 2.4}
                  fill={i % 2 === 0 ? "#FCD34D" : "#FEF3C7"}
                />
              );
            })}
          </svg>

          <motion.svg
            viewBox="0 0 200 200"
            className="relative size-64 drop-shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
            animate={{ rotate: rotation }}
            transition={{ duration: 2.2, ease: [0.17, 0.67, 0.3, 0.99] }}
          >
            <circle cx="100" cy="100" r="88" fill="none" stroke="#171717" strokeWidth="3" />
            {SEGMENT_COLORS.map((color, i) => {
              const angle = (360 / SEGMENT_COLORS.length) * i;
              return (
                <g key={i}>
                  <path
                    d="M100,100 L100,12 A88,88 0 0,1 162.2,37.8 Z"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    transform={`rotate(${angle} 100 100)`}
                  />
                  <text
                    x="100"
                    y="34"
                    transform={`rotate(${angle + 22.5} 100 100)`}
                    textAnchor="middle"
                    fontSize="15"
                    fontWeight="800"
                    fill="#FFFFFF"
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth="0.5"
                  >
                    {SEGMENT_VALUES[i]}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="26" fill="#FFFFFF" stroke="#171717" strokeWidth="2" />
          </motion.svg>

          <div className="absolute -top-1 left-1/2 z-10 size-0 -translate-x-1/2 border-x-[11px] border-t-[18px] border-x-transparent border-t-[#171717] drop-shadow-sm" />
          <span className="absolute flex size-14 items-center justify-center rounded-full bg-primary shadow-md">
            <Sparkles className="size-6 text-white" />
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

