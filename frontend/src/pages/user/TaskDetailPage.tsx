import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, Users, Calendar, ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { getTask, startTask, submitTaskProof, uploadTaskProofFile, getMySubmissions } from "@/services/tasks";
import { getWallet } from "@/services/wallet";
import type { Task, TaskSubmission, Wallet } from "@/types/domain";
import { TASK_CATEGORY_LABELS, TASK_DIFFICULTY_LABELS } from "@/types/domain";
import { formatCurrency, formatDate } from "@/utils/format";
import { notify } from "@/utils/toast";
import { isAccountActivated } from "@/utils/activation";
import { ActivationBanner } from "@/components/shared/ActivationBanner";
import { extractTiktokVideoId, tiktokEmbedUrl } from "@/utils/video";

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [task, setTask] = useState<Task | null>(null);
  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [proofText, setProofText] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!id || !profile) return;
    setLoading(true);
    const [t, mine, w] = await Promise.all([getTask(id), getMySubmissions(profile.id), getWallet(profile.id)]);
    setTask(t);
    setSubmission(mine.find((s) => s.task_id === id) ?? null);
    setWallet(w);
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
      notify.success("Mission démarrée ! Complétez-la puis soumettez votre preuve.");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Impossible de démarrer cette mission");
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmitProof() {
    if (!submission || !profile) return;
    if (!proofText && !proofUrl && !proofFile) {
      notify.error("Ajoutez au moins une preuve (texte, lien ou fichier)");
      return;
    }
    setSubmitting(true);
    try {
      let filePath: string | undefined;
      if (proofFile) {
        filePath = await uploadTaskProofFile(profile.id, submission.id, proofFile);
      }
      await submitTaskProof(submission.id, { proofText, proofUrl, proofFilePath: filePath });
      notify.success("Preuve envoyée ! Elle sera examinée par notre équipe.");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Chargement de la mission..." />;
  if (!task) return <Alert tone="error">Mission introuvable.</Alert>;

  const slotsLeft = task.max_completions ? Math.max(task.max_completions - task.completions_count, 0) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> Retour
      </button>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{TASK_CATEGORY_LABELS[task.category]}</Badge>
          <Badge tone="primary">{TASK_DIFFICULTY_LABELS[task.difficulty]}</Badge>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-text-primary">{task.title}</h1>
        <p className="mt-3 text-2xl font-semibold text-primary">{formatCurrency(task.reward, settings.currencyLabel)}</p>

        <div className="mt-4 flex flex-wrap gap-5 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5"><Clock className="size-4" /> {task.estimated_time ?? "Non précisé"}</span>
          {slotsLeft !== null && <span className="flex items-center gap-1.5"><Users className="size-4" /> {slotsLeft} places restantes</span>}
          {task.deadline && <span className="flex items-center gap-1.5"><Calendar className="size-4" /> avant le {formatDate(task.deadline)}</span>}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Description</h2>
            <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{task.description}</p>
          </div>
          {task.instructions && (
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Instructions</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{task.instructions}</p>
            </div>
          )}
          {task.requirements && (
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Conditions</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm text-text-secondary">{task.requirements}</p>
            </div>
          )}
          {task.video_url && (
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Vidéo</h2>
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
                    Ouvrir la vidéo <ExternalLink className="size-3.5" />
                  </a>
                );
              })()}
            </div>
          )}
        </div>

        <div className="mt-6 border-t border-border pt-6">
          {!submission && !isAccountActivated(wallet, settings, profile?.role) && <ActivationBanner />}

          {!submission && isAccountActivated(wallet, settings, profile?.role) && (
            <Button fullWidth size="lg" loading={starting} onClick={handleStart} disabled={slotsLeft === 0}>
              {slotsLeft === 0 ? "Plus de places disponibles" : "START TASK"}
            </Button>
          )}

          {submission?.status === "STARTED" && (
            <div className="flex flex-col gap-3">
              <Alert tone="info">Mission démarrée. Envoyez votre preuve de réalisation ci-dessous.</Alert>
              <Input label="Lien (URL)" placeholder="https://..." value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Description / preuve texte</label>
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Décrivez comment vous avez complété la mission..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Capture d'écran / fichier (optionnel)</label>
                <input
                  type="file"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  className="text-sm text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
                />
              </div>
              <Button fullWidth loading={submitting} onClick={handleSubmitProof}>
                Soumettre ma preuve
              </Button>
            </div>
          )}

          {submission && submission.status !== "STARTED" && (
            <Alert tone={submission.status === "APPROVED" ? "success" : submission.status === "REJECTED" ? "error" : "info"}>
              Statut de votre soumission : <strong>{submission.status.replace(/_/g, " ")}</strong>
              {submission.review_note && <p className="mt-1">Note : {submission.review_note}</p>}
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
}
