/*
 * TELECOM CONNECT LAB — Module « Propagation radio » : leçon
 */
(function (root) {
  'use strict';
  var TCL = root.TCL = root.TCL || {};
  var P = TCL.propMath, M = TCL.signalMath;
  function v(s) { return '<var>' + s + '</var>'; }
  function fN(x, s) { return M.formatNumber(x, s); }
  function lenFmt(d) { return M.formatLength(d).replace(/ /g, ' '); }

  var BASE = { pt: 30, gt: 6, gr: 2, f: 900e6, loss: 0, sens: -90, ht: 30, hr: 1.5 };

  function budgetSvg() {
    var W = 600, H = 270, top = 44, bottom = H - 22, hi = 40, lo = -100;
    var y = function (dbm) { return top + (hi - dbm) / (hi - lo) * (bottom - top); };
    var fs = P.fspl(5000, 900e6), steps = [['Pt', 30], ['+ Gt', 6], ['− FSPL', -fs], ['− L', -10], ['+ Gr', 2]];
    var out = ['<svg class="schema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Escalier du bilan de liaison : 30 dBm émis, plus 6 dBi, moins ' + fN(fs, 4) + ' dB d’espace libre, moins 10 dB de pertes, plus 2 dBi : environ ' + fN(28 - fs, 3) + ' dBm reçus, au-dessus de la sensibilité de moins 90 dBm." xmlns="http://www.w3.org/2000/svg">'];
    out.push('<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>');
    [0, -50, -90].forEach(function (t) {
      out.push('<line class="' + (t === -90 ? 'schema__limit' : 'schema__lead') + '" x1="62" y1="' + y(t).toFixed(1) + '" x2="' + (W - 16) + '" y2="' + y(t).toFixed(1) + '"' + (t === 0 ? ' stroke-dasharray="2 4"' : t === -50 ? ' stroke-dasharray="2 4"' : '') + '/>');
      out.push('<text class="schema__t schema__t--muted" x="56" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end">' + (t === 0 ? '0' : '−' + (-t)) + ' dBm</text>');
    });
    var x = 78, cur = 0, w = 84;
    steps.forEach(function (st, i) {
      var nxt = i === 0 ? st[1] : cur + st[1], a = y(Math.max(cur, nxt)), b = y(Math.min(cur, nxt));
      out.push('<rect class="' + (st[1] >= 0 ? 'schema__gain' : 'schema__loss') + '" x="' + x + '" y="' + a.toFixed(1) + '" width="' + w + '" height="' + Math.max(3, b - a).toFixed(1) + '" rx="3"/>');
      out.push('<text class="schema__t" x="' + (x + w / 2) + '" y="24" text-anchor="middle">' + st[0] + '</text><text class="schema__t schema__t--muted" x="' + (x + w / 2) + '" y="38" text-anchor="middle">' + (st[1] > 0 ? '+' : '') + fN(st[1], 3) + ' dB' + (i === 0 ? 'm' : '') + '</text>');
      if (i < steps.length - 1) out.push('<line class="schema__lead" x1="' + (x + w) + '" y1="' + y(nxt).toFixed(1) + '" x2="' + (x + w + 18) + '" y2="' + y(nxt).toFixed(1) + '"/>');
      cur = nxt; x += w + 18;
    });
    out.push('<text class="schema__t schema__t--net" x="' + (x - 18 - w / 2) + '" y="' + (y(cur) - 8).toFixed(1) + '" text-anchor="middle">Pr ≈ ' + fN(cur, 3) + ' dBm</text>');
    out.push('<text class="schema__t schema__t--alt" x="' + (W - 18) + '" y="' + (y(-90) + 16).toFixed(1) + '" text-anchor="end">sensibilité S = −90 dBm</text>');
    out.push('</svg>');
    return out.join('');
  }

  function fsplOptions() {
    var s = Object.assign({}, BASE, { d: 5000 });
    return { kind: 'xy', title: 'Puissance reçue en espace libre selon la distance', desc: 'Droite décroissante de 20 dB par décade ; la sensibilité de −90 dBm est atteinte vers ' + lenFmt(P.maxRange(s)) + '.',
      x: { min: 10, max: 100000, log: true, ticks: [10, 100, 1000, 10000, 100000], format: lenFmt, label: 'distance d' },
      y: { min: -140, max: 20, ticks: [-140, -120, -100, -80, -60, -40, -20, 0, 20], zeroLine: false, label: 'Pr (dBm)' },
      series: [{ samples: 100, fn: function (d) { return P.received(Object.assign({}, s, { d: d })); } }],
      hlines: [{ y: -90, label: 'S = −90 dBm', anchor: 'start' }], vlines: [{ x: P.maxRange(s), label: 'portée ' + lenFmt(P.maxRange(s)) }],
      points: [{ x: 1000, y: P.received(Object.assign({}, s, { d: 1000 })), label: '1 km' }, { x: 10000, y: P.received(Object.assign({}, s, { d: 10000 })), label: '10 km : −20 dB' }] };
  }

  function twoRayOptions() {
    var s = Object.assign({}, BASE), bp = P.breakpoint(s.f, s.ht, s.hr);
    return { kind: 'xy', title: 'Modèle à deux rayons (ht = 30 m, hr = 1,5 m, 900 MHz)', desc: 'Oscillations autour de l’espace libre jusqu’à la distance de rupture de ' + lenFmt(bp) + ', puis décroissance de 40 dB par décade.',
      x: { min: 10, max: 100000, log: true, ticks: [10, 100, 1000, 10000, 100000], format: lenFmt, label: 'distance d' },
      y: { min: -160, max: 20, ticks: [-160, -120, -80, -40, 0], zeroLine: false, label: 'Pr (dBm)' },
      series: [{ samples: 200, cls: 'scope__trace scope__trace--ref', fn: function (d) { return P.received(Object.assign({}, s, { d: d })); } },
        { samples: 1600, fn: function (d) { return P.receivedTwoRay(Object.assign({}, s, { d: d })); } }],
      vlines: [{ x: bp, cls: 'scope__marker', label: 'rupture ' + lenFmt(bp) }] };
  }

  function fresnelSvg() {
    var W = 600, H = 210, x0 = 50, x1 = 550, yl = 100, a = 60, top = '', bot = '';
    for (var i = 0; i <= 60; i++) { var t = i / 60, r = 2 * a * Math.sqrt(t * (1 - t)), x = x0 + t * (x1 - x0); top += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + (yl - r).toFixed(1); bot = 'L' + x.toFixed(1) + ' ' + (yl + r).toFixed(1) + bot; }
    return '<svg class="schema" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Première zone de Fresnel : un ellipsoïde autour de la ligne directe, plus large au milieu du trajet. Un obstacle qui y pénètre provoque des pertes même s’il ne coupe pas la ligne directe." xmlns="http://www.w3.org/2000/svg">' +
      '<rect class="schema__bg" x="0" y="0" width="' + W + '" height="' + H + '" rx="14"/>' +
      '<path class="schema__fresnel" d="' + top + bot + 'Z"/><line class="schema__axis" x1="' + x0 + '" y1="' + yl + '" x2="' + x1 + '" y2="' + yl + '"/>' +
      '<path class="schema__ground" d="M380 ' + (H - 10) + 'L430 ' + (yl + 32) + 'L480 ' + (H - 10) + 'Z"/>' +
      '<line class="schema__lead" x1="300" y1="' + yl + '" x2="300" y2="' + (yl - a) + '"/><text class="schema__t" x="306" y="' + (yl - a / 2) + '">F₁ (maximal au milieu)</text>' +
      '<circle class="schema__ant" cx="' + x0 + '" cy="' + yl + '" r="6"/><circle class="schema__ant" cx="' + x1 + '" cy="' + yl + '" r="6"/>' +
      '<text class="schema__t" x="' + x0 + '" y="' + (yl + 26) + '">E</text><text class="schema__t" x="' + x1 + '" y="' + (yl + 26) + '" text-anchor="end">R</text>' +
      '<text class="schema__t schema__t--host" x="430" y="' + (H - 16) + '" text-anchor="middle">l’obstacle mord sur la zone</text></svg>';
  }

  function diffractionOptions() {
    return { kind: 'xy', title: 'Perte de diffraction d’une arête J(ν)', desc: 'Nulle pour ν inférieur à −0,78, 6 dB pour ν = 0 (sommet sur la ligne directe), puis croissante.',
      x: { min: -2, max: 3, ticks: [-2, -1, 0, 1, 2, 3], label: 'paramètre ν' }, y: { min: 0, max: 25, ticks: [0, 5, 10, 15, 20, 25], label: 'J (dB)' },
      series: [{ samples: 400, fn: P.knifeEdgeLoss }],
      points: [{ x: 0, y: P.knifeEdgeLoss(0), label: 'ν = 0 : 6 dB' }], vlines: [{ x: -0.78, label: '−0,78' }] };
  }

  var figures = {
    budget: { caption: 'Le bilan de liaison se lit comme un escalier : les gains montent, les pertes descendent ; la liaison fonctionne si l’on reste au-dessus de la sensibilité.', svg: budgetSvg },
    fspl: { caption: 'En espace libre, la puissance reçue perd 20 dB quand la distance est multipliée par 10 (échelle logarithmique).', options: fsplOptions },
    tworay: { caption: 'Avec un rayon réfléchi par le sol (trait plein), la puissance oscille puis chute plus vite que l’espace libre (pointillés).', options: twoRayOptions },
    fresnel: { caption: 'La première zone de Fresnel : l’énergie utile voyage dans ce volume, pas seulement sur la ligne directe.', svg: fresnelSvg },
    diffraction: { caption: 'Perte supplémentaire due à un obstacle en arête, selon le paramètre de diffraction ν (UIT-R P.526).', options: diffractionOptions }
  };

  var f5 = P.fspl(5000, 900e6), r0 = P.maxRange(Object.assign({}, BASE));

  var chapters = [
    {
      id: 'c1', title: 'Décibels et bilan de liaison',
      summary: 'dB et dBm ; additionner gains et pertes ; puissance reçue, sensibilité, marge.',
      html: [
        '<p class="lead">Entre l’émetteur et le récepteur, la puissance d’un signal radio est divisée par des milliards de milliards. Pour manipuler des rapports aussi grands, on utilise les décibels.</p>',
        '<h3>Le décibel</h3>',
        '<p>Un rapport de puissances ' + v('P') + '<sub>2</sub>/' + v('P') + '<sub>1</sub> s’exprime en décibels (dB) par :</p>',
        '<div class="formula">' + v('G') + '<sub>dB</sub> = 10 log<sub>10</sub>(' + v('P') + '<sub>2</sub> / ' + v('P') + '<sub>1</sub>)</div>',
        '<ul><li>× 2 ≈ +3 dB ; × 10 = +10 dB ; × 100 = +20 dB ; ÷ 1 000 = −30 dB.</li><li>Les <strong>multiplications</strong> deviennent des <strong>additions</strong> : c’est tout l’intérêt.</li></ul>',
        '<p>Le <strong>dBm</strong> exprime une puissance par rapport à 1 mW : ' + v('P') + '<sub>dBm</sub> = 10 log<sub>10</sub>(' + v('P') + ' / 1 mW). Ainsi 0 dBm = 1 mW, 30 dBm = 1 W, −90 dBm = 1 pW (10<sup>−12</sup> W).</p>',
        '<h3>Le bilan de liaison</h3>',
        '<div class="formula">' + v('P') + '<sub>r</sub> = ' + v('P') + '<sub>t</sub> + ' + v('G') + '<sub>t</sub> − ' + v('A') + ' − ' + v('L') + ' + ' + v('G') + '<sub>r</sub>&emsp;(dBm, dBi, dB)</div>',
        '<ul><li>' + v('P') + '<sub>t</sub> : puissance émise ; ' + v('G') + '<sub>t</sub>, ' + v('G') + '<sub>r</sub> : gains des antennes (en dBi, par rapport à une antenne isotrope).</li><li>' + v('A') + ' : affaiblissement de propagation (distance, fréquence, sol) ; ' + v('L') + ' : pertes supplémentaires (câbles, murs, obstacles).</li></ul>',
        '<div data-fig="budget"></div>',
        '<p>Le récepteur a une <strong>sensibilité</strong> ' + v('S') + ' : la plus petite puissance qu’il sait exploiter. La <strong>marge</strong> ' + v('P') + '<sub>r</sub> − ' + v('S') + ' doit être positive ; en pratique, on garde plusieurs dB de réserve pour les variations du canal.</p>'
      ].join('')
    },
    {
      id: 'c2', title: 'L’espace libre',
      summary: 'Formule de Friis ; affaiblissement en espace libre ; effet de la distance et de la fréquence ; portée.',
      html: [
        '<p class="lead">Le cas de référence : une liaison en vue directe, sans sol ni obstacle. La puissance se dilue sur une sphère de plus en plus grande.</p>',
        '<h3>L’affaiblissement en espace libre (FSPL)</h3>',
        '<div class="formula">FSPL = 20 log<sub>10</sub>(4π' + v('d') + v('f') + ' / ' + v('c') + ')&emsp;(' + v('d') + ' en m, ' + v('f') + ' en Hz)</div>',
        '<p>Forme pratique : FSPL (dB) = 32,45 + 20 log<sub>10</sub>(' + v('d') + '<sub>km</sub>) + 20 log<sub>10</sub>(' + v('f') + '<sub>MHz</sub>). Cette relation, avec les gains d’antenne, constitue la <strong>formule de Friis</strong>.</p>',
        '<ul class="examples"><li>Doubler la distance : +6 dB d’affaiblissement. Multiplier la distance par 10 : +20 dB.</li><li>Doubler la fréquence : +6 dB également, pour des antennes de gain fixé.</li></ul>',
        '<h3>Exemple guidé</h3>',
        '<ol class="steps"><li>900 MHz, 5 km : FSPL = 32,45 + 20 log(5) + 20 log(900) = 32,45 + 13,98 + 59,08 ≈ <strong>' + fN(f5, 4) + ' dB</strong>.</li>',
        '<li>Bilan avec 30 dBm, 6 dBi et 2 dBi : ' + v('P') + '<sub>r</sub> = 30 + 6 + 2 − ' + fN(f5, 4) + ' ≈ <strong>' + fN(38 - f5, 4) + ' dBm</strong>.</li>',
        '<li>Sensibilité −90 dBm : marge ≈ ' + fN(38 - f5 + 90, 3) + ' dB. La liaison fonctionne.</li></ol>',
        '<div data-fig="fspl"></div>',
        '<h3>La portée maximale</h3>',
        '<p>On cherche la distance où ' + v('P') + '<sub>r</sub> = ' + v('S') + ' : l’affaiblissement admissible vaut ' + v('P') + '<sub>t</sub> + ' + v('G') + '<sub>t</sub> + ' + v('G') + '<sub>r</sub> − ' + v('L') + ' − ' + v('S') + '. Chaque 6 dB gagnés (antenne, puissance, sensibilité) <strong>doublent</strong> la portée en espace libre. Dans l’exemple, la portée est d’environ ' + lenFmt(r0) + ' : une valeur théorique, bien supérieure à la réalité au sol.</p>'
      ].join('')
    },
    {
      id: 'c3', title: 'Antennes, PIRE et sensibilité',
      summary: 'Gain d’antenne ; puissance isotrope rayonnée équivalente ; limites réglementaires ; choix du récepteur.',
      html: [
        '<p class="lead">Une antenne ne crée pas d’énergie : elle la concentre dans une direction. Le gain mesure cette concentration.</p>',
        '<h3>Gain et PIRE</h3>',
        '<p>Une antenne de 6 dBi envoie, dans sa direction principale, 4 fois plus de puissance qu’une antenne isotrope. On combine puissance et gain dans la <strong>PIRE</strong> (puissance isotrope rayonnée équivalente) :</p>',
        '<div class="formula">PIRE (dBm) = ' + v('P') + '<sub>t</sub> + ' + v('G') + '<sub>t</sub> − pertes de câble</div>',
        '<p>La réglementation limite souvent la PIRE plutôt que la puissance : par exemple 20 dBm (100 mW) pour le Wi-Fi à 2,4 GHz en Europe. Augmenter le gain de l’antenne d’émission oblige alors à réduire la puissance ; en revanche, le gain de l’antenne de <strong>réception</strong> reste un levier libre.</p>',
        '<h3>Sensibilité du récepteur</h3>',
        '<p>La sensibilité dépend du bruit (voir le module « Chaîne de transmission ») et du débit : plus le débit est élevé, plus il faut de puissance. Un récepteur 4G accepte environ −100 dBm à faible débit ; un récepteur Wi-Fi à très haut débit demande environ −65 dBm. Un récepteur GPS fonctionne vers −130 dBm grâce à un débit très faible.</p>',
        '<div class="callout callout--info"><strong>Le principe de réciprocité.</strong> Une antenne a le même gain en émission et en réception. Un bilan de liaison se calcule donc dans les deux sens, mais les puissances et sensibilités diffèrent : la liaison montante (du téléphone vers la station) est souvent la plus limitante, car le téléphone émet moins fort.</div>'
      ].join('')
    },
    {
      id: 'c4', title: 'La réflexion sur le sol et les trajets multiples',
      summary: 'Modèle à deux rayons ; interférences constructives et destructives ; distance de rupture ; évanouissements.',
      html: [
        '<p class="lead">Au-dessus du sol, le récepteur reçoit l’onde directe et une onde réfléchie par le sol. Les deux s’additionnent… ou se compensent.</p>',
        '<h3>Le modèle à deux rayons</h3>',
        '<p>Le rayon réfléchi parcourt un peu plus de chemin. Avec un sol plan et une réflexion rasante, il est inversé (coefficient de réflexion Γ ≈ −1). Selon la différence de trajet Δ, les deux ondes arrivent <strong>en phase</strong> (le signal se renforce, jusqu’à +6 dB) ou <strong>en opposition</strong> (le signal s’effondre : un creux).</p>',
        '<div class="formula">Δ ≈ 2' + v('h') + '<sub>t</sub>' + v('h') + '<sub>r</sub> / ' + v('d') + '&emsp;·&emsp;' + v('d') + '<sub>c</sub> = 4' + v('h') + '<sub>t</sub>' + v('h') + '<sub>r</sub> / λ</div>',
        '<div data-fig="tworay"></div>',
        '<p>Au-delà de la <strong>distance de rupture</strong> ' + v('d') + '<sub>c</sub>, les deux rayons tendent à s’annuler : la puissance décroît en 1/' + v('d') + '⁴, soit <strong>40 dB par décade</strong> (12 dB quand la distance double), au lieu de 20 dB en espace libre. On a alors ' + v('P') + '<sub>r</sub> ≈ ' + v('P') + '<sub>t</sub>' + v('G') + '<sub>t</sub>' + v('G') + '<sub>r</sub> (' + v('h') + '<sub>t</sub>' + v('h') + '<sub>r</sub>)² / ' + v('d') + '⁴ : la fréquence n’intervient plus, mais la <strong>hauteur des antennes</strong> devient décisive (doubler ' + v('h') + '<sub>t</sub> fait gagner 6 dB).</p>',
        '<p>Exemple : ' + v('h') + '<sub>t</sub> = 30 m, ' + v('h') + '<sub>r</sub> = 1,5 m, 900 MHz : λ = 0,333 m et ' + v('d') + '<sub>c</sub> = 4 × 30 × 1,5 / 0,333 ≈ <strong>' + lenFmt(P.breakpoint(900e6, 30, 1.5)) + '</strong>.</p>',
        '<h3>Les trajets multiples en ville</h3>',
        '<p>En ville, les ondes se réfléchissent sur les façades, se diffractent sur les toits et se diffusent sur les objets. Le récepteur additionne des dizaines de copies retardées : en se déplaçant de quelques centimètres (une fraction de λ), le signal peut perdre 20 à 30 dB. Ces <strong>évanouissements rapides</strong> (fading) sont combattus par la diversité d’antennes (plusieurs antennes, MIMO), le codage et l’entrelacement.</p>'
      ].join('')
    },
    {
      id: 'c5', title: 'Obstacles : zone de Fresnel, diffraction et horizon',
      summary: 'Première zone de Fresnel ; dégagement ; diffraction par une arête ; pénétration ; courbure terrestre.',
      html: [
        '<p class="lead">Une liaison ne se résume pas à une ligne : l’énergie utile occupe un volume autour du trajet direct.</p>',
        '<h3>La première zone de Fresnel</h3>',
        '<p>C’est l’ellipsoïde des points pour lesquels le trajet émetteur → point → récepteur est plus long que le trajet direct de moins de λ/2. Son rayon, à ' + v('d') + '<sub>1</sub> de l’émetteur et ' + v('d') + '<sub>2</sub> du récepteur, vaut :</p>',
        '<div class="formula">' + v('F') + '<sub>1</sub> = √(λ ' + v('d') + '<sub>1</sub> ' + v('d') + '<sub>2</sub> / (' + v('d') + '<sub>1</sub> + ' + v('d') + '<sub>2</sub>))</div>',
        '<div data-fig="fresnel"></div>',
        '<p>Au milieu d’une liaison de 5 km à 900 MHz : ' + v('F') + '<sub>1</sub> = √(0,333 × 2 500 × 2 500 / 5 000) ≈ <strong>' + fN(P.fresnelRadius(900e6, 2500, 2500), 3) + ' m</strong>. Règle pratique des ingénieurs : dégager au moins <strong>60 %</strong> de ' + v('F') + '<sub>1</sub> pour retrouver les performances de l’espace libre.</p>',
        '<h3>La diffraction par une arête</h3>',
        '<p>Quand un obstacle (crête, toit) s’approche de la ligne directe ou la coupe, l’onde le contourne par <strong>diffraction</strong>, avec une perte. Pour une arête mince, on calcule le paramètre sans dimension ν et la perte ' + v('J') + '(ν) (recommandation UIT-R P.526) :</p>',
        '<div class="formula">ν = ' + v('h') + ' √(2(' + v('d') + '<sub>1</sub> + ' + v('d') + '<sub>2</sub>) / (λ ' + v('d') + '<sub>1</sub> ' + v('d') + '<sub>2</sub>))&emsp;·&emsp;' + v('J') + ' ≈ 6,9 + 20 log<sub>10</sub>(√((ν − 0,1)² + 1) + ν − 0,1)</div>',
        '<p>' + v('h') + ' est la hauteur du sommet par rapport à la ligne directe (négative s’il est en dessous). La formule s’applique pour ν &gt; −0,78 ; en dessous, la perte est négligeable.</p>',
        '<div data-fig="diffraction"></div>',
        '<ul class="examples"><li>Sommet exactement sur la ligne directe (ν = 0) : <strong>6 dB</strong> de perte, la moitié du champ.</li><li>Sommet bien au-dessus (ν = 2,4) : environ 20 dB.</li><li>Les hautes fréquences (λ petite) donnent un ν plus grand pour le même obstacle : elles « contournent » moins bien les obstacles.</li></ul>',
        '<h3>Murs et végétation</h3>',
        '<p>Traverser un matériau coûte aussi des dB : quelques dB pour une vitre ou une cloison légère, 10 à 20 dB ou plus pour un mur en béton armé, selon l’épaisseur et la fréquence. Ces valeurs, très variables, sont mesurées ou tirées de tables (UIT-R P.2040) ; le laboratoire les traite comme des pertes que vous choisissez.</p>',
        '<h3>L’horizon radioélectrique</h3>',
        '<p>La Terre est ronde : au-delà d’une certaine distance, le sol masque la vue directe. L’atmosphère courbe légèrement les ondes, ce qu’on modélise par une Terre de rayon 4/3 plus grand :</p>',
        '<div class="formula">' + v('d') + '<sub>horizon</sub> ≈ 4,12 (√' + v('h') + '<sub>t</sub> + √' + v('h') + '<sub>r</sub>) km&emsp;(hauteurs en m)</div>',
        '<p>Avec 30 m et 1,5 m : 4,12 × (5,48 + 1,22) ≈ <strong>' + lenFmt(P.radioHorizon(30, 1.5)) + '</strong>. C’est pourquoi les relais hertziens sont placés sur des points hauts.</p>'
      ].join('')
    },
    {
      id: 'c6', title: 'Limites des modèles et synthèse',
      summary: 'Domaine de validité ; modèles empiriques ; récapitulatif ; erreurs fréquentes.',
      html: [
        '<p class="lead">Un modèle de propagation n’est qu’une approximation : il faut savoir quand il s’applique.</p>',
        '<h3>Ce que valent les modèles de ce module</h3>',
        '<div class="table-wrap"><table class="data-table"><caption>Domaine de validité</caption><thead><tr><th scope="col">Modèle</th><th scope="col">Valable si…</th><th scope="col">Ignore…</th></tr></thead><tbody>' +
          '<tr><td>Espace libre</td><td>vue directe, zone de Fresnel dégagée (satellite, faisceau hertzien)</td><td>sol, obstacles, atmosphère</td></tr>' +
          '<tr><td>Deux rayons</td><td>terrain plat et dégagé, antennes au-dessus du sol</td><td>relief, rugosité, courbure terrestre, autres réflexions</td></tr>' +
          '<tr><td>Arête unique</td><td>un obstacle net (crête, bord de toit)</td><td>obstacles arrondis ou multiples, végétation</td></tr>' +
        '</tbody></table></div>',
        '<p>En ville ou en intérieur, les opérateurs utilisent des <strong>modèles empiriques</strong> ajustés sur des milliers de mesures (Okumura-Hata, COST 231, modèles 3GPP), des logiciels de lancer de rayons sur des cartes 3D, et surtout des campagnes de mesures. L’exposant de l’affaiblissement y vaut souvent 3 à 4 (au lieu de 2), avec des fluctuations aléatoires de plusieurs dB.</p>',
        '<h3>Ce qu’il faut retenir</h3>',
        '<ul class="summary"><li>Bilan : ' + v('P') + '<sub>r</sub> = ' + v('P') + '<sub>t</sub> + ' + v('G') + '<sub>t</sub> + ' + v('G') + '<sub>r</sub> − ' + v('A') + ' − ' + v('L') + ' ; la liaison fonctionne si ' + v('P') + '<sub>r</sub> ≥ ' + v('S') + ' (avec une marge).</li>',
        '<li>Espace libre : FSPL = 32,45 + 20 log ' + v('d') + '<sub>km</sub> + 20 log ' + v('f') + '<sub>MHz</sub> ; +6 dB quand ' + v('d') + ' ou ' + v('f') + ' double.</li>',
        '<li>Réflexion sur le sol : creux et bosses, puis 40 dB par décade au-delà de ' + v('d') + '<sub>c</sub> = 4' + v('h') + '<sub>t</sub>' + v('h') + '<sub>r</sub>/λ.</li>',
        '<li>Obstacles : dégager 60 % de la zone de Fresnel ; une arête sur la ligne directe coûte 6 dB.</li>',
        '<li>La courbure terrestre limite la vue directe à l’horizon radioélectrique.</li></ul>',
        '<h3>Erreurs fréquentes à éviter</h3>',
        '<ul class="pitfalls">',
        '<li><strong>Additionner des watts et des dB.</strong> On additionne des dBm et des dB, jamais des mW et des dB.</li>',
        '<li><strong>Oublier le signe des pertes.</strong> Les pertes se retranchent, les gains s’ajoutent.</li>',
        '<li><strong>Croire qu’une vue directe suffit.</strong> Un obstacle qui frôle la ligne directe coûte déjà plusieurs dB.</li>',
        '<li><strong>Prendre la portée en espace libre pour une portée réelle.</strong> Au sol, elle est souvent dix fois plus courte.</li>',
        '</ul>'
      ].join('')
    }
  ];

  TCL.lessons = TCL.lessons || {};
  TCL.lessons.propagation = {
    id: 'propagation', title: 'Propagation radio',
    intro: 'Cette leçon explique comment calculer la puissance reçue par un récepteur radio, comment la distance, la fréquence, le sol et les obstacles l’affaiblissent, et dans quelles limites les modèles simples sont valables.',
    objectives: [
      'Manipuler les décibels (dB, dBm) et établir un bilan de liaison.',
      'Calculer l’affaiblissement en espace libre et une portée maximale.',
      'Expliquer le rôle des gains d’antenne, de la PIRE et de la sensibilité.',
      'Décrire l’effet d’une réflexion sur le sol et la distance de rupture.',
      'Calculer un rayon de Fresnel et estimer la perte due à un obstacle.',
      'Situer les limites des modèles idéalisés.'
    ],
    prerequisites: 'Module « Ondes électromagnétiques » (longueur d’onde) ; logarithme décimal (calculatrice).',
    chapters: chapters, figures: figures
  };
})(window);
