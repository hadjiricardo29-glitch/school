// Edge Function "generate-quiz" — génère des questions de quiz via l'API
// Gemini (staff uniquement) pour préremplir le constructeur de quiz côté
// admin. L'admin reste toujours libre de modifier/supprimer les questions
// générées avant d'enregistrer — cette fonction ne fait que proposer.
// POST { topic: string, count?: number, optionsPerQuestion?: number }  (JWT staff requis)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STAFF_ROLES = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

interface GeneratedQuestion {
  question: string;
  options: string[];
  correct_option: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
    if (!profile || !STAFF_ROLES.includes(profile.role)) {
      return json({ error: "Not authorized" }, 403);
    }

    const body = await req.json();
    const topic = String(body.topic ?? "").trim();
    const count = Math.min(Math.max(Number(body.count) || 5, 1), 15);
    const optionsPerQuestion = Math.min(Math.max(Number(body.optionsPerQuestion) || 3, 2), 6);
    if (!topic) return json({ error: "Topic is required" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: configRow } = await admin.from("secure_config").select("value").eq("key", "gemini_api_key").maybeSingle();
    const apiKey = configRow?.value;
    if (!apiKey) return json({ error: "gemini_api_key is not configured" }, 500);

    const prompt =
      `Génère ${count} questions de quiz à choix unique, en français, sur le sujet suivant : "${topic}". ` +
      `Chaque question doit avoir exactement ${optionsPerQuestion} options plausibles, une seule étant correcte. ` +
      `Les questions doivent être variées, factuelles et vérifiables, sans ambiguïté sur la bonne réponse.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  options: { type: "ARRAY", items: { type: "STRING" } },
                  correct_option: { type: "INTEGER" },
                },
                required: ["question", "options", "correct_option"],
              },
            },
          },
        }),
      },
    );

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => "");
      return json({ error: `Gemini API error (${geminiRes.status}): ${errBody.slice(0, 300)}` }, 502);
    }

    const geminiData = await geminiRes.json();
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ error: "Gemini returned no content" }, 502);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return json({ error: "Gemini returned invalid JSON" }, 502);
    }

    const questions = validateQuestions(parsed);
    if (questions.length === 0) return json({ error: "Gemini returned no valid questions" }, 502);

    return json({ questions });
  } catch (err) {
    return json({ error: extractErrorMessage(err) }, 500);
  }
});

// Ne jamais faire confiance à la sortie du modèle telle quelle — un champ
// manquant ou un correct_option hors bornes pourrait planter le
// constructeur de quiz admin ou pire, s'y glisser sans bonne réponse valide.
function validateQuestions(raw: unknown): GeneratedQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: GeneratedQuestion[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const q = item as Record<string, unknown>;
    const question = typeof q.question === "string" ? q.question.trim() : "";
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0) : [];
    const correctOption = typeof q.correct_option === "number" ? q.correct_option : Number(q.correct_option);
    if (!question || options.length < 2 || !Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) continue;
    out.push({ question, options, correct_option: correctOption });
  }
  return out;
}

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
