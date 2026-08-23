import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, UploadCloud, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createCourse, deleteCourse, listAllCourses, updateCourse, uploadCourseThumbnail } from "@/services/admin";
import type { Course, CourseStatus } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency } from "@/utils/format";
import { notify } from "@/utils/toast";

const STATUS_OPTIONS: { value: CourseStatus; label: string }[] = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "PUBLISHED", label: "Publiée" },
  { value: "ARCHIVED", label: "Archivée" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  price: "",
  content_url: "",
  thumbnail_url: "",
  duration_minutes: "",
  status: "DRAFT" as CourseStatus,
};

export function AdminCoursesPage() {
  const { settings } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Course | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setCourses(await listAllCourses());
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

  function openEdit(course: Course) {
    setEditing(course);
    setForm({
      title: course.title,
      description: course.description,
      category: course.category ?? "",
      price: String(course.price),
      content_url: course.content_url ?? "",
      thumbnail_url: course.thumbnail_url ?? "",
      duration_minutes: course.duration_minutes ? String(course.duration_minutes) : "",
      status: course.status,
    });
    setModalOpen(true);
  }

  async function onSave() {
    if (!form.title || !form.description) {
      notify.error("Titre et description sont requis");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category || null,
        price: form.price ? Number(form.price) : 0,
        content_url: form.content_url || null,
        thumbnail_url: form.thumbnail_url || null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        status: form.status,
      };
      if (editing) {
        await updateCourse(editing.id, payload);
        notify.success("Formation mise à jour");
      } else {
        await createCourse(payload);
        notify.success("Formation créée");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function onThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCourseThumbnail(file);
      setForm((f) => ({ ...f, thumbnail_url: url }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Envoi de l'image impossible");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete() {
    if (!toDelete) return;
    setSaving(true);
    try {
      await deleteCourse(toDelete.id);
      notify.success("Formation supprimée");
      setToDelete(null);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Suppression impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Course>[] = [
    { key: "title", header: "Formation", render: (c) => <span className="font-medium text-text-primary">{c.title}</span> },
    { key: "category", header: "Catégorie", render: (c) => <Badge tone="neutral">{c.category ?? "—"}</Badge> },
    { key: "price", header: "Prix", render: (c) => (c.price > 0 ? formatCurrency(c.price, settings.currencyLabel) : "Gratuit") },
    { key: "status", header: "Statut", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      render: (c) => (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="rounded-full p-1.5 text-text-secondary hover:bg-surface-alt" aria-label="Modifier"><Pencil className="size-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setToDelete(c); }} className="rounded-full p-1.5 text-error hover:bg-error-bg" aria-label="Supprimer"><Trash2 className="size-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Formations</h1>
          <p className="mt-1 text-sm text-text-secondary">{courses.length} formations au total</p>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={openCreate}>Nouvelle formation</Button>
      </div>

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={courses} rowKey={(c) => c.id} onRowClick={openEdit} emptyMessage="Aucune formation" />}</Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Modifier la formation" : "Nouvelle formation"} size="lg" footer={
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
            <Input label="Catégorie" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Trading, Marketing..." />
            <Input label={`Prix (${settings.currencyLabel}) — 0 = gratuit`} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Durée (minutes)" type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            <Select label="Statut" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CourseStatus })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Image</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onThumbnailChange} />
            {form.thumbnail_url ? (
              <div className="relative w-fit">
                <img src={form.thumbnail_url} alt="" className="aspect-[9/16] w-24 rounded-md bg-purple/5 object-contain" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, thumbnail_url: "" }))}
                  className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-error text-white shadow-sm"
                  aria-label="Retirer l'image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                loading={uploading}
                icon={<UploadCloud className="size-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choisir une image
              </Button>
            )}
            <p className="text-xs text-text-secondary">Format vertical recommandé (9:16, type TikTok) — affichée sur la carte et la page de la formation</p>
          </div>
          <Input
            label="Lien du produit"
            value={form.content_url}
            onChange={(e) => setForm({ ...form, content_url: e.target.value })}
            placeholder="https://..."
            hint='Le bouton "Obtenir" redirige vers cette URL'
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer cette formation ?"
        description={`"${toDelete?.title}" sera définitivement supprimée.`}
        danger
        loading={saving}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
