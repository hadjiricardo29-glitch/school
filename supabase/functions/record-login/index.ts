// Edge Function "record-login" — capture l'IP réelle de connexion d'un
// utilisateur (le seul endroit qui voit le vrai en-tête réseau, jamais
// falsifiable par le client) et la transmet à la RPC record_login.
// POST { userAgent? }  (JWT utilisateur requis)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    const body = await req.json().catch(() => ({}));
    const userAgent = body.userAgent ? String(body.userAgent) : req.headers.get("user-agent");

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip");

    const { error: rpcError } = await supabase.rpc("record_login", { p_ip_address: ip, p_user_agent: userAgent });
    if (rpcError) throw rpcError;

    return json({ ok: true });
  } catch (err) {
    // Le suivi de connexion ne doit jamais bloquer la connexion elle-même —
    // 200 même en cas d'échec interne, l'appelant l'ignore de toute façon.
    return json({ ok: false, error: extractErrorMessage(err) }, 200);
  }
});

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
