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
import { getDirectReferrals, getMyRank } from "@/services/referrals";
import type { Deposit, EarningBucket, MyRank, Profile, Task, Transaction, Wallet, WalletBalance } from "@/types/domain";
import { EARNING_BUCKET_COLORS, EARNING_BUCKET_LABELS } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";
import { hasUsedDeposit, isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { cn } from "@/utils/cn";

export function DashboardPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<Profile[]>([]);
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

  if (loading) return <LoadingState label="Chargement de votre dashboard..." />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Bonjour, {profile?.first_name ?? profile?.username} 👋</h1>
        <p className="mt-1 text-sm text-text-secondary">Votre activité en un coup d'œil.</p>
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
          label="Solde disponible"
          value={formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)}
          icon={WalletIcon}
          tone="primary"
          variant="filled"
        />
        <StatCard
          className="aspect-square"
          label="Total retiré"
          value={formatCurrency(wallet?.total_withdrawn ?? 0, settings.currencyLabel)}
          icon={ArrowDownToLine}
          tone="success"
          variant="filled"
        />
        <StatCard
          className="aspect-square"
          label="Mon rang"
          value={myRank ? `#${myRank.rank}` : "—"}
          icon={Trophy}
          tone="purple"
          variant="filled"
          hint={myRank ? "Top gains cumulés" : "Pas encore classé"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gains du jour" value={formatCurrency(todayEarnings, settings.currencyLabel)} />
        <StatCard label="Total des gains" value={formatCurrency(wallet?.total_earned ?? 0, settings.currencyLabel)} icon={WalletIcon} />
        <StatCard label="Gains de parrainage" value={formatCurrency(referralEarnings, settings.currencyLabel)} icon={Share2} />
      </div>

      <Card>
        <CardHeader title="Solde par catégorie" subtitle="Ce que vous pouvez retirer, ventilé par source de gain" />
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

      <ChartCard title="Évolution des gains" subtitle="14 derniers jours">
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
          <CardHeader title="Transactions récentes" action={<Link to="/transactions" className="text-xs font-medium text-primary hover:underline">Voir tout</Link>} />
          {transactions.length === 0 ? (
            <EmptyState title="Aucune transaction pour le moment" />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {transactions.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-text-primary">{t.description ?? t.type}</p>
                    <p className="text-xs text-text-secondary">{formatDate(t.created_at)}</p>
                  </div>
                  <span className={t.amount >= 0 ? "font-semibold text-success" : "font-semibold text-error"}>
                    {t.amount >= 0 ? "+" : ""}
                    {formatCurrency(t.amount, settings.currencyLabel)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Actions rapides" />
          <div className="flex flex-col gap-2">
            <Link to="/tasks">
              <Button variant="outline" fullWidth icon={<ListChecks className="size-4" />}>
                Parcourir les tâches
              </Button>
            </Link>
            <Link to="/wallet/withdraw">
              <Button variant="info" fullWidth icon={<ArrowDownToLine className="size-4" />}>
                Retirer
              </Button>
            </Link>
            {!hasUsedDeposit(deposits) && (
              <Link to="/wallet/deposit">
                <Button variant="success" fullWidth icon={<WalletIcon className="size-4" />}>
                  Déposer
                </Button>
              </Link>
            )}
            <Link to="/referrals">
              <Button variant="outline" fullWidth icon={<Share2 className="size-4" />}>
                Inviter des amis
              </Button>
            </Link>
            {settings.spinEnabled && (
              <Link to="/spin">
                <Button variant="outline" fullWidth icon={<Sparkles className="size-4" />}>
                  Roue de la chance
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tâches journalières" action={<Link to="/tasks" className="text-xs font-medium text-primary hover:underline">Voir tout</Link>} />
          {tasks.length === 0 ? (
            <EmptyState title="Aucune tâche publiée pour le moment" />
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
          <CardHeader title="Mon équipe" action={<Link to="/team" className="text-xs font-medium text-primary hover:underline">Voir l'arbre</Link>} />
          {team.length === 0 ? (
            <EmptyState
              title="Aucun filleul pour l'instant"
              description="Partagez votre lien de parrainage pour commencer à développer votre équipe."
              action={
                <Link to="/referrals">
                  <Button size="sm" icon={<ArrowRight className="size-4" />}>Mon lien de parrainage</Button>
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
