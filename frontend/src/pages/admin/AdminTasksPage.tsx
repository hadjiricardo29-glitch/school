import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Copy, Sparkles, UploadCloud, X, Layers, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createTask, deleteTask, generateQuizQuestions, listAllTasks, listQuizQuestions, replaceQuizQuestions, updateTask, uploadTaskImage } from "@/services/admin";
import type { Task, TaskCategory, TaskStatus } from "@/types/domain";
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

// Tâches d'entraînement IA : annotation (LABELING) ou évaluation de réponses
// (AI_EVALUATION) — remplace TikTok/YouTube/Ads côté création. Les deux
// utilisent le même mécanisme que QUIZ (questions à choix unique, correction
// automatique) : pas de vidéo, pas de révision manuelle, juste des questions
// que l'utilisateur coche pour annoter/évaluer un contenu.
const ADMIN_TASK_CATEGORIES: TaskCategory[] = ["LABELING", "AI_EVALUATION"];
// Chaque question a toujours exactement 3 options (dont une bonne réponse) —
// pas de +/- pour rester simple.
const OPTIONS_PER_QUESTION = 3;

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

interface BulkResult {
  topic: string;
  ok: boolean;
  error?: string;
}

const EMPTY_BULK_FORM = {
  category: "LABELING" as TaskCategory,
  reward: "",
  questionsPerTask: "3",
  status: "DRAFT" as TaskStatus,
  topics: "",
};

const EMPTY_QUESTION: QuizDraftQuestion = { question: "", options: Array(OPTIONS_PER_QUESTION).fill(""), correct_option: 0 };

const EMPTY_FORM = {
  title: "",
  description: "",
  image_url: "",
  category: "LABELING" as TaskCategory,
  reward: "",
  max_completions: "",
  single_submission_per_user: true,
  deadline: "",
  status: "DRAFT" as TaskStatus,
};

