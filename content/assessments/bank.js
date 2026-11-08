/*
 * TELECOM CONNECT LAB — Banque de questions des évaluations formelles
 * ------------------------------------------------------------------
 * CE DOSSIER N'EST JAMAIS PUBLIÉ dans le site ni dans l'APK (voir
 * tools/build-www.js) : les corrigés ne vivent que sur le serveur.
 *
 * Chaque question se décline en variantes numériques ; le serveur en tire une
 * au hasard. Les bonnes réponses sont CALCULÉES par les bibliothèques déjà
 * testées (modules/<id>/*-math.js), jamais recopiées à la main.
 *
 * Ces contenus doivent faire l'objet d'une validation scientifique par un
 * enseignant avant tout usage à enjeu.
 *
 * ⚠ Ne pas réordonner les paramètres d'une question déjà publiée : les
 * corrections des tentatives passées pointent vers l'indice de la variante.
 * Pour corriger une question, créer un nouvel identifiant et désactiver l'ancienne.
 */
'use strict';
var path = require('path');
var R = path.join(__dirname, '..', '..', 'modules');
var req = function (p) { return require(path.join(R, p)); };
var M = req('signaux/signal-math.js'), C = req('circuits/circuit-math.js'), W = req('ondes-em/wave-math.js'), A = req('antennes/antenna-math.js'),
  P = req('propagation/propagation-math.js'), CH = req('chaine/chain-math.js'), MD = req('modulation/modulation-math.js'),
  F = req('fibre/fiber-math.js'), MO = req('mobiles/mobile-math.js'), IP = req('ip/ip-math.js');

function fN(x, s) { return M.formatNumber(x, s || 4); }
var IDS = ['a', 'b', 'c', 'd'];

function num(id, skill, params, fn) {
  return { id: id, skill: skill, kind: 'numeric', variants: params.map(function (p) {
    var r = fn(p), answer = { value: r.value };
    if (r.abs != null) answer.abs = r.abs; else answer.rel = r.rel != null ? r.rel : 0.02;
    return { prompt: r.prompt, unit: r.unit || '', answer: answer, display: fN(r.value) + (r.unit ? ' ' + r.unit : ''), explanation: r.explanation };
  }) };
}
function text(id, skill, params, fn) {
  return { id: id, skill: skill, kind: 'text', variants: params.map(function (p) {
    var r = fn(p);
    return { prompt: r.prompt, answer: { accepted: r.accepted }, display: r.accepted[0], explanation: r.explanation };
  }) };
}
function mcq(id, skill, params, fn) {
  return { id: id, skill: skill, kind: 'qcm', variants: params.map(function (p, n) {
    var r = fn(p), count = r.wrong.length + 1, at = n % count, labels = r.wrong.slice();
    labels.splice(at, 0, r.correct);
    return { prompt: r.prompt, options: labels.map(function (l, i) { return { id: IDS[i], label: l }; }), answer: { id: IDS[at] }, display: r.correct, explanation: r.explanation };
  }) };
}

var bank = {};

