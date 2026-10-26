/*
 * TELECOM CONNECT LAB — Catalogue des modules
 * ------------------------------------------
 * Chaque module comporte trois parties : leçon (TCL.lessons[id]), simulation
 * (TCL.labs[id]) et exercices (TCL.exercises[id]).
 *
 * Le statut affiché est CALCULÉ à partir des fichiers réellement chargés :
 * une partie n'est considérée comme disponible que si son fichier est présent
 * dans index.html ET si elle est déclarée (parts.* = true) ci-dessous.
 * Rien ne peut donc être annoncé « disponible » sans contenu fonctionnel.
 *
 * Pour ajouter un module :
 *   1. créer modules/<id>/ avec lesson.js, simulation.js, exercises.js
 *      (et un fichier de calculs <id>-math.js testable) ;
 *   2. charger ces fichiers dans index.html, avant ce fichier ;
 *   3. ajouter le module ci-dessous.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};

  var categories = [
    { id: 'bases', title: 'Bases du signal', text: 'Les grandeurs qui décrivent tout signal transmis.' },
    { id: 'ondes', title: 'Ondes et antennes', text: 'Comment un signal devient une onde et se propage.' },
    { id: 'transmission', title: 'Transmission', text: 'Du message à l’émetteur, du support au récepteur.' },
    { id: 'reseaux', title: 'Réseaux', text: 'Acheminer l’information entre de nombreux équipements.' }
  ];

  var ALL = { lesson: true, lab: true, exercises: true };

  /* L'ordre de ce tableau est le parcours conseillé. */
  var modules = [
    { id: 'signaux', category: 'bases', parts: ALL, icon: 'wave', title: 'Comprendre les signaux',
      text: 'Amplitude, fréquence, période et phase d’un signal sinusoïdal.' },
    { id: 'ondes-em', category: 'ondes', parts: ALL, icon: 'em', title: 'Ondes électromagnétiques',
      text: 'Champs E et B, fréquence, vitesse, longueur d’onde et spectre radio.' },
    { id: 'antennes', category: 'ondes', parts: ALL, icon: 'antenna', title: 'Antennes',
      text: 'Dipôles et réseaux d’antennes : diagramme de rayonnement, gain, directivité, polarisation.' },
    { id: 'propagation', category: 'ondes', parts: ALL, icon: 'propagation', title: 'Notions de propagation radio',
      text: 'Espace libre, réflexion sur le sol, obstacles, bilan de liaison et portée.' },
    { id: 'chaine', category: 'transmission', parts: ALL, icon: 'chain', title: 'Chaîne de transmission',
      text: 'De la source au message restitué : codage, modulation, canal bruité, décision, erreurs.' },
    { id: 'modulation', category: 'transmission', parts: ALL, icon: 'modulation', title: 'Modulation et démodulation',
      text: 'AM, FM et modulations numériques ASK, FSK, PSK : formes d’onde et spectre.' },
    { id: 'fibre', category: 'transmission', parts: ALL, icon: 'fiber', title: 'Fibre optique',
      text: 'Réflexion totale interne, ouverture numérique, atténuation et bilan de puissance.' },
    { id: 'mobiles', category: 'reseaux', parts: ALL, icon: 'mobile', title: 'Réseaux mobiles',
      text: 'Cellules, stations de base, réutilisation des fréquences, couverture et générations 2G à 5G.' },
    { id: 'ip', category: 'reseaux', parts: ALL, icon: 'network', title: 'Réseaux IP',
      text: 'Adresses IPv4, masques, sous-réseaux, passerelle, routage et encapsulation.' }
  ];

  /** Parties RÉELLEMENT disponibles : déclarées ET chargées. */
  function liveParts(m) {
    return {
      lesson: !!(m.parts.lesson && TCL.lessons && TCL.lessons[m.id]),
      lab: !!(m.parts.lab && TCL.labs && TCL.labs[m.id]),
      exercises: !!(m.parts.exercises && TCL.exercises && TCL.exercises[m.id])
    };
  }

  function statusOf(m) {
    var p = liveParts(m);
    return p.lesson && p.lab && p.exercises ? 'available' : (p.lesson || p.lab || p.exercises ? 'partial' : 'planned');
  }

  /**
   * Progression d'un module, calculée UNIQUEMENT à partir des activités terminées :
   *   chapitres marqués comme lus + missions du laboratoire réussies
   *   + exercices réussis au moins une fois.
   */
  function moduleProgress(state, moduleId) {
    var m = byId(moduleId);
    if (!m) return null;
    var parts = liveParts(m);
    var lesson = parts.lesson ? TCL.lessons[moduleId] : null;
    var ex = parts.exercises ? TCL.exercises[moduleId] : null;
    var lab = parts.lab ? TCL.labs[moduleId] : null;
    var L = (state.lessons[moduleId] || {}).chapters || {};
    var Mi = ((state.lab[moduleId] || {}).missions) || {};
    var E = ((state.exercises[moduleId] || {}).items) || {};
    var series = ((state.exercises[moduleId] || {}).series) || [];

    var chaptersTotal = lesson ? lesson.chapters.length : 0;
    var chaptersDone = lesson ? lesson.chapters.filter(function (c) { return L[c.id]; }).length : 0;
    var missionsTotal = lab ? lab.missions.length : 0;
    var missionsDone = lab ? lab.missions.filter(function (x) { return Mi[x.id]; }).length : 0;
    var exTotal = ex ? ex.count : 0;
    var exAttempted = ex ? ex.list.filter(function (e) { return E[e.id] && E[e.id].attempts > 0; }).length : 0;
    var exMastered = ex ? ex.list.filter(function (e) { return E[e.id] && E[e.id].correct > 0; }).length : 0;
    var total = chaptersTotal + missionsTotal + exTotal;
    var done = chaptersDone + missionsDone + exMastered;
    var best = series.reduce(function (b, s) { return Math.max(b, s.score); }, -1);
    var lastSeries = series.length ? series[series.length - 1] : null;
    return {
      chaptersTotal: chaptersTotal, chaptersDone: chaptersDone,
      missionsTotal: missionsTotal, missionsDone: missionsDone,
      exTotal: exTotal, exAttempted: exAttempted, exMastered: exMastered,
      seriesCount: series.length, best: best >= 0 ? best : null, lastSeries: lastSeries,
      lessonComplete: chaptersTotal > 0 && chaptersDone === chaptersTotal,
      complete: total > 0 && done === total,
      started: done > 0 || exAttempted > 0 || !!(state.lab[moduleId] && state.lab[moduleId].params),
      percent: total ? Math.round((done / total) * 100) : 0,
      done: done, total: total
    };
  }

  /** Progression générale : somme de toutes les activités de tous les modules disponibles. */
  function overallProgress(state) {
    var acc = { done: 0, total: 0, chaptersDone: 0, chaptersTotal: 0, missionsDone: 0, missionsTotal: 0, exAttempted: 0, exMastered: 0, exTotal: 0, modulesComplete: 0, lessonsComplete: 0, modules: 0 };
    modules.forEach(function (m) {
      if (statusOf(m) === 'planned') return;
      var p = moduleProgress(state, m.id);
      acc.modules++;
      ['done', 'total', 'chaptersDone', 'chaptersTotal', 'missionsDone', 'missionsTotal', 'exAttempted', 'exMastered', 'exTotal'].forEach(function (k) { acc[k] += p[k]; });
      if (p.complete) acc.modulesComplete++;
      if (p.lessonComplete) acc.lessonsComplete++;
    });
    acc.percent = acc.total ? Math.round(acc.done / acc.total * 100) : 0;
    return acc;
  }

  /** Missions réussies dans la simulation d'un module. */
  function labProgress(state, moduleId) {
    var lab = TCL.labs && TCL.labs[moduleId];
    if (!lab) return null;
    var Mi = ((state.lab[moduleId] || {}).missions) || {};
    var done = lab.missions.filter(function (x) { return Mi[x.id]; }).length;
    return { missionsDone: done, missionsTotal: lab.missions.length, opened: !!(state.lab[moduleId] && state.lab[moduleId].params), percent: Math.round(done / lab.missions.length * 100) };
  }

  function byId(id) { return modules.filter(function (m) { return m.id === id; })[0]; }

  TCL.registry = {
    categories: categories,
    modules: modules,
    byId: byId,
    liveParts: liveParts,
    statusOf: statusOf,
    moduleProgress: moduleProgress,
    overallProgress: overallProgress,
    labProgress: labProgress,
    withLesson: function () { return modules.filter(function (m) { return liveParts(m).lesson; }); },
    withLab: function () { return modules.filter(function (m) { return liveParts(m).lab; }); },
    withExercises: function () { return modules.filter(function (m) { return liveParts(m).exercises; }); },
    available: function () { return modules.filter(function (m) { return statusOf(m) === 'available'; }); },
    planned: function () { return modules.filter(function (m) { return statusOf(m) !== 'available'; }); },
    labPlanned: function () { return modules.filter(function (m) { return !liveParts(m).lab; }); }
  };
})(window);
