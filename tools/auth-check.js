#!/usr/bin/env node
/*
 * Test réel et unitaire de l'envoi d'un code, avec la clé publique de config.js.
 *   Demander un code : npm run auth:check -- prenom@exemple.cd
 *   Vérifier le code : npm run auth:check -- prenom@exemple.cd 123456
 * Une seule requête par lancement ; aucun jeton n'est affiché.
 * « Demande acceptée » ne prouve pas la réception : seul le code reçu le prouve.
 */
'use strict';
var fs = require('fs'), path = require('path');
var email = process.argv[2], code = process.argv[3];
if (!email || !/@/.test(email)) { console.error('Usage : npm run auth:check -- adresse@exemple.cd [code]'); process.exit(2); }

var text = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
function read(k) { var m = new RegExp(k + "\\s*:\\s*'([^']*)'").exec(text); return m ? m[1] : ''; }
var url = process.env.TCL_AUTH_URL || read('supabaseUrl'), key = process.env.TCL_AUTH_KEY || read('supabaseAnonKey');
if (!url || !key) { console.error('config.js ne contient pas la configuration Supabase.'); process.exit(2); }

var HELP = {
  over_email_send_rate_limit: 'Limite d’envoi atteinte : attendez, ou vérifiez Authentication > Rate Limits.',
  over_request_rate_limit: 'Trop de demandes depuis cette adresse IP : attendez quelques minutes.',
  email_address_not_authorized: 'Le SMTP personnalisé n’est pas actif : Supabase utilise encore son service par défaut.',
  otp_expired: 'Code faux ou expiré : demandez-en un nouveau et utilisez le dernier reçu.',
  otp_disabled: 'Connexion par e-mail désactivée, ou compte inexistant.',
  signup_disabled: 'Les inscriptions sont désactivées dans Authentication > Sign In / Providers.',
  unexpected_failure: 'Supabase n’a pas réussi à envoyer l’e-mail : revérifiez hôte, port, identifiant, clé SMTP et expéditeur Brevo.'
};

(async function () {
  var p = code ? '/auth/v1/verify' : '/auth/v1/otp';
  var body = code ? { email: email, token: code, type: 'email' } : { email: email, create_user: true };
  var res = await fetch(url + p, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  var data = {}; try { data = JSON.parse(await res.text()); } catch (e) { /* réponse vide */ }
  if (res.ok) {
    console.log(code ? 'Code accepté par Supabase : session ouverte (HTTP ' + res.status + ').' : 'Demande acceptée par Supabase (HTTP ' + res.status + '). Contrôlez la boîte de réception et le dossier Indésirables.');
    process.exit(code && !data.access_token ? 1 : 0);
  }
  var ec = data.error_code || data.code || '';
  console.error('Échec HTTP ' + res.status + (ec ? ' (' + ec + ')' : '') + ' : ' + (data.msg || data.message || data.error_description || 'sans détail'));
  if (HELP[ec]) console.error('→ ' + HELP[ec]);
  process.exit(1);
})().catch(function () { console.error('Réseau : Supabase est injoignable.'); process.exit(1); });