bank.circuits = [
  num('ci-ohm', 'Loi d’Ohm', [[12, 470], [5, 220], [9, 1000], [24, 680]], function (p) { return {
    prompt: '<p>Une résistance de ' + fN(p[1]) + ' Ω est alimentée sous ' + fN(p[0]) + ' V. Calculez le courant, <strong>en mA</strong>.</p>',
    value: p[0] / p[1] * 1000, unit: 'mA', explanation: '<p>I = U/R = ' + fN(p[0]) + ' / ' + fN(p[1]) + ' = ' + fN(p[0] / p[1] * 1000) + ' mA.</p>' }; }),
  num('ci-par', 'Association de résistances', [[100, 100], [220, 330], [1000, 470], [150, 680]], function (p) { var r = C.parallel(p); return {
    prompt: '<p>Deux résistances de ' + fN(p[0]) + ' Ω et ' + fN(p[1]) + ' Ω sont en parallèle. Calculez la résistance équivalente, en Ω.</p>',
    value: r, unit: 'Ω', explanation: '<p>Req = R₁R₂/(R₁+R₂) = ' + fN(r) + ' Ω.</p>' }; }),
  num('ci-div', 'Diviseur de tension', [[12, 1000, 2200], [9, 470, 470], [5, 3300, 1000], [24, 10000, 4700]], function (p) { var u = C.divider(p[0], p[1], p[2]); return {
    prompt: '<p>Un diviseur à vide est alimenté sous ' + fN(p[0]) + ' V, avec R₁ = ' + fN(p[1]) + ' Ω côté source et R₂ = ' + fN(p[2]) + ' Ω côté masse. Calculez la tension aux bornes de R₂, en V.</p>',
    value: u, unit: 'V', explanation: '<p>U₂ = E·R₂/(R₁+R₂) = ' + fN(u) + ' V.</p>' }; }),
  num('ci-pow', 'Puissance', [[100, 0.05], [470, 0.02], [220, 0.1], [1000, 0.01]], function (p) { var w = C.powerRI(p[0], p[1]) * 1000; return {
    prompt: '<p>Une résistance de ' + fN(p[0]) + ' Ω est parcourue par ' + fN(p[1] * 1000) + ' mA. Calculez la puissance dissipée, <strong>en mW</strong>.</p>',
    value: w, unit: 'mW', explanation: '<p>P = R·I² = ' + fN(w) + ' mW.</p>' }; }),
  num('ci-tau', 'Circuit RC', [[1000, 100], [4700, 10], [10000, 47], [2200, 220]], function (p) { var t = C.tau(p[0], p[1] * 1e-6) * 1000; return {
    prompt: '<p>Un circuit RC comporte R = ' + fN(p[0]) + ' Ω et C = ' + fN(p[1]) + ' µF. Calculez sa constante de temps, <strong>en ms</strong>.</p>',
    value: t, unit: 'ms', explanation: '<p>τ = R·C = ' + fN(t) + ' ms. Le condensateur atteint environ 63 % de la tension finale après τ.</p>' }; }),
  mcq('ci-depannage', 'Dépannage', [0, 1, 2], function () { return {
    prompt: '<p>Scénario de dépannage : dans un diviseur alimenté en 12 V, vous mesurez 12 V au point milieu, alors que le calcul prévoit 6 V. Que soupçonnez-vous d’abord ?</p>',
    correct: 'R₂ (côté masse) est coupée, aucun courant ne circule',
    wrong: ['R₂ (côté masse) est en court-circuit', 'L’alimentation délivre une tension trop faible', 'R₁ a une valeur deux fois trop grande'],
    explanation: '<p>Sans courant, la chute dans R₁ est nulle : le point milieu monte à la tension de l’alimentation. Un court-circuit de R₂ donnerait 0 V.</p>' }; })
];

bank.signaux = [
  num('si-per', 'Période et fréquence', [50, 250, 400, 1000], function (f) { return {
    prompt: '<p>Un signal sinusoïdal a une fréquence de ' + fN(f) + ' Hz. Calculez sa période, <strong>en ms</strong>.</p>',
    value: M.period(f) * 1000, unit: 'ms', explanation: '<p>T = 1/f = ' + fN(M.period(f) * 1000) + ' ms.</p>' }; }),
  num('si-freq', 'Période et fréquence', [2.5, 4, 8, 20], function (t) { return {
    prompt: '<p>Sur l’oscilloscope, un cycle dure ' + fN(t) + ' ms. Calculez la fréquence, en Hz.</p>',
    value: 1000 / t, unit: 'Hz', explanation: '<p>f = 1/T = ' + fN(1000 / t) + ' Hz.</p>' }; }),
  num('si-puls', 'Pulsation', [50, 100, 159, 500], function (f) { return {
    prompt: '<p>Calculez la pulsation ω d’un signal de ' + fN(f) + ' Hz, en rad/s.</p>',
    value: M.angularFrequency(f), unit: 'rad/s', explanation: '<p>ω = 2πf = ' + fN(M.angularFrequency(f)) + ' rad/s.</p>' }; }),
  num('si-val', 'Lecture d’un signal', [[2, 100, 1.25], [4, 50, 2.5], [3, 200, 0.5], [5, 125, 1]], function (p) { var x = M.value(p[0], p[1], 0, p[2] / 1000); return {
    prompt: '<p>Pour x(t) = ' + fN(p[0]) + ' sin(2π · ' + fN(p[1]) + ' · t), calculez x à t = ' + fN(p[2]) + ' ms, en volts.</p>',
    value: x, unit: 'V', abs: 0.03, explanation: '<p>x = ' + fN(p[0]) + ' · sin(2π · ' + fN(p[1]) + ' · ' + fN(p[2] / 1000) + ') = ' + fN(x) + ' V.</p>' }; }),
  num('si-shift', 'Phase', [[90, 50], [180, 100], [45, 250], [90, 500]], function (p) { var dt = M.timeShift(p[0] * Math.PI / 180, p[1]) * 1000; return {
    prompt: '<p>Un signal de ' + fN(p[1]) + ' Hz présente une phase de ' + fN(p[0]) + '°. Calculez son avance dans le temps, <strong>en ms</strong>.</p>',
    value: dt, unit: 'ms', explanation: '<p>Δt = φ/(2πf) = ' + fN(dt) + ' ms.</p>' }; }),
  mcq('si-amp', 'Grandeurs d’un signal', [0, 1, 2], function () { return {
    prompt: '<p>Vous doublez la fréquence d’une sinusoïde sans changer son amplitude. Que devient sa période ?</p>',
    correct: 'Elle est divisée par deux', wrong: ['Elle double', 'Elle ne change pas', 'Elle est multipliée par quatre'],
    explanation: '<p>T = 1/f : la période varie à l’inverse de la fréquence.</p>' }; })
];

