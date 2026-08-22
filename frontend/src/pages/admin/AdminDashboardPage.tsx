import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, ClipboardList, ListChecks, ArrowUpFromLine, ArrowDownToLine, Coins } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { getAdminStats } from "@/services/admin";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/utils/format";

export function AdminDashboardPage() {
  const { settings } = useSettings();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Tableau de bord administrateur</h1>
        <p className="mt-1 text-sm text-text-secondary">Vue d'ensemble de la plateforme.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Utilisateurs" value={stats.totalUsers} icon={Users} tone="primary" />
        <StatCard label="Tâches" value={stats.totalTasks} icon={ClipboardList} />
        <StatCard label="Soumissions en attente" value={stats.pendingSubmissions} icon={ListChecks} />
        <StatCard label="Retraits en attente" value={stats.pendingWithdrawals} icon={ArrowUpFromLine} />
        <StatCard label="Total des dépôts" value={formatCurrency(stats.totalDeposits, settings.currencyLabel)} icon={ArrowDownToLine} />
        <StatCard label="Total des retraits" value={formatCurrency(stats.totalWithdrawals, settings.currencyLabel)} icon={Coins} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Approuver des soumissions", to: "/admin/submissions" },
          { label: "Traiter les retraits", to: "/admin/withdrawals" },
          { label: "Gérer les tâches", to: "/admin/tasks" },
          { label: "Gérer les utilisateurs", to: "/admin/users" },
        ].map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="text-sm font-medium text-text-primary transition-shadow hover:shadow-md">{action.label}</Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader title="Rappels" />
        <ul className="list-inside list-disc space-y-1.5 text-sm text-text-secondary">
          <li>Toute modification financière ou de rôle est enregistrée dans le journal d'audit.</li>
          <li>Les paiements sont en mode démonstration tant qu'aucun fournisseur réel n'est configuré.</li>
          <li>Les barèmes de commission et frais de retrait sont modifiables depuis Paramètres.</li>
        </ul>
      </Card>
    </div>
  );
}
