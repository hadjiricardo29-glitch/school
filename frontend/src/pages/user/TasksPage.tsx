import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { listPublishedTasks } from "@/services/tasks";
import type { Task, TaskCategory } from "@/types/domain";
import { TASK_CATEGORY_LABELS, TASK_DIFFICULTY_LABELS } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/utils/format";

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Toutes les catégories" },
  ...(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] })),
];

const SOCIAL_CATEGORIES: TaskCategory[] = ["TIKTOK", "YOUTUBE"];

export function TasksPage() {
  const { settings } = useSettings();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    setLoading(true);
    listPublishedTasks({ category: (category || undefined) as TaskCategory | undefined, search: search || undefined })
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [category, search]);

  const remainingSlots = useMemo(
    () => (task: Task) => (task.max_completions ? Math.max(task.max_completions - task.completions_count, 0) : null),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Tâches journalières</h1>
        <p className="mt-1 text-sm text-text-secondary">Choisissez, réalisez, gagnez.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          leftIcon={<Search className="size-4" />}
          placeholder="Rechercher une tâche..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select options={CATEGORY_OPTIONS} value={category} onChange={(e) => setCategory(e.target.value)} className="sm:max-w-xs" />
      </div>

      {loading ? (
        <LoadingState />
      ) : tasks.length === 0 ? (
        <EmptyState title="Aucune tâche trouvée" description="Essayez une autre catégorie ou revenez plus tard." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const slots = remainingSlots(task);
            return (
              <Link key={task.id} to={`/tasks/${task.id}`}>
                <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <Badge tone={SOCIAL_CATEGORIES.includes(task.category) ? "oled" : "neutral"}>
                      {TASK_CATEGORY_LABELS[task.category]}
                    </Badge>
                    <Badge tone="primary">{TASK_DIFFICULTY_LABELS[task.difficulty]}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-text-primary">{task.title}</p>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-text-secondary">{task.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Clock className="size-3.5" />
                      {task.estimated_time ?? "—"}
                    </span>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(task.reward, settings.currencyLabel)}</span>
                  </div>
                  {slots !== null && (
                    <p className="mt-2 text-xs text-text-secondary">{slots} place{slots > 1 ? "s" : ""} restante{slots > 1 ? "s" : ""}</p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