bank['ondes-em'] = [
  num('em-lam', 'Longueur d’onde', [100e6, 900e6, 2.4e9, 5e9], function (f) { return {
    prompt: '<p>Calculez la longueur d’onde dans le vide d’une onde de ' + fN(f / 1e6) + ' MHz, <strong>en cm</strong>.</p>',
    value: W.wavelength(f) * 100, unit: 'cm', explanation: '<p>λ = c/f = ' + fN(W.wavelength(f) * 100) + ' cm.</p>' }; }),
  num('em-coax', 'Vitesse dans un milieu', [[100e6, 0.66], [145e6, 0.66], [433e6, 0.85], [1e9, 0.85]], function (p) { return {
    prompt: '<p>Dans un câble de facteur de vitesse ' + fN(p[1]) + ', calculez la longueur d’onde à ' + fN(p[0] / 1e6) + ' MHz, en mètres.</p>',
    value: W.wavelength(p[0], p[1]), unit: 'm', explanation: '<p>λ = VF·c/f = ' + fN(W.wavelength(p[0], p[1])) + ' m.</p>' }; }),
  num('em-freq', 'Longueur d’onde', [3, 0.33, 0.125, 0.06], function (l) { return {
    prompt: '<p>Une onde a une longueur d’onde de ' + fN(l) + ' m dans le vide. Calculez sa fréquence, <strong>en MHz</strong>.</p>',
    value: W.frequencyFor(l) / 1e6, unit: 'MHz', explanation: '<p>f = c/λ = ' + fN(W.frequencyFor(l) / 1e6) + ' MHz.</p>' }; }),
  num('em-time', 'Vitesse dans un milieu', [3000, 36000e3 / 1000, 150, 1200], function (d) { var t = W.travelTime(d, 1) * 1e6; return {
    prompt: '<p>Combien de temps une onde met-elle pour parcourir ' + fN(d) + ' m dans le vide ? Réponse <strong>en µs</strong>.</p>',
    value: t, unit: 'µs', explanation: '<p>t = d/c = ' + fN(t) + ' µs.</p>' }; }),
  mcq('em-band', 'Bandes de fréquences', [[100e6, 'VHF'], [900e6, 'UHF'], [5e9, 'SHF'], [1e6, 'MF']], function (p) {
    var wrong = ['VHF', 'UHF', 'SHF', 'MF'].filter(function (b) { return b !== p[1]; });
    return { prompt: '<p>À quelle bande de l’UIT appartient une fréquence de ' + fN(p[0] / 1e6) + ' MHz ?</p>', correct: W.band(p[0]).id, wrong: wrong,
      explanation: '<p>' + W.band(p[0]).id + ' : ' + W.band(p[0]).name + '.</p>' }; }),
  mcq('em-relation', 'Longueur d’onde', [0, 1, 2], function () { return {
    prompt: '<p>Une onde de fréquence fixe passe du vide dans un câble coaxial. Que se passe-t-il ?</p>',
    correct: 'La fréquence reste la même, la longueur d’onde diminue', wrong: ['La fréquence diminue, la longueur d’onde reste la même', 'Les deux diminuent', 'Les deux augmentent'],
    explanation: '<p>La fréquence est imposée par la source. La vitesse baisse, donc λ = v/f baisse.</p>' }; })
];

