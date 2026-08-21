import { useEffect, useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { listFraudFlags, resolveFraudFlag } from "@/services/admin";
import type { FraudFlag, FraudSeverity } from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { notify } from "@/utils/toast";

const TABS = [
  { value: "OPEN", label: "Ouverts" },
  { value: "RESOLVED", label: "Résolus" },
  { value: "DISMISSED", label: "Ignorés" },
];

const SEVERITY_TONE: Record<FraudSeverity, "neutral" | "warning" | "error"> = {
  LOW: "neutral",
  MEDIUM: "warning",
  HIGH: "warning",
  CRITICAL: "error",
};

export function AdminFraudPage() {
  const [tab, setTab] = useState("OPEN");
  const [rows, setRows] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setRows(await listFraudFlags(tab));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleResolve(id: string, status: "RESOLVED" | "DISMISSED") {
    setSavingId(id);
    try {
      await resolveFraudFlag(id, status);
      notify.success(status === "RESOLVED" ? "Signalement résolu" : "Signalement ignoré");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSavingId(null);
    }
  }

  const columns: Column<FraudFlag>[] = [
    { key: "user", header: "Utilisateur", render: (f) => <span className="font-medium text-text-primary">@{f.user?.username ?? "—"}</span> },
    { key: "type", header: "Type", render: (f) => f.type },
    { key: "severity", header: "Sévérité", render: (f) => <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge> },
    { key: "description", header: "Description", render: (f) => <span className="line-clamp-1">{f.description ?? "—"}</span> },
    { key: "date", header: "Date", render: (f) => formatDateTime(f.created_at) },
    {
      key: "actions",
      header: "",
      render: (f) =>
        f.status === "OPEN" ? (
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" loading={savingId === f.id} onClick={() => handleResolve(f.id, "DISMISSED")}>Ignorer</Button>
            <Button size="sm" loading={savingId === f.id} onClick={() => handleResolve(f.id, "RESOLVED")}>Résoudre</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Anti-fraude</h1>
        <p className="mt-1 text-sm text-text-secondary">Signalements automatiques et manuels à examiner.</p>
      </div>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(f) => f.id} emptyMessage="Aucun signalement" />}</Card>
    </div>
  );
}
