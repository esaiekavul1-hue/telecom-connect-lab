// Lancement : deno test --no-check --allow-none supabase/functions/ai-tutor/handler.test.ts
import assert from "node:assert/strict";
import { buildSystemPrompt, handle, LIMITS, validateMessages, type Deps, type Provider } from "./handler.ts";

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
