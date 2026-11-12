/*
 * TELECOM CONNECT LAB — Structure pédagogique (6 espaces)
 * ------------------------------------------------------
 * PROPOSITION de structuration, et non programme universitaire officiel.
 * Pour adapter les contenus à un référentiel réel, seul ce fichier change.
 *
 *   competencies : ce qui se valide officiellement (une par module).
 *   spaces       : espaces → cours → modules réellement développés.
 *
 * Quatre domaines : télécommunications, électronique, informatique, IoT.
 * Un cours sans module (modules: []) serait affiché « Programme à développer » :
 * la plateforme ne présente jamais comme disponible un contenu qui n'existe pas.
 * Également lu par tools/generate-assessments.js : prérequis identiques côté serveur.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { root.TCL = root.TCL || {}; root.TCL.curriculum = api; }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var competencies = {
    signaux:      { title: 'Comprendre les signaux',      prerequisites: [] },
    fourier:      { title: 'Signaux et systèmes',         prerequisites: ['signaux'] },
    'ondes-em':   { title: 'Ondes électromagnétiques',    prerequisites: ['signaux'] },
    antennes:     { title: 'Antennes',                    prerequisites: ['ondes-em'] },
    propagation:  { title: 'Propagation radio',           prerequisites: ['ondes-em'] },
    chaine:       { title: 'Chaîne de transmission',      prerequisites: ['signaux'] },
    modulation:   { title: 'Modulation et démodulation',  prerequisites: ['signaux'] },
    numerique:    { title: 'Transmission numérique et codage', prerequisites: ['modulation', 'chaine'] },
    multiplexage: { title: 'Multiplexage et accès multiple', prerequisites: ['modulation'] },
    fibre:        { title: 'Fibre optique',               prerequisites: ['ondes-em'] },
    satellite:    { title: 'Communications satellitaires', prerequisites: ['propagation', 'qualite'] },
    mobiles:      { title: 'Réseaux mobiles',             prerequisites: ['propagation', 'modulation'] },
    '5g':         { title: '4G, 5G et technologies émergentes', prerequisites: ['mobiles', 'multiplexage'] },
    'sans-fil':   { title: 'Réseaux sans fil',            prerequisites: ['propagation', 'ip'] },
    ip:           { title: 'Réseaux IP',                  prerequisites: [] },
    qualite:      { title: 'Mesures et qualité des transmissions', prerequisites: ['chaine'] },
    ingenierie:   { title: 'Dimensionnement et maintenance', prerequisites: ['mobiles'] },
    circuits:     { title: 'Circuits électriques',        prerequisites: [] },
    ac:           { title: 'Courant alternatif et circuits RLC', prerequisites: ['circuits'] },
    analyse:      { title: 'Analyse des circuits',        prerequisites: ['circuits'] },
    diodes:       { title: 'Diodes et alimentations',     prerequisites: ['circuits'] },
    transistors:  { title: 'Transistors et amplification', prerequisites: ['diodes'] },
    aop:          { title: 'Amplificateurs opérationnels et filtres', prerequisites: ['ac'] },
    logique:      { title: 'Électronique numérique',      prerequisites: ['binaire'] },
    can:          { title: 'Conversion analogique-numérique', prerequisites: ['signaux', 'binaire'] },
    mesures:      { title: 'Mesures et dépannage électronique', prerequisites: ['ac'] },
    rf:           { title: 'Radiofréquence et adaptation', prerequisites: ['ac', 'ondes-em'] },
    binaire:      { title: 'Représentation des données',  prerequisites: [] },
    ordinateur:   { title: 'Architecture d’un ordinateur', prerequisites: ['binaire'] },
    systemes:     { title: 'Systèmes d’exploitation et fichiers', prerequisites: ['ordinateur'] },
    'reseaux-info': { title: 'Réseaux et client-serveur', prerequisites: ['ip'] },
    donnees:      { title: 'Bases de données',            prerequisites: ['ordinateur'] },
    cloud:        { title: 'Virtualisation et cloud',     prerequisites: ['systemes', 'reseaux-info'] },
    maintenance:  { title: 'Diagnostic et maintenance informatique', prerequisites: ['systemes'] },
    'iot-intro':  { title: 'Introduction à l’IoT',        prerequisites: [] },
    'iot-capteurs': { title: 'Capteurs, actionneurs et mesures', prerequisites: ['circuits', 'iot-intro'] },
    'iot-com':    { title: 'Communication des objets',    prerequisites: ['iot-intro'] },
    'iot-mqtt':   { title: 'MQTT, passerelles et supervision', prerequisites: ['iot-com'] },
    'iot-energie': { title: 'Énergie, fiabilité et sécurité', prerequisites: ['iot-capteurs'] },
    'iot-projets': { title: 'Projets IoT intégrés',       prerequisites: ['iot-mqtt', 'iot-energie'] }
  };

  /* Tests de positionnement : un résultat suffisant valide directement ces compétences. */
  var placements = [
    { id: 'placement-bases', title: 'Positionnement : bases scientifiques', grants: ['circuits', 'signaux'], description: 'Pour les apprenants qui maîtrisent déjà les circuits et les signaux.' },
    { id: 'placement-radio', title: 'Positionnement : ondes et radio', grants: ['signaux', 'ondes-em', 'antennes', 'propagation'], description: 'Pour les techniciens ou étudiants déjà formés à la radio.' },
    { id: 'placement-transmission', title: 'Positionnement : transmission', grants: ['signaux', 'chaine', 'modulation'], description: 'Chaîne de transmission et modulation.' },
    { id: 'placement-reseaux', title: 'Positionnement : réseaux IP', grants: ['ip'], description: 'Adressage IPv4, sous-réseaux, routage.' },
    { id: 'placement-mobiles', title: 'Positionnement : réseaux mobiles', grants: ['signaux', 'ondes-em', 'propagation', 'modulation', 'mobiles'], description: 'Pour les techniciens déjà formés aux réseaux cellulaires.' },
    { id: 'placement-electronique', title: 'Positionnement : électronique', grants: ['circuits', 'ac', 'diodes'], description: 'Circuits, courant alternatif et diodes.' },
    { id: 'placement-informatique', title: 'Positionnement : informatique', grants: ['binaire', 'ordinateur'], description: 'Représentation des données et architecture.' },
    { id: 'placement-iot', title: 'Positionnement : IoT', grants: ['iot-intro', 'iot-com'], description: 'Architecture et communication des objets connectés.' }
  ];

  function c(id, title, modules, coverage) { return { id: id, title: title, modules: modules || [], coverage: coverage || (modules && modules.length ? 'full' : 'planned') }; }

  var spaces = [
    { id: 'preparatoire', title: 'Préparatoire', rank: 0, entry: [], icon: 'book', text: 'Les bases scientifiques et techniques au sortir du secondaire.', courses: [
      c('prep-elec', 'Électricité : grandeurs, lois et mesures', ['circuits']),
      c('prep-telecom', 'Découvrir les télécommunications', ['signaux']),
      c('prep-info', 'Informatique fondamentale', ['binaire', 'ordinateur']),
      c('prep-iot', 'Découvrir l’Internet des objets', ['iot-intro'])
    ] },
    { id: 'l1', title: 'Licence 1', rank: 1, entry: ['circuits'], icon: 'wave', text: 'Les fondamentaux universitaires.', courses: [
      c('l1-elec', 'Électricité générale', ['circuits', 'ac', 'analyse']),
      c('l1-analog', 'Électronique analogique', ['diodes']),
      c('l1-mes', 'Mesures électroniques', ['mesures']),
      c('l1-signaux', 'Signaux et systèmes', ['signaux', 'fourier']),
      c('l1-info', 'Systèmes informatiques', ['systemes']),
      c('l1-intro', 'Introduction aux réseaux et télécommunications', ['chaine', 'ip']),
      c('l1-iot', 'Capteurs et mesures connectées', ['iot-capteurs'])
    ] },
    { id: 'l2', title: 'Licence 2', rank: 2, entry: ['circuits', 'signaux'], icon: 'modulation', text: 'L’approfondissement des techniques de transmission.', courses: [
      c('l2-analog', 'Amplification et filtrage', ['transistors', 'aop']),
      c('l2-num', 'Électronique numérique', ['logique', 'can']),
      c('l2-mod', 'Modulation et transmission', ['modulation', 'chaine']),
      c('l2-res', 'Réseaux informatiques', ['ip', 'reseaux-info']),
      c('l2-ant', 'Antennes et propagation', ['ondes-em', 'antennes', 'propagation']),
      c('l2-fibre', 'Fibre optique', ['fibre']),
      c('l2-emb', 'Systèmes embarqués communicants', ['iot-com'])
    ] },
    { id: 'l3', title: 'Licence 3', rank: 3, entry: ['signaux', 'ondes-em', 'propagation', 'modulation'], icon: 'mobile', text: 'Les applications avancées et les projets intégrateurs.', courses: [
      c('l3-numcom', 'Communications numériques', ['numerique', 'multiplexage']),
      c('l3-qual', 'Qualité des transmissions', ['qualite']),
      c('l3-mob', 'Réseaux mobiles', ['mobiles']),
      c('l3-sf', 'Réseaux sans fil', ['sans-fil']),
      c('l3-data', 'Données et bases de données', ['donnees']),
      c('l3-iot', 'IoT : protocoles, énergie et sécurité', ['iot-mqtt', 'iot-energie']),
      c('l3-proj', 'Projets techniques intégrateurs', ['iot-projets'])
    ] },
    { id: 'master', title: 'Master', rank: 4, entry: ['mobiles', 'ip'], icon: 'sparkle', text: 'Les études spécialisées et l’ingénierie des systèmes.', courses: [
      c('m-5g', 'Réseaux 5G et technologies émergentes', ['5g']),
      c('m-sat', 'Télécommunications satellitaires', ['satellite']),
      c('m-rf', 'Radiofréquence et adaptation', ['rf']),
      c('m-inge', 'Dimensionnement et ingénierie des systèmes', ['ingenierie']),
      c('m-cloud', 'Cloud et infrastructures', ['cloud']),
      c('m-iot', 'Systèmes connectés avancés', ['iot-projets'])
    ] },
    { id: 'pro', title: 'Monde professionnel', rank: null, entry: [], icon: 'shield', text: 'Pour les professionnels des télécommunications : parcours métiers orientés manipulation, installation, diagnostic et maintenance, ouverts sur demande approuvée par l’administration.', placement: true, courses: [
      c('pro-reseaux', 'Technicien réseaux', ['ip', 'reseaux-info', 'sans-fil']),
      c('pro-fibre', 'Technicien fibre optique', ['fibre', 'qualite']),
      c('pro-admin', 'Administrateur systèmes et réseaux', ['systemes', 'reseaux-info', 'cloud', 'maintenance']),
      c('pro-telecom', 'Technicien télécom', ['antennes', 'propagation', 'mobiles', 'qualite', 'ingenierie']),
      c('pro-maint', 'Maintenance électronique', ['circuits', 'diodes', 'transistors', 'mesures']),
      c('pro-info', 'Technicien de maintenance informatique', ['ordinateur', 'systemes', 'maintenance']),
      c('pro-iot', 'IoT et automatisation', ['iot-capteurs', 'iot-com', 'iot-mqtt', 'iot-energie', 'iot-projets'])
    ] }
  ];

  function spaceById(id) { return spaces.filter(function (s) { return s.id === id; })[0] || null; }
  function modulesOfSpace(s) {
    var seen = {}, out = [];
    s.courses.forEach(function (co) { co.modules.forEach(function (m) { if (!seen[m]) { seen[m] = 1; out.push(m); } }); });
    return out;
  }

  /* ------------------------------- Parcours d'un étudiant ------------------------------- */

  function courseById(space, id) { var s = spaceById(space); return s ? s.courses.filter(function (c) { return c.id === id; })[0] || null : null; }
  function specializations() { return spaceById('pro').courses; }
  function trackKey(space, spec) { return space === 'pro' && spec ? spec : space; }

  function trackLabel(space, spec) {
    var s = spaceById(space);
    if (!s) return '';
    var c = spec ? courseById(space, spec) : null;
    return c ? s.title + ' · ' + c.title : s.title;
  }

  /** Cours du parcours : la spécialisation restreint le Monde professionnel à un métier. */
  function trackCourses(space, spec) {
    var s = spaceById(space);
    if (!s) return [];
    return space === 'pro' && spec ? s.courses.filter(function (c) { return c.id === spec; }) : s.courses;
  }

  /** Une compétence et tout ce qu'elle exige, prérequis d'abord. */
  function closure(ids) {
    var seen = {}, out = [];
    function visit(id) {
      if (seen[id] || !competencies[id]) return;
      seen[id] = 1;
      competencies[id].prerequisites.forEach(visit);
      out.push(id);
    }
    ids.forEach(visit);
    return out;
  }

  /** core : modules du parcours ; prerequisites : bases exigées venant d'autres niveaux. */
  function trackModules(space, spec) {
    var core = [];
    trackCourses(space, spec).forEach(function (c) { c.modules.forEach(function (m) { if (core.indexOf(m) < 0) core.push(m); }); });
    return { core: core, prerequisites: closure(core).filter(function (m) { return core.indexOf(m) < 0; }) };
  }

  /** Tous les parcours possibles ; le serveur reçoit cette même liste (tools/generate-assessments.js). */
  function trackList() {
    var out = [];
    spaces.forEach(function (s) {
      var m = trackModules(s.id, null);
      out.push({ key: s.id, space: s.id, specialization: null, rank: s.rank, entry: s.entry, competencies: m.core.concat(m.prerequisites) });
    });
    specializations().forEach(function (c) {
      var m = trackModules('pro', c.id);
      out.push({ key: c.id, space: 'pro', specialization: c.id, rank: null, entry: [], competencies: m.core.concat(m.prerequisites) });
    });
    return out;
  }

  /** Niveaux d'études (Préparatoire à Master), proposés dès l'inscription. */
  function levels() { return spaces.filter(function (s) { return s.rank != null; }); }

  /**
   * Compétences enseignées à un niveau inférieur à celui du parcours : prérequis recommandés,
   * jamais bloquants (identique à public.start_attempt). Vide pour le Monde professionnel.
   */
  function lowerLevelCompetencies(space) {
    var s = spaceById(space), out = {};
    if (!s || s.rank == null) return out;
    levels().forEach(function (l) {
      if (l.rank >= s.rank) return;
      var m = trackModules(l.id, null);
      m.core.concat(m.prerequisites).forEach(function (c) { out[c] = 1; });
    });
    return out;
  }

  /**
   * Règle de changement, identique à public.change_track : entre niveaux d'études, changement
   * libre dans les deux sens. Le monde professionnel exige toutes les évaluations du plus haut
   * niveau occupé (highest). directPro : professionnel approuvé, accès libre.
   */
  function checkMove(from, to, validated, directPro, highest) {
    var a = spaceById(from.space), b = spaceById(to.space);
    if (!b) return { allowed: false, missing: [], placements: [], upward: false };
    if (from.space === to.space && (from.specialization || null) === (to.specialization || null)) return { allowed: false, same: true, missing: [], placements: [], upward: false };
    if (directPro) return { allowed: true, upward: false, missing: [], placements: [] };
    var toPro = to.space === 'pro' && from.space !== 'pro';
    var upward = toPro || (b.rank != null && (!a || a.rank == null || b.rank > a.rank));
    var required = [];
    if (toPro) { var ref = highest || from, m = trackModules(ref.space, ref.specialization); required = m.core.concat(m.prerequisites); }
    var missing = required.filter(function (c) { return !validated[c]; });
    var help = placements.filter(function (p) { return p.grants.some(function (g) { return missing.indexOf(g) >= 0; }); });
    return { allowed: missing.length === 0, upward: upward, missing: missing, placements: help };
  }

  return { competencies: competencies, placements: placements, spaces: spaces, spaceById: spaceById, modulesOfSpace: modulesOfSpace,
    specializations: specializations, levels: levels, lowerLevelCompetencies: lowerLevelCompetencies, courseById: courseById, trackKey: trackKey, trackLabel: trackLabel, trackCourses: trackCourses,
    closure: closure, trackModules: trackModules, trackList: trackList, checkMove: checkMove };
});
