import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet as WalletIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatusBadge } from "@/components/ui/Badge";
import { TransactionRow } from "@/components/shared/TransactionRow";
import { getDeposits, getTransactions, getWallet, getWalletBalances, getWithdrawals } from "@/services/wallet";
import type { Deposit, EarningBucket, Transaction, Wallet, WalletBalance, WithdrawalRequest } from "@/types/domain";
import { EARNING_BUCKET_COLORS } from "@/types/domain";
import { cn } from "@/utils/cn";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { hasUsedDeposit, isAccountActivated } from "@/utils/activation";

export function WalletPage() {
  const { profile } = useAuth();
  const { settings } = useSettings();
  const t = useT();
  const tw = t.wallet;
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(initialTab && ["overview", "deposits", "withdrawals", "deductions"].includes(initialTab) ? initialTab : "overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getWallet(profile.id),
      getWalletBalances(profile.id),
      getTransactions(profile.id),
      getDeposits(profile.id),
      getWithdrawals(profile.id),
    ])
      .then(([w, wb, tx, d, wd]) => {
        setWallet(w);
        setBalances(wb);
        setTransactions(tx);
        setDeposits(d);
        setWithdrawals(wd);
      })
      .finally(() => setLoading(false));
  }, [profile]);

  const deductions = withdrawals.filter((w) => w.fee > 0 && w.status === "COMPLETED");
  // Le staff est exempté de l'activation (isAccountActivated bypass son rôle)
  // — inutile de lui proposer "Activer mon compte" alors qu'il n'en a pas
  // besoin, même s'il n'a lui-même jamais fait de dépôt.
  const needsActivation = !isAccountActivated(wallet, settings, profile?.role);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{tw.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{tw.subtitle}</p>
        </div>
        <div className="flex gap-2">
          {needsActivation && !hasUsedDeposit(deposits) && (
            <Link to="/wallet/deposit">
              <Button variant="success" icon={<ArrowDownToLine className="size-4" />}>{tw.activate}</Button>
            </Link>
          )}
          <Link to="/wallet/withdraw">
            <Button variant="info" icon={<ArrowUpFromLine className="size-4" />}>{tw.withdraw}</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={tw.availableBalance}
          value={formatCurrency(wallet?.available_balance ?? 0, settings.currencyLabel)}
          icon={WalletIcon}
          tone="primary"
          variant="filled"
        />
        <StatCard
          label={tw.totalWithdrawn}
          value={formatCurrency(wallet?.total_withdrawn ?? 0, settings.currencyLabel)}
          icon={ArrowDownToLine}
          tone="success"
          variant="filled"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label={tw.pending} value={formatCurrency(wallet?.pending_balance ?? 0, settings.currencyLabel)} />
        <StatCard label={tw.totalEarned} value={formatCurrency(wallet?.total_earned ?? 0, settings.currencyLabel)} icon={TrendingUp} />
      </div>

      <Card>
        <p className="text-sm font-semibold text-text-primary">{tw.byCategory}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{tw.byCategoryBody}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(t.enums.earningBucket) as EarningBucket[]).map((b) => (
            <div key={b} className={cn("rounded-md p-3", EARNING_BUCKET_COLORS[b])}>
              <p className="text-xs opacity-80">{t.enums.earningBucket[b]}</p>
              <p className="mt-1 text-sm font-semibold">
                {formatCurrency(balances.find((wb) => wb.bucket === b)?.available_balance ?? 0, settings.currencyLabel)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-4">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: tw.tabTransactions, count: transactions.length },
              { value: "deposits", label: tw.tabActivation, count: deposits.length },
              { value: "withdrawals", label: tw.tabWithdrawals, count: withdrawals.length },
              { value: "deductions", label: tw.tabDeductions, count: deductions.length },
            ]}
          />
        </div>
        <div className="p-5">
          {tab === "overview" &&
            (transactions.length === 0 ? (
              <EmptyState title={tw.noTransactions} />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)}
              </div>
            ))}

          {tab === "deposits" &&
            (deposits.length === 0 ? (
              needsActivation ? (
                <EmptyState title={tw.accountNotActivated} action={<Link to="/wallet/deposit"><Button size="sm">{tw.activate}</Button></Link>} />
              ) : (
                <EmptyState title={tw.noDeposit} description={tw.noDepositBody} />
              )
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
              <EmptyState title={tw.noWithdrawals} action={<Link to="/wallet/withdraw"><Button size="sm">{tw.requestWithdrawal}</Button></Link>} />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {withdrawals.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{w.method}</p>
                      <p className="text-xs text-text-secondary">{formatDateTime(w.created_at)} · {tw.net} {formatCurrency(w.net_amount, settings.currencyLabel)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={w.status} />
                      <span className="font-semibold text-text-primary">{formatCurrency(w.amount, settings.currencyLabel)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {tab === "deductions" &&
            (deductions.length === 0 ? (
              <EmptyState title={tw.noDeductions} description={tw.noDeductionsBody} />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {deductions.map((w) => (
                  <div key={w.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium text-text-primary">{tw.withdrawalFee} · {w.method}</p>
                      <p className="text-xs text-text-secondary">{formatDateTime(w.created_at)} · {tw.requested} {formatCurrency(w.amount, settings.currencyLabel)}</p>
                    </div>
                    <span className="font-semibold text-error">-{formatCurrency(w.fee, settings.currencyLabel)}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
