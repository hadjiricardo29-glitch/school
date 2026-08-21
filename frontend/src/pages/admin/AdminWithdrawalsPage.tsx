import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { approveWithdrawal, listWithdrawals, rejectWithdrawal } from "@/services/admin";
import type { WithdrawalRequest } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { notify } from "@/utils/toast";

const TABS = [
  { value: "PENDING", label: "En attente" },
  { value: "COMPLETED", label: "Complétés" },
  { value: "REJECTED", label: "Rejetés" },
];

export function AdminWithdrawalsPage() {
  const { settings } = useSettings();
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<WithdrawalRequest | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setRows(await listWithdrawals(tab));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleApprove(id: string) {
    setSaving(true);
    try {
      await approveWithdrawal(id);
      notify.success("Retrait approuvé et solde déduit");
      setDetail(null);
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
      await rejectWithdrawal(id, reason || undefined);
      notify.success("Retrait rejeté, fonds restitués");
      setDetail(null);
      setReason("");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<WithdrawalRequest>[] = [
    { key: "user", header: "Utilisateur", render: (w) => <span className="font-medium text-text-primary">@{w.user?.username ?? "—"}</span> },
    { key: "method", header: "Méthode", render: (w) => w.method },
    { key: "amount", header: "Montant", render: (w) => formatCurrency(w.amount, settings.currencyLabel) },
    { key: "net", header: "Net", render: (w) => formatCurrency(w.net_amount, settings.currencyLabel) },
    { key: "date", header: "Demandé le", render: (w) => formatDateTime(w.created_at) },
    { key: "status", header: "Statut", render: (w) => <StatusBadge status={w.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Retraits</h1>
        <p className="mt-1 text-sm text-text-secondary">Toute approbation déduit le solde de manière atomique.</p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(w) => w.id} onRowClick={(w) => { setDetail(w); setReason(""); }} emptyMessage="Aucun retrait" />}</Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Détails du retrait">
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-text-secondary">Utilisateur</p><p className="font-medium text-text-primary">@{detail.user?.username}</p></div>
              <div><p className="text-text-secondary">Méthode</p><p className="font-medium text-text-primary">{detail.method}</p></div>
              <div><p className="text-text-secondary">Montant demandé</p><p className="font-medium text-text-primary">{formatCurrency(detail.amount, settings.currencyLabel)}</p></div>
              <div><p className="text-text-secondary">Frais</p><p className="font-medium text-text-primary">{formatCurrency(detail.fee, settings.currencyLabel)}</p></div>
              <div><p className="text-text-secondary">Net à verser</p><p className="font-medium text-text-primary">{formatCurrency(detail.net_amount, settings.currencyLabel)}</p></div>
              <div><p className="text-text-secondary">Destination</p><p className="font-medium text-text-primary">{JSON.stringify(detail.destination)}</p></div>
            </div>

            {detail.status === "PENDING" || detail.status === "PROCESSING" ? (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <Input label="Motif de rejet (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="danger" fullWidth loading={saving} onClick={() => handleReject(detail.id)}>Rejeter</Button>
                  <Button fullWidth loading={saving} onClick={() => handleApprove(detail.id)}>Approuver</Button>
                </div>
              </div>
            ) : (
              detail.rejection_reason && <p className="border-t border-border pt-4 text-sm text-text-secondary">Motif : {detail.rejection_reason}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
