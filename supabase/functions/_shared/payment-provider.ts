// Abstraction PaymentProvider — voir brief section 17.
// Le fournisseur ne fait JAMAIS bouger d'argent lui-même : il initie/vérifie
// l'opération auprès du rail de paiement, puis délègue la mutation atomique
// du wallet aux fonctions RPC Postgres (create_deposit_request / approve_deposit),
// qui restent la seule source de vérité pour le ledger.

export interface PaymentIntent {
  reference: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  providerMetadata?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(params: { amount: number; method: string; userId: string }): Promise<PaymentIntent>;
  verifyPayment(reference: string): Promise<PaymentIntent>;
  handleWebhook(payload: unknown, signature?: string | null): Promise<{ reference: string; status: PaymentIntent["status"] }>;
  refundPayment(reference: string): Promise<{ success: boolean }>;
}

/**
 * Fournisseur de démonstration : confirme instantanément le paiement.
 * Utilisé en développement — l'UI affiche toujours "Demo payment" pour que
 * personne ne confonde ça avec un paiement réel (brief section 45).
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(params: { amount: number; method: string; userId: string }): Promise<PaymentIntent> {
    return {
      reference: `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: "COMPLETED",
      providerMetadata: { demo: true, ...params },
    };
  }

  async verifyPayment(reference: string): Promise<PaymentIntent> {
    return { reference, status: "COMPLETED", providerMetadata: { demo: true } };
  }

  async handleWebhook(payload: unknown): Promise<{ reference: string; status: PaymentIntent["status"] }> {
    const body = payload as { reference?: string };
    return { reference: body.reference ?? "unknown", status: "COMPLETED" };
  }

  async refundPayment(): Promise<{ success: boolean }> {
    return { success: true };
  }
}

/**
 * Fournisseur "manuel" : l'utilisateur envoie une preuve de virement/dépôt,
 * un FINANCE_ADMIN valide manuellement depuis /admin/deposits. Aucune API
 * externe n'est appelée — c'est le mode adapté tant qu'aucun agrégateur
 * Mobile Money / carte / virement réel n'est configuré.
 */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";

  async createPayment(params: { amount: number; method: string; userId: string }): Promise<PaymentIntent> {
    return {
      reference: `MANUAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      status: "PENDING",
      providerMetadata: { requiresReview: true, ...params },
    };
  }

  async verifyPayment(reference: string): Promise<PaymentIntent> {
    return { reference, status: "PENDING" };
  }

  async handleWebhook(): Promise<{ reference: string; status: PaymentIntent["status"] }> {
    throw new Error("ManualPaymentProvider does not receive webhooks — approval happens via /admin/deposits");
  }

  async refundPayment(): Promise<{ success: boolean }> {
    return { success: false };
  }
}

/**
 * Point d'extension pour un vrai fournisseur (Mobile Money, carte, virement) :
 * implémenter PaymentProvider en appelant l'API officielle du fournisseur,
 * puis vérifier la signature du webhook avant d'appeler approve_deposit.
 * Ne JAMAIS marquer un dépôt COMPLETED sans vérification serveur du paiement.
 */
export function getPaymentProvider(name: string): PaymentProvider {
  switch (name) {
    case "manual":
      return new ManualPaymentProvider();
    case "mock":
    default:
      return new MockPaymentProvider();
  }
}