bank.antennes = [
  num('an-dip', 'Dimensionner un dipôle', [100e6, 145e6, 433e6, 900e6], function (f) { var l = A.wavelength(f) / 2; return {
    prompt: '<p>Calculez la longueur théorique d’un dipôle demi-onde à ' + fN(f / 1e6) + ' MHz, <strong>en cm</strong> (facteur de raccourcissement ignoré).</p>',
    value: l * 100, unit: 'cm', explanation: '<p>L = λ/2 = c/(2f) = ' + fN(l * 100) + ' cm.</p>' }; }),
  num('an-db', 'Gain', [2, 4, 10, 50], function (g) { return {
    prompt: '<p>Une antenne a un gain de ' + fN(g) + ' en rapport linéaire. Exprimez-le en dBi.</p>',
    value: A.toDb(g), unit: 'dBi', abs: 0.15, explanation: '<p>G = 10 log₁₀(' + fN(g) + ') = ' + fN(A.toDb(g)) + ' dBi.</p>' }; }),
  num('an-area', 'Surface effective', [[1.64, 900e6], [10, 2.4e9], [4, 1.8e9], [31.6, 5e9]], function (p) { var a = A.effectiveArea(p[0], p[1]) * 1e4; return {
    prompt: '<p>Calculez la surface effective d’une antenne de gain linéaire ' + fN(p[0]) + ' à ' + fN(p[1] / 1e9) + ' GHz, <strong>en cm²</strong>.</p>',
    value: a, unit: 'cm²', explanation: '<p>Ae = G·λ²/(4π) = ' + fN(a) + ' cm².</p>' }; }),
  num('an-pol', 'Polarisation', [0, 30, 45, 60], function (d) { var lin = Math.pow(Math.cos(d * Math.PI / 180), 2); return {
    prompt: '<p>Deux antennes à polarisation linéaire sont désalignées de ' + fN(d) + '°. Quelle fraction de la puissance est captée ? Réponse <strong>en %</strong>.</p>',
    value: lin * 100, unit: '%', abs: 1, explanation: '<p>Fraction = cos²(' + fN(d) + '°) = ' + fN(lin * 100) + ' %.</p>' }; }),
  mcq('an-array', 'Réseaux d’antennes', [0, 1, 2], function () { return {
    prompt: '<p>Dans un réseau d’antennes, que produit un déphasage progressif entre les éléments ?</p>',
    correct: 'Il oriente le lobe principal', wrong: ['Il augmente la fréquence émise', 'Il supprime les pertes du câble', 'Il change la polarisation en circulaire'],
    explanation: '<p>Le déphasage décale la direction où les contributions s’ajoutent en phase : c’est le dépointage électronique.</p>' }; })
];

