import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Copy, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createTask, deleteTask, generateQuizQuestions, listAllTasks, listQuizQuestions, replaceQuizQuestions, updateTask } from "@/services/admin";
import type { Task, TaskCategory, TaskDifficulty, TaskStatus } from "@/types/domain";
import { TASK_CATEGORY_LABELS } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/utils/format";
import { notify } from "@/utils/toast";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "PUBLISHED", label: "Publiée" },
  { value: "PAUSED", label: "En pause" },
  { value: "COMPLETED", label: "Terminée" },
  { value: "EXPIRED", label: "Expirée" },
];

// Les tâches journalières se limitent désormais à ces catégories : les
// réseaux sociaux (TikTok/YouTube, tâche vidéo), les publicités (Ads,
// même mécanique de vérification par temps d'engagement) et le quiz —
// voir AdminTasksPage.
const ADMIN_TASK_CATEGORIES: TaskCategory[] = ["QUIZ", "TIKTOK", "YOUTUBE", "ADS"];
const SOCIAL_CATEGORIES: TaskCategory[] = ["TIKTOK", "YOUTUBE"];
// TikTok/YouTube/Ads partagent la même mécanique : l'utilisateur reste sur
// la page (avec un lien optionnel) pendant auto_verify_seconds et est
// crédité automatiquement — par opposition au QUIZ, seule catégorie notée.
const ENGAGEMENT_CATEGORIES: TaskCategory[] = ["TIKTOK", "YOUTUBE", "ADS"];
const MAX_QUIZ_OPTIONS = 6;

const WATCH_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: "15", label: "15 secondes" },
  { value: "30", label: "30 secondes" },
  { value: "45", label: "45 secondes" },
  { value: "60", label: "1 minute" },
  { value: "90", label: "1 min 30" },
  { value: "120", label: "2 minutes" },
  { value: "180", label: "3 minutes" },
  { value: "300", label: "5 minutes" },
];
const DEFAULT_INSTRUCTIONS = "Watch and earn";

// "2026-08-24" -> minuit (UTC) du jour suivant, soit l'instant exact où la
// tâche datée du 24 doit cesser d'être affichée.
function endOfDayIso(dateOnly: string): string {
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

interface QuizDraftQuestion {
  question: string;
  options: string[];
  correct_option: number;
}

const EMPTY_QUESTION: QuizDraftQuestion = { question: "", options: ["", "", ""], correct_option: 0 };

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "QUIZ" as TaskCategory,
  reward: "",
  instructions: "",
  requirements: "",
  max_completions: "",
  single_submission_per_user: true,
  deadline: "",
  status: "DRAFT" as TaskStatus,
  video_url: "",
  auto_verify_seconds: "30",
};

