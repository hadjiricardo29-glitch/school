import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, GraduationCap, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { listPublishedCourses } from "@/services/courses";
import type { Course } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/utils/format";

export function CoursesPage() {
  const { settings } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    listPublishedCourses()
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  const free = useMemo(() => courses.filter((c) => c.price <= 0), [courses]);
  const paid = useMemo(() => courses.filter((c) => c.price > 0), [courses]);
  const shown = tab === "free" ? free : tab === "paid" ? paid : courses;

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Formations</h1>
        <p className="mt-1 text-sm text-text-secondary">Développez vos compétences avec nos formations gratuites et payantes.</p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Toutes", count: courses.length },
          { value: "free", label: "Gratuites", count: free.length },
          { value: "paid", label: "Payantes", count: paid.length },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState title="Aucune formation disponible" description="Revenez bientôt, de nouvelles formations arrivent régulièrement." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((course) => (
            <Link key={course.id} to={`/courses/${course.id}`}>
              <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <Badge tone="neutral">{course.category ?? "Formation"}</Badge>
                  {course.price > 0 ? (
                    <Badge tone="warning">
                      <Lock className="size-3" /> Payante
                    </Badge>
                  ) : (
                    <Badge tone="success">Gratuite</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-full bg-purple/10 text-purple">
                    <GraduationCap className="size-4" />
                  </span>
                  <p className="text-sm font-semibold text-text-primary">{course.title}</p>
                </div>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-text-secondary">{course.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <Clock className="size-3.5" />
                    {course.duration_minutes ? `${course.duration_minutes} min` : "—"}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {course.price > 0 ? formatCurrency(course.price, settings.currencyLabel) : "Gratuit"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