bank.propagation = [
  num('pr-fspl', 'Espace libre', [[1000, 900e6], [5000, 2.4e9], [10000, 100e6], [200, 5e9]], function (p) { return {
    prompt: '<p>Calculez la perte en espace libre sur ' + fN(p[0] / 1000) + ' km à ' + fN(p[1] / 1e6) + ' MHz, en dB.</p>',
    value: P.fspl(p[0], p[1]), unit: 'dB', abs: 0.5, explanation: '<p>FSPL = 20 log₁₀(4πdf/c) = ' + fN(P.fspl(p[0], p[1])) + ' dB.</p>' }; }),
  num('pr-budget', 'Bilan de liaison', [[30, 10, 2, 110], [20, 6, 6, 95], [43, 15, 0, 130], [10, 3, 3, 80]], function (p) { var r = p[0] + p[1] + p[2] - p[3]; return {
    prompt: '<p>Puissance émise ' + fN(p[0]) + ' dBm, gains d’antennes ' + fN(p[1]) + ' dBi et ' + fN(p[2]) + ' dBi, perte de trajet ' + fN(p[3]) + ' dB. Calculez la puissance reçue, en dBm.</p>',
    value: r, unit: 'dBm', abs: 0.1, explanation: '<p>Pr = Pe + Ge + Gr − L = ' + fN(r) + ' dBm.</p>' }; }),
  num('pr-horizon', 'Horizon radio', [[30, 1.5], [50, 10], [100, 2], [20, 20]], function (p) { var d = P.radioHorizon(p[0], p[1]) / 1000; return {
    prompt: '<p>Avec des antennes à ' + fN(p[0]) + ' m et ' + fN(p[1]) + ' m (modèle 4/3 de la Terre), calculez l’horizon radio, <strong>en km</strong>.</p>',
    value: d, unit: 'km', rel: 0.03, explanation: '<p>d ≈ 4,12(√h₁ + √h₂) = ' + fN(d) + ' km.</p>' }; }),
  num('pr-fresnel', 'Zone de Fresnel', [[900e6, 1000, 1000], [2.4e9, 500, 1500], [5e9, 2000, 2000], [100e6, 5000, 5000]], function (p) { var r = P.fresnelRadius(p[0], p[1], p[2]); return {
    prompt: '<p>À ' + fN(p[0] / 1e6) + ' MHz, un obstacle se trouve à ' + fN(p[1]) + ' m de l’émetteur et ' + fN(p[2]) + ' m du récepteur. Calculez le rayon de la première zone de Fresnel, en mètres.</p>',
    value: r, unit: 'm', rel: 0.03, explanation: '<p>r = √(λ·d₁·d₂/(d₁+d₂)) = ' + fN(r) + ' m.</p>' }; }),
  mcq('pr-double', 'Espace libre', [0, 1, 2], function () { return {
    prompt: '<p>En espace libre, on double la distance. De combien varie la perte de trajet ?</p>',
    correct: '+6 dB', wrong: ['+3 dB', '+12 dB', '+20 dB'], explanation: '<p>La perte varie en 20 log₁₀(d) : doubler d ajoute 20 log₁₀(2) ≈ 6 dB.</p>' }; })
];

bank.chaine = [
  num('ch-db', 'Décibels', [3, 10, 20, 13], function (d) { return {
    prompt: '<p>Un rapport signal sur bruit vaut ' + fN(d) + ' dB. Donnez-le en rapport linéaire.</p>',
    value: CH.dbToLin(d), unit: '', explanation: '<p>10^(' + fN(d) + '/10) = ' + fN(CH.dbToLin(d)) + '.</p>' }; }),
  num('ch-shannon', 'Capacité de Shannon', [[1e6, 10], [20e6, 20], [5e6, 15], [100e3, 30]], function (p) { var c = CH.shannon(p[0], p[1]) / 1e6; return {
    prompt: '<p>Calculez la capacité de Shannon d’un canal de ' + fN(p[0] / 1e6) + ' MHz avec un RSB de ' + fN(p[1]) + ' dB, <strong>en Mbit/s</strong>.</p>',
    value: c, unit: 'Mbit/s', explanation: '<p>C = B log₂(1 + RSB) = ' + fN(c) + ' Mbit/s.</p>' }; }),
  num('ch-noise', 'Bruit thermique', [[1e6, 290], [20e6, 290], [200e3, 290], [100e6, 290]], function (p) { var n = CH.thermalNoiseDbm(p[0], p[1]); return {
    prompt: '<p>Calculez la puissance de bruit thermique dans ' + fN(p[0] / 1e6) + ' MHz à 290 K, en dBm.</p>',
    value: n, unit: 'dBm', abs: 0.5, explanation: '<p>N = kTB, soit environ −174 + 10 log₁₀(B) = ' + fN(n) + ' dBm.</p>' }; }),
  num('ch-rep', 'Codage de canal', [100, 8, 1000, 56], function (b) { return {
    prompt: '<p>Avec un code à répétition ×3, combien de bits sont transmis pour ' + fN(b) + ' bits utiles ?</p>',
    value: b / CH.codeRate('rep3'), unit: 'bits', abs: 0.5, explanation: '<p>Rendement 1/3 : ' + fN(b) + ' × 3 = ' + fN(b * 3) + ' bits.</p>' }; }),
  mcq('ch-ordre', 'Chaîne de transmission', [0, 1, 2], function () { return {
    prompt: '<p>À l’émission, dans quel ordre s’enchaînent les étapes ?</p>',
    correct: 'Source, codage, modulation, canal', wrong: ['Modulation, source, codage, canal', 'Source, modulation, canal, codage', 'Canal, codage, modulation, source'],
    explanation: '<p>Le message est d’abord codé, puis le signal modulé est envoyé dans le canal.</p>' }; })
];

