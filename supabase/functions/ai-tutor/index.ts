/*
 * TELECOM CONNECT LAB — Assistant pédagogique : point d'entrée Supabase Edge.
 *
 * Secrets (jamais dans le client ni l'APK) :
 *   supabase secrets set ANTHROPIC_API_KEY=… ALLOWED_ORIGINS=https://… [AI_MODEL=…]
 * SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournis
 * automatiquement par la plateforme.
 *
 * Pour un autre fournisseur : écrire un second objet Provider et le choisir
 * ci-dessous. handler.ts ne change pas.
 */
import Anthropic from "npm:@anthropic-ai/sdk";
import { handle, type Provider } from "./handler.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = env("SUPABASE_ANON_KEY");

/* Tarifs en $ par million de jetons. À actualiser si le modèle ou les prix changent. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

function anthropicProvider(apiKey: string, model: string): Provider {
  const client = new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
  const price = PRICES[model];
  if (!price) throw new Error(`Tarif inconnu pour le modèle ${model} : complétez PRICES.`);
  return {
    name: "anthropic",
    async send(system, messages) {
      const params: any = {
        model, max_tokens: 4000, system, messages,
        output_config: { effort: "medium" },
      };
      // Repli serveur en cas de refus : proposé uniquement sur les modèles qui l'acceptent.
      if (model !== "claude-haiku-5-5") { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
      const res: any = await client.beta.messages.create(params);
      const text = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
      const inputTokens = (res.usage.input_tokens ?? 0) + (res.usage.cache_read_input_tokens ?? 0) + (res.usage.cache_creation_input_tokens ?? 0);
      const outputTokens = res.usage.output_tokens ?? 0;
      return {
        text, truncated: res.stop_reason === "max_tokens", refused: res.stop_reason === "refusal",
        usage: { inputTokens, outputTokens, costUsd: (inputTokens * price.input + outputTokens * price.output) / 1e6 },
      };
    },
  };
}

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

const apiKey = env("ANTHROPIC_API_KEY");
const provider = apiKey ? anthropicProvider(apiKey, env("AI_MODEL") || "claude-opus-5-5") : null;

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
}));
