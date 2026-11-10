/*
 * TELECOM CONNECT LAB — Assistant pédagogique : Netlify Function.
 *
 * Même passerelle que supabase/functions/ai-tutor (handler.ts, gemini.ts), servie
 * par le site lui-même : POST /functions/v1/ai-tutor. Aucun secret n'atteint le
 * navigateur ni l'APK : ils vivent dans les variables d'environnement Netlify.
 *
 *   GEMINI_API_KEY             clé Google AI Studio, projet SANS facturation (offre gratuite)
 *   SUPABASE_URL               adresse du projet Supabase
 *   SUPABASE_ANON_KEY          clé publique (sb_publishable_…) : vérifie la session de l'étudiant
 *   SUPABASE_SERVICE_ROLE_KEY  clé secrète (sb_secret_… ou service_role) : quotas uniquement
 *   ALLOWED_ORIGINS            facultatif : autres origines autorisées, séparées par des virgules
 *   AI_MODEL, AI_FALLBACK_MODEL facultatifs : modèles de l'offre gratuite uniquement
 *
 * Les quotas (questions par jour, coupure pendant une évaluation, budget) restent
 * tenus par la base : ai_reserve_request, ai_record_usage, ai_release_request.
 */
import { handle, type Deps, type Provider } from "../../supabase/functions/ai-tutor/handler.ts";
import { geminiProvider } from "../../supabase/functions/ai-tutor/gemini.ts";

type Env = Record<string, string | undefined>;

/** Netlify interrompt une fonction synchrone après 10 s : la réponse doit arriver avant. */
export const BUDGET_MS = 9000;
/** Application mobile Capacitor (Android, iOS). */
const APP_ORIGINS = ["https://localhost", "capacitor://localhost"];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export function createTutor(env: Env, fetchImpl: typeof fetch = fetch) {
  const get = (k: string) => (env[k] ?? "").trim();
  const supabase = get("SUPABASE_URL").replace(/\/+$/, "");
  const anonKey = get("SUPABASE_ANON_KEY");
  const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");
  const ready = !!(supabase && anonKey && serviceKey);

  let provider: Provider | null = null;
  if (ready && get("GEMINI_API_KEY")) {
    try {
      provider = geminiProvider({
        apiKey: get("GEMINI_API_KEY"), model: get("AI_MODEL") || undefined, fallback: get("AI_FALLBACK_MODEL") || undefined,
        fetch: fetchImpl, budgetMs: Number(get("AI_BUDGET_MS")) || BUDGET_MS,
      });
    } catch (e) {
      console.error("ai-tutor", e instanceof Error ? e.message : "configuration invalide");
    }
  }

  // Nouvelle clé secrète : en-tête apikey seul. Ancienne clé service_role (JWT) : aussi en Authorization.
  const serviceHeaders: Record<string, string> = serviceKey.startsWith("sb_secret_")
    ? { apikey: serviceKey }
    : { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  async function rpc(name: string, args: unknown) {
    const res = await fetchImpl(`${supabase}/rest/v1/rpc/${name}`, {
      method: "POST", headers: { ...serviceHeaders, "Content-Type": "application/json" }, body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`rpc ${name}: ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  const origins = [get("URL"), get("DEPLOY_PRIME_URL"), get("DEPLOY_URL"), ...APP_ORIGINS,
    ...get("ALLOWED_ORIGINS").split(",").map((s) => s.trim())].filter(Boolean);

  return async function tutor(req: Request): Promise<Response> {
    if (!ready) return json(503, { error: "not_configured" });
    const deps: Deps = {
      provider,
      allowedOrigins: [new URL(req.url).origin, ...origins],
      async verifyUser(token) {
        const res = await fetchImpl(`${supabase}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        return (await res.json())?.id ?? null;
      },
      reserve: (userId) => rpc("ai_reserve_request", { p_user: userId }),
      record: async (userId, u) => { await rpc("ai_record_usage", { p_user: userId, p_input: u.inputTokens, p_output: u.outputTokens, p_cost: u.costUsd }); },
      release: async (userId) => { await rpc("ai_release_request", { p_user: userId }); },
    };
    try {
      return await handle(req, deps);
    } catch (e) {
      // Base injoignable ou refus du serveur : aucun détail interne n'est renvoyé.
      console.error("ai-tutor", e instanceof Error ? e.message : "erreur");
      return json(503, { error: "provider_busy" });
    }
  };
}

let tutor: ((req: Request) => Promise<Response>) | null = null;

export default (req: Request) => {
  tutor ??= createTutor(process.env);
  return tutor(req);
};

export const config = { path: "/functions/v1/ai-tutor" };
