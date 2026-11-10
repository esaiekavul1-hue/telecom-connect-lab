// Lancement : deno test --no-check --allow-none supabase/functions/ai-tutor/handler.test.ts
import assert from "node:assert/strict";
import { buildSystemPrompt, handle, LIMITS, redact, validateMessages, type Deps, type Provider } from "./handler.ts";
import { FREE_MODELS, geminiProvider, parseReply, toContents } from "./gemini.ts";

const fake: Provider = { name: "fake", send: () => Promise.resolve({ text: "réponse", truncated: false, refused: false, usage: { inputTokens: 10, outputTokens: 5, costUsd: 0.001 } }) };
function deps(over: Partial<Deps> = {}): Deps & { recorded: unknown[] } {
  const recorded: unknown[] = [];
  return { provider: fake, allowedOrigins: ["https://site.test"], recorded,
    verifyUser: (t) => Promise.resolve(t === "bon" ? "u1" : null),
    reserve: () => Promise.resolve({ allowed: true, used: 1, limit: 20 }),
    record: (_u, usage) => { recorded.push(usage); return Promise.resolve(); }, ...over } as any;
}
const post = (body: unknown, token = "bon") => new Request("https://f.test/", { method: "POST", headers: { authorization: `Bearer ${token}`, origin: "https://site.test" }, body: JSON.stringify(body) });
const ok = { messages: [{ role: "user", content: "Qu'est-ce qu'un dB ?" }] };

