#!/usr/bin/env node
/*
 * Génère supabase/seed/assessments.generated.sql à partir de la banque de
 * questions et du référentiel. Idempotent : ne réinitialise jamais les réglages
 * modifiés dans l'administration (seuil, durée, tentatives, statut).
 */
'use strict';
var fs = require('fs');
var path = require('path');
var bank = require('../content/assessments/bank.js');
var cur = require('../core/curriculum.js');

function lit(v) { return "'" + String(v).replace(/'/g, "''") + "'"; }
function arr(a) { return "array[" + a.map(lit).join(',') + "]::text[]"; }
function json(v) { return lit(JSON.stringify(v)) + '::jsonb'; }

function assessments() {
  var out = [];
  Object.keys(cur.competencies).forEach(function (id) {
    var c = cur.competencies[id];
    if (!bank[id]) throw new Error('Banque manquante : ' + id);
    out.push({ id: 'final-' + id, title: 'Évaluation : ' + c.title, description: 'Évaluation de fin de module, corrigée par le serveur.',
      kind: 'course_final', competency: id, count: Math.min(5, bank[id].length), pass: 70, duration: 1200, maxAttempts: null, cooldown: 30,
      prerequisites: c.prerequisites, grants: [], questions: bank[id].map(function (q) { return Object.assign({}, q, { id: id + ':' + q.id }); }) });
  });
  cur.placements.forEach(function (p) {
    var qs = [];
    p.grants.forEach(function (g) { bank[g].slice(0, 4).forEach(function (q) { qs.push(Object.assign({}, q, { id: p.id + ':' + q.id })); }); });
    out.push({ id: p.id, title: p.title, description: p.description, kind: 'placement', competency: null, count: Math.min(10, qs.length), pass: 80, duration: 1500, maxAttempts: 2, cooldown: 1440,
      prerequisites: [], grants: p.grants, questions: qs });
  });
  return out;
}

function sql(list) {
  var s = ['-- FICHIER GÉNÉRÉ par tools/generate-assessments.js : ne pas modifier à la main.', '-- À exécuter après les deux migrations de supabase/migrations/. Peut être relancé sans risque.', 'begin;'];
  list.forEach(function (a) {
    s.push('insert into public.assessments (id,title,description,kind,competency,question_count,pass_percent,duration_seconds,max_attempts,cooldown_minutes,prerequisites,grants,status) values (' +
      [lit(a.id), lit(a.title), lit(a.description), lit(a.kind), a.competency ? lit(a.competency) : 'null', a.count, a.pass, a.duration, a.maxAttempts || 'null', a.cooldown, arr(a.prerequisites), arr(a.grants), "'published'"].join(',') +
      ') on conflict (id) do update set title=excluded.title, description=excluded.description, prerequisites=excluded.prerequisites, grants=excluded.grants;');
    a.questions.forEach(function (q) {
      s.push('insert into private.questions (id,assessment_id,skill,kind,variants) values (' + [lit(q.id), lit(a.id), lit(q.skill), lit(q.kind), json(q.variants)].join(',') +
        ') on conflict (id) do update set skill=excluded.skill, kind=excluded.kind, variants=excluded.variants;');
    });
  });
  s.push('delete from private.track_competencies;', 'delete from private.track_catalog;');
  cur.trackList().forEach(function (t) {
    s.push('insert into private.track_catalog (track_key,space,specialization,rank,entry) values (' + [lit(t.key), lit(t.space), t.specialization ? lit(t.specialization) : 'null', t.rank == null ? 'null' : t.rank, arr(t.entry)].join(',') + ');');
    t.competencies.forEach(function (c) { s.push('insert into private.track_competencies (track_key,competency) values (' + lit(t.key) + ',' + lit(c) + ');'); });
  });
  s.push('commit;', '');
  return s.join('\n');
}

var list = assessments();
module.exports = { assessments: assessments, sql: sql };

if (require.main === module) {
  var out = path.join(__dirname, '..', 'supabase', 'seed', 'assessments.generated.sql');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, sql(list));
  var n = list.reduce(function (t, a) { return t + a.questions.length; }, 0);
  console.log(list.length + ' évaluations, ' + n + ' questions → ' + path.relative(process.cwd(), out));
}
