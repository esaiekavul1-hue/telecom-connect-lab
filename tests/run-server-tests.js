/*
 * TELECOM CONNECT LAB — Tests du socle serveur (migrations, RLS, évaluations)
 * Lancement : node tests/run-server-tests.js
 * Rejoue les vrais fichiers SQL dans PostgreSQL (WASM, en mémoire).
 */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var local = require('../tools/local-db.js');
var gen = require('../tools/generate-assessments.js');

var passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + e.message); }
}
async function rejects(p, re) {
  var err = null;
  try { await p; } catch (e) { err = e; }
  assert.ok(err, 'une erreur était attendue');
  if (re) assert.ok(re.test(err.message), 'message inattendu : ' + err.message);
}

(async function () {
  var existingUser, existingProgress = { lessons: { signaux: { chapters: { c1: '2026-01-01' } } } };
  var L = await local.create({ beforeMigration: async function (db) {
    var r = await db.query("insert into auth.users (email, raw_user_meta_data) values ('ancien@exemple.org', '{\"full_name\":\"Ancien\"}') returning id");
    existingUser = r.rows[0].id;
    await db.query('insert into public.progress (user_id, data) values ($1, $2)', [existingUser, existingProgress]);
  } });
  var a = await L.createUser('a@exemple.org', 'Aline');
  var b = await L.createUser('b@exemple.org', 'Benoit');
  var adminId = await L.createUser('admin@exemple.org', 'Admin');
  await L.db.query("update public.profiles set role = 'admin' where id = $1", [adminId]);
  // Professionnel approuvé par l'administration : le parcours « Monde professionnel » ouvre presque toutes les évaluations testées ici.
  var withTrack = async function (id, spec) {
    await L.rpc(id, 'choose_initial_track', { p_space: 'l1' });
    await L.rpc(id, 'request_pro', { p_specialization: spec || null });
    await L.rpc(adminId, 'admin_decide_pro', { p_user: id, p_approve: true });
    return id;
  };
  await withTrack(a); await withTrack(b);

  console.log('\nContinuité des données');
  await test('compte existant : profil créé, progression intacte', async function () {
    var p = await L.db.query('select display_name, role from public.profiles where id = $1', [existingUser]);
    assert.strictEqual(p.rows[0].display_name, 'Ancien'); assert.strictEqual(p.rows[0].role, 'student');
    var g = await L.db.query('select data from public.progress where user_id = $1', [existingUser]);
    assert.deepStrictEqual(g.rows[0].data, existingProgress);
  });
  await test('un nouveau compte reçoit automatiquement un profil étudiant', async function () {
    var p = await L.db.query('select role from public.profiles where id = $1', [a]);
    assert.strictEqual(p.rows[0].role, 'student');
  });

  console.log('\nSéparation des rôles et RLS');
  await test('un étudiant ne peut pas se donner le rôle admin', async function () {
    await rejects(L.as(a, 'authenticated', function (tx) { return tx.query("update public.profiles set role = 'admin' where id = $1", [a]); }), /permission denied/);
  });
  await test('un étudiant peut modifier son nom, pas celui d’un autre', async function () {
    await L.as(a, 'authenticated', function (tx) { return tx.query("update public.profiles set display_name = 'Aline M.' where id = $1", [a]); });
    await L.as(a, 'authenticated', function (tx) { return tx.query("update public.profiles set display_name = 'Pirate' where id = $1", [b]); });
    var r = await L.db.query('select display_name from public.profiles where id = $1', [b]);
    assert.strictEqual(r.rows[0].display_name, 'Benoit');
  });
  await test('RLS : un étudiant ne lit que son profil ; la progression d’autrui reste invisible', async function () {
    var r = await L.as(a, 'authenticated', function (tx) { return tx.query('select id from public.profiles'); });
    assert.deepStrictEqual(r.rows.map(function (x) { return x.id; }), [a]);
    var g = await L.as(a, 'authenticated', function (tx) { return tx.query('select * from public.progress where user_id = $1', [existingUser]); });
    assert.strictEqual(g.rows.length, 0);
  });
  await test('un étudiant ne peut pas écrire une validation, une tentative ni un score', async function () {
    await rejects(L.as(a, 'authenticated', function (tx) { return tx.query("insert into public.competency_validations (user_id, competency, source) values ($1, 'ip', 'admin')", [a]); }), /permission denied/);
    await rejects(L.as(a, 'authenticated', function (tx) { return tx.query("insert into public.attempts (user_id, assessment_id, status, passed) values ($1, 'final-ip', 'submitted', true)", [a]); }), /permission denied/);
  });
  await test('les corrigés sont inaccessibles au client (schéma privé)', async function () {
    await rejects(L.as(a, 'authenticated', function (tx) { return tx.query('select variants from private.questions'); }), /permission denied/);
    await rejects(L.as(null, 'anon', function (tx) { return tx.query('select variants from private.questions'); }), /permission denied/);
  });
  await test('anonyme : aucune évaluation lisible, aucune fonction exécutable', async function () {
    await rejects(L.as(null, 'anon', function (tx) { return tx.query('select * from public.assessments'); }), /permission denied/);
    await rejects(L.rpc(null, 'start_attempt', { p_assessment: 'final-ip' }, 'anon'), /permission denied/);
  });
  await test('fonctions d’administration refusées à un étudiant', async function () {
    await rejects(L.rpc(a, 'admin_stats', {}), /administration/);
    await rejects(L.rpc(a, 'admin_set_role', { p_user: a, p_role: 'admin' }), /administration/);
    await rejects(L.rpc(a, 'admin_set_validation', { p_user: a, p_competency: 'ip', p_granted: true }), /administration/);
  });
  await test('les fonctions de quota IA sont réservées à la clé de service', async function () {
    await rejects(L.rpc(a, 'ai_reserve_request', { p_user: a }), /permission denied/);
    await rejects(L.rpc(a, 'ai_record_usage', { p_user: a, p_input: 0, p_output: 0, p_cost: 0 }), /permission denied/);
    await rejects(L.rpc(a, 'ai_release_request', { p_user: a }), /permission denied/);
  });
  await test('un utilisateur non admin ne peut lire ni les paramètres privés ni les journaux', async function () {
    var r = await L.as(a, 'authenticated', function (tx) { return tx.query("select key from public.platform_settings where key = 'ai_monthly_budget_usd'"); });
    assert.strictEqual(r.rows.length, 0);
    var e = await L.as(a, 'authenticated', function (tx) { return tx.query('select * from public.audit_log'); });
    assert.strictEqual(e.rows.length, 0);
  });

  console.log('\nCorrection serveur');
  async function grade(kind, answer, value) {
    var r = await L.db.query('select private.grade($1, $2, $3) as ok', [kind, answer, { value: value }]);
    return r.rows[0].ok;
  }
  await test('numérique : virgule, point, tolérance, unité attendue', async function () {
    var ans = { value: 2.5, abs: 0.05, unit: 'ms' };
    assert.strictEqual(await grade('numeric', ans, '2,5'), true);
    assert.strictEqual(await grade('numeric', ans, '2.54'), true);
    assert.strictEqual(await grade('numeric', ans, '2.5 ms'), true);
    assert.strictEqual(await grade('numeric', ans, '2.6'), false);
    assert.strictEqual(await grade('numeric', ans, '2.5 kHz'), false);
    assert.strictEqual(await grade('numeric', ans, 'abc'), false);
    assert.strictEqual(await grade('numeric', ans, ''), false);
  });
  await test('numérique : tolérance relative et valeurs négatives', async function () {
    assert.strictEqual(await grade('numeric', { value: -100, rel: 0.02 }, '-101'), true);
    assert.strictEqual(await grade('numeric', { value: -100, rel: 0.02 }, '-103'), false);
    assert.strictEqual(await grade('numeric', { value: -100, rel: 0.02 }, '100'), false);
  });
  await test('QCM et texte (espaces et casse ignorés)', async function () {
    assert.strictEqual(await grade('qcm', { id: 'b' }, 'b'), true);
    assert.strictEqual(await grade('qcm', { id: 'b' }, 'c'), false);
    assert.strictEqual(await grade('text', { accepted: ['192.168.1.0'] }, ' 192.168.1.0 '), true);
    assert.strictEqual(await grade('text', { accepted: ['192.168.1.0'] }, '192.168.1.1'), false);
  });
  await test('banque : la réponse de CHAQUE variante est acceptée par le correcteur serveur', async function () {
    var n = 0, list = gen.assessments();
    for (var x of list) for (var q of x.questions) for (var v of q.variants) {
      var answer = Object.assign({}, v.answer, { unit: v.unit });
      var value = q.kind === 'qcm' ? v.answer.id : q.kind === 'text' ? v.answer.accepted[0] : String(v.answer.value);
      assert.strictEqual(await grade(q.kind, answer, value), true, q.id + ' : ' + value);
      n++;
    }
    assert.ok(n > 200, 'trop peu de variantes : ' + n);
  });

  console.log('\nÉvaluations');
  var attempt;
  async function correctValue(att, position) {
    var r = await L.db.query('select q.kind, q.variants -> i.variant_index as v from private.attempt_items i join private.questions q on q.id = i.question_id where i.attempt_id = $1 and i.position = $2', [att, position]);
    var row = r.rows[0];
    return row.kind === 'qcm' ? row.v.answer.id : row.kind === 'text' ? row.v.answer.accepted[0] : String(row.v.answer.value);
  }
  async function solve(user, att, items, howMany) {
    for (var i = 0; i < items.length; i++) {
      var val = i < howMany ? await correctValue(att, items[i].position) : '0';
      await L.rpc(user, 'save_answer', { p_attempt: att, p_position: items[i].position, p_value: val });
    }
  }

  await test('la tentative ne renvoie ni bonne réponse ni explication', async function () {
    attempt = await L.rpc(a, 'start_attempt', { p_assessment: 'final-circuits' });
    assert.strictEqual(attempt.items.length, 5);
    var s = JSON.stringify(attempt);
    assert.ok(!/"answer"|"explanation"|"accepted"/.test(s), s.slice(0, 200));
    assert.ok(attempt.deadline_at);
  });
  await test('reprise : relancer renvoie la même tentative et les mêmes questions', async function () {
    var again = await L.rpc(a, 'start_attempt', { p_assessment: 'final-circuits' });
    assert.strictEqual(again.attempt_id, attempt.attempt_id);
    assert.deepStrictEqual(again.items.map(function (i) { return i.prompt; }), attempt.items.map(function (i) { return i.prompt; }));
  });
  await test('un autre étudiant ne peut ni répondre ni soumettre ni lire cette tentative', async function () {
    await rejects(L.rpc(b, 'save_answer', { p_attempt: attempt.attempt_id, p_position: 1, p_value: '1' }), /introuvable/);
    await rejects(L.rpc(b, 'submit_attempt', { p_attempt: attempt.attempt_id }), /introuvable/);
    await rejects(L.rpc(b, 'attempt_result', { p_attempt: attempt.attempt_id }), /introuvable/);
  });
  await test('échec sous le seuil : aucune validation, ni corrigé ni énoncé, juste ou faux par notion', async function () {
    await solve(a, attempt.attempt_id, attempt.items, 2);
    var res = await L.rpc(a, 'submit_attempt', { p_attempt: attempt.attempt_id });
    assert.strictEqual(res.percent, 40); assert.strictEqual(res.passed, false);
    assert.strictEqual(res.show_correction, false); assert.strictEqual(res.correction_policy, 'after_pass');
    assert.ok(!/"answer"|"explanation"|"accepted"|"prompt"|"options"/.test(JSON.stringify(res)), JSON.stringify(res.items[0]));
    assert.ok(res.items.every(function (i) { return typeof i.correct === 'boolean' && i.skill; }));
    assert.strictEqual(res.items.filter(function (i) { return i.correct; }).length, 2);
    assert.ok(!/"answer"/.test(JSON.stringify(await L.rpc(a, 'attempt_result', { p_attempt: attempt.attempt_id }))));
    var v = await L.db.query('select count(*)::int as n from public.competency_validations where user_id = $1', [a]);
    assert.strictEqual(v.rows[0].n, 0);
  });
  await test('soumettre deux fois ne change pas le résultat ; répondre après coup est refusé', async function () {
    var res = await L.rpc(a, 'submit_attempt', { p_attempt: attempt.attempt_id });
    assert.strictEqual(res.percent, 40);
    await rejects(L.rpc(a, 'save_answer', { p_attempt: attempt.attempt_id, p_position: 1, p_value: '1' }), /terminée/);
  });
  await test('délai de réflexion appliqué après un échec', async function () {
    await rejects(L.rpc(a, 'start_attempt', { p_assessment: 'final-circuits' }), /Nouvelle tentative possible/);
  });
  await test('prérequis imposés par le serveur', async function () {
    await rejects(L.rpc(a, 'start_attempt', { p_assessment: 'final-ondes-em' }), /Prérequis non validés : signaux/);
  });
  await test('réussite : seule la correction serveur crée la validation', async function () {
    await L.db.query("update public.assessments set cooldown_minutes = 0 where id = 'final-circuits'");
    var t = await L.rpc(a, 'start_attempt', { p_assessment: 'final-circuits' });
    assert.notStrictEqual(t.attempt_id, attempt.attempt_id);
    await solve(a, t.attempt_id, t.items, 5);
    var res = await L.rpc(a, 'submit_attempt', { p_attempt: t.attempt_id });
    assert.strictEqual(res.passed, true); assert.strictEqual(res.percent, 100);
    assert.ok(res.show_correction && res.items[0].answer && res.items[0].explanation && res.items[0].prompt, 'corrigé après réussite');
    var v = await L.as(a, 'authenticated', function (tx) { return tx.query('select competency, source from public.competency_validations'); });
    assert.deepStrictEqual(v.rows, [{ competency: 'circuits', source: 'assessment' }]);
  });
  await test('temps écoulé : réponses tardives refusées, notation sur les réponses enregistrées', async function () {
    await L.db.query("update public.assessments set cooldown_minutes = 0 where id = 'final-signaux'");
    var t = await L.rpc(b, 'start_attempt', { p_assessment: 'final-signaux' });
    await solve(b, t.attempt_id, t.items.slice(0, 1), 1);
    await L.db.query("update public.attempts set deadline_at = now() - interval '5 minutes' where id = $1", [t.attempt_id]);
    await rejects(L.rpc(b, 'save_answer', { p_attempt: t.attempt_id, p_position: 2, p_value: '1' }), /Temps écoulé/);
    var res = await L.rpc(b, 'submit_attempt', { p_attempt: t.attempt_id });
    assert.strictEqual(res.status, 'expired'); assert.strictEqual(res.percent, 20);
  });
  await test('tentatives limitées', async function () {
    await L.db.query("update public.assessments set cooldown_minutes = 0 where id = 'placement-reseaux'");
    for (var i = 0; i < 2; i++) { var t = await L.rpc(b, 'start_attempt', { p_assessment: 'placement-reseaux' }); await L.rpc(b, 'submit_attempt', { p_attempt: t.attempt_id }); }
    await rejects(L.rpc(b, 'start_attempt', { p_assessment: 'placement-reseaux' }), /Nombre maximal/);
  });
  await test('positionnement : la réussite valide les compétences visées, sans prérequis', async function () {
    var c = await withTrack(await L.createUser('c@exemple.org'));
    var t = await L.rpc(c, 'start_attempt', { p_assessment: 'placement-bases' });
    await solve(c, t.attempt_id, t.items, t.items.length);
    var res = await L.rpc(c, 'submit_attempt', { p_attempt: t.attempt_id });
    assert.strictEqual(res.passed, true);
    assert.strictEqual(res.show_correction, false, 'aucun corrigé de positionnement, même réussi');
    assert.ok(!/"answer"|"explanation"|"prompt"/.test(JSON.stringify(res)));
    var v = await L.db.query("select competency, source from public.competency_validations where user_id = $1 order by 1", [c]);
    assert.deepStrictEqual(v.rows, [{ competency: 'circuits', source: 'placement' }, { competency: 'signaux', source: 'placement' }]);
  });
  await test('supervision humaine : la réussite reste en attente jusqu’à l’approbation', async function () {
    var d = await withTrack(await L.createUser('d@exemple.org'));
    await L.db.query("update public.assessments set requires_proctor = true where id = 'final-ip'");
    var t = await L.rpc(d, 'start_attempt', { p_assessment: 'final-ip' });
    await solve(d, t.attempt_id, t.items, t.items.length);
    var res = await L.rpc(d, 'submit_attempt', { p_attempt: t.attempt_id });
    assert.strictEqual(res.proctor_status, 'pending');
    var v = await L.db.query('select count(*)::int as n from public.competency_validations where user_id = $1', [d]);
    assert.strictEqual(v.rows[0].n, 0);
    await rejects(L.rpc(d, 'admin_review_attempt', { p_attempt: t.attempt_id, p_approve: true }), /administration/);
    var pend = await L.rpc(adminId, 'admin_pending_reviews', {});
    assert.strictEqual(pend.length, 1);
    await L.rpc(adminId, 'admin_review_attempt', { p_attempt: t.attempt_id, p_approve: true, p_note: 'ok' });
    var w = await L.db.query('select count(*)::int as n from public.competency_validations where user_id = $1', [d]);
    assert.strictEqual(w.rows[0].n, 1);
    await L.db.query("update public.assessments set requires_proctor = false where id = 'final-ip'");
  });

  console.log('\nAssistant IA : quotas');
  var svc = function (name, args) { return L.rpc(null, name, args, 'service_role'); };
  await test('coupé pendant une évaluation formelle en cours', async function () {
    var e = await withTrack(await L.createUser('e@exemple.org'));
    var t = await L.rpc(e, 'start_attempt', { p_assessment: 'final-signaux' });
    assert.deepStrictEqual(await svc('ai_reserve_request', { p_user: e }), { allowed: false, reason: 'exam_active' });
    await L.rpc(e, 'submit_attempt', { p_attempt: t.attempt_id });
    assert.strictEqual((await svc('ai_reserve_request', { p_user: e })).allowed, true);
  });
  await test('limite quotidienne, sans dépassement', async function () {
    var f = await L.createUser('f@exemple.org');
    await L.db.query("update public.platform_settings set value = '2' where key = 'ai_daily_requests'");
    assert.strictEqual((await svc('ai_reserve_request', { p_user: f })).allowed, true);
    assert.strictEqual((await svc('ai_reserve_request', { p_user: f })).allowed, true);
    var r = await svc('ai_reserve_request', { p_user: f });
    assert.strictEqual(r.allowed, false); assert.strictEqual(r.reason, 'daily_limit');
    await svc('ai_release_request', { p_user: f });
    assert.strictEqual((await svc('ai_reserve_request', { p_user: f })).allowed, true, 'demande rendue après une panne');
    await L.db.query("update public.platform_settings set value = '20' where key = 'ai_daily_requests'");
  });
  await test('budget mensuel et désactivation globale', async function () {
    var g = await L.createUser('g@exemple.org');
    await svc('ai_reserve_request', { p_user: g });
    await svc('ai_record_usage', { p_user: g, p_input: 1000, p_output: 500, p_cost: 11 });
    assert.strictEqual((await svc('ai_reserve_request', { p_user: g })).reason, 'budget');
    await L.db.query('update public.ai_usage_daily set cost_usd = 0');
    await L.rpc(adminId, 'admin_set_setting', { p_key: 'ai_enabled', p_value: false });
    assert.strictEqual((await svc('ai_reserve_request', { p_user: g })).reason, 'disabled');
    await L.rpc(adminId, 'admin_set_setting', { p_key: 'ai_enabled', p_value: true });
  });

  console.log('\nAdministration');
  await test('liste, statistiques, journal d’audit', async function () {
    var u = await L.rpc(adminId, 'admin_list_users', { p_search: 'aline', p_limit: 10, p_offset: 0 });
    assert.ok(u.length === 0 || u[0].email);
    var byMail = await L.rpc(adminId, 'admin_list_users', { p_search: 'a@exemple', p_limit: 10, p_offset: 0 });
    assert.strictEqual(byMail[0].id, a);
    var st = await L.rpc(adminId, 'admin_stats', {});
    assert.ok(st.users >= 7 && st.attempts >= 3);
    var au = await L.as(adminId, 'authenticated', function (tx) { return tx.query("select action from public.audit_log where action = 'review_attempt'"); });
    assert.strictEqual(au.rows.length, 1);
  });
  await test('un administrateur ne peut pas retirer son propre rôle', async function () {
    await rejects(L.rpc(adminId, 'admin_set_role', { p_user: adminId, p_role: 'student' }), /propre rôle/);
  });
  await test('journal d’erreurs borné par compte et par taille', async function () {
    await L.rpc(a, 'log_client_error', { p_kind: 'x'.repeat(100), p_message: 'y'.repeat(5000), p_context: {} });
    var r = await L.db.query('select length(kind) k, length(message) m from public.error_log where user_id = $1', [a]);
    assert.strictEqual(r.rows[0].k, 40); assert.strictEqual(r.rows[0].m, 1000);
    for (var i = 0; i < 40; i++) await L.rpc(a, 'log_client_error', { p_kind: 'x', p_message: 'y', p_context: {} });
    var n = await L.db.query('select count(*)::int n from public.error_log where user_id = $1', [a]);
    assert.strictEqual(n.rows[0].n, 30);
  });

  console.log('\nParcours');
  async function profile(id) { return (await L.db.query('select space, specialization, track_chosen_at from public.profiles where id = $1', [id])).rows[0]; }
  async function history(id) { return (await L.db.query('select from_space, to_space, kind from public.track_history where user_id = $1 order by id', [id])).rows; }
  async function validate(id, comps) { for (var x of comps) await L.db.query("insert into public.competency_validations (user_id, competency, source) values ($1, $2, 'admin') on conflict do nothing", [id, x]); }
  var t1 = await L.createUser('t1@exemple.org');
  await test('un compte neuf n’a aucun parcours et ne peut lancer aucune évaluation', async function () {
    assert.strictEqual((await profile(t1)).space, null);
    await rejects(L.rpc(t1, 'start_attempt', { p_assessment: 'final-circuits' }), /Choisissez d'abord votre parcours/);
    await rejects(L.rpc(t1, 'start_attempt', { p_assessment: 'placement-bases' }), /Choisissez d'abord votre parcours/);
  });
  await test('écrire directement son parcours est refusé', async function () {
    await rejects(L.as(t1, 'authenticated', function (tx) { return tx.query("update public.profiles set space = 'l3' where id = $1", [t1]); }), /permission denied/);
    await rejects(L.as(t1, 'authenticated', function (tx) { return tx.query("update public.profiles set specialization = 'pro-fibre' where id = $1", [t1]); }), /permission denied/);
    await rejects(L.as(t1, 'authenticated', function (tx) { return tx.query("insert into public.track_history (user_id, to_space, kind) values ($1, 'l3', 'change')", [t1]); }), /permission denied/);
  });
  await test('parcours inconnu ou spécialisation incohérente refusés', async function () {
    await rejects(L.rpc(t1, 'choose_initial_track', { p_space: 'doctorat' }), /Parcours inconnu/);
    await rejects(L.rpc(t1, 'choose_initial_track', { p_space: 'pro', p_specialization: 'l2-fibre' }), /Parcours inconnu/);
  });
  await test('choix initial enregistré, historisé, puis définitif', async function () {
    var r = await L.rpc(t1, 'choose_initial_track', { p_space: 'l1' });
    assert.strictEqual(r.space, 'l1'); assert.ok((await profile(t1)).track_chosen_at);
    assert.deepStrictEqual(await L.rpc(t1, 'choose_initial_track', { p_space: 'l1' }), r);
    await rejects(L.rpc(t1, 'choose_initial_track', { p_space: 'l3' }), /déjà enregistré/);
    assert.deepStrictEqual(await history(t1), [{ from_space: null, to_space: 'l1', kind: 'initial' }]);
  });
  await test('anonyme : aucune fonction de parcours', async function () {
    await rejects(L.rpc(null, 'choose_initial_track', { p_space: 'l1' }, 'anon'), /permission denied/);
    await rejects(L.rpc(null, 'change_track', { p_space: 'l1' }, 'anon'), /permission denied/);
  });
  await test('évaluation hors parcours refusée par le serveur', async function () {
    await rejects(L.rpc(t1, 'start_attempt', { p_assessment: 'final-fibre' }), /ne fait pas partie de votre parcours/);
    await rejects(L.rpc(t1, 'start_attempt', { p_assessment: 'final-mobiles' }), /ne fait pas partie de votre parcours/);
  });
  await test('évaluation d’un prérequis venant d’un autre niveau : autorisée', async function () {
    var l2 = await L.createUser('l2@exemple.org');
    await L.rpc(l2, 'choose_initial_track', { p_space: 'l1' });
    await validate(l2, ['circuits', 'signaux']);
    await L.rpc(l2, 'change_track', { p_space: 'l2' });
    var t = await L.rpc(l2, 'start_attempt', { p_assessment: 'final-signaux' });
    await L.rpc(l2, 'submit_attempt', { p_attempt: t.attempt_id });
  });
  await test('spécialisation : seules ses compétences sont ouvertes', async function () {
    var sp = await L.createUser('sp@exemple.org');
    await withTrack(sp, 'pro-fibre');
    await rejects(L.rpc(sp, 'start_attempt', { p_assessment: 'final-ip' }), /ne fait pas partie/);
    await rejects(L.rpc(sp, 'start_attempt', { p_assessment: 'final-fibre' }), /Prérequis non validés : ondes-em/);
  });
  await test('positionnement ouvert quel que soit le parcours', async function () {
    var t = await L.rpc(t1, 'start_attempt', { p_assessment: 'placement-radio' });
    assert.ok(t.attempt_id);
    await rejects(L.rpc(t1, 'change_track', { p_space: 'preparatoire' }), /évaluation en cours/);
    await L.rpc(t1, 'submit_attempt', { p_attempt: t.attempt_id });
  });
  await test('changer de niveau d’études : libre, sans compétences d’entrée', async function () {
    assert.strictEqual((await L.rpc(t1, 'change_track', { p_space: 'l2' })).space, 'l2');
    await validate(t1, ['circuits', 'signaux']);
  });
  await test('changer ne supprime ni validation ni tentative', async function () {
    var v = await L.db.query('select count(*)::int n from public.competency_validations where user_id = $1', [t1]);
    assert.strictEqual(v.rows[0].n, 2);
    var at = await L.db.query('select count(*)::int n from public.attempts where user_id = $1', [t1]);
    assert.strictEqual(at.rows[0].n, 1);
    assert.deepStrictEqual((await history(t1)).map(function (h) { return h.to_space; }), ['l1', 'l2']);
  });
  await test('étudiant : monde professionnel fermé tant que son parcours n’est pas validé ; redescendre reste libre', async function () {
    assert.strictEqual((await L.rpc(t1, 'change_track', { p_space: 'preparatoire' })).space, 'preparatoire');
    await validate(t1, ['binaire', 'ordinateur', 'iot-intro']);
    await rejects(L.rpc(t1, 'change_track', { p_space: 'pro', p_specialization: 'pro-reseaux' }), /à valider avant ce parcours/);
    assert.strictEqual((await profile(t1)).space, 'preparatoire', 'descendre ne réduit pas l’exigence');
    await validate(t1, (await L.db.query("select competency from private.track_competencies where track_key = 'l2' and competency not in ('circuits','signaux','binaire','ordinateur','iot-intro')")).rows.map(function (x) { return x.competency; }));
    assert.strictEqual((await L.rpc(t1, 'change_track', { p_space: 'pro', p_specialization: 'pro-reseaux' })).specialization, 'pro-reseaux');
    assert.strictEqual((await L.rpc(t1, 'change_track', { p_space: 'master' })).space, 'master', 'retour vers un niveau d’études libre');
  });
  await test('professionnel approuvé : tous les niveaux librement, sans validation', async function () {
    var dp = await withTrack(await L.createUser('direct-pro@exemple.org'));
    for (var sp2 of ['master', 'l3', 'l1', 'preparatoire', 'pro', 'l2']) assert.strictEqual((await L.rpc(dp, 'change_track', { p_space: sp2 })).space, sp2);
    assert.strictEqual((await L.db.query('select count(*)::int n from public.competency_validations where user_id = $1', [dp])).rows[0].n, 0);
    assert.strictEqual((await L.rpc(dp, 'change_track', { p_space: 'pro' })).space, 'pro');
  });
  await test('sans parcours initial, le changement est refusé', async function () {
    var n = await L.createUser('n@exemple.org');
    await rejects(L.rpc(n, 'change_track', { p_space: 'l1' }), /d'abord votre parcours/);
  });
  await test('une tentative ouverte avant un changement décidé par l’administration reste terminable', async function () {
    var u = await L.createUser('u@exemple.org');
    await L.rpc(u, 'choose_initial_track', { p_space: 'l1' });
    var t = await L.rpc(u, 'start_attempt', { p_assessment: 'final-circuits' });
    await L.db.query("update public.profiles set space = 'l3' where id = $1", [u]);
    assert.strictEqual((await L.rpc(u, 'start_attempt', { p_assessment: 'final-circuits' })).attempt_id, t.attempt_id);
    await L.rpc(u, 'submit_attempt', { p_attempt: t.attempt_id });
  });
  await test('référentiel serveur identique à core/curriculum.js', async function () {
    var cur = require('../core/curriculum.js');
    for (var t of cur.trackList()) {
      var r = await L.db.query('select competency from private.track_competencies where track_key = $1 order by 1', [t.key]);
      assert.deepStrictEqual(r.rows.map(function (x) { return x.competency; }), t.competencies.slice().sort(), t.key);
    }
  });

  console.log('\nChoix du niveau d’études');
  var mig4 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261110000200_v2_access_hardening.sql'), 'utf8');
  var mig5 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261111000100_v2_level_choice.sql'), 'utf8');
  var down5 = fs.readFileSync(path.join(__dirname, '../supabase/rollback/20261111000100_v2_level_choice.down.sql'), 'utf8');
  /** Rejoue la sécurisation : la migration 5 doit toujours être réappliquée après elle. */
  async function replay4() { await L.db.exec(mig4); await L.db.exec(mig5); }
  await test('inscription : Préparatoire, L1, L2, L3 et Master proposés à tous', async function () {
    for (var lv of ['preparatoire', 'l1', 'l2', 'l3', 'master']) {
      var u = await L.createUser('niveau-' + lv + '@exemple.org');
      assert.strictEqual((await L.rpc(u, 'choose_initial_track', { p_space: lv })).space, lv);
      assert.deepStrictEqual(await history(u), [{ from_space: null, to_space: lv, kind: 'initial' }]);
    }
  });
  await test('inscription : le Monde professionnel reste distinct, sur demande approuvée', async function () {
    var f = await L.createUser('first@exemple.org');
    await rejects(L.rpc(f, 'choose_initial_track', { p_space: 'pro' }), /Monde professionnel s'ouvre par une demande approuvée/);
    await rejects(L.rpc(f, 'choose_initial_track', { p_space: 'pro', p_specialization: 'pro-fibre' }), /demande approuvée/);
    assert.strictEqual((await profile(f)).space, null);
  });
  await test('commencer en L3 : évaluations ouvertes sans les niveaux précédents', async function () {
    var u = await L.createUser('direct-l3@exemple.org');
    await L.rpc(u, 'choose_initial_track', { p_space: 'l3' });
    var t = await L.rpc(u, 'start_attempt', { p_assessment: 'final-numerique' });
    assert.ok(t.attempt_id, 'prérequis modulation et chaîne (L2) recommandés, non bloquants');
    await L.rpc(u, 'submit_attempt', { p_attempt: t.attempt_id });
    assert.strictEqual((await L.db.query('select count(*)::int n from public.competency_validations where user_id = $1', [u])).rows[0].n, 0, 'aucune validation offerte');
    await rejects(L.rpc(u, 'start_attempt', { p_assessment: 'final-5g' }), /ne fait pas partie de votre parcours/);
    var p = await L.rpc(u, 'start_attempt', { p_assessment: 'placement-transmission' });
    assert.ok(p.attempt_id, 'test de positionnement facultatif disponible');
    await L.rpc(u, 'submit_attempt', { p_attempt: p.attempt_id });
  });
  await test('commencer en Master : évaluations du niveau ouvertes directement', async function () {
    var u = await L.createUser('direct-master@exemple.org');
    await L.rpc(u, 'choose_initial_track', { p_space: 'master' });
    var t = await L.rpc(u, 'start_attempt', { p_assessment: 'final-5g' });
    assert.ok(t.attempt_id);
    await L.rpc(u, 'submit_attempt', { p_attempt: t.attempt_id });
  });
  await test('un prérequis du même niveau reste exigé', async function () {
    var u = await L.createUser('ordre-l2@exemple.org');
    await L.rpc(u, 'choose_initial_track', { p_space: 'l2' });
    await rejects(L.rpc(u, 'start_attempt', { p_assessment: 'final-antennes' }), /Prérequis non validés : ondes-em/);
  });
  await test('changer de niveau conserve résultats, tentatives et progression', async function () {
    var u = await L.createUser('change-niveau@exemple.org');
    await L.rpc(u, 'choose_initial_track', { p_space: 'l3' });
    await validate(u, ['modulation']);
    var t = await L.rpc(u, 'start_attempt', { p_assessment: 'final-numerique' }); await L.rpc(u, 'submit_attempt', { p_attempt: t.attempt_id });
    await L.db.query('insert into public.progress (user_id, data) values ($1, $2)', [u, existingProgress]);
    for (var lv of ['l1', 'master', 'preparatoire', 'l3']) assert.strictEqual((await L.rpc(u, 'change_track', { p_space: lv })).space, lv);
    var r = (await L.db.query('select (select count(*)::int from public.competency_validations where user_id = $1) v, (select count(*)::int from public.attempts where user_id = $1) a, (select data from public.progress where user_id = $1) d', [u])).rows[0];
    assert.strictEqual(r.v, 1); assert.strictEqual(r.a, 1); assert.deepStrictEqual(r.d, existingProgress);
    assert.deepStrictEqual((await history(u)).map(function (h) { return h.to_space; }), ['l3', 'l1', 'master', 'preparatoire', 'l3']);
  });
  await test('étudiant non approuvé : Monde professionnel toujours fermé', async function () {
    var u = await L.createUser('sans-pro@exemple.org');
    await L.rpc(u, 'choose_initial_track', { p_space: 'master' });
    await rejects(L.rpc(u, 'change_track', { p_space: 'pro', p_specialization: 'pro-reseaux' }), /à valider avant ce parcours/);
    await L.rpc(u, 'request_pro', { p_specialization: 'pro-reseaux' });
    await rejects(L.rpc(u, 'change_track', { p_space: 'pro', p_specialization: 'pro-reseaux' }), /à valider avant ce parcours/);
  });
  await test('la migration 5 se rejoue, puis s’annule en rétablissant les règles précédentes, sans perte', async function () {
    await L.db.exec(mig5); await L.db.exec(mig5);
    var counts = 'select (select count(*)::int from public.competency_validations) v, (select count(*)::int from public.attempts) a, (select count(*)::int from public.profiles where space is not null) p, (select count(*)::int from public.track_history) h';
    var before = (await L.db.query(counts)).rows[0];
    await L.db.exec(down5);
    assert.deepStrictEqual((await L.db.query(counts)).rows[0], before);
    var u = await L.createUser('annulation5@exemple.org');
    await rejects(L.rpc(u, 'choose_initial_track', { p_space: 'l3' }), /premier parcours est Préparatoire ou Licence 1/);
    await rejects(L.rpc(null, 'start_attempt', { p_assessment: 'final-circuits' }, 'anon'), /permission denied/);
    await L.db.exec(mig5);
    assert.strictEqual((await L.rpc(u, 'choose_initial_track', { p_space: 'l3' })).space, 'l3');
  });
  await test('droits : fonctions fermées aux visiteurs anonymes', async function () {
    await rejects(L.rpc(null, 'choose_initial_track', { p_space: 'l3' }, 'anon'), /permission denied/);
    await rejects(L.rpc(null, 'change_track', { p_space: 'l3' }, 'anon'), /permission denied/);
    await rejects(L.rpc(null, 'start_attempt', { p_assessment: 'final-circuits' }, 'anon'), /permission denied/);
  });

  console.log('\nSécurisation des accès');
  async function prof4(id) { return (await L.db.query('select space, specialization, pro_status from public.profiles where id = $1', [id])).rows[0]; }
  await test('seul le nom d’affichage reste modifiable par l’étudiant', async function () {
    var cols = (await L.db.query("select column_name c from information_schema.column_privileges where grantee = 'authenticated' and table_name = 'profiles' and privilege_type = 'UPDATE'")).rows.map(function (x) { return x.c; });
    assert.deepStrictEqual(cols, ['display_name']);
  });
  var p1 = await L.createUser('pro1@exemple.org');
  await test('demande professionnelle : en attente, aucun droit avant l’approbation', async function () {
    await rejects(L.rpc(p1, 'request_pro', {}), /d'abord votre parcours/);
    await L.rpc(p1, 'choose_initial_track', { p_space: 'l1' });
    var r = await L.rpc(p1, 'request_pro', { p_specialization: 'pro-reseaux', p_message: '  Technicien réseau depuis 6 ans  ' });
    assert.strictEqual(r.pro_status, 'pending');
    assert.deepStrictEqual(await prof4(p1), { space: 'l1', specialization: null, pro_status: 'pending' });
    await rejects(L.rpc(p1, 'change_track', { p_space: 'pro', p_specialization: 'pro-reseaux' }), /à valider avant ce parcours/);
    await rejects(L.as(p1, 'authenticated', function (tx) { return tx.query("update public.profiles set pro_status = 'approved' where id = $1", [p1]); }), /permission denied/);
    await rejects(L.rpc(p1, 'request_pro', { p_specialization: 'l2' }), /Parcours inconnu/);
    await rejects(L.rpc(null, 'request_pro', {}, 'anon'), /permission denied/);
    await rejects(L.rpc(p1, 'admin_decide_pro', { p_user: p1, p_approve: true }), /Réservé/);
    await rejects(L.rpc(p1, 'admin_list_pro_requests', {}), /Réservé/);
    var list = await L.rpc(adminId, 'admin_list_pro_requests', {});
    var mine = list.filter(function (x) { return x.id === p1; })[0];
    assert.ok(mine && mine.pro_status === 'pending' && mine.pro_specialization === 'pro-reseaux' && mine.pro_message === 'Technicien réseau depuis 6 ans' && mine.email === 'pro1@exemple.org', JSON.stringify(mine));
  });
  await test('approbation : Monde professionnel, spécialisation demandée, accès libre, décision tracée', async function () {
    assert.strictEqual((await L.rpc(adminId, 'admin_decide_pro', { p_user: p1, p_approve: true })).pro_status, 'approved');
    assert.deepStrictEqual(await prof4(p1), { space: 'pro', specialization: 'pro-reseaux', pro_status: 'approved' });
    assert.deepStrictEqual((await history(p1)).map(function (h) { return h.kind + ':' + h.to_space; }), ['initial:l1', 'change:pro']);
    assert.strictEqual((await L.rpc(p1, 'change_track', { p_space: 'master' })).space, 'master');
    assert.strictEqual((await L.db.query("select count(*)::int n from public.audit_log where action = 'decide_pro' and target = $1", [p1])).rows[0].n, 1);
    assert.ok(!(await L.rpc(adminId, 'admin_list_pro_requests', {})).some(function (x) { return x.id === p1; }));
  });
  await test('refus : parcours inchangé, nouvelle demande après 24 heures', async function () {
    var p2 = await L.createUser('pro2@exemple.org');
    await L.rpc(p2, 'choose_initial_track', { p_space: 'preparatoire' });
    await L.rpc(p2, 'request_pro', {});
    assert.strictEqual((await L.rpc(adminId, 'admin_decide_pro', { p_user: p2, p_approve: false, p_note: 'Justificatif absent' })).pro_status, 'rejected');
    assert.deepStrictEqual(await prof4(p2), { space: 'preparatoire', specialization: null, pro_status: 'rejected' });
    await rejects(L.rpc(p2, 'request_pro', {}), /24 heures/);
    await L.db.query("update public.profiles set pro_decided_at = now() - interval '25 hours' where id = $1", [p2]);
    assert.strictEqual((await L.rpc(p2, 'request_pro', {})).pro_status, 'pending');
    await rejects(L.rpc(adminId, 'admin_decide_pro', { p_user: existingUser, p_approve: true }), /Aucune demande/);
  });
  var old = await L.createUser('ancien-pro@exemple.org');
  await test('ancien compte inscrit en professionnel : droits et données conservés, à vérifier', async function () {
    await L.rpc(old, 'choose_initial_track', { p_space: 'l1' });
    // État laissé par les versions précédentes : inscription directe dans le Monde professionnel.
    await L.db.query("update public.profiles set space = 'pro', pro_status = null where id = $1", [old]);
    await L.db.query("update public.track_history set to_space = 'pro' where user_id = $1 and kind = 'initial'", [old]);
    await validate(old, ['circuits']);
    await replay4();
    assert.strictEqual((await prof4(old)).pro_status, 'legacy');
    assert.strictEqual((await prof4(p1)).pro_status, 'approved', 'rejouer la migration ne change aucune décision');
    assert.strictEqual((await L.rpc(old, 'change_track', { p_space: 'master' })).space, 'master');
    var l = (await L.rpc(adminId, 'admin_list_pro_requests', {})).filter(function (x) { return x.id === old; })[0];
    assert.ok(l && l.pro_status === 'legacy' && l.validations === 1, JSON.stringify(l));
  });
  await test('vérification refusée : retour au plus haut niveau réellement ouvert, rien n’est supprimé', async function () {
    var before = (await L.db.query('select (select count(*)::int from public.competency_validations where user_id = $1) v, (select count(*)::int from public.track_history where user_id = $1) h', [old])).rows[0];
    await L.rpc(adminId, 'admin_decide_pro', { p_user: old, p_approve: false });
    assert.deepStrictEqual(await prof4(old), { space: 'l1', specialization: null, pro_status: 'rejected' });
    var after = (await L.db.query('select (select count(*)::int from public.competency_validations where user_id = $1) v, (select count(*)::int from public.track_history where user_id = $1) h', [old])).rows[0];
    assert.strictEqual(after.v, before.v); assert.strictEqual(after.h, before.h + 1);
    await rejects(L.rpc(old, 'change_track', { p_space: 'pro' }), /à valider avant ce parcours/);
    assert.strictEqual((await L.rpc(old, 'change_track', { p_space: 'master' })).space, 'master', 'niveaux d’études libres');
    await replay4();
    assert.strictEqual((await prof4(old)).pro_status, 'rejected');
  });
  var vv = await L.createUser('variantes@exemple.org');
  await L.rpc(vv, 'choose_initial_track', { p_space: 'l1' });
  async function items(att) { return (await L.db.query('select question_id q, variant_index v, option_order o from private.attempt_items where attempt_id = $1 order by position', [att])).rows; }
  await test('nouvelle tentative : questions inédites d’abord, autre version des questions déjà vues', async function () {
    await L.db.query("update public.assessments set cooldown_minutes = 0 where id = 'final-signaux'");
    var bank = (await L.db.query("select count(*)::int n from private.questions where assessment_id = 'final-signaux' and active")).rows[0].n;
    var t1a = await L.rpc(vv, 'start_attempt', { p_assessment: 'final-signaux' }); await L.rpc(vv, 'submit_attempt', { p_attempt: t1a.attempt_id });
    var t2a = await L.rpc(vv, 'start_attempt', { p_assessment: 'final-signaux' }); await L.rpc(vv, 'submit_attempt', { p_attempt: t2a.attempt_id });
    var i1 = await items(t1a.attempt_id), i2 = await items(t2a.attempt_id);
    var common = i2.filter(function (x) { return i1.some(function (y) { return y.q === x.q; }); });
    assert.strictEqual(common.length, Math.max(0, 2 * i1.length - bank), 'banque ' + bank + ', communes ' + common.length);
    assert.ok(common.every(function (x) { return i1.filter(function (y) { return y.q === x.q; })[0].v !== x.v; }), 'même version reprise');
  });
  await test('QCM : ordre des choix propre à chaque tentative, correction inchangée', async function () {
    var t = await L.rpc(vv, 'start_attempt', { p_assessment: 'final-signaux' });
    var rows = await items(t.attempt_id), checked = 0;
    for (var k = 0; k < t.items.length; k++) {
      if (t.items[k].kind !== 'qcm') continue;
      checked++;
      assert.deepStrictEqual(t.items[k].options.map(function (o) { return o.id; }), rows[k].o);
      var ref = (await L.db.query('select variants -> $2::int -> \'options\' o from private.questions where id = $1', [rows[k].q, rows[k].v])).rows[0].o;
      assert.deepStrictEqual(rows[k].o.slice().sort(), ref.map(function (o) { return o.id; }).sort());
    }
    await solve(vv, t.attempt_id, t.items, t.items.length);
    assert.strictEqual((await L.rpc(vv, 'submit_attempt', { p_attempt: t.attempt_id })).percent, 100);
    assert.ok(checked > 0 || t.items.every(function (i) { return i.kind !== 'qcm'; }));
  });
  await test('échecs répétés : attente de 30 min, puis 2 h, puis 24 h ; la réussite remet à zéro', async function () {
    var cw = await L.createUser('attente@exemple.org');
    await L.rpc(cw, 'choose_initial_track', { p_space: 'l1' });
    await L.db.query("update public.assessments set cooldown_minutes = 30 where id = 'final-circuits'");
    var age = function (txt) { return L.db.query("update public.attempts set submitted_at = now() - interval '" + txt + "' where user_id = $1", [cw]); };
    var fail = async function () { var t = await L.rpc(cw, 'start_attempt', { p_assessment: 'final-circuits' }); await L.rpc(cw, 'submit_attempt', { p_attempt: t.attempt_id }); };
    await fail();
    await rejects(L.rpc(cw, 'start_attempt', { p_assessment: 'final-circuits' }), /Nouvelle tentative possible/);
    await age('40 minutes'); await fail();
    await age('40 minutes');
    await rejects(L.rpc(cw, 'start_attempt', { p_assessment: 'final-circuits' }), /Nouvelle tentative possible/);
    await age('3 hours'); await fail();
    await age('3 hours');
    await rejects(L.rpc(cw, 'start_attempt', { p_assessment: 'final-circuits' }), /Nouvelle tentative possible/);
    await age('25 hours');
    var t = await L.rpc(cw, 'start_attempt', { p_assessment: 'final-circuits' });
    await solve(cw, t.attempt_id, t.items, t.items.length);
    assert.strictEqual((await L.rpc(cw, 'submit_attempt', { p_attempt: t.attempt_id })).passed, true);
    await age('40 minutes'); await fail();
    await age('40 minutes');
    assert.ok((await L.rpc(cw, 'start_attempt', { p_assessment: 'final-circuits' })).attempt_id, 'après une réussite, un échec ne coûte que 30 min');
  });

  console.log('\nLimites de la progression');
  var mig6 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261112000100_v2_progress_limits.sql'), 'utf8');
  await test('progression : écriture normale acceptée, plus de 1 Mo refusée, ancienne progression intacte', async function () {
    var u = await L.createUser('volume@exemple.org');
    var write = function (data) { return L.as(u, 'authenticated', function (tx) { return tx.query('insert into public.progress (user_id, data) values ($1, $2) on conflict (user_id) do update set data = excluded.data', [u, data]); }); };
    await write({ lessons: { circuits: { chapters: { c1: '2026-11-01' } } } });
    await rejects(write({ blob: 'x'.repeat(1100000) + Math.random() }), /progress_data_size/);
    var big = { blob: Array.from({ length: 1200000 }, function (_, i) { return String.fromCharCode(33 + (i * 7919) % 90); }).join('') };
    await rejects(write(big), /progress_data_size/);
    assert.deepStrictEqual((await L.db.query('select data from public.progress where user_id = $1', [u])).rows[0].data, { lessons: { circuits: { chapters: { c1: '2026-11-01' } } } });
    assert.deepStrictEqual((await L.db.query('select data from public.progress where user_id = $1', [existingUser])).rows[0].data, existingProgress);
  });
  await test('progression : TRUNCATE refusé aux comptes connectés et aux visiteurs', async function () {
    await rejects(L.as(a, 'authenticated', function (tx) { return tx.query('truncate public.progress'); }), /permission denied/);
    await rejects(L.as(null, 'anon', function (tx) { return tx.query('truncate public.progress'); }), /permission denied/);
  });
  await test('limites de la progression : rejouables puis annulables sans perte', async function () {
    await L.db.exec(mig6); await L.db.exec(mig6);
    var n = (await L.db.query('select count(*)::int n from public.progress')).rows[0].n;
    await L.db.exec(fs.readFileSync(path.join(__dirname, '../supabase/rollback/20261112000100_v2_progress_limits.down.sql'), 'utf8'));
    assert.strictEqual((await L.db.query("select count(*)::int n from pg_constraint where conname = 'progress_data_size'")).rows[0].n, 0);
    assert.strictEqual((await L.db.query('select count(*)::int n from public.progress')).rows[0].n, n);
    await L.db.exec(mig6);
  });

  console.log('\nRéversibilité');
  await test('la sécurisation se rejoue puis s’annule sans perte', async function () {
    await replay4();
    await L.db.exec(down5);
    var counts = 'select (select count(*)::int from public.competency_validations) v, (select count(*)::int from public.attempts) a, (select count(*)::int from public.profiles where pro_status is not null) p';
    var before = (await L.db.query(counts)).rows[0];
    await L.db.exec(fs.readFileSync(path.join(__dirname, '../supabase/rollback/20261110000200_v2_access_hardening.down.sql'), 'utf8'));
    assert.deepStrictEqual((await L.db.query(counts)).rows[0], before);
    assert.strictEqual((await L.db.query("select to_regprocedure('public.request_pro(text,text)') f")).rows[0].f, null);
    var z = await L.createUser('apres-annulation@exemple.org');
    assert.strictEqual((await L.rpc(z, 'choose_initial_track', { p_space: 'l3' })).space, 'l3', 'règles de la migration 3 rétablies');
    var t = await L.rpc(z, 'start_attempt', { p_assessment: 'final-modulation' }).catch(function (e) { return e; });
    assert.ok(t.attempt_id || /Prérequis/.test(t.message), String(t.message));
  });
  await test('la migration se rejoue sans erreur (idempotente) et sans perte', async function () {
    var sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261108000100_v2_core.sql'), 'utf8');
    await L.db.exec(sql);
    var v = await L.db.query('select count(*)::int n from public.competency_validations');
    assert.ok(v.rows[0].n >= 4);
  });
  await test('l’annulation retire la V2 et conserve comptes et progressions', async function () {
    await L.db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261110000100_v2_pro_access.sql'), 'utf8'));
    await L.db.exec(fs.readFileSync(path.join(__dirname, '../supabase/rollback/20261110000100_v2_pro_access.down.sql'), 'utf8'));
    assert.strictEqual((await L.db.query("select to_regprocedure('private.is_direct_pro(uuid)') as f")).rows[0].f, null);
    var migration2 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261108000200_v2_tracks.sql'), 'utf8');
    await L.db.exec(migration2);
    var spaceKept = (await L.db.query('select count(*)::int n from public.profiles where space is not null')).rows[0].n;
    await L.db.exec(fs.readFileSync(path.join(__dirname, '../supabase/rollback/20261108000200_v2_tracks.down.sql'), 'utf8'));
    assert.strictEqual((await L.db.query('select count(*)::int n from public.profiles where space is not null')).rows[0].n, spaceKept);
    assert.strictEqual((await L.db.query("select to_regclass('public.track_history') as a")).rows[0].a, null);
    var down = fs.readFileSync(path.join(__dirname, '../supabase/rollback/20261108000100_v2_core.down.sql'), 'utf8');
    await L.db.exec(down);
    var g = await L.db.query('select data from public.progress where user_id = $1', [existingUser]);
    assert.deepStrictEqual(g.rows[0].data, existingProgress);
    var u = await L.db.query('select count(*)::int n from auth.users');
    assert.ok(u.rows[0].n >= 7);
    var t = await L.db.query("select to_regclass('public.attempts') as a, to_regclass('public.profiles') as b");
    assert.strictEqual(t.rows[0].a, null); assert.strictEqual(t.rows[0].b, null);
    await L.db.query("insert into auth.users (email) values ('apres@exemple.org')");
  });

  console.log('\n' + passed + ' tests réussis, ' + failed + ' échec(s).');
  process.exit(failed ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(1); });
