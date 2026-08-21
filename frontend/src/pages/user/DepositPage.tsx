import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { useSettings } from "@/contexts/SettingsContext";
import { createDepositRequest } from "@/services/wallet";
import { notify } from "@/utils/toast";
import { formatCurrency } from "@/utils/format";

const METHODS = [
  { value: "mobile_money", label: "Mobile Money" },
  { value: "card", label: "Carte bancaire" },
  { value: "bank_transfer", label: "Virement bancaire" },
];

export function DepositPage() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Montant invalide");
      return;
    }
    setLoading(true);
    try {
      await createDepositRequest({ amount: value, method, provider: "mock" });
      notify.success(`Dépôt démo de ${formatCurrency(value, settings.currencyLabel)} crédité sur votre solde.`);
      navigate("/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dépôt impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="size-4" /> Retour
      </button>

      <Card>
        <h1 className="text-lg font-semibold text-text-primary">Effectuer un dépôt</h1>
        <div className="mt-4">
          <Alert tone="warning">
            Environnement de démonstration — aucun paiement réel n'est effectué. Le montant est crédité instantanément à
            titre de test ("Demo payment").
          </Alert>
        </div>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          {error && <Alert tone="error">{error}</Alert>}
          <Input
            label={`Montant (${settings.currencyLabel})`}
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
          />
          <Select label="Méthode" options={METHODS} value={method} onChange={(e) => setMethod(e.target.value)} />
          <Button type="submit" fullWidth loading={loading}>
            Déposer (démo)
          </Button>
        </form>
      </Card>
    </div>
  );
}
