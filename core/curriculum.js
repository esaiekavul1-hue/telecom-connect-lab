/*
 * TELECOM CONNECT LAB — Structure pédagogique (6 espaces)
 * ------------------------------------------------------
 * PROPOSITION de structuration, et non programme universitaire officiel.
 * Pour adapter les contenus à un référentiel réel, seul ce fichier change.
 *
 *   competencies : ce qui se valide officiellement (une par module).
 *   spaces       : espaces → cours → modules réellement développés.
 *
 * Un cours sans module (modules: []) est affiché « Programme à développer » :
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
    circuits:     { title: 'Circuits électriques',        prerequisites: [] },
    signaux:      { title: 'Comprendre les signaux',      prerequisites: [] },
    'ondes-em':   { title: 'Ondes électromagnétiques',    prerequisites: ['signaux'] },
    antennes:     { title: 'Antennes',                    prerequisites: ['ondes-em'] },
    propagation:  { title: 'Propagation radio',           prerequisites: ['ondes-em'] },
    chaine:       { title: 'Chaîne de transmission',      prerequisites: ['signaux'] },
    modulation:   { title: 'Modulation et démodulation',  prerequisites: ['signaux'] },
    fibre:        { title: 'Fibre optique',               prerequisites: ['ondes-em'] },
    mobiles:      { title: 'Réseaux mobiles',             prerequisites: ['propagation', 'modulation'] },
    ip:           { title: 'Réseaux IP',                  prerequisites: [] }
  };

  /* Tests de positionnement : un résultat suffisant valide directement ces compétences. */
  var placements = [
    { id: 'placement-bases', title: 'Positionnement : bases scientifiques', grants: ['circuits', 'signaux'], description: 'Pour les apprenants qui maîtrisent déjà les circuits et les signaux.' },
    { id: 'placement-radio', title: 'Positionnement : ondes et radio', grants: ['signaux', 'ondes-em', 'antennes', 'propagation'], description: 'Pour les techniciens ou étudiants déjà formés à la radio.' },
    { id: 'placement-transmission', title: 'Positionnement : transmission', grants: ['signaux', 'chaine', 'modulation'], description: 'Chaîne de transmission et modulation.' },
    { id: 'placement-reseaux', title: 'Positionnement : réseaux IP', grants: ['ip'], description: 'Adressage IPv4, sous-réseaux, routage.' }
  ];

  function c(id, title, modules, coverage) { return { id: id, title: title, modules: modules || [], coverage: coverage || (modules && modules.length ? 'full' : 'planned') }; }

  var spaces = [
    { id: 'preparatoire', title: 'Préparatoire', icon: 'book', text: 'Les bases scientifiques et techniques au sortir du secondaire.', courses: [
      c('prep-math', 'Mathématiques appliquées'),
      c('prep-elec', 'Physique et électricité', ['circuits'], 'partial'),
      c('prep-electronique', 'Introduction à l’électronique'),
      c('prep-info', 'Informatique fondamentale'),
      c('prep-logique', 'Logique et raisonnement technique'),
      c('prep-telecom', 'Introduction aux télécommunications', ['signaux'], 'partial'),
      c('prep-mesures', 'Mesures, unités et instruments', ['circuits'], 'partial')
    ] },
    { id: 'l1', title: 'Licence 1', icon: 'wave', text: 'Les fondamentaux universitaires.', courses: [
      c('l1-elec', 'Électricité générale', ['circuits'], 'partial'),
      c('l1-analog', 'Électronique analogique'),
      c('l1-math', 'Mathématiques appliquées'),
      c('l1-signaux', 'Signaux et systèmes', ['signaux'], 'partial'),
      c('l1-prog', 'Informatique et programmation'),
      c('l1-intro', 'Introduction aux réseaux et télécommunications', ['chaine', 'ip'], 'partial')
    ] },
    { id: 'l2', title: 'Licence 2', icon: 'modulation', text: 'L’approfondissement des techniques de transmission.', courses: [
      c('l2-num', 'Électronique numérique'),
      c('l2-mod', 'Modulation et transmission', ['modulation', 'chaine']),
      c('l2-res', 'Réseaux informatiques', ['ip'], 'partial'),
      c('l2-ant', 'Antennes et propagation', ['ondes-em', 'antennes', 'propagation']),
      c('l2-fibre', 'Fibre optique', ['fibre']),
      c('l2-emb', 'Systèmes embarqués'),
      c('l2-prog', 'Programmation technique')
    ] },
    { id: 'l3', title: 'Licence 3', icon: 'mobile', text: 'Les applications avancées et les projets intégrateurs.', courses: [
      c('l3-mob', 'Réseaux mobiles', ['mobiles'], 'partial'),
      c('l3-archi', 'Architecture des télécommunications'),
      c('l3-rout', 'Routage et commutation', ['ip'], 'partial'),
      c('l3-iot', 'IoT'),
      c('l3-sec', 'Sécurité des réseaux'),
      c('l3-dsp', 'Traitement numérique du signal'),
      c('l3-proj', 'Projets techniques intégrateurs')
    ] },
    { id: 'master', title: 'Master', icon: 'sparkle', text: 'Les études spécialisées et la recherche.', courses: [
      c('m-5g', 'Réseaux 5G et technologies émergentes'),
      c('m-cloud', 'Cloud et infrastructures'),
      c('m-ia', 'Intelligence artificielle appliquée'),
      c('m-sat', 'Télécommunications satellitaires'),
      c('m-cyber', 'Cybersécurité avancée'),
      c('m-optim', 'Optimisation et ingénierie des systèmes'),
      c('m-rech', 'Recherche et projets avancés')
    ] },
    { id: 'pro', title: 'Monde professionnel', icon: 'shield', text: 'Des parcours métiers, accessibles par évaluation des prérequis : aucun diplôme de Master n’est demandé.', placement: true, courses: [
      c('pro-reseaux', 'Technicien réseaux', ['ip'], 'partial'),
      c('pro-fibre', 'Technicien fibre optique', ['fibre'], 'partial'),
      c('pro-admin', 'Administrateur systèmes et réseaux'),
      c('pro-telecom', 'Technicien télécom', ['antennes', 'propagation', 'mobiles'], 'partial'),
      c('pro-maint', 'Maintenance électronique', ['circuits'], 'partial'),
      c('pro-iot', 'IoT et automatisation'),
      c('pro-cyber', 'Cybersécurité'),
      c('pro-dev', 'Développement et outils techniques')
    ] }
  ];

  function spaceById(id) { return spaces.filter(function (s) { return s.id === id; })[0] || null; }
  function modulesOfSpace(s) {
    var seen = {}, out = [];
    s.courses.forEach(function (co) { co.modules.forEach(function (m) { if (!seen[m]) { seen[m] = 1; out.push(m); } }); });
    return out;
  }

  return { competencies: competencies, placements: placements, spaces: spaces, spaceById: spaceById, modulesOfSpace: modulesOfSpace };
});