bank.modulation = [
  num('mo-ambw', 'Modulation AM', [3e3, 4.5e3, 5e3, 10e3], function (f) { return {
    prompt: '<p>Un signal modulant de ' + fN(f / 1000) + ' kHz module une porteuse en AM. Calculez la largeur de bande, <strong>en kHz</strong>.</p>',
    value: MD.amBandwidth(f) / 1000, unit: 'kHz', explanation: '<p>B = 2fm = ' + fN(MD.amBandwidth(f) / 1000) + ' kHz.</p>' }; }),
  num('mo-eff', 'Modulation AM', [0.3, 0.5, 0.8, 1], function (m) { var e = MD.amEfficiency(m) * 100; return {
    prompt: '<p>Calculez le rendement en puissance d’une AM d’indice m = ' + fN(m) + ', <strong>en %</strong>.</p>',
    value: e, unit: '%', abs: 0.5, explanation: '<p>η = m²/(2+m²) = ' + fN(e) + ' %.</p>' }; }),
  num('mo-carson', 'Modulation FM', [[75e3, 15e3], [5e3, 3e3], [25e3, 5e3], [50e3, 10e3]], function (p) { return {
    prompt: '<p>En FM, l’excursion est de ' + fN(p[0] / 1000) + ' kHz et la fréquence modulante de ' + fN(p[1] / 1000) + ' kHz. Calculez la largeur de bande de Carson, <strong>en kHz</strong>.</p>',
    value: MD.carson(p[0], p[1]) / 1000, unit: 'kHz', explanation: '<p>B ≈ 2(Δf + fm) = ' + fN(MD.carson(p[0], p[1]) / 1000) + ' kHz.</p>' }; }),
  num('mo-beta', 'Modulation FM', [[75e3, 15e3], [5e3, 2.5e3], [30e3, 10e3], [50e3, 5e3]], function (p) { return {
    prompt: '<p>Calculez l’indice de modulation β pour Δf = ' + fN(p[0] / 1000) + ' kHz et fm = ' + fN(p[1] / 1000) + ' kHz.</p>',
    value: MD.beta(p[0], p[1]), unit: '', explanation: '<p>β = Δf/fm = ' + fN(MD.beta(p[0], p[1])) + '.</p>' }; }),
  num('mo-psk', 'Modulations numériques', [1e6, 2e6, 500e3, 10e6], function (r) { return {
    prompt: '<p>Estimez la largeur de bande (lobe principal) d’une BPSK à ' + fN(r / 1e6) + ' Mbit/s, <strong>en MHz</strong>.</p>',
    value: MD.digitalBandwidth('PSK', r) / 1e6, unit: 'MHz', explanation: '<p>B ≈ 2Rb = ' + fN(MD.digitalBandwidth('PSK', r) / 1e6) + ' MHz.</p>' }; }),
  mcq('mo-over', 'Modulation AM', [0, 1, 2], function () { return {
    prompt: '<p>Que provoque un indice de modulation AM supérieur à 1 ?</p>',
    correct: 'Une surmodulation qui déforme l’enveloppe', wrong: ['Une meilleure qualité sonore', 'Une baisse de la fréquence porteuse', 'La suppression des bandes latérales'],
    explanation: '<p>L’enveloppe passe par zéro et se replie : la détection d’enveloppe ne restitue plus le message.</p>' }; })
];

