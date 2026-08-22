import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createTask, deleteTask, listAllTasks, updateTask } from "@/services/admin";
import type { Task, TaskCategory, TaskDifficulty, TaskStatus } from "@/types/domain";
import { TASK_CATEGORY_LABELS, TASK_DIFFICULTY_LABELS } from "@/types/domain";
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

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "OTHER" as TaskCategory,
  reward: "",
  estimated_time: "",
  difficulty: "EASY" as TaskDifficulty,
  instructions: "",
  requirements: "",
  max_completions: "",
  single_submission_per_user: true,
  deadline: "",
  status: "DRAFT" as TaskStatus,
  video_url: "",
};

export function AdminTasksPage() {
  const { settings } = useSettings();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
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

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      reward: String(task.reward),
      estimated_time: task.estimated_time ?? "",
      difficulty: task.difficulty,
      instructions: task.instructions ?? "",
      requirements: task.requirements ?? "",
      max_completions: task.max_completions ? String(task.max_completions) : "",
      single_submission_per_user: task.single_submission_per_user,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      status: task.status,
      video_url: task.video_url ?? "",
    });
    setModalOpen(true);
  }

  function duplicate(task: Task) {
    setEditing(null);
    setForm({
      title: `${task.title} (copie)`,
      description: task.description,
      category: task.category,
      reward: String(task.reward),
      estimated_time: task.estimated_time ?? "",
      difficulty: task.difficulty,
      instructions: task.instructions ?? "",
      requirements: task.requirements ?? "",
      max_completions: task.max_completions ? String(task.max_completions) : "",
      single_submission_per_user: task.single_submission_per_user,
      deadline: "",
      status: "DRAFT",
      video_url: task.video_url ?? "",
    });
    setModalOpen(true);
  }

  async function onSave() {
    if (!form.title || !form.description || !form.reward) {
      notify.error("Titre, description et récompense sont requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        reward: Number(form.reward),
        estimated_time: form.estimated_time || null,
        difficulty: form.difficulty,
        instructions: form.instructions || null,
        requirements: form.requirements || null,
        max_completions: form.max_completions ? Number(form.max_completions) : null,
        single_submission_per_user: form.single_submission_per_user,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        status: form.status,
        video_url: form.video_url || null,
      };
      if (editing) {
        await updateTask(editing.id, payload);
        notify.success("Mission mise à jour");
      } else {
        await createTask(payload);
        notify.success("Mission créée");
      }
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
      notify.success("Mission supprimée");
      setToDelete(null);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Task>[] = [
    { key: "title", header: "Mission", render: (t) => <span className="font-medium text-text-primary">{t.title}</span> },
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
          <h1 className="text-xl font-semibold text-text-primary">Missions</h1>
          <p className="mt-1 text-sm text-text-secondary">{tasks.length} missions au total</p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={openCreate}>Nouvelle mission</Button>
      </div>

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={tasks} rowKey={(t) => t.id} onRowClick={openEdit} emptyMessage="Aucune mission" />}</Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier la mission" : "Nouvelle mission"} size="lg" footer={
        <>
          <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={onSave} loading={saving}>Enregistrer</Button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <Input label="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Description</label>
            <textarea className="min-h-20 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Catégorie" options={(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] }))} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })} />
            <Select label="Difficulté" options={(Object.keys(TASK_DIFFICULTY_LABELS) as TaskDifficulty[]).map((d) => ({ value: d, label: TASK_DIFFICULTY_LABELS[d] }))} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as TaskDifficulty })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={`Récompense (${settings.currencyLabel})`} type="number" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} />
            <Input label="Temps estimé" value={form.estimated_time} onChange={(e) => setForm({ ...form, estimated_time: e.target.value })} placeholder="15 min" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Instructions</label>
            <textarea className="min-h-16 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Conditions</label>
            <textarea className="min-h-16 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Places max (vide = illimité)" type="number" value={form.max_completions} onChange={(e) => setForm({ ...form, max_completions: e.target.value })} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <Input
            label="URL vidéo (optionnel)"
            value={form.video_url}
            onChange={(e) => setForm({ ...form, video_url: e.target.value })}
            placeholder="https://www.tiktok.com/@compte/video/1234567890"
            hint="Lien TikTok — la vidéo s'affiche directement dans l'application"
          />
          <Select label="Statut" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} />
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="size-4 accent-primary" checked={form.single_submission_per_user} onChange={(e) => setForm({ ...form, single_submission_per_user: e.target.checked })} />
            Une seule participation par utilisateur
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette mission ?"
        description={`"${toDelete?.title}" sera définitivement supprimée.`}
        danger
        loading={saving}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
