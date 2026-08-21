import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { getRecentCommissions, getTopReferrers } from "@/services/admin";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDateTime } from "@/utils/format";
import type { Profile } from "@/types/domain";

interface CommissionRow {
  id: string;
  amount: number;
  level: number;
  created_at: string;
  beneficiary: Profile;
  source_user: Profile;
}

export function AdminReferralsPage() {
  const { settings } = useSettings();
  const [topReferrers, setTopReferrers] = useState<{ profile: Profile; directCount: number }[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTopReferrers(10), getRecentCommissions(20)])
      .then(([top, comms]) => {
        setTopReferrers(top.filter((t) => t.directCount > 0));
        setCommissions(comms as unknown as CommissionRow[]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Parrainage</h1>
        <p className="mt-1 text-sm text-text-secondary">Vue d'ensemble du réseau et des commissions versées.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Meilleurs parrains" subtitle="Par nombre de filleuls directs" />
          {topReferrers.length === 0 ? (
            <EmptyState title="Aucun parrainage pour le moment" />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {topReferrers.map(({ profile, directCount }) => (
                <div key={profile.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={profile.first_name} lastName={profile.last_name} username={profile.username} size="sm" />
                    <span className="text-sm font-medium text-text-primary">@{profile.username}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{directCount} filleuls</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Commissions récentes" />
          {commissions.length === 0 ? (
            <EmptyState title="Aucune commission versée" />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">
                      @{c.beneficiary?.username} <span className="text-text-secondary">← @{c.source_user?.username}</span>
                    </p>
                    <p className="text-xs text-text-secondary">Niveau {c.level} · {formatDateTime(c.created_at)}</p>
                  </div>
                  <span className="font-semibold text-success">+{formatCurrency(c.amount, settings.currencyLabel)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