bank.fibre = [
  num('fi-crit', 'Réflexion totale', [[1.48, 1.46], [1.5, 1.48], [1.4675, 1.4622], [1.47, 1.45]], function (p) { return {
    prompt: '<p>Cœur n₁ = ' + fN(p[0]) + ', gaine n₂ = ' + fN(p[1]) + '. Calculez l’angle critique, en degrés.</p>',
    value: F.criticalAngle(p[0], p[1]), unit: '°', abs: 0.15, explanation: '<p>θc = arcsin(n₂/n₁) = ' + fN(F.criticalAngle(p[0], p[1])) + '°.</p>' }; }),
  num('fi-na', 'Ouverture numérique', [[1.48, 1.46], [1.5, 1.48], [1.47, 1.45], [1.46, 1.44]], function (p) { return {
    prompt: '<p>Calculez l’ouverture numérique pour n₁ = ' + fN(p[0]) + ' et n₂ = ' + fN(p[1]) + '.</p>',
    value: F.numericalAperture(p[0], p[1]), unit: '', abs: 0.006, explanation: '<p>ON = √(n₁² − n₂²) = ' + fN(F.numericalAperture(p[0], p[1])) + '.</p>' }; }),
  num('fi-budget', 'Bilan de puissance', [[0, 0.2, 80, 3, 2], [-3, 0.35, 40, 2, 2], [3, 0.25, 60, 5, 4], [0, 3, 2, 0, 2]], function (p) {
    var b = F.budget({ pt: p[0], alpha: p[1], L: p[2], splices: p[3], spliceLoss: 0.1, connectors: p[4], connectorLoss: 0.5 }); return {
    prompt: '<p>Puissance émise ' + fN(p[0]) + ' dBm, fibre ' + fN(p[1]) + ' dB/km sur ' + fN(p[2]) + ' km, ' + p[3] + ' épissure(s) à 0,1 dB, ' + p[4] + ' connecteur(s) à 0,5 dB. Calculez la puissance reçue, en dBm.</p>',
    value: b.pr, unit: 'dBm', abs: 0.1, explanation: '<p>Pertes totales ' + fN(b.total) + ' dB, donc Pr = ' + fN(b.pr) + ' dBm.</p>' }; }),
  num('fi-max', 'Bilan de puissance', [[0, -28, 0.2, 3, 2], [3, -24, 0.35, 2, 2], [-3, -30, 0.25, 4, 4], [0, -20, 0.5, 0, 2]], function (p) {
    var l = F.maxLength({ pt: p[0], sens: p[1], alpha: p[2], splices: p[3], spliceLoss: 0.1, connectors: p[4], connectorLoss: 0.5 }); return {
    prompt: '<p>Puissance émise ' + fN(p[0]) + ' dBm, sensibilité ' + fN(p[1]) + ' dBm, ' + fN(p[2]) + ' dB/km, ' + p[3] + ' épissure(s) à 0,1 dB, ' + p[4] + ' connecteur(s) à 0,5 dB. Calculez la longueur maximale, en km.</p>',
    value: l, unit: 'km', rel: 0.02, explanation: '<p>L = (Pe − S − raccordements)/α = ' + fN(l) + ' km.</p>' }; }),
  mcq('fi-depannage', 'Dépannage', [0, 1, 2], function () { return {
    prompt: '<p>Scénario de dépannage : une liaison optique neuve présente 4 dB de pertes de plus que prévu, concentrés en un seul point du tracé OTDR. Quelle est la cause la plus probable ?</p>',
    correct: 'Une épissure ou un connecteur défectueux à cet endroit', wrong: ['L’atténuation linéique de la fibre est trop forte', 'La longueur d’onde du laser est trop courte', 'La sensibilité du récepteur est insuffisante'],
    explanation: '<p>Une perte localisée se voit comme une marche sur la trace OTDR ; une atténuation trop forte modifierait la pente sur toute la longueur.</p>' }; })
];

bank.mobiles = [
  num('mb-n', 'Motifs de réutilisation', [[1, 1], [2, 0], [2, 1], [2, 2]], function (p) { return {
    prompt: '<p>Calculez la taille du motif N pour i = ' + p[0] + ' et j = ' + p[1] + '.</p>',
    value: MO.clusterSize(p[0], p[1]), unit: '', abs: 0.01, explanation: '<p>N = i² + ij + j² = ' + MO.clusterSize(p[0], p[1]) + '.</p>' }; }),
  num('mb-d', 'Réutilisation des fréquences', [[1, 7], [2, 4], [0.5, 3], [3, 12]], function (p) { return {
    prompt: '<p>Cellules de rayon ' + fN(p[0]) + ' km, motif N = ' + p[1] + '. Calculez la distance de réutilisation, en km.</p>',
    value: MO.reuseDistance(p[0], p[1]), unit: 'km', explanation: '<p>D = R√(3N) = ' + fN(MO.reuseDistance(p[0], p[1])) + ' km.</p>' }; }),
  num('mb-ch', 'Capacité', [[420, 7], [120, 4], [300, 3], [840, 12]], function (p) { return {
    prompt: '<p>Un opérateur dispose de ' + p[0] + ' canaux, motif N = ' + p[1] + '. Combien de canaux par cellule ?</p>',
    value: MO.channelsPerCell(p[0], p[1]), unit: '', abs: 0.01, explanation: '<p>S/N = ' + MO.channelsPerCell(p[0], p[1]) + ' canaux.</p>' }; }),
  num('mb-ci', 'Interférences', [[7, 4], [3, 4], [4, 3.5], [12, 4]], function (p) { var c = MO.toDb(MO.carrierToInterference(p[0], p[1], 6)); return {
    prompt: '<p>Avec le modèle à 6 interféreurs, motif N = ' + p[0] + ' et exposant d’affaiblissement n = ' + fN(p[1]) + ', calculez C/I, en dB.</p>',
    value: c, unit: 'dB', abs: 0.3, explanation: '<p>C/I = (√(3N))ⁿ/6 = ' + fN(c) + ' dB.</p>' }; }),
  mcq('mb-ho', 'Mobilité', [0, 1, 2], function () { return {
    prompt: '<p>Quel mécanisme maintient un appel lorsqu’un téléphone change de cellule ?</p>',
    correct: 'Le transfert intercellulaire (handover)', wrong: ['La réutilisation des fréquences', 'La modulation de phase', 'La diffusion IP'],
    explanation: '<p>Le réseau bascule la communication vers la cellule voisine mieux reçue.</p>' }; })
];

