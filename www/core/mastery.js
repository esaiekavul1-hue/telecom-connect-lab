/*
 * TELECOM CONNECT LAB — Moteur de progression par la maîtrise
 * ----------------------------------------------------------
 * Calculs purs, sans accès au réseau. Deux niveaux distincts :
 *   - l'entraînement (chapitres, exercices, missions) vient du carnet local :
 *     il oriente l'étudiant mais ne prouve rien ;
 *   - la validation officielle vient UNIQUEMENT du serveur (ctx.validated).
 *
 * ctx = {
 *   state      : progression (core/store.js),
 *   content    : { module: { chapters:[id], missions:[id], exercises:[{id,skill}] } },
 *   validated  : { competence: { source, validated_at } },
 *   curriculum : core/curriculum.js,
 *   thresholds : { lesson, exercises, lab } en %, facultatif
 * }
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.mastery = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var DEFAULTS = { lesson: 100, exercises: 70, lab: 50 };

  function pct(done, total) { return total ? Math.round(done / total * 100) : 0; }
  function th(ctx) { return Object.assign({}, DEFAULTS, ctx.thresholds || {}); }

  function missingPrerequisites(id, ctx) {
    var c = ctx.curriculum.competencies[id];
    if (!c) return [];
    return c.prerequisites.filter(function (p) { return !ctx.validated[p]; });
  }

  /** Compétences à retravailler : exercices tentés mais jamais réussis, regroupés. */
  function weakSkills(id, ctx) {
    var ex = (ctx.state.exercises[id] || {}).items || {};
    var by = {};
    ((ctx.content[id] || {}).exercises || []).forEach(function (e) {
      var it = ex[e.id];
      if (it && it.attempts > 0 && !(it.correct > 0)) by[e.skill] = (by[e.skill] || 0) + 1;
    });
    return Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).map(function (s) { return { skill: s, failed: by[s] }; });
  }

  function moduleMastery(id, ctx) {
    var content = ctx.content[id] || { chapters: [], missions: [], exercises: [] };
    var st = ctx.state, t = th(ctx);
    var L = (st.lessons[id] || {}).chapters || {};
    var Mi = (st.lab[id] || {}).missions || {};
    var E = (st.exercises[id] || {}).items || {};
    var lessonPct = pct(content.chapters.filter(function (c) { return L[c]; }).length, content.chapters.length);
    var labPct = pct(content.missions.filter(function (m) { return Mi[m]; }).length, content.missions.length);
    var exercisePct = pct(content.exercises.filter(function (e) { return E[e.id] && E[e.id].correct > 0; }).length, content.exercises.length);
    var steps = [
      { key: 'lesson', label: 'Leçon', percent: lessonPct, target: t.lesson, done: lessonPct >= t.lesson, href: '#/lecons/' + id },
      { key: 'exercises', label: 'Exercices et quiz', percent: exercisePct, target: t.exercises, done: exercisePct >= t.exercises, href: '#/defis/' + id },
      { key: 'lab', label: 'Travaux pratiques virtuels', percent: labPct, target: t.lab, done: labPct >= t.lab, href: '#/laboratoire/' + id }
    ];
    var ready = steps.every(function (s) { return s.done; });
    var started = lessonPct > 0 || exercisePct > 0 || labPct > 0;
    var missing = missingPrerequisites(id, ctx);
    var validated = ctx.validated[id] || null;
    var status = validated ? 'validated' : missing.length ? 'locked' : ready ? 'ready' : started ? 'in_progress' : 'available';
    return { id: id, status: status, validated: validated, prerequisitesMissing: missing, ready: ready, started: started, steps: steps, weak: weakSkills(id, ctx),
      percent: validated ? 100 : Math.round((Math.min(lessonPct, t.lesson) / t.lesson + Math.min(exercisePct, t.exercises) / t.exercises + Math.min(labPct, t.lab) / t.lab) / 3 * 90) };
  }

  /** État d'un cours : agrège ses modules ; un cours sans module reste « à développer ». */
  function courseState(course, ctx) {
    if (!course.modules.length) return { status: 'planned', percent: 0, modules: [] };
    var mods = course.modules.map(function (m) { return moduleMastery(m, ctx); });
    var all = function (s) { return mods.every(function (m) { return m.status === s; }); };
    var status = all('validated') ? 'validated' : all('locked') ? 'locked'
      : mods.some(function (m) { return m.status === 'in_progress' || m.status === 'ready' || m.status === 'validated'; }) ? 'in_progress' : 'available';
    return { status: status, percent: Math.round(mods.reduce(function (s, m) { return s + m.percent; }, 0) / mods.length), modules: mods };
  }

  function spaceState(space, ctx) {
    var courses = space.courses.map(function (c) { return Object.assign({}, c, { state: courseState(c, ctx) }); });
    var live = courses.filter(function (c) { return c.state.status !== 'planned'; });
    return { courses: courses, available: live.length, total: courses.length,
      validated: live.filter(function (c) { return c.state.status === 'validated'; }).length,
      percent: live.length ? Math.round(live.reduce(function (s, c) { return s + c.state.percent; }, 0) / live.length) : 0 };
  }

  /**
   * Prochaines actions : d'abord la remédiation après un échec, puis ce qui est
   * prêt à valider, puis ce qui est commencé, puis la suite logique.
   * ctx.failedAttempts : [{ competency, skills:[…] }], dernier échec par compétence.
   */
  function recommendations(ctx, limit) {
    var out = [], seen = {}, ids = Object.keys(ctx.curriculum.competencies).filter(function (id) { return ctx.content[id]; });
    function add(id, r) { if (!seen[id]) { seen[id] = 1; out.push(Object.assign({ module: id }, r)); } }
    var title = function (id) { return ctx.curriculum.competencies[id].title; };
    (ctx.failedAttempts || []).forEach(function (f) {
      if (ctx.validated[f.competency] || !ctx.content[f.competency]) return;
      add(f.competency, { kind: 'remediation', icon: 'reset', href: '#/competence/' + f.competency,
        text: title(f.competency) + ' : retravailler ' + (f.skills.length ? f.skills.slice(0, 2).join(', ') : 'les notions de l’évaluation') + ' avant une nouvelle tentative' });
    });
    var mm = ids.map(function (id) { return moduleMastery(id, ctx); });
    mm.filter(function (m) { return m.status === 'ready'; }).forEach(function (m) { add(m.id, { kind: 'assess', icon: 'shield', href: '#/competence/' + m.id, text: title(m.id) + ' : vous pouvez passer l’évaluation' }); });
    mm.filter(function (m) { return m.status === 'in_progress'; }).forEach(function (m) {
      var next = m.steps.filter(function (s) { return !s.done; })[0];
      add(m.id, { kind: 'continue', icon: 'book', href: next.href, text: title(m.id) + ' : poursuivre « ' + next.label.toLowerCase() + ' » (' + next.percent + ' %, seuil conseillé ' + next.target + ' %)' });
    });
    mm.filter(function (m) { return m.status === 'available'; }).forEach(function (m) { add(m.id, { kind: 'start', icon: 'arrowRight', href: '#/competence/' + m.id, text: 'Commencer : ' + title(m.id) }); });
    return out.slice(0, limit || 4);
  }

  return { DEFAULTS: DEFAULTS, moduleMastery: moduleMastery, courseState: courseState, spaceState: spaceState, weakSkills: weakSkills, recommendations: recommendations, missingPrerequisites: missingPrerequisites };
});
