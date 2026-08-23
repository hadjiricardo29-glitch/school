import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ListChecks, Share2, Wallet as WalletIcon, ArrowDownToLine, Sparkles, Trophy } from "lucide-react";
import motosuImage from "@/assets/motosu.png";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { getDeposits, getTransactions, getWallet, getWalletBalances } from "@/services/wallet";
import { listPublishedTasks } from "@/services/tasks";
import { getDirectReferrals, getMyRank, type ReferralWithStatus } from "@/services/referrals";
import type { Deposit, EarningBucket, MyRank, Task, Transaction, Wallet, WalletBalance } from "@/types/domain";
import { EARNING_BUCKET_COLORS, EARNING_BUCKET_LABELS } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";
import { hasUsedDeposit, isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { useT } from "@/i18n/useT";
import { cn } from "@/utils/cn";

export function DashboardPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const t = useT().dashboard;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<ReferralWithStatus[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [myRank, setMyRank] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getWallet(profile.id),
      getWalletBalances(profile.id),
      getTransactions(profile.id, 60),
      listPublishedTasks(),
      getDirectReferrals(profile.id),
      getDeposits(profile.id),
      getMyRank(),
    ])
      .then(([w, wb, tx, t, refs, d, rank]) => {
        setWallet(w);
        setBalances(wb);
        setTransactions(tx);
        setTasks(t.slice(0, 4));
        setTeam(refs.slice(0, 5));
        setDeposits(d);
        setMyRank(rank);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const todayEarnings = useMemo(() => {
    const today = new Date().toDateString();
    return transactions
      .filter((t) => t.amount > 0 && new Date(t.created_at).toDateString() === today)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const referralEarnings = useMemo(
    () => transactions.filter((t) => t.type === "REFERRAL_COMMISSION").reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    transactions
      .filter((t) => t.amount > 0)
      .forEach((t) => {
        const key = t.created_at.slice(0, 10);
        if (key in days) days[key] += t.amount;
      });
    return Object.entries(days).map(([date, total]) => ({
      date: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(new Date(date)),
      total,
    }));
  }, [transactions]);

  if (loading) return <LoadingState label={t.loading} />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {t.greeting.replace("{name}", profile?.first_name ?? profile?.username ?? "")} 👋
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{t.subtitle}</p>
      </div>

      {!isAccountActivated(wallet, settings, profile?.role) && <ActivationBanner />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <img
          src={motosuImage}
          alt={settings.platformName}
          className="aspect-square w-full object-cover"
        />
        <StatCard
          className="aspect-square"
          label={t.availableBalance}
          value={formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)}
          icon={WalletIcon}
          tone="primary"
          variant="filled"
        />
        <StatCard
          className="aspect-square"
          label={t.totalWithdrawn}
          value={formatCurrency(wallet?.total_withdrawn ?? 0, settings.currencyLabel)}
          icon={ArrowDownToLine}
          tone="success"
          variant="filled"
        />
        <StatCard
          className="aspect-square"
          label={t.myRank}
          value={myRank ? `#${myRank.rank}` : "—"}
          icon={Trophy}
          tone="purple"
          variant="filled"
          hint={myRank ? t.topEarnings : t.notRankedYet}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t.todayEarnings} value={formatCurrency(todayEarnings, settings.currencyLabel)} />
        <StatCard label={t.totalEarnings} value={formatCurrency(wallet?.total_earned ?? 0, settings.currencyLabel)} icon={WalletIcon} />
        <StatCard label={t.referralEarnings} value={formatCurrency(referralEarnings, settings.currencyLabel)} icon={Share2} />
      </div>

      <Card>
        <CardHeader title={t.byCategory} subtitle={t.byCategorySubtitle} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(Object.keys(EARNING_BUCKET_LABELS) as EarningBucket[]).map((b) => (
            <div key={b} className={cn("rounded-md p-3", EARNING_BUCKET_COLORS[b])}>
              <p className="text-xs opacity-80">{EARNING_BUCKET_LABELS[b]}</p>
              <p className="mt-1 text-sm font-semibold">
                {formatCurrency(balances.find((wb) => wb.bucket === b)?.available_balance ?? 0, settings.currencyLabel)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <ChartCard title={t.earningsChart} subtitle={t.last14days}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#820000" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#820000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={40} />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), settings.currencyLabel)}
              contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="total" stroke="#820000" strokeWidth={2} fill="url(#earningsGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t.recentTransactions} action={<Link to="/transactions" className="text-xs font-medium text-primary hover:underline">{t.seeAll}</Link>} />
          {transactions.length === 0 ? (
            <EmptyState title={t.noTransactions} />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {transactions.slice(0, 6).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{tx.description ?? tx.type}</p>
                    <p className="text-xs text-text-secondary">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={tx.amount >= 0 ? "font-semibold text-success" : "font-semibold text-error"}>
                    {tx.amount >= 0 ? "+" : ""}
                    {formatCurrency(tx.amount, settings.currencyLabel)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t.quickActions} />
          <div className="flex flex-col gap-2">
            <Link to="/tasks">
              <Button variant="outline" fullWidth icon={<ListChecks className="size-4" />}>
                {t.browseTasks}
              </Button>
            </Link>
            {!hasUsedDeposit(deposits) && (
              <Link to="/wallet/deposit">
                <Button variant="success" fullWidth icon={<WalletIcon className="size-4" />}>
                  {t.deposit}
                </Button>
              </Link>
            )}
            <Link to="/referrals">
              <Button variant="outline" fullWidth icon={<Share2 className="size-4" />}>
                {t.inviteFriends}
              </Button>
            </Link>
            {settings.spinEnabled && (
              <Link to="/spin">
                <Button variant="outline" fullWidth icon={<Sparkles className="size-4" />}>
                  {t.luckyWheel}
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.dailyTasks} action={<Link to="/tasks" className="text-xs font-medium text-primary hover:underline">{t.seeAll}</Link>} />
          {tasks.length === 0 ? (
            <EmptyState title={t.noTasksPublished} />
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.map((task) => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-surface-alt">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{task.title}</p>
                    <Badge tone="neutral" className="mt-1">{task.difficulty}</Badge>
                  </div>
                  <span className="text-sm font-semibold text-primary">{formatCurrency(task.reward, settings.currencyLabel)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t.myTeam} action={<Link to="/team" className="text-xs font-medium text-primary hover:underline">{t.seeTree}</Link>} />
          {team.length === 0 ? (
            <EmptyState
              title={t.noReferralsYet}
              description={t.noReferralsBody}
              action={
                <Link to="/referrals">
                  <Button size="sm" icon={<ArrowRight className="size-4" />}>{t.myReferralLink}</Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {team.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-text-primary">@{member.username}</span>
                  <span className="text-xs text-text-secondary">{formatDate(member.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