bank.ip = [
  text('ip-net', 'Adresse de réseau', [['192.168.10.77', 26], ['10.20.30.40', 20], ['172.16.5.130', 25], ['192.168.1.200', 27]], function (p) {
    var a = IP.toString(IP.network(IP.parseIp(p[0]), p[1])); return {
    prompt: '<p>Quelle est l’adresse de réseau de ' + p[0] + '/' + p[1] + ' ?</p>', accepted: [a], explanation: '<p>ET logique avec le masque /' + p[1] + ' : ' + a + '.</p>' }; }),
  text('ip-bc', 'Adresse de diffusion', [['192.168.10.77', 26], ['10.0.5.1', 22], ['172.16.5.130', 25], ['192.168.1.200', 28]], function (p) {
    var a = IP.toString(IP.broadcast(IP.parseIp(p[0]), p[1])); return {
    prompt: '<p>Quelle est l’adresse de diffusion de ' + p[0] + '/' + p[1] + ' ?</p>', accepted: [a], explanation: '<p>Tous les bits d’hôte à 1 : ' + a + '.</p>' }; }),
  num('ip-host', 'Plan d’adressage', [24, 26, 20, 28], function (p) { return {
    prompt: '<p>Combien d’hôtes utilisables contient un réseau /' + p + ' ?</p>', value: IP.hostCount(p), unit: '', abs: 0.01, explanation: '<p>2^(32−' + p + ') − 2 = ' + IP.hostCount(p) + '.</p>' }; }),
  num('ip-pfx', 'Plan d’adressage', [50, 500, 12, 1000], function (n) { return {
    prompt: '<p>Quel préfixe le plus long permet d’accueillir ' + n + ' hôtes ? Donnez le nombre après la barre oblique.</p>', value: IP.prefixForHosts(n), unit: '', abs: 0.01, explanation: '<p>/' + IP.prefixForHosts(n) + ' offre ' + IP.hostCount(IP.prefixForHosts(n)) + ' hôtes.</p>' }; }),
  text('ip-mask', 'Masques', [20, 26, 22, 28], function (p) { var m = IP.toString(IP.prefixToMask(p)); return {
    prompt: '<p>Écrivez le masque correspondant au préfixe /' + p + ' en notation décimale pointée.</p>', accepted: [m], explanation: '<p>' + p + ' bits à 1 : ' + m + '.</p>' }; }),
  mcq('ip-depannage', 'Dépannage', [0, 1, 2], function () { return {
    prompt: '<p>Scénario de dépannage : un poste joint les machines de son sous-réseau mais aucune machine extérieure. Ses paramètres IP et son masque sont corrects. Que vérifiez-vous d’abord ?</p>',
    correct: 'La passerelle par défaut configurée sur le poste', wrong: ['La table ARP du serveur distant', 'La longueur du câble réseau', 'Le TTL des paquets reçus'],
    explanation: '<p>Tout trafic hors du sous-réseau passe par la passerelle : si elle manque ou est fausse, seul le réseau local répond.</p>' }; })
];

module.exports = bank;
