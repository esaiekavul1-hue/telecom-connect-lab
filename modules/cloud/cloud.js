/*
 * TELECOM CONNECT LAB 2.0 — Virtualisation et cloud.
 * Référence : NIST SP 800-145. Modèle : consolidation par capacité, élasticité sur 24 h.
 */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var K = node ? require('../../core/module-kit.js') : root.TCL.moduleKit;
  var api = factory(K);
  if (node) module.exports = api; else K.register(api);
})(typeof window !== 'undefined' ? window : globalThis, function (K) {
  'use strict';
  var fN = K.fN, v = K.v, S = K.S;
  function hosts(n, appRam, overhead, hostRam, reserve) { var per = appRam + overhead, usable = hostRam - reserve; if (per > usable) return Infinity; return Math.ceil(n / Math.floor(usable / per)); }
  function demand(h, base, peak) { return base + (peak - base) * Math.max(0, Math.sin((h - 6) * Math.PI / 12)); }
  function autoscale(base, peak, unit, cap) { var used = 0, fixed = 0, miss = 0; for (var h = 0; h < 24; h++) { var d = demand(h, base, peak), n = Math.ceil(d / unit); used += n; if (d > cap * unit) miss++; fixed += cap; } return { used: used, fixed: fixed, miss: miss, saving: (1 - used / fixed) * 100 }; }
  var math = { hosts: hosts, demand: demand, autoscale: autoscale };

  var lesson = K.lesson({ id: 'cloud', title: 'Virtualisation et cloud',
    intro: 'La virtualisation permet de faire tourner plusieurs environnements sur une même machine. Le cloud fournit ces ressources à la demande, par le réseau.',
    objectives: ['Comparer machines virtuelles et conteneurs.', 'Distinguer IaaS, PaaS et SaaS.', 'Énoncer les caractéristiques essentielles du cloud.', 'Estimer des ressources et expliquer l’élasticité.'],
    prerequisites: 'Systèmes d’exploitation ; réseaux et client-serveur.',
    sources: ['NIST SP 800-145.', 'Pages « Hypervisor », « OS-level virtualization ».'],
    figures: { vm: { caption: 'Une machine virtuelle embarque un système complet ; des conteneurs partagent le noyau de l’hôte.', svg: function () { return S.blocks({ w: 520, h: 170, label: 'Comparaison machines virtuelles et conteneurs.', boxes: [{ id: 'a', x: 20, y: 15, w: 220, h: 34, t: 'Application + système invité' }, { id: 'b', x: 20, y: 60, w: 220, h: 34, t: 'Hyperviseur' }, { id: 'c', x: 20, y: 105, w: 220, h: 34, t: 'Matériel' }, { id: 'd', x: 280, y: 15, w: 220, h: 34, t: 'Application + bibliothèques' }, { id: 'e', x: 280, y: 60, w: 220, h: 34, t: 'Moteur + noyau partagé' }, { id: 'f', x: 280, y: 105, w: 220, h: 34, t: 'Matériel' }], links: [{ a: 'a', b: 'b' }, { a: 'b', b: 'c' }, { a: 'd', b: 'e' }, { a: 'e', b: 'f' }] }); } },
      el: { caption: 'Demande sur 24 h : une capacité fixe est dimensionnée pour le pic, l’élasticité suit la demande.', options: function () { return { kind: 'xy', title: 'Élasticité', desc: 'Demande sur une journée et capacité fixe.', x: { min: 0, max: 24, ticks: [0, 6, 12, 18, 24], label: 'heure' }, y: { min: 0, max: 120, label: 'charge (%)' }, series: [{ samples: 100, fn: function (h) { return demand(h, 20, 100); } }], hlines: [{ y: 100, label: 'capacité fixe' }] }; } } },
    chapters: [
      { title: 'Virtualisation', summary: 'Hyperviseurs, machines virtuelles, conteneurs.', html: [
        '<p class="lead">Un seul serveur physique peut héberger plusieurs environnements isolés.</p>',
        '<div data-fig="vm"></div>',
        K.defs([['Hyperviseur de type 1', 'S’exécute directement sur le matériel.'], ['Hyperviseur de type 2', 'S’exécute au-dessus d’un système d’exploitation.'], ['Conteneur', 'Environnement isolé utilisant le noyau de la machine hôte.']]),
        K.formula('Hôtes = ⌈N / ⌊(RAM<sub>hôte</sub> − réserve)/(RAM<sub>appli</sub> + surcoût)⌋⌉', 'Dimensionnement simplifié, par la mémoire seule.'),
        K.example('consolidation', '<p>20 applications de 2 Go. Sur des hôtes de 64 Go avec 8 Go de réserve : VM avec 2 Go de surcoût : ' + hosts(20, 2, 2, 64, 8) + ' hôtes. Conteneurs avec 0,1 Go de surcoût : ' + hosts(20, 2, 0.1, 64, 8) + ' hôte.</p>')] },
      { title: 'Le cloud', summary: 'Définition, modèles de service, déploiement.', html: [
        '<p class="lead">Le NIST décrit le cloud par cinq caractéristiques essentielles.</p>',
        K.defs([['Libre-service à la demande', 'Ressources obtenues sans intervention humaine du fournisseur.'], ['Large accès réseau', 'Accessible par des mécanismes standard.'], ['Mise en commun', 'Ressources partagées entre clients.'], ['Élasticité rapide', 'Capacité ajustée selon le besoin.'], ['Service mesuré', 'Usage mesuré et facturable.']]),
        K.table(['Modèle', 'Le client gère', 'Exemple d’usage'], [['IaaS', 'Système, applications, données', 'Machines virtuelles'], ['PaaS', 'Applications, données', 'Plateforme de déploiement'], ['SaaS', 'Données et réglages', 'Messagerie en ligne']], 'Trois modèles de service'),
        K.formula('Coût = ∑ ressources<sub>h</sub> × prix unitaire', 'Le coût à l’usage suit la consommation.'),
        K.example('choisir un modèle', '<p>Une école veut une messagerie sans administrer de serveur : SaaS. Un opérateur veut déployer son propre logiciel sur son système : IaaS. Les modèles de déploiement sont public, privé, communautaire et hybride.</p>')] },
      { title: 'Élasticité et disponibilité', summary: 'Mise à l’échelle, régions, responsabilité.', html: [
        '<p class="lead">L’élasticité évite de payer pour le pic toute la journée.</p>',
        '<div data-fig="el"></div>',
        K.formula('Économie = 1 − (∑ capacité<sub>h</sub>) / (24 × capacité fixe)', 'Par rapport à un dimensionnement fixe pour le pic.'),
        K.example('une journée type', '<p>Base 20 %, pic 100 %, unités de 10 % : l’élasticité économise ' + fN(autoscale(20, 100, 10, 10).saving) + ' % par rapport à 10 unités fixes.</p>'),
        K.apply('<p>Avant de migrer, vérifiez la dépendance à la connexion Internet et le lieu de stockage des données : ces points varient beaucoup selon les pays.</p>'),
        K.pitfalls(['<strong>Croire que le cloud supprime toute responsabilité.</strong> La sécurité reste partagée.', '<strong>Oublier le coût du trafic sortant.</strong>', '<strong>Confondre conteneur et machine virtuelle</strong> : un conteneur ne peut pas faire tourner un noyau différent.']),
        K.summary(['VM : système complet ; conteneur : noyau partagé.', 'IaaS, PaaS, SaaS.', 'Cinq caractéristiques NIST.', 'L’élasticité suit la demande.']),
        K.toLab('cloud', 'Comparez la consolidation et mesurez l’élasticité.')] }
    ] });

  var D = { n: 20, app: 2, mode: 'vm', over: 2, host: 64, res: 8, base: 20, peak: 100, cap: 10, unit: 10 };
  function M(s) { var ov = s.mode === 'vm' ? s.over : 0.1, H = hosts(s.n, s.app, ov, s.host, s.res), a = autoscale(s.base, Math.max(s.peak, s.base), s.unit, s.cap); return { H: H, ov: ov, ram: isFinite(H) ? H * s.host : 0, a: a }; }
  var lab = { id: 'cloud', title: 'Consolidation et élasticité', short: 'Virtualisation et cloud', icon: 'cloud', badge: 'Dimensionnement simplifié par la mémoire',
    text: 'Comparez machines virtuelles et conteneurs, puis confrontez une capacité fixe à une demande variable.',
    summary: 'Comparez le nombre d’hôtes nécessaires avec machines virtuelles ou conteneurs, puis mesurez l’intérêt de l’élasticité.',
    params: [{ group: 'Consolidation' }, { k: 'mode', label: 'Technologie', opts: [['vm', 'Machines virtuelles'], ['ct', 'Conteneurs']] }, { k: 'n', label: 'Applications', min: 1, max: 200, step: 1, unit: '', dec: 0 }, { k: 'app', label: 'Mémoire par application', min: 0.25, max: 32, step: 0.25, unit: 'Go', dec: 2 }, { k: 'over', label: 'Surcoût par VM', min: 0.5, max: 8, step: 0.5, unit: 'Go', dec: 1, when: function (s) { return s.mode === 'vm'; } }, { k: 'host', label: 'Mémoire de l’hôte', min: 16, max: 512, step: 8, unit: 'Go', dec: 0 }, { k: 'res', label: 'Réserve de l’hôte', min: 2, max: 16, step: 1, unit: 'Go', dec: 0 }, { group: 'Élasticité' }, { k: 'base', label: 'Demande minimale', min: 0, max: 100, step: 5, unit: '%', dec: 0 }, { k: 'peak', label: 'Demande de pointe', min: 10, max: 300, step: 5, unit: '%', dec: 0 }, { k: 'unit', label: 'Capacité par serveur', min: 5, max: 50, step: 5, unit: '%', dec: 0 }, { k: 'cap', label: 'Serveurs en capacité fixe', min: 1, max: 40, step: 1, unit: '', dec: 0 }],
    defaults: D, model: M,
    expr: function (s, m) { return isFinite(m.H) ? m.H + ' hôte(s) nécessaire(s)' : 'Application trop grande pour un hôte'; },
    verdict: function (s, m) { return m.a.miss ? { ok: false, text: 'Capacité fixe insuffisante à ' + m.a.miss + ' heure(s)' } : { ok: true, text: 'Capacité fixe suffisante' }; },
    readouts: [['Hôtes nécessaires', function (s, m) { return isFinite(m.H) ? String(m.H) : 'impossible'; }], ['Mémoire totale', function (s, m) { return fN(m.ram) + ' Go'; }], ['Serveur·h (élastique)', function (s, m) { return String(m.a.used); }], ['Serveur·h (fixe)', function (s, m) { return String(m.a.fixed); }], ['Économie', function (s, m) { return fN(m.a.saving) + ' %'; }], ['Heures saturées', function (s, m) { return String(m.a.miss); }]],
    plots: [{ options: function (s) { var pk = Math.max(s.peak, s.base); return { title: 'Demande journalière', desc: 'Demande sur 24 heures et capacité fixe.', x: { min: 0, max: 24, ticks: [0, 6, 12, 18, 24], label: 'heure' }, y: { min: 0, max: Math.max(pk, s.cap * s.unit) * 1.2 + 1, label: 'charge (%)' }, series: [{ samples: 100, fn: function (h) { return demand(h, s.base, pk); } }], hlines: [{ y: s.cap * s.unit, label: 'capacité fixe' }] }; } }],
    explain: function (s, m) { return '<p>Chaque ' + (s.mode === 'vm' ? 'machine virtuelle' : 'conteneur') + ' occupe ' + fN(s.app + m.ov) + ' Go. L’infrastructure élastique consommerait ' + m.a.used + ' serveur·heures contre ' + m.a.fixed + ' en capacité fixe.</p>'; },
    missions: [
      { id: 'm1', title: 'Conteneurs ou VM ?', text: 'Passez aux conteneurs et comparez : 20 applications de 2 Go doivent tenir sur un seul hôte de 64 Go.', solution: { mode: 'ct', n: 20, app: 2, host: 64, res: 8 }, check: function (s, m) { if (s.n !== 20 || s.app !== 2 || s.host !== 64) return { ok: false, msg: 'Gardez 20 applications de 2 Go et un hôte de 64 Go.' }; return m.H === 1 ? { ok: true, msg: 'Réussi : l’absence de système invité libère de la mémoire.' } : { ok: false, msg: m.H + ' hôte(s).' }; } },
      { id: 'm2', title: 'Pas de saturation', text: 'Réglez la capacité fixe pour éviter toute heure saturée.', solution: { cap: 10 , peak: 100, unit: 10 }, check: function (s, m) { return !m.a.miss && s.cap !== D.cap + 0 ? { ok: true, msg: 'Réussi.' } : !m.a.miss ? { ok: false, msg: 'Modifiez la capacité ou la demande pour tester.' } : { ok: false, msg: m.a.miss + ' heure(s) saturée(s).' }; } },
      { id: 'm3', title: 'Mesurer l’économie', text: 'Avec une base de 10 % et un pic de 100 %, obtenez au moins 40 % d’économie par élasticité.', solution: { base: 10, peak: 100, unit: 10, cap: 10 }, check: function (s, m) { if (s.base !== 10 || s.peak !== 100) return { ok: false, msg: 'Réglez la base à 10 % et le pic à 100 %.' }; return m.a.saving >= 40 ? { ok: true, msg: 'Réussi : ' + fN(m.a.saving) + ' % de serveur·heures évitées.' } : { ok: false, msg: 'Économie : ' + fN(m.a.saving) + ' %.' }; } }],
    limits: '<p>Le dimensionnement n’utilise que la mémoire ; processeur, disque et réseau sont ignorés. La forme de la demande est une sinusoïde idéale. Les coûts réels dépendent du fournisseur. Aucun service cloud réel n’est contacté.</p>' };
  lab.missions[1] = { id: 'm2', title: 'Pas de saturation', text: 'Avec un pic de 200 %, réglez la capacité fixe pour éviter toute heure saturée.', solution: { peak: 200, cap: 20, unit: 10 }, check: function (s, m) { if (s.peak !== 200) return { ok: false, msg: 'Réglez le pic à 200 %.' }; return !m.a.miss ? { ok: true, msg: 'Réussi : la capacité couvre le pic.' } : { ok: false, msg: m.a.miss + ' heure(s) saturée(s). Ajoutez des serveurs.' }; } };

  var list = [
    K.num('e1', 'Hôtes nécessaires', 'Consolidation', '<p>30 applications de 4 Go, surcoût 2 Go par VM, hôte 64 Go avec 4 Go de réserve. Combien d’hôtes ?</p>', hosts(30, 4, 2, 64, 4), '', { abs: 0.1 }, '<p>⌊60/6⌋ = 10 par hôte, donc 3 hôtes.</p>'),
    K.num('e2', 'Par hôte', 'Consolidation', '<p>Conteneurs de 1,9 Go + 0,1 Go de surcoût ; 60 Go utilisables. Combien de conteneurs par hôte ?</p>', 30, '', { abs: 0.1 }, '<p>⌊60/2⌋ = 30.</p>'),
    K.num('e3', 'Serveurs', 'Élasticité', '<p>Charge 75 %, serveurs de capacité 20 %. Combien de serveurs faut-il ?</p>', 4, '', { abs: 0.1 }, '<p>⌈75/20⌉ = 4.</p>'),
    K.pick('e4', 'IaaS', 'Modèles', '<p>En IaaS, le client gère :</p>', 'le système d’exploitation et les applications', ['uniquement ses données dans une application', 'le bâtiment du centre de données', 'les disques physiques'], '<p>Le fournisseur gère l’infrastructure, le client ce qui est au-dessus.</p>'),
    K.pick('e5', 'SaaS', 'Modèles', '<p>Un exemple de SaaS est :</p>', 'une messagerie en ligne', ['une machine virtuelle vide', 'un serveur physique acheté', 'un hyperviseur local'], '<p>Le logiciel est livré prêt à l’emploi.</p>'),
    K.pick('e6', 'Conteneur', 'Virtualisation', '<p>Un conteneur :</p>', 'partage le noyau de la machine hôte', ['embarque toujours un noyau complet', 'nécessite un disque dédié', 'ne peut pas être isolé'], '<p>Le système hôte fournit le noyau aux différents conteneurs.</p>'),
    K.pick('e7', 'Type 1', 'Virtualisation', '<p>Un hyperviseur de type 1 :</p>', 'fonctionne directement sur le matériel', ['fonctionne au-dessus d’un navigateur', 'nécessite un conteneur', 'ne gère qu’une machine virtuelle'], '<p>Il n’y a pas de système d’exploitation intermédiaire.</p>'),
    K.pick('e8', 'NIST', 'Modèles', '<p>Quelle caractéristique fait partie de la définition du NIST ?</p>', 'L’élasticité rapide', ['L’obligation d’un contrat papier', 'Le stockage sur bande uniquement', 'L’absence de réseau'], '<p>Les autres sont le libre-service, le large accès réseau, la mise en commun et le service mesuré.</p>')
  ];
  return { math: math, lesson: lesson, lab: lab, exercises: K.series('cloud', list) };
});
