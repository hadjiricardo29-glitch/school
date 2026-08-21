import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/Badge";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { getDeposits, getTransactions, getWallet, getWithdrawals } from "@/services/wallet";
import type { Deposit, Transaction, Wallet, WithdrawalRequest } from "@/types/domain";
import { formatCurrency, formatDateTime } from "@/utils/format";

export function WalletPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([getWallet(profile.id), getTransactions(profile.id), getDeposits(profile.id), getWithdrawals(profile.id)])
      .then(([w, tx, d, wd]) => {
        setWallet(w);
        setTransactions(tx);
        setDeposits(d);
        setWithdrawals(wd);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Portefeuille</h1>
          <p className="mt-1 text-sm text-text-secondary">Gérez votre solde, vos dépôts et vos retraits.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/wallet/deposit">
            <Button variant="outline" icon={<ArrowDownToLine className="size-4" />}>Déposer</Button>
          </Link>
          <Link to="/wallet/withdraw">
            <Button icon={<ArrowUpFromLine className="size-4" />}>Retirer</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Solde disponible" value={formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)} icon={WalletIcon} tone="primary" />
        <StatCard label="En attente" value={formatCurrency(wallet?.pending_balance ?? 0, settings.currencyLabel)} />
        <StatCard label="Total gagné" value={formatCurrency(wallet?.total_earned ?? 0, settings.currencyLabel)} icon={TrendingUp} />
        <StatCard label="Total retiré" value={formatCurrency(wallet?.total_withdrawn ?? 0, settings.currencyLabel)} icon={TrendingDown} />
      </div>

      <Card padded={false}>
        <div className="px-5 pt-4">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: "Transactions", count: transactions.length },
              { value: "deposits", label: "Dépôts", count: deposits.length },
              { value: "withdrawals", label: "Retraits", count: withdrawals.length },
            ]}
          />
        </div>
        <div className="p-5">
          {tab === "overview" &&
            (transactions.length === 0 ? (
              <EmptyState title="Aucune transaction pour le moment" />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {transactions.map((t) => <TransactionRow key={t.id} transaction={t} />)}
              </div>
            ))}

          {tab === "deposits" &&
            (deposits.length === 0 ? (
              <EmptyState title="Aucun dépôt" action={<Link to="/wallet/deposit"><Button size="sm">Faire un dépôt</Button></Link>} />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {deposits.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{d.method} · {d.reference}</p>
                      <p className="text-xs text-text-secondary">{formatDateTime(d.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={d.status} />
                      <span className="font-semibold text-text-primary">{formatCurrency(d.amount, settings.currencyLabel)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === "withdrawals" &&
            (withdrawals.length === 0 ? (
              <EmptyState title="Aucun retrait" action={<Link to="/wallet/withdraw"><Button size="sm">Demander un retrait</Button></Link>} />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{w.method}</p>
                      <p className="text-xs text-text-secondary">{formatDateTime(w.created_at)} · net {formatCurrency(w.net_amount, settings.currencyLabel)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={w.status} />
                      <span className="font-semibold text-text-primary">{formatCurrency(w.amount, settings.currencyLabel)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