Deno.test("jeton absent ou invalide : 401", async () => {
  assert.equal((await handle(post(ok, "mauvais"), deps())).status, 401);
  assert.equal((await handle(new Request("https://f.test/", { method: "POST" }), deps())).status, 401);
});
Deno.test("sans fournisseur : 503 not_configured, aucune réponse simulée", async () => {
  const r = await handle(post(ok), deps({ provider: null }));
  assert.equal(r.status, 503);
  assert.deepEqual(await r.json(), { error: "not_configured" });
});
Deno.test("évaluation en cours : 403 et le fournisseur n'est pas appelé", async () => {
  let called = false;
  const r = await handle(post(ok), deps({ reserve: () => Promise.resolve({ allowed: false, reason: "exam_active" }), provider: { name: "x", send: () => { called = true; return fake.send("", []); } } }));
  assert.equal(r.status, 403); assert.equal(called, false);
});
Deno.test("quota atteint : 429", async () => {
  const r = await handle(post(ok), deps({ reserve: () => Promise.resolve({ allowed: false, reason: "daily_limit", limit: 20 }) }));
  assert.equal(r.status, 429);
});
Deno.test("réponse : texte renvoyé et coût enregistré", async () => {
  const d = deps();
  const r = await handle(post(ok), d);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).text, "réponse");
  assert.equal(d.recorded.length, 1);
});
Deno.test("refus du modèle : signalé, coût tout de même enregistré", async () => {
  const d = deps({ provider: { name: "x", send: () => Promise.resolve({ text: "", truncated: false, refused: true, usage: { inputTokens: 1, outputTokens: 0, costUsd: 0 } }) } });
  assert.deepEqual(await (await handle(post(ok), d)).json(), { error: "refused" });
  assert.equal(d.recorded.length, 1);
});
Deno.test("erreur du fournisseur : 502 sans fuite de détail", async () => {
  const r = await handle(post(ok), deps({ provider: { name: "x", send: () => Promise.reject(new Error("clé sk-secrete invalide")) } }));
  assert.equal(r.status, 502);
  assert.ok(!(await r.text()).includes("sk-secrete"));
});
Deno.test("validation des messages", () => {
  assert.equal(validateMessages([]), null);
  assert.equal(validateMessages([{ role: "system", content: "x" }]), null);
  assert.equal(validateMessages([{ role: "user", content: "x".repeat(LIMITS.messageChars + 1) }]), null);
  assert.equal(validateMessages([{ role: "assistant", content: "x" }]), null);
  const long = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "m" + i }));
  const v = validateMessages([...long, { role: "user", content: "fin" }])!;
  assert.ok(v.length <= LIMITS.messages); assert.equal(v[0].role, "user"); assert.equal(v[v.length - 1].content, "fin");
});
Deno.test("l'origine non autorisée n'est pas renvoyée en CORS", async () => {
  const r = await handle(new Request("https://f.test/", { method: "OPTIONS", headers: { origin: "https://pirate.test" } }), deps());
  assert.equal(r.headers.get("access-control-allow-origin"), "https://site.test");
});
Deno.test("consigne : indice sans solution, niveau et règles présents, contexte borné", () => {
  const s = buildSystemPrompt({ mode: "hint", level: "l2", context: "c".repeat(9000) });
  assert.match(s, /Ne donne ni le résultat final/); assert.match(s, /Licence 2/); assert.match(s, /N'invente jamais/);
  assert.ok(s.length < 9000 / 2 + LIMITS.contextChars);
});

const fail = (code: string, status = 0) => Object.assign(new Error("x"), { failure: code, status });
const failing = (code: string): Provider => ({ name: "x", send: () => Promise.reject(fail(code)) });
Deno.test("limite gratuite : 429 clair et demande rendue à l'étudiant", async () => {
  let released = 0;
  const r = await handle(post(ok), deps({ provider: failing("free_limit"), release: () => { released++; return Promise.resolve(); } }));
  assert.equal(r.status, 429); assert.deepEqual(await r.json(), { error: "free_limit" }); assert.equal(released, 1);
});
Deno.test("service saturé : 503 provider_busy", async () => {
  const r = await handle(post(ok), deps({ provider: failing("busy") }));
  assert.equal(r.status, 503); assert.deepEqual(await r.json(), { error: "provider_busy" });
});
Deno.test("données personnelles masquées avant envoi", async () => {
  assert.equal(redact("écris à marie.k@exemple.cd"), "écris à [e-mail masqué]");
  assert.equal(redact("appelle +243 812 345 678 ou 0812345678"), "appelle [numéro masqué] ou [numéro masqué]");
  assert.equal(redact("R = 1000000 Ω à 2,4 GHz et 0,125 V"), "R = 1000000 Ω à 2,4 GHz et 0,125 V");
  let seen = "";
  await handle(post({ messages: [{ role: "user", content: "mon mail a@b.cd" }] }), deps({ provider: { name: "x", send: (_s, m) => { seen = m[0].content; return fake.send("", []); } } }));
  assert.ok(!seen.includes("a@b.cd"));
});
Deno.test("gemini : un modèle hors offre gratuite est refusé", () => {
  assert.throws(() => geminiProvider({ apiKey: "k", model: "gemini-4-argon" }), /hors offre gratuite/);
  assert.throws(() => geminiProvider({ apiKey: "k", fallback: "gemini-omni-1.2-flash" }), /hors offre gratuite/);
  assert.ok(FREE_MODELS.includes("gemini-3.6-flash"));
});
Deno.test("gemini : requête conforme, clé dans l'en-tête et jamais dans l'URL", async () => {
  let url = "", init: any;
  const p = geminiProvider({ apiKey: "CLE", fetch: ((u: string, i: any) => { url = u; init = i; return Promise.resolve(new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "bonjour" }] } }], usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3, thoughtsTokenCount: 2 } }))); }) as any });
  const r = await p.send("SYS", [{ role: "user", content: "q" }, { role: "assistant", content: "r" }, { role: "user", content: "s" }]);
  assert.ok(url.endsWith("/v1beta/models/gemini-3.6-flash:generateContent")); assert.ok(!url.includes("CLE"));
  assert.equal(init.headers["x-goog-api-key"], "CLE");
  const b = JSON.parse(init.body);
  assert.equal(b.systemInstruction.parts[0].text, "SYS"); assert.deepEqual(b.contents.map((c: any) => c.role), ["user", "model", "user"]);
  assert.equal(r.text, "bonjour"); assert.deepEqual(r.usage, { inputTokens: 7, outputTokens: 5, costUsd: 0 });
});
Deno.test("gemini : 429 passe au modèle de secours, puis limite gratuite", async () => {
  const urls: string[] = [];
  const mk = (st: number[]) => geminiProvider({ apiKey: "k", fetch: ((u: string) => { urls.push(u); const s = st.shift()!; return Promise.resolve(new Response(s === 200 ? JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }) : "{}", { status: s })); }) as any });
  assert.equal((await mk([429, 200]).send("s", [{ role: "user", content: "q" }])).text, "ok");
  assert.ok(urls[1].includes("gemini-3.5-flash-lite"));
  await assert.rejects(mk([429, 429]).send("s", [{ role: "user", content: "q" }]), (e: any) => e.failure === "free_limit");
  await assert.rejects(mk([503, 500]).send("s", [{ role: "user", content: "q" }]), (e: any) => e.failure === "busy");
  await assert.rejects(mk([403]).send("s", [{ role: "user", content: "q" }]), (e: any) => e.failure === "config");
});
Deno.test("gemini : blocages, troncature, pensées ignorées, conversation", () => {
  assert.equal(parseReply({ promptFeedback: { blockReason: "SAFETY" } }).refused, true);
  assert.equal(parseReply({ candidates: [{ finishReason: "RECITATION" }] }).refused, true);
  assert.equal(parseReply({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "a" }] } }] }).truncated, true);
  assert.equal(parseReply({ candidates: [{ content: { parts: [{ thought: true, text: "secret" }, { text: "visible" }] } }] }).text, "visible");
  assert.deepEqual(toContents([{ role: "assistant", content: "x" }]), [{ role: "model", parts: [{ text: "x" }] }]);
});
