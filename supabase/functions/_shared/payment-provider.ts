// Abstraction PaymentProvider — voir brief section 17.
// Le fournisseur ne fait JAMAIS bouger d'argent lui-même : il initie/vérifie
// l'opération auprès du rail de paiement, puis délègue la mutation atomique
// du wallet aux fonctions RPC Postgres (create_deposit_request / approve_deposit),
// qui restent la seule source de vérité pour le ledger.

export interface PaymentIntent {
  reference: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  providerMetadata?: Record<string, unknown>;
  checkoutUrl?: string;
}

export interface CreatePaymentParams {
  amount: number;
  method: string;
  userId: string;
  country?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface WebhookHeaders {
  signature?: string | null;
  timestamp?: string | null;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentIntent>;
  verifyPayment(reference: string): Promise<PaymentIntent>;
  handleWebhook(payload: unknown, headers: WebhookHeaders): Promise<{ reference: string; status: PaymentIntent["status"] }>;
  refundPayment(reference: string): Promise<{ success: boolean }>;
}

/**
 * Fournisseur de démonstration : confirme instantanément le paiement.
 * Utilisé en développement — l'UI affiche toujours "Demo payment" pour que
 * personne ne confonde ça avec un paiement réel (brief section 45).
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
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
    const body = (typeof payload === "string" ? JSON.parse(payload) : payload) as { reference?: string };
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

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
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

const SASPAY_BASE_URL = "https://api.saspay.me/api/v1";

// BUG CRITIQUE trouvé en relisant docs.saspay.me/api-reference/openapi.json :
// l'enum réel du statut SASpay est PENDING | SUCCESS | FAILED | CANCELLED —
// il n'existe AUCUN statut "COMPLETED" côté SASpay. Le code comparait
// jusqu'ici `status === "COMPLETED"`, une valeur que SASpay n'envoie jamais :
// même un webhook transaction.success (data.status: "SUCCESS") aurait été
// silencieusement traité comme PENDING, donc jamais auto-approuvé. Ce bug
// existait indépendamment du bug de référence déjà corrigé — un dépôt avec
// la bonne référence ET un vrai paiement confirmé serait quand même resté
// bloqué en PENDING pour toujours.
function mapSaspayStatus(raw: string | undefined): PaymentIntent["status"] {
  if (raw === "SUCCESS") return "COMPLETED";
  if (raw === "FAILED" || raw === "CANCELLED") return "FAILED";
  return "PENDING";
}

/**
 * Fournisseur réel — encaissement (dépôt) via SASpay softpay (push Mobile
 * Money direct sur le téléphone du client). Le décaissement (retrait) n'est
 * PAS branché ici : POST /payouts/initialize/ exige une IP fixe en liste
 * blanche que les Edge Functions Supabase ne fournissent pas (chaque
 * invocation peut sortir par une IP différente) — voir la note de
 * l'utilisateur là-dessus. Tant qu'un relais à IP fixe (type QuotaGuard/
 * Fixie) n'est pas en place, les retraits restent approuvés manuellement
 * via /admin/withdrawals, ce qui reste un flux valide.
 *
 * Couverture actuelle : Afrique de l'Ouest uniquement (CI, SN, ML, BF, BJ,
 * TG, NE, GN, GH, NG) — les codes `network` du frontend
 * (config/operators.ts) sont désormais les codes exacts confirmés via
 * docs.saspay.me/api-reference/reference/formats, pas une supposition.
 *
 * ⚠️ Toujours non testé contre un vrai paiement (aucune clé API valide
 * disponible au moment de l'écriture) — le SHAPE de la requête/réponse
 * softpay est documenté et suivi ici, mais un premier dépôt réel de test
 * reste nécessaire avant d'activer ce fournisseur en production.
 */
export class SASpayProvider implements PaymentProvider {
  readonly name = "saspay";

  private apiKey(): string {
    const key = Deno.env.get("SASPAY_API_KEY");
    if (!key) throw new Error("SASPAY_API_KEY is not configured");
    return key;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey()}`,
      "Content-Type": "application/json",
    };
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch(`${SASPAY_BASE_URL}/payments/softpay/`, {
      method: "POST",
      headers: { ...this.headers(), "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({
        amount: params.amount.toFixed(2),
        currency: "XOF",
        country: params.country ?? "CI",
        network: params.method,
        customer: {
          email: params.email,
          first_name: params.firstName,
          last_name: params.lastName,
          phone: params.phone,
        },
        metadata: { userId: params.userId },
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.message ?? body?.code ?? `SASpay softpay failed with status ${res.status}`);
    }
    // Journalisé pour diagnostiquer tout écart entre le schéma documenté et
    // la réponse réelle — c'est ce qui a permis de repérer le bug ci-dessous.
    console.log("SASpay softpay response:", JSON.stringify(body));

    // reference?/transaction_id?/data.id? en secours : la doc documente `id`,
    // mais un dépôt réel a déjà reçu une réponse où `id` était absent, ce qui
    // générait silencieusement une référence bidon côté Postgres (fallback
    // 'DEP-xxxx') — un tel dépôt ne peut alors jamais être rapproché par le
    // webhook. On préfère échouer bruyamment (voir index.ts) plutôt que de
    // laisser recréer ce bug.
    const reference = body.id ?? body.reference ?? body.transaction_id ?? body.data?.id;

    return {
      reference,
      status: mapSaspayStatus(body.status),
      checkoutUrl: body.checkout_url,
      providerMetadata: body,
    };
  }

  async verifyPayment(reference: string): Promise<PaymentIntent> {
    const res = await fetch(`${SASPAY_BASE_URL}/payments/${reference}/verify/`, {
      headers: this.headers(),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body?.message ?? body?.code ?? `SASpay verify failed with status ${res.status}`);
    }
    return {
      reference,
      status: mapSaspayStatus(body.status),
      providerMetadata: body,
    };
  }

  async handleWebhook(payload: unknown, headers: WebhookHeaders): Promise<{ reference: string; status: PaymentIntent["status"] }> {
    const rawBody = typeof payload === "string" ? payload : JSON.stringify(payload);
    await this.verifyWebhookSignature(rawBody, headers);

    const envelope = (typeof payload === "string" ? JSON.parse(payload) : payload) as {
      event?: string;
      data?: { id?: string; status?: string };
    };
    return { reference: envelope.data?.id ?? "unknown", status: mapSaspayStatus(envelope.data?.status) };
  }

  private async verifyWebhookSignature(rawBody: string, headers: WebhookHeaders): Promise<void> {
    const secret = Deno.env.get("SASPAY_WEBHOOK_SECRET");
    if (!secret) throw new Error("SASPAY_WEBHOOK_SECRET is not configured");
    if (!headers.signature || !headers.timestamp) {
      throw new Error("Missing webhook signature/timestamp headers");
    }

    const timestampSeconds = Number(headers.timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
      throw new Error("Webhook timestamp outside the 5 minute replay-protection window");
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(`${headers.timestamp}.${rawBody}`));
    const expectedHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!timingSafeEqual(expectedHex, headers.signature)) {
      throw new Error("Invalid webhook signature");
    }
  }

  async refundPayment(): Promise<{ success: boolean }> {
    // Aucun endpoint de remboursement documenté dans les pages lues —
    // échoue explicitement plutôt que de prétendre réussir.
    throw new Error("SASpay refund is not implemented — no documented refund endpoint");
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
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
    case "saspay":
      return new SASpayProvider();
    case "mock":
    default:
      return new MockPaymentProvider();
  }
}
