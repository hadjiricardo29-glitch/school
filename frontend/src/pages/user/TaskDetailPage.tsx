import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Clock, Users, Calendar, ArrowLeft, ExternalLink, Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { getTask, startTask, recordWatchHeartbeat, getMySubmissions } from "@/services/tasks";
import { getWallet } from "@/services/wallet";
import type { Task, TaskSubmission, Wallet } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";
import { notify } from "@/utils/toast";
import { isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { extractTiktokVideoId, tiktokEmbedUrl } from "@/utils/video";

const HEARTBEAT_INTERVAL_MS = 4000;

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const t = useT();
  const [task, setTask] = useState<Task | null>(null);
  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [watched, setWatched] = useState(0);
  const reloadingRef = useRef(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    const task = await getTask(id);
    setTask(task);
    // Visible sans compte — on ne charge la soumission/le solde que si
    // quelqu'un est connecté, pour laisser les visiteurs anonymes voir la
    // tâche avant de s'inscrire (au lieu d'être renvoyés vers /login).
    if (profile) {
      const [mine, w] = await Promise.all([getMySubmissions(profile.id), getWallet(profile.id)]);
      const mySubmission = mine.find((s) => s.task_id === id) ?? null;
      setSubmission(mySubmission);
      setWatched(mySubmission?.watched_seconds ?? 0);
      setWallet(w);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, profile]);

  async function handleStart() {
    if (!id || !profile) return;
    setStarting(true);
    try {
      const s = await startTask(id, profile.id);
      setSubmission(s);
      setWatched(0);
      notify.success(t.taskDetail.startedSuccess);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t.taskDetail.startError);
    } finally {
      setStarting(false);
    }
  }

  // Vérification automatique : tant que la tâche est STARTED, envoie un
  // heartbeat authentifié toutes les 4s (en pause si l'onglet n'est pas
  // visible) — le serveur borne l'incrément au temps réellement écoulé,
  // donc spammer ou rejouer l'appel ne fait pas avancer le compteur plus
  // vite que le temps réel (voir record_watch_heartbeat côté DB).
  useEffect(() => {
    if (!submission || submission.status !== "STARTED") return;
    reloadingRef.current = false;
    let cancelled = false;

    async function ping() {
      if (document.visibilityState !== "visible" || reloadingRef.current) return;
      try {
        const result = await recordWatchHeartbeat(submission!.id);
        if (cancelled) return;
        setWatched(result.watched_seconds);
        if (result.completed && !reloadingRef.current) {
          reloadingRef.current = true;
          notify.success(`+${formatCurrency(task?.reward ?? 0, settings.currencyLabel)}`);
          await load();
        }
      } catch {
        // silencieux — un heartbeat manqué se rattrape au suivant
      }
    }

    ping();
    const intervalId = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id, submission?.status]);

  if (loading) return <LoadingState label={t.taskDetail.loading} />;
  if (!task) return <Alert tone="error">{t.taskDetail.notFound}</Alert>;

  const slotsLeft = task.max_completions ? Math.max(task.max_completions - task.completions_count, 0) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> {t.taskDetail.back}
      </button>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{t.enums.taskCategory[task.category]}</Badge>
          <Badge tone="primary">{t.enums.taskDifficulty[task.difficulty]}</Badge>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-text-primary">{task.title}</h1>
        <p className="mt-3 text-2xl font-semibold text-primary">{formatCurrency(task.reward, settings.currencyLabel)}</p>

        <div className="mt-4 flex flex-wrap gap-5 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><Clock className="size-4" /> {task.estimated_time ?? t.taskDetail.notSpecified}</span>
          <span className="flex items-center gap-1.5"><Timer className="size-4" /> {task.auto_verify_seconds}s {t.taskDetail.toBeCredited}</span>
          {slotsLeft !== null && <span className="flex items-center gap-1.5"><Users className="size-4" /> {slotsLeft} {t.taskDetail.spotsLeft}</span>}
          {task.deadline && <span className="flex items-center gap-1.5"><Calendar className="size-4" /> {t.taskDetail.before} {formatDate(task.deadline)}</span>}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">{t.taskDetail.description}</h2>
            <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{task.description}</p>
          </div>
          {task.instructions && (
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{t.taskDetail.instructions}</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{task.instructions}</p>
            </div>
          )}
          {task.requirements && (
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{t.taskDetail.requirements}</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{task.requirements}</p>
            </div>
          )}
          {task.video_url && (
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{t.taskDetail.video}</h2>
              {(() => {
                const videoId = extractTiktokVideoId(task.video_url!);
                return videoId ? (
                  <div className="mx-auto mt-2 aspect-[9/16] w-full max-w-xs overflow-hidden rounded-md border border-border">
                    <iframe
                      src={tiktokEmbedUrl(videoId)}
                      allow="encrypted-media; fullscreen"
                      className="size-full"
                      title={task.title}
                    />
                  </div>
                ) : (
                  <a
                    href={task.video_url!}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    {t.taskDetail.openVideo} <ExternalLink className="size-3.5" />
                  </a>
                );
              })()}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-6">
          {!profile && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-text-secondary">{t.taskDetail.loginPrompt}</p>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Link to="/register" className="flex-1">
                  <Button fullWidth>{t.taskDetail.createAccount}</Button>
                </Link>
                <Link to="/login" state={{ from: location }} className="flex-1">
                  <Button fullWidth variant="outline">{t.taskDetail.login}</Button>
                </Link>
              </div>
            </div>
          )}

          {profile && !submission && !isAccountActivated(wallet, settings, profile?.role) && <ActivationBanner />}

          {profile && !submission && isAccountActivated(wallet, settings, profile?.role) && (
            <Button fullWidth size="lg" loading={starting} onClick={handleStart} disabled={slotsLeft === 0}>
              {slotsLeft === 0 ? t.taskDetail.noMoreSlots : t.taskDetail.startTask}
            </Button>
          )}

          {submission?.status === "STARTED" && (
            <div className="flex flex-col gap-3">
              <Alert tone="info">
                {t.taskDetail.startedInfo.replace("{video}", task.video_url ? t.taskDetail.startedInfoVideo : "")}
              </Alert>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(100, (watched / task.auto_verify_seconds) * 100)}%` }}
                />
              </div>
              <p className="text-center text-sm text-text-secondary">
                {Math.min(watched, task.auto_verify_seconds)} / {task.auto_verify_seconds}s
              </p>
            </div>
          )}

          {submission && submission.status !== "STARTED" && (
            <Alert tone={submission.status === "APPROVED" ? "success" : submission.status === "REJECTED" ? "error" : "info"}>
              {t.taskDetail.submissionStatus} <strong>{submission.status.replace(/_/g, " ")}</strong>
              {submission.review_note && <p className="mt-1">{t.taskDetail.note} {submission.review_note}</p>}
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
}
