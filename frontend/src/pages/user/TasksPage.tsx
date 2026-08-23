import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { listPublishedTasks } from "@/services/tasks";
import type { Task, TaskCategory } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { formatCurrency } from "@/utils/format";

const SOCIAL_CATEGORIES: TaskCategory[] = ["TIKTOK", "YOUTUBE"];

export function TasksPage() {
  const { settings } = useSettings();
  const t = useT();
  const pathname = useLocation().pathname;
  const socialOnly = pathname === "/tasks/social";
  const quizOnly = pathname === "/tasks/quiz";
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");

  const CATEGORY_OPTIONS = useMemo(
    () => [
      { value: "", label: t.tasks.allCategories },
      ...(Object.keys(t.enums.taskCategory) as TaskCategory[]).map((c) => ({ value: c, label: t.enums.taskCategory[c] })),
    ],
    [t],
  );

  useEffect(() => {
    setLoading(true);
    listPublishedTasks({ category: (category || undefined) as TaskCategory | undefined, search: search || undefined })
      .then((all) => {
        if (socialOnly) return setTasks(all.filter((task) => SOCIAL_CATEGORIES.includes(task.category)));
        if (quizOnly) return setTasks(all.filter((task) => task.category === "QUIZ"));
        setTasks(all);
      })
      .finally(() => setLoading(false));
  }, [category, search, socialOnly, quizOnly]);

  const remainingSlots = useMemo(
    () => (task: Task) => (task.max_completions ? Math.max(task.max_completions - task.completions_count, 0) : null),
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {quizOnly ? t.tasks.quizTitle : socialOnly ? t.tasks.socialTitle : t.tasks.title}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {quizOnly ? t.tasks.quizSubtitle : socialOnly ? t.tasks.socialSubtitle : t.tasks.subtitle}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          leftIcon={<Search className="size-4" />}
          placeholder={t.tasks.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        {!socialOnly && !quizOnly && (
          <Select options={CATEGORY_OPTIONS} value={category} onChange={(e) => setCategory(e.target.value)} className="sm:max-w-xs" />
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : tasks.length === 0 ? (
        <EmptyState title={t.tasks.noneFound} description={t.tasks.noneFoundBody} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => {
            const slots = remainingSlots(task);
            return (
              <Link key={task.id} to={`/tasks/${task.id}`}>
                <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <Badge tone={SOCIAL_CATEGORIES.includes(task.category) ? "oled" : "neutral"}>
                      {t.enums.taskCategory[task.category]}
                    </Badge>
                    <Badge tone="primary">{t.enums.taskDifficulty[task.difficulty]}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-text-primary">{task.title}</p>
                  {task.category !== "QUIZ" && (
                    <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-text-secondary">{task.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
                    <span className="text-sm font-semibold text-primary">{formatCurrency(task.reward, settings.currencyLabel)}</span>
                  </div>
                  {slots !== null && (
                    <p className="mt-2 text-xs text-text-secondary">{slots} {slots > 1 ? t.tasks.slotsLeftPlural : t.tasks.slotsLeft}</p>
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
