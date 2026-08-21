import { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Coins,
  Info,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/utils/cn";
import { getNotifications, markAllAsRead, markAsRead } from "@/services/notifications";
import type { AppNotification, NotificationType } from "@/types/domain";
import { formatRelativeTime } from "@/utils/format";

const ICONS: Record<NotificationType, LucideIcon> = {
  TASK_APPROVED: CheckCircle2,
  TASK_REJECTED: XCircle,
  PAYMENT_RECEIVED: Wallet,
  WITHDRAWAL_APPROVED: ArrowDownToLine,
  WITHDRAWAL_REJECTED: ArrowUpFromLine,
  REFERRAL_JOINED: Users,
  COMMISSION_RECEIVED: Coins,
  SYSTEM: Info,
};

export function NotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getNotifications(profile.id, 100).then(setNotifications).finally(() => setLoading(false));
  }, [profile]);

  async function handleMarkAllRead() {
    if (!profile) return;
    await markAllAsRead(profile.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleClick(n: AppNotification) {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      <Card padded={false}>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="Aucune notification" />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] ?? Info;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn("flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-surface-alt", !n.read && "bg-primary/[0.03]")}
                >
                  <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full", !n.read ? "bg-primary/10 text-primary" : "bg-surface-alt text-text-secondary")}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{n.title}</p>
                    <p className="mt-0.5 text-sm text-text-secondary">{n.message}</p>
                    <p className="mt-1 text-xs text-text-secondary">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
