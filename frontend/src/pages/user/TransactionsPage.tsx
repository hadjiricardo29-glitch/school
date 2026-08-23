import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n/useT";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { getTransactions } from "@/services/wallet";
import type { Transaction, TransactionType } from "@/types/domain";

export function TransactionsPage() {
  const { profile } = useAuth();
  const t = useT().transactions;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  const TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "", label: t.allTypes },
    ...(Object.keys(t.types) as TransactionType[]).map((v) => ({ value: v, label: t.types[v] })),
  ];

  useEffect(() => {
    if (!profile) return;
    getTransactions(profile.id, 200).then(setTransactions).finally(() => setLoading(false));
  }, [profile]);

  const filtered = type ? transactions.filter((tx) => tx.type === (type as TransactionType)) : transactions;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t.subtitle}</p>
        </div>
        <Select options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title={t.none} />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filtered.map((tx) => (
              <TransactionRow key={tx.id} transaction={tx} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
