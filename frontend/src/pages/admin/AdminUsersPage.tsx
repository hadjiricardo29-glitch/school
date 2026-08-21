import { useEffect, useState } from "react";
import { Search } from "lucide-react";
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
import { changeUserRole, listUsers, setUserStatus } from "@/services/admin";
import type { Profile, UserRole } from "@/types/domain";
import { ROLE_LABELS } from "@/types/domain";
import { formatDate } from "@/utils/format";
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

  async function toggleStatus(user: Profile) {
    setSaving(true);
    try {
      await setUserStatus(user.id, user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      notify.success(user.status === "ACTIVE" ? "Utilisateur suspendu" : "Utilisateur activé");
      await load();
      setSelected(null);
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `@${selected.username}` : ""}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-text-secondary">Nom complet</p><p className="font-medium text-text-primary">{selected.first_name} {selected.last_name}</p></div>
              <div><p className="text-text-secondary">Pays</p><p className="font-medium text-text-primary">{selected.country ?? "—"}</p></div>
              <div><p className="text-text-secondary">Téléphone</p><p className="font-medium text-text-primary">{selected.phone_code} {selected.phone}</p></div>
              <div><p className="text-text-secondary">Code parrainage</p><p className="font-medium text-text-primary">{selected.referral_code}</p></div>
            </div>

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

            <Button
              variant={selected.status === "ACTIVE" ? "danger" : "primary"}
              loading={saving}
              onClick={() => toggleStatus(selected)}
            >
              {selected.status === "ACTIVE" ? "Suspendre le compte" : "Activer le compte"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
