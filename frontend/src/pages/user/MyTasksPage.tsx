import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
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
  const t = useT().myTasks;
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
        <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.subtitle}</p>
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          title={t.empty}
          action={
            <Link to="/tasks">
              <Button size="sm">{t.browseTasks}</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {submissions.map((s) => (
            <Link key={s.id} to={`/tasks/${s.task_id}`}>
              <Card className="flex items-center justify-between gap-4 transition-shadow hover:shadow-md">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{s.task?.title ?? t.task}</p>
                  <p className="mt-1 text-xs text-text-secondary">{t.startedOn} {formatDate(s.started_at)}</p>
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
