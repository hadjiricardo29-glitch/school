import { StatusBadge } from "@/components/ui/Badge";
import { useSettings } from "@/contexts/SettingsContext";
import type { Transaction } from "@/types/domain";
import { formatCurrency, formatDateTime } from "@/utils/format";

const TYPE_LABELS: Record<string, string> = {
  TASK_REWARD: "Récompense tâche",
  REFERRAL_COMMISSION: "Commission de parrainage",
  DEPOSIT: "Frais d'activation",
  WITHDRAWAL: "Retrait",
  BONUS: "Bonus",
  REFUND: "Remboursement",
  ADJUSTMENT: "Ajustement",
};

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const { settings } = useSettings();
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-text-primary">{transaction.description || TYPE_LABELS[transaction.type]}</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {formatDateTime(transaction.created_at)} · {transaction.reference}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <StatusBadge status={transaction.status} />
        <span className={transaction.amount >= 0 ? "font-semibold text-success" : "font-semibold text-error"}>
          {transaction.amount >= 0 ? "+" : ""}
          {formatCurrency(transaction.amount, settings.currencyLabel)}
        </span>
      </div>
    </div>
  );
}
