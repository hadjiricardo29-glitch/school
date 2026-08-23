import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { approveDeposit, listDeposits, rejectDeposit } from "@/services/admin";
import type { Deposit } from "@/types/domain";
import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { notify } from "@/utils/toast";

const TABS = [
  { value: "PENDING", label: "En attente" },
  { value: "COMPLETED", label: "Complétés" },
  { value: "FAILED", label: "Rejetés" },
];

export function AdminDepositsPage() {
  const { settings } = useSettings();
  const [tab, setTab] = useState("PENDING");
  const [rows, setRows] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setRows(await listDeposits(tab));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleApprove(id: string) {
    setSavingId(id);
    try {
      await approveDeposit(id);
      notify.success("Frais d'activation approuvés — compte activé");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSavingId(null);
    }
  }

  async function handleReject(id: string) {
    setSavingId(id);
    try {
      await rejectDeposit(id);
      notify.success("Frais d'activation rejetés");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSavingId(null);
    }
  }

  const columns: Column<Deposit>[] = [
    { key: "user", header: "Utilisateur", render: (d) => <span className="font-medium text-text-primary">@{d.user?.username ?? "—"}</span> },
    { key: "amount", header: "Montant", render: (d) => formatCurrency(d.amount, settings.currencyLabel) },
    { key: "method", header: "Méthode", render: (d) => d.method },
    { key: "reference", header: "Référence", render: (d) => d.reference },
    { key: "date", header: "Date", render: (d) => formatDateTime(d.created_at) },
    { key: "status", header: "Statut", render: (d) => <StatusBadge status={d.status} /> },
    {
      key: "actions",
      header: "",
      render: (d) =>
        d.status === "PENDING" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="danger" loading={savingId === d.id} onClick={(e) => { e.stopPropagation(); handleReject(d.id); }}>Rejeter</Button>
            <Button size="sm" loading={savingId === d.id} onClick={(e) => { e.stopPropagation(); handleApprove(d.id); }}>Approuver</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Frais d'activation</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {settings.paymentProvider === "mock"
            ? "Les frais en mode démo (Mock) sont crédités instantanément."
            : "Frais traités via SASpay — confirmés automatiquement par webhook."}
        </p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(d) => d.id} emptyMessage="Aucun frais d'activation" />}</Card>
    </div>
  );
}
