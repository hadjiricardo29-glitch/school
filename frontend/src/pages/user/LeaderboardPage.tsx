import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { getLeaderboard } from "@/services/referrals";
import type { LeaderboardEntry } from "@/types/domain";
import { cn } from "@/utils/cn";

const MEDAL_TONE = ["text-[#B7791F]", "text-[#6B7280]", "text-[#820000]"];

export function LeaderboardPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const t = useT().leaderboard;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard(10).then(setEntries).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.subtitle.replace("{platform}", settings.platformName)}</p>
      </div>

      <Card padded={false}>
        {entries.length === 0 ? (
          <EmptyState icon={Trophy} title={t.empty} />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {entries.map((entry) => {
              const isMe = entry.username === profile?.username;
              return (
                <div
                  key={entry.rank}
                  className={cn("flex items-center gap-3 px-5 py-3", isMe && "bg-primary/[0.04]")}
                >
                  <span
                    className={cn(
                      "w-6 text-center text-sm font-bold",
                      entry.rank <= 3 ? MEDAL_TONE[entry.rank - 1] : "text-text-secondary",
                    )}
                  >
                    {entry.rank}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    @{entry.username}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-primary">{t.you}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
