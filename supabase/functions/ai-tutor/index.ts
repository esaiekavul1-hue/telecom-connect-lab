/*
 * TELECOM CONNECT LAB — Assistant pédagogique : point d'entrée Supabase Edge.
 *
 * Secrets (jamais dans le client ni l'APK) :
 *   supabase secrets set GEMINI_API_KEY=… ALLOWED_ORIGINS=https://… [AI_MODEL=…] [AI_FALLBACK_MODEL=…]
 * SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis
 * automatiquement par la plateforme.
 *
 * Pour un autre fournisseur : écrire un second objet Provider et le choisir
 * ci-dessous. handler.ts ne change pas.
 */
import { handle, type Provider } from "./handler.ts";
import { geminiProvider } from "./gemini.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = env("SUPABASE_ANON_KEY");

async function callRpc(name: string, args: unknown) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${name}: ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function buildProvider(): Provider | null {
  const apiKey = env("GEMINI_API_KEY");
  if (!apiKey) return null;
  try {
    return geminiProvider({ apiKey, model: env("AI_MODEL") || undefined, fallback: env("AI_FALLBACK_MODEL") || undefined });
  } catch (e) {
    console.error("ai-tutor", e instanceof Error ? e.message : "configuration invalide");
    return null;
  }
}
const provider = buildProvider();

Deno.serve((req) => handle(req, {
  provider,
  allowedOrigins: (env("ALLOWED_ORIGINS") || "https://dainty-biscuit-3fc767.netlify.app,https://localhost,capacitor://localhost").split(",").map((s) => s.trim()),
  async verifyUser(token) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json())?.id ?? null;
  },
  reserve: (userId) => callRpc("ai_reserve_request", { p_user: userId }),
  record: async (userId, u) => { await callRpc("ai_record_usage", { p_user: userId, p_input: u.inputTokens, p_output: u.outputTokens, p_cost: u.costUsd }); },
  release: async (userId) => { await callRpc("ai_release_request", { p_user: userId }); },
}));