export function AdminTasksPage() {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const socialOnly = searchParams.get("social") === "1";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [quizQuestions, setQuizQuestions] = useState<QuizDraftQuestion[]>([]);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState("5");
  const [genLoading, setGenLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Task | null>(null);

  async function load() {
    setLoading(true);
    setTasks(await listAllTasks());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visibleTasks = socialOnly ? tasks.filter((t) => SOCIAL_CATEGORIES.includes(t.category)) : tasks;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: socialOnly ? "TIKTOK" : "QUIZ" });
    setQuizQuestions(socialOnly ? [] : [{ ...EMPTY_QUESTION }]);
    setGenTopic("");
    setModalOpen(true);
  }

  async function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      reward: String(task.reward),
      instructions: task.instructions ?? "",
      requirements: task.requirements ?? "",
      max_completions: task.max_completions ? String(task.max_completions) : "",
      single_submission_per_user: task.single_submission_per_user,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      status: task.status,
      video_url: task.video_url ?? "",
      auto_verify_seconds: String(task.auto_verify_seconds),
    });
    setQuizQuestions(task.category === "QUIZ" ? await loadQuizDraft(task.id) : []);
    setGenTopic("");
    setModalOpen(true);
  }

  async function duplicate(task: Task) {
    setEditing(null);
    setForm({
      title: `${task.title} (copie)`,
      description: task.description,
      category: task.category,
      reward: String(task.reward),
      instructions: task.instructions ?? "",
      requirements: task.requirements ?? "",
      max_completions: task.max_completions ? String(task.max_completions) : "",
      single_submission_per_user: task.single_submission_per_user,
      deadline: "",
      status: "DRAFT",
      video_url: task.video_url ?? "",
      auto_verify_seconds: String(task.auto_verify_seconds),
    });
    setQuizQuestions(task.category === "QUIZ" ? await loadQuizDraft(task.id) : []);
    setGenTopic("");
    setModalOpen(true);
  }

  async function loadQuizDraft(taskId: string): Promise<QuizDraftQuestion[]> {
    const questions = await listQuizQuestions(taskId);
    return questions.map((q) => ({ question: q.question, options: q.options, correct_option: q.correct_option }));
  }

  function addQuestion() {
    setQuizQuestions([...quizQuestions, { ...EMPTY_QUESTION }]);
  }
  function removeQuestion(qi: number) {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== qi));
  }
  function updateQuestion(qi: number, patch: Partial<QuizDraftQuestion>) {
    setQuizQuestions(quizQuestions.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  }
  function addOption(qi: number) {
    updateQuestion(qi, { options: [...quizQuestions[qi].options, ""] });
  }
  function removeOption(qi: number, oi: number) {
    const q = quizQuestions[qi];
    const options = q.options.filter((_, i) => i !== oi);
    updateQuestion(qi, { options, correct_option: q.correct_option >= options.length ? 0 : q.correct_option });
  }
  function updateOption(qi: number, oi: number, value: string) {
    const q = quizQuestions[qi];
    updateQuestion(qi, { options: q.options.map((o, i) => (i === oi ? value : o)) });
  }

  async function handleGenerate() {
    if (!genTopic.trim()) {
      notify.error("Indiquez un sujet pour générer des questions");
      return;
    }
    setGenLoading(true);
    try {
      const generated = await generateQuizQuestions(genTopic.trim(), Number(genCount) || 5, 3);
      // Garde les questions déjà remplies à la main, jette juste le brouillon vide de départ.
      const kept = quizQuestions.filter((q) => q.question.trim() || q.options.some((o) => o.trim()));
      setQuizQuestions([...kept, ...generated]);
      notify.success(`${generated.length} questions générées — relisez-les avant d'enregistrer`);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Génération impossible");
    } finally {
      setGenLoading(false);
    }
  }

  function validateQuiz(): string | null {
    if (quizQuestions.length === 0) return "Ajoutez au moins une question au quiz";
    for (const q of quizQuestions) {
      if (!q.question.trim()) return "Chaque question doit avoir un texte";
      if (q.options.length < 2) return "Chaque question doit avoir au moins 2 options";
      if (q.options.some((o) => !o.trim())) return "Aucune option ne peut être vide";
    }
    return null;
  }

  async function onSave() {
    const isQuiz = form.category === "QUIZ";
    if (!form.title || !form.reward || (!isQuiz && !form.description)) {
      notify.error("Titre, description et récompense sont requis");
      return;
    }
    if (ENGAGEMENT_CATEGORIES.includes(form.category) && (!form.auto_verify_seconds || Number(form.auto_verify_seconds) <= 0)) {
      notify.error("La durée de vérification doit être supérieure à 0");
      return;
    }
    if (SOCIAL_CATEGORIES.includes(form.category) && !form.video_url.trim()) {
      notify.error("L'URL de la vidéo est obligatoire pour une tâche réseaux sociaux");
      return;
    }
    if (form.category === "QUIZ") {
      const quizError = validateQuiz();
      if (quizError) {
        notify.error(quizError);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: isQuiz ? form.title : form.description,
        category: form.category,
        reward: Number(form.reward),
        estimated_time: null,
        difficulty: "EASY" as TaskDifficulty,
        instructions: isQuiz ? null : ENGAGEMENT_CATEGORIES.includes(form.category) ? DEFAULT_INSTRUCTIONS : form.instructions || null,
        requirements: isQuiz ? null : form.requirements || null,
        max_completions: isQuiz ? null : form.max_completions ? Number(form.max_completions) : null,
        single_submission_per_user: form.single_submission_per_user,
        // La deadline marque la fin de la journée choisie : une tâche datée
        // lundi reste visible jusqu'à 00h mardi (début du jour suivant).
        deadline: isQuiz || !form.deadline ? null : endOfDayIso(form.deadline),
        status: form.status,
        video_url: ENGAGEMENT_CATEGORIES.includes(form.category) ? form.video_url || null : null,
        auto_verify_seconds: ENGAGEMENT_CATEGORIES.includes(form.category) ? Number(form.auto_verify_seconds) : 1,
      };
      const savedTask = editing ? await updateTask(editing.id, payload) : await createTask(payload);
      await replaceQuizQuestions(savedTask.id, form.category === "QUIZ" ? quizQuestions : []);
      notify.success(editing ? "Tâche mise à jour" : "Tâche créée");
      setModalOpen(false);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setSaving(true);
    try {
      await deleteTask(toDelete.id);
      notify.success("Tâche supprimée");
      setToDelete(null);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Task>[] = [
    { key: "title", header: "Tâche", render: (t) => <span className="font-medium text-text-primary">{t.title}</span> },
    { key: "category", header: "Catégorie", render: (t) => <Badge tone="neutral">{TASK_CATEGORY_LABELS[t.category]}</Badge> },
    { key: "reward", header: "Récompense", render: (t) => formatCurrency(t.reward, settings.currencyLabel) },
    { key: "completions", header: "Places", render: (t) => (t.max_completions ? `${t.completions_count}/${t.max_completions}` : "Illimité") },
    { key: "status", header: "Statut", render: (t) => <StatusBadge status={t.status} /> },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="rounded-full p-1.5 text-text-secondary hover:bg-surface-alt" aria-label="Modifier"><Pencil className="size-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); duplicate(t); }} className="rounded-full p-1.5 text-text-secondary hover:bg-surface-alt" aria-label="Dupliquer"><Copy className="size-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setToDelete(t); }} className="rounded-full p-1.5 text-error hover:bg-error-bg" aria-label="Supprimer"><Trash2 className="size-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{socialOnly ? "Réseaux sociaux" : "Tâches journalières"}</h1>
          <p className="mt-1 text-sm text-text-secondary">{visibleTasks.length} tâches au total</p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={openCreate}>Nouvelle tâche</Button>
      </div>

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={visibleTasks} rowKey={(t) => t.id} onRowClick={openEdit} emptyMessage="Aucune tâche" />}</Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier la tâche" : "Nouvelle tâche"} size="lg" footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={onSave} loading={saving}>Enregistrer</Button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          {form.category !== "QUIZ" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Description</label>
              <textarea className="min-h-20 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          )}
          {form.category === "QUIZ" ? (
            <Select label="Catégorie" options={ADMIN_TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] }))} value={form.category} onChange={(e) => {
              const category = e.target.value as TaskCategory;
              setForm({ ...form, category });
            }} />
          ) : (
            <Select label="Catégorie" options={ADMIN_TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] }))} value={form.category} onChange={(e) => {
              const category = e.target.value as TaskCategory;
              setForm({ ...form, category });
              if (category === "QUIZ" && quizQuestions.length === 0) setQuizQuestions([{ ...EMPTY_QUESTION }]);
            }} />
          )}
          <Input label={`Récompense (${settings.currencyLabel})`} type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} />
          {form.category !== "QUIZ" && (
            <>
              {!ENGAGEMENT_CATEGORIES.includes(form.category) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-primary">Instructions</label>
                  <textarea className="min-h-16 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Conditions</label>
                <textarea className="min-h-16 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Places max (vide = illimité)" type="number" value={form.max_completions} onChange={(e) => setForm({ ...form, max_completions: e.target.value })} />
                <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </>
          )}

          {ENGAGEMENT_CATEGORIES.includes(form.category) && (
            <>
              <Input
                label={form.category === "ADS" ? "Lien à visiter (optionnel)" : "URL vidéo"}
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder={form.category === "ADS" ? "https://exemple.com/offre" : "https://www.tiktok.com/@compte/video/1234567890"}
                hint={form.category === "ADS" ? "Lien de la publicité — s'ouvre dans un nouvel onglet" : "Lien TikTok — la vidéo s'affiche directement dans l'application"}
              />
              <Select
                label="Temps de visionnage"
                options={WATCH_TIME_OPTIONS}
                value={form.auto_verify_seconds}
                onChange={(e) => setForm({ ...form, auto_verify_seconds: e.target.value })}
                hint="Temps que l'utilisateur doit rester sur la page pour être crédité automatiquement — aucune preuve à envoyer"
              />
            </>
          )}

          {form.category === "QUIZ" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3">
                <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary"><Sparkles className="size-4" /> Générer avec l'IA</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder="Sujet (ex: culture générale africaine)" className="flex-1" />
                  <Input type="number" min={1} max={15} value={genCount} onChange={(e) => setGenCount(e.target.value)} className="sm:w-20" hint="Nb." />
                  <Button variant="outline" loading={genLoading} onClick={handleGenerate}>Générer</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Questions du quiz</label>
                <Button variant="outline" size="sm" onClick={addQuestion}>+ Ajouter une question</Button>
              </div>
              {quizQuestions.length === 0 && <p className="text-sm text-text-secondary">Aucune question — ajoutez-en au moins une.</p>}
              {quizQuestions.map((q, qi) => (
                <div key={qi} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input value={q.question} onChange={(e) => updateQuestion(qi, { question: e.target.value })} placeholder={`Question ${qi + 1}`} className="flex-1" />
                    <button onClick={() => removeQuestion(qi)} className="rounded-full p-1.5 text-error hover:bg-error-bg" aria-label="Supprimer la question"><Trash2 className="size-4" /></button>
                  </div>
                  <p className="text-xs text-text-secondary">Cochez la bonne réponse</p>
                  <div className="flex flex-col gap-1.5">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          checked={q.correct_option === oi}
                          onChange={() => updateQuestion(qi, { correct_option: oi })}
                          className="size-4 accent-primary"
                        />
                        <Input value={opt} onChange={(e) => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="flex-1" />
                        {q.options.length > 2 && (
                          <button onClick={() => removeOption(qi, oi)} className="rounded-full p-1 text-text-secondary hover:bg-error-bg hover:text-error" aria-label="Retirer l'option"><Trash2 className="size-3.5" /></button>
                        )}
                      </div>
                    ))}
                    {q.options.length < MAX_QUIZ_OPTIONS && (
                      <button onClick={() => addOption(qi)} className="self-start text-xs font-medium text-primary hover:underline">+ Ajouter une option</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Select label="Statut" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={form.single_submission_per_user} onChange={(e) => setForm({ ...form, single_submission_per_user: e.target.checked })} />
            Une seule participation par utilisateur
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette tâche ?"
        description={`"${toDelete?.title}" sera définitivement supprimée.`}
        danger
        loading={saving}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
