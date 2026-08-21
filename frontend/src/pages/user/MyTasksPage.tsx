import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { getMySubmissions } from "@/services/tasks";
import type { TaskSubmission } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";

export function MyTasksPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMySubmissions(profile.id).then(setSubmissions).finally(() => setLoading(false));
  }, [profile]);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Mes missions</h1>
        <p className="mt-1 text-sm text-text-secondary">Historique de vos missions commencées et soumises.</p>
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          title="Vous n'avez pas encore commencé de mission"
          action={
            <Link to="/tasks">
              <Button size="sm">Parcourir les missions</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((s) => (
            <Link key={s.id} to={`/tasks/${s.task_id}`}>
              <Card className="flex items-center justify-between gap-4 transition-shadow hover:shadow-md">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{s.task?.title ?? "Mission"}</p>
                  <p className="mt-1 text-xs text-text-secondary">Démarrée le {formatDate(s.started_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {s.task && <span className="text-sm font-semibold text-primary">{formatCurrency(s.task.reward, settings.currencyLabel)}</span>}
                  <StatusBadge status={s.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
