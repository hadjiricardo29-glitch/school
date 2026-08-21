# Paiements

## Principe : jamais de fausse fonctionnalité

Tant qu'aucun fournisseur de paiement réel n'est configuré, **tous** les dépôts et retraits sont explicitement en mode démonstration. L'interface affiche toujours "Demo payment" sur la page de dépôt — aucune interface ne prétend qu'un paiement réel a eu lieu (brief section 45).

## Abstraction `PaymentProvider`

Définie dans `supabase/functions/_shared/payment-provider.ts` :

```ts
interface PaymentProvider {
  readonly name: string;
  createPayment(params: { amount: number; method: string; userId: string }): Promise<PaymentIntent>;
  verifyPayment(reference: string): Promise<PaymentIntent>;
  handleWebhook(payload: unknown, signature?: string | null): Promise<{ reference: string; status: PaymentIntent["status"] }>;
  refundPayment(reference: string): Promise<{ success: boolean }>;
}
```

Deux implémentations livrées :

- **`MockPaymentProvider`** — confirme instantanément le paiement (statut `COMPLETED` immédiat). Utilisée par défaut en développement.
- **`ManualPaymentProvider`** — crée le dépôt en `PENDING`, sans appel externe ; un `FINANCE_ADMIN` l'approuve manuellement depuis `/admin/deposits` après vérification (ex : preuve de virement bancaire).

## Séparation des responsabilités

```
Frontend (DepositPage)
   │  supabase.functions.invoke("payments/deposit", { amount, method, provider })
   ▼
Edge Function "payments"  ──▶  provider.createPayment(...)   (intégration fournisseur)
   │
   │  supabase.rpc("create_deposit_request", ...)
   ▼
Fonction Postgres create_deposit_request  ──▶  mutation atomique du wallet (source de vérité)
```

L'Edge Function ne modifie **jamais** directement `wallets` ou `transactions` : elle orchestre l'appel au fournisseur puis délègue systématiquement à la fonction RPC Postgres, qui reste l'unique source de vérité pour le ledger. Cela garantit qu'aucun chemin (Edge Function, admin, futur webhook) ne peut créditer un wallet sans passer par une transaction atomique auditée.

## Brancher un fournisseur réel

1. Implémenter `PaymentProvider` pour le fournisseur choisi (ex. `OrangeMoneyProvider`, `WaveProvider`) dans `supabase/functions/_shared/payment-provider.ts`, en appelant l'API officielle du fournisseur dans `createPayment`.
2. Dans `handleWebhook`, **vérifier la signature du webhook** fournie par le fournisseur avant de faire confiance au payload (ne jamais faire confiance à un webhook non authentifié).
3. Ajouter les secrets nécessaires (clé API, secret de signature) comme variables d'environnement de l'Edge Function via `supabase secrets set` — jamais en dur dans le code, jamais côté frontend.
4. Mettre à jour `PAYMENT_PROVIDER` / la valeur `provider` envoyée depuis `DepositPage` pour utiliser le nouveau provider.
5. Retirer la mention "Demo payment" de l'UI une fois le fournisseur réel actif en production.

## Retraits

Les retraits n'ont pas d'abstraction `PaymentProvider` dédiée dans cette version : ils sont traités manuellement par un `FINANCE_ADMIN` depuis `/admin/withdrawals` (approbation = décaissement effectué hors plateforme, ex. virement Mobile Money manuel). L'intégration d'un payout automatisé (API sortante du fournisseur) suivrait le même principe que les dépôts : une Edge Function orchestrant l'appel au fournisseur, qui ne fait que déclencher `approve_withdrawal` après confirmation du virement.
