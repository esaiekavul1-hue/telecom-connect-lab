/*
 * TELECOM CONNECT LAB — Fournisseur Google Gemini, offre gratuite uniquement.
 * Seuls les modèles annoncés « Free of charge » par la grille tarifaire Google sont acceptés.
 * ⚠ Le projet Google lié à la clé ne doit avoir AUCUN compte de facturation :
 * c'est cette absence qui garantit la gratuité, et elle ne se vérifie pas par l'API.
 * Aucune dépendance : fetch est injectable, donc testable.
 */
import type { ChatMessage, Provider, ProviderReply } from "./handler.ts";

export const FREE_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
export const DEFAULT_MODEL = "gemini-3.6-flash";
export const DEFAULT_FALLBACK = "gemini-3.5-flash-lite";

const HOST = "https://generativelanguage.googleapis.com/v1beta/models/";
const REFUSALS = ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "IMAGE_SAFETY"];

function failure(code: string, status: number, detail?: unknown): Error {
  return Object.assign(new Error(`gemini ${status}`), { failure: code, status, detail });
}

/** Détail de l'erreur Google, pour le diagnostic serveur uniquement ; la clé est toujours masquée. */
async function errorDetail(res: Response, model: string, apiKey: string) {
  const raw = await res.text().catch(() => "");
  let e: any = {};
  try { e = JSON.parse(raw)?.error ?? {}; } catch { /* réponse non JSON */ }
  const reason = (e.details ?? []).map((d: any) => d?.reason).filter(Boolean).join(",");
  const message = String(e.message ?? raw).split(apiKey).join("[clé masquée]").slice(0, 600);
  return { model, googleStatus: e.status ?? "", reason, message };
}

/** Réponse Gemini → format de la passerelle. Coût toujours nul : offre gratuite. */
export function parseReply(data: any): ProviderReply {
  const c = data?.candidates?.[0];
  const u = data?.usageMetadata ?? {};
  const usage = { inputTokens: u.promptTokenCount ?? 0, outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0), costUsd: 0 };
  const text = (c?.content?.parts ?? []).filter((p: any) => !p.thought && typeof p.text === "string").map((p: any) => p.text).join("").trim();
  const refused = !!data?.promptFeedback?.blockReason || REFUSALS.includes(c?.finishReason);
  return { text, truncated: c?.finishReason === "MAX_TOKENS", refused, usage };
}

export function toContents(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
}

/**
 * budgetMs : durée totale accordée à une réponse, modèle de secours compris
 * (Netlify interrompt une fonction synchrone après 10 s). Sans budget : 45 s par modèle.
 */
export function geminiProvider(opts: { apiKey: string; model?: string; fallback?: string; fetch?: typeof fetch; timeoutMs?: number; budgetMs?: number }): Provider {
  const model = opts.model || DEFAULT_MODEL;
  const fallback = opts.fallback === undefined ? DEFAULT_FALLBACK : opts.fallback;
  for (const m of [model, fallback]) if (m && !FREE_MODELS.includes(m)) throw new Error(`Modèle hors offre gratuite refusé : ${m}`);
  const call = opts.fetch ?? fetch;
  const models = fallback && fallback !== model ? [model, fallback] : [model];

  return {
    name: "gemini",
    async send(system, messages) {
      let last: Error = failure("busy", 0);
      const end = opts.budgetMs ? Date.now() + opts.budgetMs : Infinity;
      for (const m of models) {
        const left = end - Date.now();
        if (left < 1500) break; // trop tard pour un nouvel essai : la demande est rendue à l'étudiant
        let res: Response;
        try {
          res = await call(`${HOST}${m}:generateContent`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": opts.apiKey },
            body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: toContents(messages), generationConfig: { maxOutputTokens: 4000 } }),
            signal: AbortSignal.timeout(Math.min(opts.timeoutMs ?? 45_000, left)),
          });
        } catch { last = failure("busy", 0); continue; }
        if (res.ok) return parseReply(await res.json());
        const detail = await errorDetail(res, m, opts.apiKey);
        // Le modèle de secours a son propre quota : on l'essaie si le premier est saturé.
        if (res.status === 429) { last = failure("free_limit", 429, detail); continue; }
        if (res.status >= 500) { last = failure("busy", res.status, detail); continue; }
        throw failure("config", res.status, detail);
      }
      throw last;
    },
  };
}
