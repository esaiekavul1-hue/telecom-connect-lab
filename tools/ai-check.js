#!/usr/bin/env node
/*
 * Vérifie une vraie conversation avec Gemini (offre gratuite), à l'aide de GEMINI_API_KEY.
 * Lancement : npm run ai:check. La clé n'est jamais affichée.
 */
'use strict';
var fs = require('fs'), path = require('path'), os = require('os'), url = require('url');
var strip = require('node:module').stripTypeScriptTypes;
var key = process.env.GEMINI_API_KEY;
if (!key) { console.error('GEMINI_API_KEY est absente.'); process.exit(2); }

(async function () {
  var dir = path.join(__dirname, '..', 'supabase', 'functions', 'ai-tutor'), mods = {};
  for (var n of ['handler', 'gemini']) {
    var tmp = path.join(os.tmpdir(), 'tcl-ai-' + n + '-' + process.pid + '.mjs');
    fs.writeFileSync(tmp, strip(fs.readFileSync(path.join(dir, n + '.ts'), 'utf8')));
    mods[n] = await import(url.pathToFileURL(tmp).href);
    fs.unlinkSync(tmp);
  }
  var p = mods.gemini.geminiProvider({ apiKey: key, model: process.env.AI_MODEL || undefined, fallback: process.env.AI_FALLBACK_MODEL || undefined });
  var sys = mods.handler.buildSystemPrompt({ mode: 'explain', level: 'l2', module: 'Antennes', context: 'Parcours : Licence 2.' });
  var r = await p.send(sys, [{ role: 'user', content: 'Quelle est la longueur d’onde à 900 MHz, en mètres ?' }]);
  console.log('Réponse reçue (' + r.usage.inputTokens + ' jetons en entrée, ' + r.usage.outputTokens + ' en sortie, refus : ' + r.refused + ', tronquée : ' + r.truncated + ')\n');
  console.log(r.text);
  process.exit(r.text ? 0 : 1);
})().catch(async function (e) {
  var why = { free_limit: 'limite gratuite atteinte (429)', busy: 'service indisponible', config: 'requête refusée par Google (' + e.status + ')' }[e.failure] || e.message;
  console.error('Échec : ' + why);
  if (e.detail) {
    console.error('  Modèle      : ' + e.detail.model);
    console.error('  Requête     : POST /v1beta/models/' + e.detail.model + ':generateContent (systemInstruction, contents, generationConfig.maxOutputTokens)');
    console.error('  Statut      : ' + (e.detail.googleStatus || 'non précisé'));
    console.error('  Raison      : ' + (e.detail.reason || 'non précisée'));
    console.error('  Message     : ' + e.detail.message);
  }
  if (e.failure === 'config') await listModels();
  process.exit(1);
});

/** Modèles que cette clé voit réellement, parmi ceux de l'offre gratuite. */
async function listModels() {
  try {
    var res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } });
    if (!res.ok) { console.error('  Liste des modèles : refusée (' + res.status + ')'); return; }
    var names = ((await res.json()).models || []).filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; }).map(function (m) { return m.name.replace('models/', ''); });
    console.error('  Modèles generateContent visibles : ' + names.length);
    console.error('  Dont Flash : ' + (names.filter(function (n) { return /flash/.test(n); }).join(', ') || 'aucun'));
  } catch (err) { console.error('  Liste des modèles : réseau indisponible'); }
}
