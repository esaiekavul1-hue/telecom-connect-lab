/*
 * TELECOM CONNECT LAB 2.0 — Moteur des laboratoires déclaratifs
 * ------------------------------------------------------------
 * Un laboratoire est décrit par un objet pur (voir modules/<id>/<id>.js) :
 *   params   : commandes [{ k, label, min, max, step, unit, log, dec, hint, when? }
 *                         | { k, label, opts: [[v, texte]], select?, hint?, when? } | { group }]
 *   defaults : état initial (les clés sans commande portent l'état d'une expérience pas à pas)
 *   model(s) : calcul pur des résultats à partir de l'état
 *   readouts, plots, schema, widget, actions, explain, missions, limits
 * Les widgets interactifs rendent des boutons [data-act][data-arg] ; le moteur
 * appelle actions[nom](état, argument) puis recalcule tout.
 */
(function (root) {
  'use strict';
  var TCL = root.TCL;
  var U = TCL.util, K = TCL.labkit;
  function fN(x, s) { return TCL.signalMath.formatNumber(x, s == null ? 3 : s); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function paramList(def) { return def.params.filter(function (p) { return p.k; }); }

  function sanitizer(def) {
    return function (saved) {
      var o = {};
      paramList(def).forEach(function (p) {
        var x = saved[p.k];
        if (p.opts) { if (p.opts.some(function (op) { return String(op[0]) === String(x); })) o[p.k] = x; } else if (isFinite(x) && x !== null && x >= p.min && x <= p.max) o[p.k] = Number(x);
      });
      Object.keys(def.defaults).forEach(function (k) {
        if (o[k] !== undefined || paramList(def).some(function (p) { return p.k === k; })) return;
        var d = def.defaults[k], x = saved[k];
        if (x === undefined) return;
        if (Array.isArray(d) ? Array.isArray(x) && x.length === d.length : typeof d === typeof x) o[k] = x;
      });
      return o;
    };
  }

  function controlHtml(p) {
    var inner;
    if (p.opts) inner = p.select ? K.select({ id: 'in-' + p.k, label: p.label, options: p.opts, hint: p.hint || '' }) : K.segmented({ id: 'in-' + p.k, label: p.label, options: p.opts, hint: p.hint });
    else inner = K.range({ id: 'in-' + p.k, label: p.label, min: p.log ? 0 : p.min, max: p.log ? 1000 : p.max, step: p.log ? 1 : (p.step || 'any'), unit: p.unit || '', srLabel: U.esc(p.label.replace(/<[^>]+>/g, '')), hint: p.hint || ('De ' + fN(p.min) + ' à ' + fN(p.max) + (p.unit ? ' ' + p.unit : '') + (p.log ? ' (curseur logarithmique).' : '.')) });
    return '<div data-param="' + p.k + '">' + inner + '</div>';
  }

  function build(def) {
    var ID = def.id, DEFAULTS = clone(def.defaults);
    var sanitize = sanitizer(def);
    var missions = def.missions.map(function (m) { return { id: m.id, title: m.title, text: m.text, check: function (s) { return m.check(s, def.model(s)); } }; });

    function mount(container) {
      var s = K.loadParams(ID, clone(DEFAULTS), sanitize);
      try { def.model(s); } catch (e) { s = clone(DEFAULTS); }
      var tr = K.tracker(), save = K.paramSaver(ID), plots = def.plots || [], charts = [], pairs = {};
      var $ = function (q) { return container.querySelector(q); };

      var panels = [];
      if (def.schema) panels.push('<div class="scope-panel"><div class="scope-panel__bar"><p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p></div><div id="schema" class="sk-host"></div></div>');
      if (def.widget) panels.push('<div class="sim-widget" id="widget"></div>');
      plots.forEach(function (p, i) {
        var bar = i === 0 && !def.schema ? '<p class="scope-panel__expr" id="expr"></p><p class="verdict" id="verdict" aria-live="polite"></p>' : '<p class="scope-panel__expr" id="expr-' + i + '"></p>';
        panels.push('<div class="scope-panel"><div class="scope-panel__bar">' + bar + '</div><div class="scope-panel__plot" id="plot-' + i + '"></div></div>');
      });
      var controls = def.params.map(function (p) { return p.group ? '<p class="controls__group">' + U.esc(p.group) + '</p>' : controlHtml(p); }).join('');

      container.innerHTML = '<div class="lab">' + K.head({ title: 'Laboratoire : ' + def.short, badge: def.badge, text: def.text }) +
        '<div class="lab__grid"><div class="lab__main">' + panels.join('') +
        K.readouts(def.readouts.map(function (r, i) { return [r[0], 'r-' + i]; })) + K.explainBox('') +
        '</div><aside class="lab__controls" aria-label="Commandes de la simulation"><form class="controls" novalidate>' + controls +
        '<button type="button" class="btn btn--ghost btn--block" id="lab-reset">' + TCL.icon('reset') + 'Recommencer</button></form></aside></div>' +
        K.missionsSection(missions) + K.limits(def.limits) + K.sequenceLinks(ID) + '</div>';

      plots.forEach(function (p, i) {
        charts.push(TCL.plot.mount($('#plot-' + i), function (w) {
          var m = def.model(s), o = p.options(s, m, w);
          if (!o.kind) o.kind = 'xy';
          if (!o.ratio) o.ratio = w < 520 ? 0.62 : 0.36;
          return o;
        }));
      });

      function refresh() {
        var m = def.model(s);
        if (def.schema) $('#schema').innerHTML = def.schema(s, m);
        if (def.widget) {
          var ae = document.activeElement, keep = ae && ae.getAttribute && ae.getAttribute('data-act') ? '[data-act="' + ae.getAttribute('data-act') + '"]' + (ae.getAttribute('data-arg') != null ? '[data-arg="' + ae.getAttribute('data-arg') + '"]' : '') : null;
          $('#widget').innerHTML = def.widget(s, m);
          if (keep && !$('#widget').contains(ae)) { var back = $(keep); if (back) back.focus(); }
        }
        charts.forEach(function (c) { c.update(); });
        if ($('#expr')) $('#expr').innerHTML = def.expr ? def.expr(s, m) : '';
        plots.forEach(function (p, i) { var el = $('#expr-' + i); if (el) el.innerHTML = p.expr ? p.expr(s, m) : ''; });
        if ($('#verdict')) {
          var ve = def.verdict ? def.verdict(s, m) : null, el = $('#verdict');
          el.className = ve ? 'verdict ' + (ve.ok ? 'verdict--ok' : 'verdict--ko') : 'verdict';
          el.innerHTML = ve ? TCL.icon(ve.ok ? 'check' : 'alert') + '<span>' + U.esc(ve.text) + '</span>' : '';
        }
        def.readouts.forEach(function (r, i) { K.setText(container, '#r-' + i, r[1](s, m)); });
        paramList(def).forEach(function (p) {
          var box = $('[data-param="' + p.k + '"]');
          if (box && p.when) box.hidden = !p.when(s);
          if (p.opts) {
            if (p.select) { var sel = $('#in-' + p.k); if (document.activeElement !== sel) sel.value = s[p.k]; }
            else { var r = container.querySelector('input[name="in-' + p.k + '"][value="' + s[p.k] + '"]'); if (r) r.checked = true; }
          } else {
            K.setText(container, '#in-' + p.k + '-out', p.fmt ? p.fmt(s[p.k]) : fN(s[p.k]) + (p.unit ? ' ' + p.unit : ''));
            pairs[p.k].sync(s[p.k]);
          }
        });
        $('#explain').innerHTML = def.explain(s, m, tr.param());
        save(s);
      }
      function set(k, v) { tr.before(k, s); s[k] = v; refresh(); }

      paramList(def).forEach(function (p) {
        if (p.opts) {
          var after = function (raw) { var opt = p.opts.filter(function (o) { return String(o[0]) === raw; })[0]; tr.before(p.k, s); s[p.k] = opt[0]; if (p.onChange) p.onChange(s); refresh(); tr.end(); };
          if (p.select) $('#in-' + p.k).addEventListener('change', function () { after(this.value); });
          else U.qsa('input[name="in-' + p.k + '"]', container).forEach(function (el) { el.addEventListener('change', function () { after(el.value); }); });
          return;
        }
        var log = p.log ? K.logSlider(p.min, p.max) : null;
        pairs[p.k] = K.bindPair(container, { id: 'in-' + p.k, toSlider: log ? log.to : null, fromSlider: log ? log.from : null,
          validate: K.numberValidator(p.min, p.max, p.unit || '', p.dec == null ? 3 : p.dec),
          onInput: function (v) { set(p.k, p.dec === 0 ? Math.round(v) : v); }, onEnd: function () { tr.end(); }, current: function () { return s[p.k]; } });
      });

      function onClick(e) {
        var b = e.target.closest && e.target.closest('[data-act]');
        if (!b || !container.contains(b) || !def.actions) return;
        var fn = def.actions[b.getAttribute('data-act')];
        if (!fn) return;
        tr.before(b.getAttribute('data-act'), s);
        fn(s, b.getAttribute('data-arg'));
        refresh(); tr.end();
      }
      container.addEventListener('click', onClick);
      $('#lab-reset').addEventListener('click', function () { s = clone(DEFAULTS); tr.reset(); Object.keys(pairs).forEach(function (k) { pairs[k].clear(); }); refresh(); U.toast('Expérience réinitialisée.', 'info'); });
      U.qs('form.controls', container).addEventListener('submit', function (e) { e.preventDefault(); });
      K.bindMissions(container, ID, def.short, missions, function () { return s; });
      refresh();
      return function () { container.removeEventListener('click', onClick); charts.forEach(function (c) { c.destroy(); }); };
    }

    function thumb() {
      var s = clone(DEFAULTS), m = def.model(s);
      if (def.plots && def.plots.length) { var o = def.plots[0].options(s, m, 420); o.kind = o.kind || 'xy'; o.ratio = 0.55; return o; }
      if (def.schema) return { html: '<div class="thumb-fiber">' + def.schema(s, m) + '</div>' };
      return { html: '<div class="thumb-fiber thumb-icon">' + TCL.icon(def.icon) + '</div>' };
    }

    return { id: ID, title: def.title, short: def.short, icon: def.icon, summary: def.summary, mount: mount, missions: missions, thumb: thumb, DEFAULTS: DEFAULTS, model: def.model, def: def };
  }

  TCL.labEngine = { build: build };
})(window);
