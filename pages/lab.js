/*
 * Espace « Mon laboratoire » : liste des simulations et page de simulation.
 * Une simulation n'apparaît comme disponible que si elle est réellement
 * développée (fichier modules/<id>/simulation.js chargé) ET déclarée dans
 * modules/registry.js.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, I = TCL.icon, esc = U.esc;
  var P = TCL.pages;

  function labInfo(id) {
    if (id === 'signaux') {
      return { id: 'signaux', title: 'Signal sinusoïdal', summary: 'Réglez l’amplitude, la fréquence, la phase et la fenêtre de temps d’une sinusoïde idéale. Lisez la période, la pulsation et le décalage, puis réalisez trois missions.', missions: TCL.labs.signaux.missions,
        thumb: function () { return Object.assign(TCL.plot.sineOptions({ A: 3, f: 150, phi: Math.PI / 4, win: 0.02, reference: { A: 3 }, yMax: 5, yStep: 1, title: 'Aperçu de la simulation' }), { ratio: 0.55 }); } };
    }
    return TCL.labs[id];
  }

  function list(main) {
    var st = TCL.store.get();
    var labs = TCL.registry.withLab();
    var cards = labs.map(function (m) {
      var info = labInfo(m.id), p = TCL.registry.labProgress(st, m.id);
      var opened = !!(st.lab[m.id] && st.lab[m.id].params);
      return '<article class="lab-card"><div class="lab-card__visual" data-thumb="' + m.id + '"></div><div class="lab-card__body">' +
        '<p class="lab-card__badges"><span class="badge badge--live">Disponible</span><span class="badge badge--skill">' + esc(m.title) + '</span></p>' +
        '<h2><a href="#/laboratoire/' + m.id + '">' + esc(info.title) + '</a></h2>' +
        '<p>' + esc(info.summary) + '</p>' +
        '<p class="card__meta">Missions réussies : ' + p.missionsDone + ' / ' + p.missionsTotal + '</p>' +
        '<div class="card__actions"><a class="btn btn--primary" href="#/laboratoire/' + m.id + '">' + I('flask') + (opened ? 'Reprendre la simulation' : 'Ouvrir la simulation') + '</a>' +
        (TCL.registry.liveParts(m).lesson ? '<a class="btn btn--ghost" href="#/lecons/' + m.id + '">' + I('book') + 'Leçon</a>' : '') + '</div>' +
        '</div></article>';
    }).join('');
    var soon = TCL.registry.labPlanned().map(function (m) {
      return '<li class="soon">' + I(m.icon) + '<div><h4>' + esc(m.title) + '</h4><p>Simulation en cours de développement.</p></div><span class="badge badge--soon">En préparation</span></li>';
    }).join('');
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mon laboratoire' }]) +
      P.head('Mon laboratoire', 'Manipulez les paramètres techniques et observez immédiatement leurs effets. Chaque simulation se termine par de courtes missions pour vérifier votre compréhension.') +
      '<div class="lab-list">' + cards +
      (soon ? '<section aria-labelledby="soon-labs"><h2 class="h-sub" id="soon-labs">Prochaines simulations</h2><ul class="soon-list">' + soon + '</ul></section>' : '') +
      '</div></div>';
    var mounted = [];
    U.qsa('[data-thumb]', main).forEach(function (el) {
      var info = labInfo(el.getAttribute('data-thumb'));
      var t = info.thumb();
      if (t && t.html) { el.classList.add('lab-card__visual--schema'); el.innerHTML = t.html; return; }
      mounted.push(TCL.plot.mount(el, function () { return info.thumb(); }));
    });
    return function () { mounted.forEach(function (m) { m.destroy(); }); };
  }

  function lab(main, params) {
    var id = params.lab;
    var mod = TCL.registry.byId(id);
    if (!mod || !TCL.registry.liveParts(mod).lab) return TCL.pages.notFound.render(main);
    var info = labInfo(id);
    main.innerHTML = '<div class="container page">' + P.crumbs([{ label: 'Mon laboratoire', href: '#/laboratoire' }, { label: info.title }]) + P.moduleNav(id, 'lab') + '<div id="lab-host"></div></div>';
    return TCL.labs[id].mount(U.qs('#lab-host', main));
  }

  TCL.pages.labs = { title: 'Mon laboratoire', render: list };
  TCL.pages.lab = {
    title: function (p) { var info = TCL.labs[p.lab] ? labInfo(p.lab) : null; return info ? 'Laboratoire : ' + info.title : 'Laboratoire'; },
    render: lab
  };
})(window);