export function AdminTasksPage() {
  const { settings } = useSettings();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [quizQuestions, setQuizQuestions] = useState<QuizDraftQuestion[]>([{ ...EMPTY_QUESTION }]);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState("5");
  const [genLoading, setGenLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(EMPTY_BULK_FORM);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);

  async function load() {
    setLoading(true);
    setTasks(await listAllTasks());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setQuizQuestions([{ ...EMPTY_QUESTION }]);
    setGenTopic("");
    setModalOpen(true);
  }

  async function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description === task.title ? "" : task.description,
      image_url: task.image_url ?? "",
      category: task.category,
      reward: String(task.reward),
      max_completions: task.max_completions ? String(task.max_completions) : "",
      single_submission_per_user: task.single_submission_per_user,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      status: task.status,
    });
    setQuizQuestions(await loadQuizDraft(task.id));
    setGenTopic("");
    setModalOpen(true);
  }

  async function duplicate(task: Task) {
    setEditing(null);
    setForm({
      title: `${task.title} (copie)`,
      description: task.description === task.title ? "" : task.description,
      image_url: task.image_url ?? "",
      category: task.category,
      reward: String(task.reward),
      max_completions: task.max_completions ? String(task.max_completions) : "",
      single_submission_per_user: task.single_submission_per_user,
      deadline: "",
      status: "DRAFT",
    });
    setQuizQuestions(await loadQuizDraft(task.id));
    setGenTopic("");
    setModalOpen(true);
  }

  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTaskImage(file);
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Envoi de l'image impossible");
    } finally {
      setUploading(false);
    }
  }

  async function loadQuizDraft(taskId: string): Promise<QuizDraftQuestion[]> {
    const questions = await listQuizQuestions(taskId);
    if (questions.length === 0) return [{ ...EMPTY_QUESTION }];
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
    if (quizQuestions.length === 0) return "Ajoutez au moins une question";
    for (const q of quizQuestions) {
      if (!q.question.trim()) return "Chaque question doit avoir un texte";
      if (q.options.length !== OPTIONS_PER_QUESTION) return `Chaque question doit avoir exactement ${OPTIONS_PER_QUESTION} options`;
      if (q.options.some((o) => !o.trim())) return "Aucune option ne peut être vide";
    }
    return null;
  }

  async function onSave() {
    if (!form.title || !form.reward) {
      notify.error("Titre et récompense sont requis");
      return;
    }
    const quizError = validateQuiz();
    if (quizError) {
      notify.error(quizError);
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Task> = {
        title: form.title,
        // Contexte affiché à l'utilisateur pour l'aider à répondre — à défaut,
        // retombe sur le titre plutôt que de laisser vide.
        description: form.description.trim() || form.title,
        image_url: form.image_url || null,
        category: form.category,
        reward: Number(form.reward),
        estimated_time: null,
        instructions: null,
        requirements: null,
        max_completions: form.max_completions ? Number(form.max_completions) : null,
        single_submission_per_user: form.single_submission_per_user,
        // La deadline marque la fin de la journée choisie : une tâche datée
        // lundi reste visible jusqu'à 00h mardi (début du jour suivant).
        deadline: form.deadline ? endOfDayIso(form.deadline) : null,
        status: form.status,
        video_url: null,
        auto_verify_seconds: 1,
      };
      const savedTask = editing ? await updateTask(editing.id, payload) : await createTask(payload);
      await replaceQuizQuestions(savedTask.id, quizQuestions);
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

  function openBulk() {
    setBulkForm({ ...EMPTY_BULK_FORM });
    setBulkResults([]);
    setBulkOpen(true);
  }

  // Une tâche par ligne : génère ses questions via l'IA puis la crée et lui
  // attache ses questions — séquentiel (pas en parallèle) pour ne pas
  // envoyer N requêtes simultanées à l'API Gemini.
  async function runBulkGenerate() {
    const topics = bulkForm.topics.split("\n").map((t) => t.trim()).filter(Boolean);
    if (topics.length === 0) {
      notify.error("Indiquez au moins un sujet (un par ligne)");
      return;
    }
    if (!bulkForm.reward) {
      notify.error("La récompense est requise");
      return;
    }
    setBulkRunning(true);
    setBulkResults(topics.map((topic) => ({ topic, ok: false, error: undefined })));
    let successCount = 0;
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      try {
        const questions = await generateQuizQuestions(topic, Number(bulkForm.questionsPerTask) || 3, OPTIONS_PER_QUESTION);
        if (questions.length === 0) throw new Error("Aucune question générée");
        const savedTask = await createTask({
          title: topic,
          description: topic,
          image_url: null,
          category: bulkForm.category,
          reward: Number(bulkForm.reward),
          estimated_time: null,
          instructions: null,
          requirements: null,
          max_completions: null,
          single_submission_per_user: true,
          deadline: null,
          status: bulkForm.status,
          video_url: null,
          auto_verify_seconds: 1,
        });
        await replaceQuizQuestions(savedTask.id, questions);
        successCount++;
        setBulkResults((prev) => prev.map((r, idx) => (idx === i ? { topic, ok: true } : r)));
      } catch (err) {
        setBulkResults((prev) => prev.map((r, idx) => (idx === i ? { topic, ok: false, error: err instanceof Error ? err.message : "Échec" } : r)));
      }
    }
    setBulkRunning(false);
    notify[successCount === topics.length ? "success" : "error"](`${successCount}/${topics.length} tâches créées`);
    await load();
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
          <h1 className="text-xl font-semibold text-text-primary">Tâches journalières</h1>
          <p className="mt-1 text-sm text-text-secondary">{tasks.length} tâches au total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Layers className="size-4" />} onClick={openBulk}>Génération en masse</Button>
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>Nouvelle tâche</Button>
        </div>
      </div>

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={tasks} rowKey={(t) => t.id} onRowClick={openEdit} emptyMessage="Aucune tâche" />}</Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier la tâche" : "Nouvelle tâche"} size="lg" footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={onSave} loading={saving}>Enregistrer</Button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Description / contexte (affiché à l'utilisateur pour l'aider à répondre)</label>
            <textarea
              className="min-h-16 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex : Voici un avis client, lisez-le puis répondez aux questions."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Image de contexte (optionnelle)</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageChange} />
            {form.image_url ? (
              <div className="relative w-fit">
                <img src={form.image_url} alt="" className="h-24 w-24 rounded-md border border-border object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-error text-white shadow-sm"
                  aria-label="Retirer l'image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" loading={uploading} icon={<UploadCloud className="size-4" />} onClick={() => fileInputRef.current?.click()}>
                Choisir une image
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type de tâche"
              options={ADMIN_TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] }))}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
            />
            <Input label={`Récompense (${settings.currencyLabel})`} type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Places max (vide = illimité)" type="number" value={form.max_completions} onChange={(e) => setForm({ ...form, max_completions: e.target.value })} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary"><Sparkles className="size-4" /> Générer avec l'IA</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder="Sujet (ex: étiqueter le sentiment d'un avis client)" className="flex-1" />
                <Input type="number" min={1} max={15} value={genCount} onChange={(e) => setGenCount(e.target.value)} className="sm:w-20" hint="Nb." />
                <Button variant="outline" loading={genLoading} onClick={handleGenerate}>Générer</Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Questions</label>
              <Button variant="outline" size="sm" onClick={addQuestion}>+ Ajouter une question</Button>
            </div>
            {quizQuestions.length === 0 && <p className="text-sm text-text-secondary">Aucune question — ajoutez-en au moins une.</p>}
            {quizQuestions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input value={q.question} onChange={(e) => updateQuestion(qi, { question: e.target.value })} placeholder={`Question ${qi + 1}`} className="flex-1" />
                  <button onClick={() => removeQuestion(qi)} className="rounded-full p-1.5 text-error hover:bg-error-bg" aria-label="Supprimer la question"><Trash2 className="size-4" /></button>
                </div>
                <p className="text-xs text-text-secondary">3 options — cochez la bonne réponse</p>
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
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Select label="Statut" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={form.single_submission_per_user} onChange={(e) => setForm({ ...form, single_submission_per_user: e.target.checked })} />
            Une seule participation par utilisateur
          </label>
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => !bulkRunning && setBulkOpen(false)} title="Génération en masse" size="lg" footer={
        <>
          <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkRunning}>Fermer</Button>
          <Button onClick={runBulkGenerate} loading={bulkRunning}>Générer et créer</Button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">Un sujet par ligne = une tâche créée avec ses questions générées par l'IA (mêmes réglages pour toutes).</p>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type de tâche"
              options={ADMIN_TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] }))}
              value={bulkForm.category}
              onChange={(e) => setBulkForm({ ...bulkForm, category: e.target.value as TaskCategory })}
              disabled={bulkRunning}
            />
            <Input label={`Récompense (${settings.currencyLabel})`} type="number" value={bulkForm.reward} onChange={(e) => setBulkForm({ ...bulkForm, reward: e.target.value })} disabled={bulkRunning} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Questions par tâche" type="number" min={1} max={15} value={bulkForm.questionsPerTask} onChange={(e) => setBulkForm({ ...bulkForm, questionsPerTask: e.target.value })} disabled={bulkRunning} />
            <Select label="Statut" options={STATUS_OPTIONS} value={bulkForm.status} onChange={(e) => setBulkForm({ ...bulkForm, status: e.target.value as TaskStatus })} disabled={bulkRunning} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Sujets (un par ligne)</label>
            <textarea
              className="min-h-32 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={bulkForm.topics}
              onChange={(e) => setBulkForm({ ...bulkForm, topics: e.target.value })}
              placeholder={"Sentiment d'un avis client\nClassification d'une image de produit\nDétection de spam dans un message"}
              disabled={bulkRunning}
            />
          </div>
          {bulkResults.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
              {bulkResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {r.ok ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : r.error ? (
                    <XCircle className="size-4 shrink-0 text-error" />
                  ) : (
                    <span className="size-4 shrink-0 animate-pulse rounded-full bg-border" />
                  )}
                  <span className="flex-1 truncate text-text-primary">{r.topic}</span>
                  {r.error && <span className="text-xs text-error">{r.error}</span>}
                </div>
              ))}
            </div>
          )}
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
