import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, ExternalLink, GraduationCap, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getCourse, getMyEnrollments, purchaseCourse } from "@/services/courses";
import { getWallet } from "@/services/wallet";
import type { Course, CourseEnrollment, Wallet } from "@/types/domain";
import { formatCurrency } from "@/utils/format";
import { notify } from "@/utils/toast";

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  async function load() {
    if (!id || !profile) return;
    setLoading(true);
    const [c, enrolls, w] = await Promise.all([getCourse(id), getMyEnrollments(profile.id), getWallet(profile.id)]);
    setCourse(c);
    setEnrollments(enrolls);
    setWallet(w);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile]);

  if (loading) return <LoadingState label="Chargement de la formation..." />;
  if (!course) return <Alert tone="error">Formation introuvable.</Alert>;

  const isFree = course.price <= 0;
  const owned = isFree || enrollments.some((e) => e.course_id === course.id);

  async function handlePurchase() {
    if (!course) return;
    setPurchasing(true);
    try {
      await purchaseCourse(course.id);
      notify.success("Formation débloquée !");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Achat impossible");
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> Retour
      </button>

      <Card padded={false} className="overflow-hidden">
        {course.thumbnail_url ? (
          <img src={course.thumbnail_url} alt={course.title} className="h-48 w-full object-cover sm:h-64" />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-purple/10 sm:h-64">
            <GraduationCap className="size-16 text-purple" />
          </div>
        )}
        <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{course.category ?? "Formation"}</Badge>
          {isFree ? <Badge tone="success">Gratuite</Badge> : <Badge tone="warning"><Lock className="size-3" /> Payante</Badge>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-full bg-purple/10 text-purple">
            <GraduationCap className="size-5" />
          </span>
          <h1 className="text-xl font-semibold text-text-primary">{course.title}</h1>
        </div>
        {!isFree && (
          <p className="mt-3 text-2xl font-semibold text-primary">{formatCurrency(course.price, settings.currencyLabel)}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-5 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Clock className="size-4" /> {course.duration_minutes ? `${course.duration_minutes} min` : "Non précisé"}
          </span>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-text-primary">Description</h2>
          <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{course.description}</p>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          {owned ? (
            course.content_url ? (
              <a href={course.content_url} target="_blank" rel="noreferrer" className="block">
                <Button size="lg" fullWidth icon={<ExternalLink className="size-4" />}>
                  Obtenir
                </Button>
              </a>
            ) : (
              <Alert tone="info">Le contenu de cette formation sera bientôt disponible.</Alert>
            )
          ) : (
            <div className="flex flex-col gap-3">
              <Alert tone="warning">
                Cette formation est payante. Solde disponible : {formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)}
              </Alert>
              <Button
                size="lg"
                loading={purchasing}
                disabled={(wallet?.available_balance ?? 0) < course.price}
                onClick={handlePurchase}
              >
                Débloquer pour {formatCurrency(course.price, settings.currencyLabel)}
              </Button>
            </div>
          )}
        </div>
        </div>
      </Card>
    </div>
  );
}
