import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { getTransactions } from "@/services/wallet";
import type { Transaction, TransactionType } from "@/types/domain";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous les types" },
  { value: "TASK_REWARD", label: "Récompenses" },
  { value: "REFERRAL_COMMISSION", label: "Commissions" },
  { value: "DEPOSIT", label: "Activation" },
  { value: "WITHDRAWAL", label: "Retraits" },
  { value: "BONUS", label: "Bonus" },
  { value: "REFUND", label: "Remboursements" },
  { value: "ADJUSTMENT", label: "Ajustements" },
];

export function TransactionsPage() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getTransactions(profile.id, 200).then(setTransactions).finally(() => setLoading(false));
  }, [profile]);

  const filtered = type ? transactions.filter((t) => t.type === (type as TransactionType)) : transactions;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Transactions</h1>
          <p className="mt-1 text-sm text-text-secondary">Historique complet de vos mouvements financiers.</p>
        </div>
        <Select options={TYPE_OPTIONS} value={type} onChange={(e) => setType(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title="Aucune transaction" />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {filtered.map((t) => (
              <TransactionRow key={t.id} transaction={t} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
