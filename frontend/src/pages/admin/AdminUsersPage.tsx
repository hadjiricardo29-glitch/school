import { useEffect, useState } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Table, type Column } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState } from "@/components/ui/LoadingState";
import { changeUserRole, getLoginHistory, listUsers, setUserStatus } from "@/services/admin";
import { supabase } from "@/services/supabase";
import type { LoginEvent, Profile, UserRole } from "@/types/domain";
import { ROLE_LABELS } from "@/types/domain";
import { formatDate, formatDateTimeSeconds } from "@/utils/format";
import { notify } from "@/utils/toast";

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous les rôles" },
  ...(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] })),
];

const PAGE_SIZE = 15;

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Profile[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [confirmingSuspend, setConfirmingSuspend] = useState(false);
  const [dupIpCount, setDupIpCount] = useState(0);
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);

  // Combien d'AUTRES comptes se sont connectés depuis la même IP — signal
  // classique de multi-comptes/usurpation, à vérifier avant de trancher.
  useEffect(() => {
    if (!selected?.last_login_ip) {
      setDupIpCount(0);
      return;
    }
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("last_login_ip", selected.last_login_ip)
      .neq("id", selected.id)
      .then(({ count }) => setDupIpCount(count ?? 0));
  }, [selected?.id, selected?.last_login_ip]);

  // Historique complet, pas que la dernière IP — utile pour repérer un
  // changement brutal de localisation ou une IP récurrente sur ce compte.
  useEffect(() => {
    if (!selected?.id) {
      setLoginHistory([]);
      return;
    }
    getLoginHistory(selected.id).then(setLoginHistory).catch(() => setLoginHistory([]));
  }, [selected?.id]);

  async function load() {
    setLoading(true);
    const res = await listUsers({ search, role: (role || undefined) as UserRole | undefined, page, pageSize: PAGE_SIZE });
    setRows(res.rows);
    setCount(res.count);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role, page]);

  async function toggleStatus(user: Profile, reason?: string) {
    setSaving(true);
    try {
      await setUserStatus(user.id, user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE", reason);
      notify.success(user.status === "ACTIVE" ? "Utilisateur suspendu — notifié du motif" : "Utilisateur activé");
      await load();
      setSelected(null);
      setConfirmingSuspend(false);
      setSuspendReason("");
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  }

  async function updateRole(user: Profile, newRole: UserRole) {
    setSaving(true);
    try {
      await changeUserRole(user.id, newRole);
      notify.success("Rôle mis à jour");
      await load();
      setSelected(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Profile>[] = [
    {
      key: "user",
      header: "Utilisateur",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Avatar firstName={u.first_name} lastName={u.last_name} username={u.username} size="sm" />
          <span className="font-medium text-text-primary">@{u.username}</span>
        </div>
      ),
    },
    { key: "role", header: "Rôle", render: (u) => <Badge tone="primary">{ROLE_LABELS[u.role]}</Badge> },
    { key: "status", header: "Statut", render: (u) => <Badge tone={u.status === "ACTIVE" ? "success" : "error"}>{u.status}</Badge> },
    { key: "country", header: "Pays", render: (u) => u.country ?? "—" },
    { key: "created_at", header: "Inscrit le", render: (u) => formatDate(u.created_at) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Utilisateurs</h1>
        <p className="mt-1 text-sm text-text-secondary">{count} utilisateurs au total</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input leftIcon={<Search className="size-4" />} placeholder="Rechercher un nom d'utilisateur..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="sm:max-w-xs" />
        <Select options={ROLE_OPTIONS} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="sm:max-w-xs" />
      </div>

      <Card>
        {loading ? <LoadingState /> : <Table columns={columns} data={rows} rowKey={(u) => u.id} onRowClick={setSelected} emptyMessage="Aucun utilisateur trouvé" />}
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(count / PAGE_SIZE))} onChange={setPage} />

      <Modal open={!!selected} onClose={() => { setSelected(null); setConfirmingSuspend(false); setSuspendReason(""); }} title={selected ? `@${selected.username}` : ""}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-text-secondary">Nom complet</p><p className="font-medium text-text-primary">{selected.first_name} {selected.last_name}</p></div>
              <div><p className="text-text-secondary">Pays</p><p className="font-medium text-text-primary">{selected.country ?? "—"}</p></div>
              <div><p className="text-text-secondary">Téléphone</p><p className="font-medium text-text-primary">{selected.phone_code} {selected.phone}</p></div>
              <div><p className="text-text-secondary">Code parrainage</p><p className="font-medium text-text-primary">{selected.referral_code}</p></div>
              <div>
                <p className="text-text-secondary">Dernière connexion</p>
                <p className="font-medium text-text-primary">{selected.last_login_at ? formatDateTimeSeconds(selected.last_login_at) : "—"}</p>
              </div>
              <div>
                <p className="text-text-secondary">Dernière IP</p>
                <p className="flex items-center gap-1.5 font-medium text-text-primary">
                  {selected.last_login_ip ?? "—"}
                  {dupIpCount > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-warning-bg px-1.5 py-0.5 text-[11px] font-medium text-warning">
                      <AlertTriangle className="size-3" /> partagée par {dupIpCount} autre{dupIpCount > 1 ? "s" : ""} compte{dupIpCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {loginHistory.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-text-primary">Historique des connexions</p>
                <div className="mt-2 flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
                  {loginHistory.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="text-text-secondary">{formatDateTimeSeconds(ev.created_at)}</span>
                      <span className="font-medium text-text-primary">{ev.ip_address ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selected.status === "SUSPENDED" && selected.suspension_reason && (
              <div className="rounded-md border border-error/30 bg-error-bg p-3 text-sm text-text-primary">
                <p className="font-medium">Motif de la suspension</p>
                <p className="mt-0.5 text-text-secondary">{selected.suspension_reason}</p>
              </div>
            )}

            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium text-text-primary">Changer le rôle</label>
              <Select
                className="mt-2"
                options={(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                value={selected.role}
                onChange={(e) => updateRole(selected, e.target.value as UserRole)}
                disabled={saving}
              />
            </div>

            {selected.status === "ACTIVE" && confirmingSuspend ? (
              <div className="flex flex-col gap-2 rounded-md border border-error/30 p-3">
                <label className="text-sm font-medium text-text-primary">Motif (envoyé à l'utilisateur)</label>
                <textarea
                  className="min-h-16 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ex : activité suspecte détectée sur ce compte, contactez le support pour vérifier votre identité."
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setConfirmingSuspend(false); setSuspendReason(""); }}>Annuler</Button>
                  <Button variant="danger" loading={saving} onClick={() => toggleStatus(selected, suspendReason.trim() || undefined)}>
                    Confirmer la suspension
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant={selected.status === "ACTIVE" ? "danger" : "primary"}
                loading={saving}
                onClick={() => (selected.status === "ACTIVE" ? setConfirmingSuspend(true) : toggleStatus(selected))}
              >
                {selected.status === "ACTIVE" ? "Suspendre le compte" : "Activer le compte"}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
