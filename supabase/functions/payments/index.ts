// Edge Function "payments" — point d'entrée unique pour l'abstraction PaymentProvider.
// POST /payments/deposit         { amount, method, provider? }  (JWT utilisateur requis)
// POST /payments/webhook         { reference, status, ... }      (appelé par le fournisseur réel, pas de JWT utilisateur)
// POST /payments/test-connection {}                              (staff uniquement, lecture seule, aucun mouvement d'argent)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getPaymentProvider } from "../_shared/payment-provider.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const route = url.pathname.split("/").filter(Boolean).pop();

  try {
    if (route === "deposit") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return json({ error: "Missing Authorization header" }, 401);
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return json({ error: "Invalid session" }, 401);
      }

      const body = await req.json();
      const amount = Number(body.amount);
      const method = String(body.method ?? "mobile_money");
      const providerName = String(body.provider ?? "mock");
      const country = body.country ? String(body.country) : undefined;

      if (!amount || amount <= 0) {
        return json({ error: "Invalid amount" }, 400);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", userData.user.id)
        .maybeSingle();

      const provider = getPaymentProvider(providerName);
      const intent = await provider.createPayment({
        amount,
        method,
        userId: userData.user.id,
        country,
        email: userData.user.email,
        firstName: profile?.first_name ?? undefined,
        lastName: profile?.last_name ?? undefined,
        phone: profile?.phone ?? undefined,
      });

      // La mutation atomique du wallet reste dans Postgres (create_deposit_request),
      // qui auto-crédite immédiatement pour le provider "mock" et laisse PENDING sinon.
      const { data: depositId, error: rpcError } = await supabase.rpc("create_deposit_request", {
        p_amount: amount,
        p_method: method,
        p_provider: provider.name,
      });
      if (rpcError) throw rpcError;

      return json({ depositId, reference: intent.reference, status: intent.status });
    }

    if (route === "test-connection") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return json({ error: "Missing Authorization header" }, 401);
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        return json({ error: "Invalid session" }, 401);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (!profile || !["ADMIN", "FINANCE_ADMIN"].includes(profile.role)) {
        return json({ error: "Not authorized" }, 403);
      }

      const apiKey = Deno.env.get("SASPAY_API_KEY");
      if (!apiKey) {
        return json({ configured: false, error: "SASPAY_API_KEY is not configured" });
      }

      // GET /networks/ est en lecture seule — confirme que la clé
      // s'authentifie sans jamais déclencher de paiement réel.
      const res = await fetch("https://api.saspay.me/api/v1/networks/", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = await res.json().catch(() => null);

      return json({
        configured: true,
        apiKeyValid: res.ok,
        status: res.status,
        networks: res.ok ? body : undefined,
        error: res.ok ? undefined : (body?.message ?? body?.code ?? `HTTP ${res.status}`),
      });
    }

    if (route === "webhook") {
      const rawBody = await req.text();
      const body = JSON.parse(rawBody);
      const provider = getPaymentProvider(String(body.provider ?? "manual"));
      const result = await provider.handleWebhook(rawBody, {
        signature: req.headers.get("x-webhook-signature"),
        timestamp: req.headers.get("x-webhook-timestamp"),
      });

      if (result.status === "COMPLETED") {
        const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: deposit } = await admin
          .from("deposits")
          .select("id, status")
          .eq("reference", result.reference)
          .maybeSingle();

        if (deposit && deposit.status === "PENDING") {
          const { error: approveError } = await admin.rpc("approve_deposit", { p_deposit_id: deposit.id });
          if (approveError) throw approveError;
        }
      }

      return json({ received: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: extractErrorMessage(err) }, 500);
  }
});

// supabase.rpc(...) rejette avec un PostgrestError (objet brut { message, ... }),
// pas une instance d'Error — `err instanceof Error` seul le rate et remplace le
// vrai message Postgres (ex: contrainte violée) par un générique "Unexpected error".
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as { message: unknown }).message);
  return "Unexpected error";
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
