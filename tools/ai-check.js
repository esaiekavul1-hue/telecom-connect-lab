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
})().catch(function (e) {
  var why = { free_limit: 'limite gratuite atteinte (429)', busy: 'service indisponible', config: 'clé ou projet refusé par Google (' + e.status + ')' }[e.failure] || e.message;
  console.error('Échec : ' + why);
  process.exit(1);
});
