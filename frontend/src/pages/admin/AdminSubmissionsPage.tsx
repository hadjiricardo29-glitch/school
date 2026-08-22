import { useEffect, useState } from "react";
import { Check, X, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Table, type Column } from "@/components/ui/Table";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { approveSubmission, listSubmissions, rejectSubmission } from "@/services/admin";
import type { TaskSubmission } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { notify } from "@/utils/toast";

const TABS = [
  { value: "SUBMITTED", label: "En attente" },
  { value: "APPROVED", label: "Approuvées" },
  { value: "REJECTED", label: "Rejetées" },
];

export function AdminSubmissionsPage() {
  const { settings } = useSettings();
  const [tab, setTab] = useState("SUBMITTED");
  const [rows, setRows] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TaskSubmission | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setRows(await listSubmissions(tab));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleApprove(id: string) {
    setSaving(true);
    try {
      await approveSubmission(id, note || undefined);
      notify.success("Soumission approuvée, récompense créditée");
      setDetail(null);
      setNote("");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(id: string) {
    setSaving(true);
    try {
      await rejectSubmission(id, note || undefined);
      notify.success("Soumission rejetée");
      setDetail(null);
      setNote("");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<TaskSubmission>[] = [
    { key: "user", header: "Utilisateur", render: (s) => <span className="font-medium text-text-primary">@{s.user?.username ?? "—"}</span> },
    { key: "task", header: "Tâche", render: (s) => s.task?.title ?? "—" },
    { key: "reward", header: "Récompense", render: (s) => (s.task ? formatCurrency(s.task.reward, settings.currencyLabel) : "—") },
    { key: "date", header: "Soumise le", render: (s) => (s.submitted_at ? formatDateTime(s.submitted_at) : "—") },
    { key: "status", header: "Statut", render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Soumissions de tâches</h1>
        <p className="mt-1 text-sm text-text-secondary">Validez les preuves envoyées par les utilisateurs.</p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(s) => s.id} onRowClick={(s) => { setDetail(s); setNote(""); }} emptyMessage="Aucune soumission" />}</Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.task?.title ?? "Soumission"} size="lg">
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-text-secondary">Utilisateur</p><p className="font-medium text-text-primary">@{detail.user?.username}</p></div>
              <div><p className="text-text-secondary">Récompense</p><p className="font-medium text-text-primary">{detail.task ? formatCurrency(detail.task.reward, settings.currencyLabel) : "—"}</p></div>
              <div><p className="text-text-secondary">Démarrée</p><p className="font-medium text-text-primary">{formatDateTime(detail.started_at)}</p></div>
              <div><p className="text-text-secondary">Statut</p><Badge tone="neutral">{detail.status}</Badge></div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-text-primary">Preuve fournie</p>
              {detail.proof_text && <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">{detail.proof_text}</p>}
              {detail.proof_url && (
                <a href={detail.proof_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline">
                  {detail.proof_url} <ExternalLink className="size-3.5" />
                </a>
              )}
              {detail.proof_file_path && <p className="mt-2 text-sm text-text-secondary">Fichier joint : {detail.proof_file_path}</p>}
              {!detail.proof_text && !detail.proof_url && !detail.proof_file_path && <p className="mt-2 text-sm text-text-secondary">Aucune preuve fournie</p>}
            </div>

            {detail.status === "SUBMITTED" || detail.status === "UNDER_REVIEW" ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <Input label="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motif de rejet ou commentaire..." />
                <div className="flex gap-2">
                  <Button variant="danger" fullWidth icon={<X className="size-4" />} loading={saving} onClick={() => handleReject(detail.id)}>Rejeter</Button>
                  <Button fullWidth icon={<Check className="size-4" />} loading={saving} onClick={() => handleApprove(detail.id)}>Approuver</Button>
                </div>
              </div>
            ) : (
              detail.review_note && <p className="border-t border-border pt-4 text-sm text-text-secondary">Note : {detail.review_note}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
