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
 *   1. créer modules/<id>/<id>.js (voir core/module-kit.js) ;
 *   2. ajouter le module ci-dessous et dans core/curriculum.js ;
 *   3. ajouter ses questions dans content/assessments/.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};

  var domains = [
    { id: 'telecom', title: 'Télécommunications' },
    { id: 'electronique', title: 'Électricité et électronique' },
    { id: 'informatique', title: 'Informatique fondamentale' },
    { id: 'iot', title: 'Internet des objets' }
  ];

  var categories = [
    { id: 'bases', domain: 'telecom', title: 'Bases du signal', text: 'Les grandeurs qui décrivent tout signal transmis.' },
    { id: 'ondes', domain: 'telecom', title: 'Ondes et antennes', text: 'Comment un signal devient une onde et se propage.' },
    { id: 'transmission', domain: 'telecom', title: 'Transmission', text: 'Du message à l’émetteur, du support au récepteur.' },
    { id: 'reseaux', domain: 'telecom', title: 'Réseaux', text: 'Acheminer l’information entre de nombreux équipements.' },
    { id: 'ingenierie', domain: 'telecom', title: 'Qualité et ingénierie', text: 'Mesurer, dimensionner, diagnostiquer et maintenir.' },
    { id: 'elec-bases', domain: 'electronique', title: 'Électricité', text: 'Les lois et les méthodes d’analyse des circuits.' },
    { id: 'elec-analog', domain: 'electronique', title: 'Électronique analogique', text: 'Diodes, transistors, amplificateurs et filtres.' },
    { id: 'elec-num', domain: 'electronique', title: 'Électronique numérique', text: 'Logique, circuits séquentiels et conversion.' },
    { id: 'elec-pro', domain: 'electronique', title: 'Mesure et radiofréquence', text: 'Instruments, dépannage et applications avancées.' },
    { id: 'info-machine', domain: 'informatique', title: 'La machine', text: 'Données, processeur, mémoire et système.' },
    { id: 'info-services', domain: 'informatique', title: 'Réseaux et services', text: 'Échanges, données, cloud et maintenance.' },
    { id: 'iot-objets', domain: 'iot', title: 'Objets connectés', text: 'Architecture, capteurs et microcontrôleurs.' },
    { id: 'iot-systemes', domain: 'iot', title: 'Systèmes connectés', text: 'Connectivité, protocoles, énergie et projets.' }
  ];

  var ALL = { lesson: true, lab: true, exercises: true };
  function mod(id, category, icon, title, text) { return { id: id, category: category, parts: ALL, icon: icon, title: title, text: text }; }

  /* L'ordre de ce tableau est le parcours conseillé. */
  var modules = [
    mod('signaux', 'bases', 'wave', 'Comprendre les signaux', 'Amplitude, fréquence, période et phase d’un signal sinusoïdal.'),
    mod('fourier', 'bases', 'wave', 'Signaux et systèmes', 'Spectre, séries de Fourier, systèmes linéaires et bande passante.'),
    mod('ondes-em', 'ondes', 'em', 'Ondes électromagnétiques', 'Champs E et B, fréquence, vitesse, longueur d’onde et spectre radio.'),
    mod('antennes', 'ondes', 'antenna', 'Antennes', 'Dipôles et réseaux d’antennes : diagramme de rayonnement, gain, directivité, polarisation.'),
    mod('propagation', 'ondes', 'propagation', 'Notions de propagation radio', 'Espace libre, réflexion sur le sol, obstacles, bilan de liaison et portée.'),
    mod('chaine', 'transmission', 'chain', 'Chaîne de transmission', 'De la source au message restitué : codage, modulation, canal bruité, décision, erreurs.'),
    mod('modulation', 'transmission', 'modulation', 'Modulation et démodulation', 'AM, FM et modulations numériques ASK, FSK, PSK : formes d’onde et spectre.'),
    mod('numerique', 'transmission', 'chain', 'Transmission numérique et codage', 'Codes en ligne, QAM, taux d’erreur, limite de Shannon, détection et correction d’erreurs.'),
    mod('multiplexage', 'transmission', 'network', 'Multiplexage et accès multiple', 'FDM, TDM, WDM, OFDM, CDMA et accès aléatoire ALOHA.'),
    mod('fibre', 'transmission', 'fiber', 'Fibre optique', 'Réflexion totale interne, ouverture numérique, atténuation et bilan de puissance.'),
    mod('satellite', 'transmission', 'antenna', 'Communications satellitaires', 'Orbites, latence, Doppler et bilan de liaison descendante.'),
    mod('mobiles', 'reseaux', 'mobile', 'Réseaux mobiles', 'Cellules, stations de base, réutilisation des fréquences, couverture et générations 2G à 5G.'),
    mod('5g', 'reseaux', 'mobile', '4G, 5G et technologies émergentes', 'Numérologie NR, débit maximal, MIMO, formation de faisceau, tranches de réseau.'),
    mod('sans-fil', 'reseaux', 'antenna', 'Réseaux sans fil', 'Wi-Fi, canaux, CSMA/CA, débit réel et portée.'),
    mod('ip', 'reseaux', 'network', 'Réseaux IP', 'Adresses IPv4, masques, sous-réseaux, passerelle, routage et encapsulation.'),
    mod('qualite', 'ingenierie', 'chart', 'Mesures et qualité des transmissions', 'Décibels, facteur de bruit, Friis, diagramme de l’œil et EVM.'),
    mod('ingenierie', 'ingenierie', 'shield', 'Dimensionnement et maintenance', 'Trafic en Erlang, disponibilité, méthode de diagnostic.'),
    mod('circuits', 'elec-bases', 'circuit', 'Circuits électriques', 'Loi d’Ohm, lois de Kirchhoff, diviseur de tension, instruments de mesure et circuit RC.'),
    mod('ac', 'elec-bases', 'wave', 'Courant alternatif et circuits RLC', 'Valeur efficace, impédance, puissances, résonance, RC et RL.'),
    mod('analyse', 'elec-bases', 'circuit', 'Analyse des circuits', 'Superposition, Thévenin, Norton et transfert maximal de puissance.'),
    mod('diodes', 'elec-analog', 'circuit', 'Diodes et alimentations', 'Jonction PN, redressement, filtrage, Zener et régulation.'),
    mod('transistors', 'elec-analog', 'circuit', 'Transistors et amplification', 'Bipolaire, MOSFET, polarisation et montage émetteur commun.'),
    mod('aop', 'elec-analog', 'modulation', 'Amplificateurs opérationnels et filtres', 'Montages de base, limites réelles, filtres actifs et oscillateurs.'),
    mod('logique', 'elec-num', 'circuit', 'Électronique numérique', 'Algèbre de Boole, portes, combinatoire, bascules et compteurs.'),
    mod('can', 'elec-num', 'chart', 'Conversion analogique-numérique', 'Échantillonnage, repliement, quantification, CNA R-2R.'),
    mod('mesures', 'elec-pro', 'target', 'Mesures et dépannage électronique', 'Multimètre, oscilloscope, sondes et méthode de diagnostic.'),
    mod('rf', 'elec-pro', 'antenna', 'Radiofréquence et adaptation', 'Lignes de transmission, ROS, adaptation d’impédance.'),
    mod('binaire', 'info-machine', 'chart', 'Représentation des données', 'Binaire, hexadécimal, complément à deux, texte et logique.'),
    mod('ordinateur', 'info-machine', 'device', 'Architecture d’un ordinateur', 'Processeur, mémoire, cycle d’instruction, stockage et périphériques.'),
    mod('systemes', 'info-machine', 'device', 'Systèmes d’exploitation et fichiers', 'Processus, ordonnancement, mémoire virtuelle, fichiers.'),
    mod('reseaux-info', 'info-services', 'network', 'Réseaux et client-serveur', 'Modèle en couches, ARP, DNS, TCP et HTTP.'),
    mod('donnees', 'info-services', 'chart', 'Bases de données', 'Modèle relationnel, clés, requêtes et transactions.'),
    mod('cloud', 'info-services', 'cloud', 'Virtualisation et cloud', 'Machines virtuelles, conteneurs, modèles de service.'),
    mod('maintenance', 'info-services', 'shield', 'Diagnostic et maintenance informatique', 'Démarrage, méthode de dépannage, RAID et sauvegardes.'),
    mod('iot-intro', 'iot-objets', 'network', 'Introduction à l’IoT', 'Architecture, objets, systèmes embarqués, Arduino et ESP32.'),
    mod('iot-capteurs', 'iot-objets', 'target', 'Capteurs, actionneurs et mesures', 'Conditionnement, acquisition, filtrage et commande MLI.'),
    mod('iot-com', 'iot-systemes', 'antenna', 'Communication des objets', 'Wi-Fi, Bluetooth, LoRa, réseaux cellulaires et temps d’antenne.'),
    mod('iot-mqtt', 'iot-systemes', 'cloud', 'MQTT, passerelles et supervision', 'Publication, abonnement, QoS, message retenu, testament, tableaux de bord.'),
    mod('iot-energie', 'iot-systemes', 'shield', 'Énergie, fiabilité et sécurité', 'Autonomie sur batterie, limites et sécurité des objets connectés.'),
    mod('iot-projets', 'iot-systemes', 'sparkle', 'Projets IoT intégrés', 'Régulation, actionneurs, supervision : un système complet.')
  ];

  /* Laboratoires complémentaires : accessibles avec leur module parent, hors calcul de progression. */
  var extraLabs = [
    { id: 'oscillateurs', parent: 'aop' },
    { id: 'multimetre', parent: 'mesures' },
    { id: 'fichiers', parent: 'systemes' },
    { id: 'routage', parent: 'ip' }
  ];
  function extraById(id) { return extraLabs.filter(function (x) { return x.id === id; })[0] || null; }
  function extrasOf(parent) { return extraLabs.filter(function (x) { return x.parent === parent; }); }

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

  /** Modules visibles : tous, ou ceux du parcours de l'étudiant. */
  function scoped(list) {
    var f = TCL.access && TCL.access.moduleFilter();
    return f ? list.filter(function (m) { return f(m.id); }) : list;
  }

  /** Progression générale : somme des activités des modules disponibles (ou de la liste ids). */
  function overallProgress(state, ids) {
    var acc = { done: 0, total: 0, chaptersDone: 0, chaptersTotal: 0, missionsDone: 0, missionsTotal: 0, exAttempted: 0, exMastered: 0, exTotal: 0, modulesComplete: 0, lessonsComplete: 0, modules: 0 };
    (ids ? modules.filter(function (m) { return ids.indexOf(m.id) >= 0; }) : scoped(modules)).forEach(function (m) {
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
    domains: domains,
    extraLabs: extraLabs,
    extraById: extraById,
    extrasOf: extrasOf,
    categories: categories,
    modules: modules,
    byId: byId,
    liveParts: liveParts,
    statusOf: statusOf,
    moduleProgress: moduleProgress,
    overallProgress: overallProgress,
    labProgress: labProgress,
    scopedModules: function () { return scoped(modules); },
    withLesson: function () { return scoped(modules).filter(function (m) { return liveParts(m).lesson; }); },
    withLab: function () { return scoped(modules).filter(function (m) { return liveParts(m).lab; }); },
    withExercises: function () { return scoped(modules).filter(function (m) { return liveParts(m).exercises; }); },
    available: function () { return modules.filter(function (m) { return statusOf(m) === 'available'; }); },
    planned: function () { return modules.filter(function (m) { return statusOf(m) !== 'available'; }); },
    labPlanned: function () { return scoped(modules).filter(function (m) { return !liveParts(m).lab; }); }
  };
})(window);
