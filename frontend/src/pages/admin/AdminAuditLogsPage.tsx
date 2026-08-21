import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import { listAuditLog } from "@/services/admin";
import type { AuditLogEntry } from "@/types/domain";
import { formatDateTime } from "@/utils/format";

export function AdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAuditLog(200).then(setRows).finally(() => setLoading(false));
  }, []);

  const columns: Column<AuditLogEntry>[] = [
    { key: "date", header: "Date", render: (a) => formatDateTime(a.created_at) },
    { key: "actor", header: "Acteur", render: (a) => (a.actor ? `@${a.actor.username}` : "Système") },
    { key: "action", header: "Action", render: (a) => <Badge tone="primary">{a.action.replace(/_/g, " ")}</Badge> },
    { key: "entity", header: "Entité", render: (a) => `${a.entity_type ?? "—"}${a.entity_id ? ` #${a.entity_id.slice(0, 8)}` : ""}` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Journal d'audit</h1>
        <p className="mt-1 text-sm text-text-secondary">Historique de toutes les actions administratives sensibles.</p>
      </div>

      <Card>{loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(a) => a.id} emptyMessage="Aucune entrée" />}</Card>
    </div>
  );
}
