import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { StatCard } from "@/components/ui/StatCard";
import { ChartCard } from "@/components/ui/ChartCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { getTransactions } from "@/services/wallet";
import { getMySubmissions } from "@/services/tasks";
import { getReferralStats, type ReferralStats } from "@/services/referrals";
import type { Transaction, TaskSubmission } from "@/types/domain";
import { formatCurrency } from "@/utils/format";

function sumSince(transactions: Transaction[], since: Date) {
  return transactions.filter((t) => t.amount > 0 && new Date(t.created_at) >= since).reduce((s, t) => s + t.amount, 0);
}

export function AnalyticsPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getTransactions(profile.id, 500), getMySubmissions(profile.id), getReferralStats(profile.id)])
      .then(([tx, subs, refs]) => {
        setTransactions(tx);
        setSubmissions(subs);
        setReferralStats(refs);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const earningsToday = useMemo(() => sumSince(transactions, startOfDay), [transactions]);
  const earningsWeek = useMemo(() => sumSince(transactions, startOfWeek), [transactions]);
  const earningsMonth = useMemo(() => sumSince(transactions, startOfMonth), [transactions]);
  const earningsTotal = useMemo(() => transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0), [transactions]);

  const tasksCompleted = submissions.filter((s) => s.status === "APPROVED").length;
  const tasksReviewed = submissions.filter((s) => ["APPROVED", "REJECTED"].includes(s.status)).length;
  const successRate = tasksReviewed > 0 ? Math.round((tasksCompleted / tasksReviewed) * 100) : 0;

  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    transactions.filter((t) => t.amount > 0).forEach((t) => {
      const key = t.created_at.slice(0, 10);
      if (key in days) days[key] += t.amount;
    });
    return Object.entries(days).map(([date, total]) => ({
      date: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(new Date(date)),
      total,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.getFullYear()}-${d.getMonth()}`] = 0;
    }
    transactions.filter((t) => t.amount > 0).forEach((t) => {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in months) months[key] += t.amount;
    });
    return Object.entries(months).map(([key, total]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(y, m, 1)), total };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Statistiques</h1>
        <p className="mt-1 text-sm text-text-secondary">Vue détaillée de votre performance sur la plateforme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Gains aujourd'hui" value={formatCurrency(earningsToday, settings.currencyLabel)} />
        <StatCard label="Gains cette semaine" value={formatCurrency(earningsWeek, settings.currencyLabel)} />
        <StatCard label="Gains ce mois" value={formatCurrency(earningsMonth, settings.currencyLabel)} tone="primary" />
        <StatCard label="Gains totaux" value={formatCurrency(earningsTotal, settings.currencyLabel)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Missions complétées" value={tasksCompleted} />
        <StatCard label="Taux de réussite" value={`${successRate}%`} />
        <StatCard label="Gains de parrainage" value={formatCurrency(referralStats?.totalCommissions ?? 0, settings.currencyLabel)} />
        <StatCard label="Taille de l'équipe" value={referralStats?.networkSize ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Gains quotidiens" subtitle="7 derniers jours">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), settings.currencyLabel)} contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Bar dataKey="total" fill="#820000" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Gains mensuels" subtitle="6 derniers mois">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => formatCurrency(Number(v), settings.currencyLabel)} contentStyle={{ borderRadius: 10, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Line type="monotone" dataKey="total" stroke="#820000" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
