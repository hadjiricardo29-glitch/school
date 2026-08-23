import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { listSupportTickets, replySupportTicket } from "@/services/admin";
import type { SupportTicket, SupportTicketStatus } from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { notify } from "@/utils/toast";

const TABS = [
  { value: "OPEN", label: "En attente" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "RESOLVED", label: "Résolus" },
];

const STATUS_LABELS: Record<string, string> = {
  OPEN: "En attente",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
};

const STATUS_TONES: Record<string, "warning" | "primary" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  RESOLVED: "success",
};

export function AdminSupportPage() {
  const [tab, setTab] = useState("OPEN");
  const [rows, setRows] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [nextStatus, setNextStatus] = useState<SupportTicketStatus>("RESOLVED");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setRows(await listSupportTickets(tab));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function openTicket(t: SupportTicket) {
    setSelected(t);
    setReply(t.admin_reply ?? "");
    setNextStatus(t.status === "OPEN" ? "IN_PROGRESS" : "RESOLVED");
  }

  async function onReply() {
    if (!selected || !reply.trim()) return;
    setSaving(true);
    try {
      await replySupportTicket(selected.id, reply.trim(), nextStatus);
      notify.success("Réponse envoyée");
      setSelected(null);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<SupportTicket>[] = [
    { key: "user", header: "Utilisateur", render: (t) => <span className="font-medium text-text-primary">@{t.user?.username ?? "—"}</span> },
    { key: "subject", header: "Sujet", render: (t) => <span className="line-clamp-1">{t.subject}</span> },
    { key: "date", header: "Date", render: (t) => formatDateTime(t.created_at) },
    { key: "status", header: "Statut", render: (t) => <Badge tone={STATUS_TONES[t.status]}>{STATUS_LABELS[t.status]}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Support</h1>
        <p className="mt-1 text-sm text-text-secondary">Messages envoyés par les utilisateurs.</p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(t) => t.id} onRowClick={openTicket} emptyMessage="Aucun message" />}</Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.subject ?? ""}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>Fermer</Button>
            <Button onClick={onReply} loading={saving}>Envoyer la réponse</Button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-medium text-text-secondary">@{selected.user?.username} · {formatDateTime(selected.created_at)}</p>
              <p className="mt-2 text-sm text-text-primary">{selected.message}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-primary">Réponse</label>
              <textarea
                className="min-h-28 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Votre réponse à l'utilisateur..."
              />
            </div>
            <div className="flex gap-2">
              {(["IN_PROGRESS", "RESOLVED"] as SupportTicketStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNextStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${nextStatus === s ? "border-primary bg-primary/10 text-primary" : "border-border text-text-secondary"}`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
