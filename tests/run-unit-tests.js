/*
 * TELECOM CONNECT LAB — Tests automatiques des calculs (sans navigateur)
 * --------------------------------------------------------------------
 * Lancement : node tests/run-unit-tests.js
 * Vérifie : formules du signal, mise en forme, bonnes réponses des exercices
 * (recalculées indépendamment), correction des réponses, validation des
 * adresses e-mail et fusion des progressions.
 */
'use strict';
var assert = require('assert');
var path = require('path');
var root = path.join(__dirname, '..');
var M = require(path.join(root, 'modules/signaux/signal-math.js'));
var EX = require(path.join(root, 'modules/signaux/exercises.js'));
var V = require(path.join(root, 'core/validate.js'));
var S = require(path.join(root, 'core/store.js'));

var passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✔ ' + name); }
  catch (e) { failed++; console.log('  ✘ ' + name + '\n      ' + e.message); }
}
function close(a, b, eps, msg) { assert.ok(Math.abs(a - b) <= (eps || 1e-12), (msg || '') + ' attendu ' + b + ', obtenu ' + a); }
var NB = ' ';

console.log('\nModèle x(t) = A sin(2πft + φ)');
test('période de 50 Hz = 0,02 s', function () { close(M.period(50), 0.02); });
test('période non définie pour f = 0', function () { assert.strictEqual(M.period(0), Infinity); });
test('fréquence pour T = 2,5 ms = 400 Hz', function () { close(M.frequency(0.0025), 400, 1e-9); });
test('pulsation de 100 Hz = 200π rad/s', function () { close(M.angularFrequency(100), 200 * Math.PI, 1e-9); });
test('valeur à t = 1,25 ms pour 2 sin(2π·100·t) = √2', function () { close(M.value(2, 100, 0, 0.00125), Math.SQRT2, 1e-12); });
test('φ = π/2 : x(0) = A (cosinus)', function () { close(M.value(3, 50, Math.PI / 2, 0), 3, 1e-12); });
test('φ = π : opposition de phase', function () { close(M.value(3, 50, Math.PI, 0.001), -M.value(3, 50, 0, 0.001), 1e-12); });
test('décalage dû à φ = π/2 à 50 Hz = 5 ms d’avance', function () { close(M.timeShift(Math.PI / 2, 50), 0.005, 1e-15); });
test('le décalage correspond bien à une translation de la courbe', function () {
  var dt = M.timeShift(Math.PI / 3, 120);
  for (var t = 0; t < 0.02; t += 0.0007) close(M.value(2, 120, Math.PI / 3, t), M.value(2, 120, 0, t + dt), 1e-9);
});
test('première crête : T/4 pour φ = 0, 0 pour φ = π/2', function () {
  close(M.firstPeakTime(100, 0), 0.0025, 1e-15); close(M.firstPeakTime(100, Math.PI / 2), 0, 1e-15);
  close(M.value(4, 100, -1, M.firstPeakTime(100, -1)), 4, 1e-9);
});
test('crête à crête = 2A et valeur efficace = A/√2', function () { assert.strictEqual(M.peakToPeak(3), 6); close(M.rms(Math.SQRT2), 1, 1e-12); });
test('périodes dans 100 ms à 50 Hz = 5', function () { close(M.periodsInWindow(50, 0.1), 5, 1e-12); });
test('conversions degrés ↔ radians', function () { close(M.degToRad(90), Math.PI / 2); close(M.radToDeg(Math.PI), 180); });
test('curseur de fréquence logarithmique : bornes 1 Hz et 10 kHz', function () {
  // même formule que simulation.js
  var sliderToF = function (s) { var f = Math.pow(10, s / 1000 * 4); return f >= 100 ? Math.round(f) : Math.round(f * 10) / 10; };
  assert.strictEqual(sliderToF(0), 1); assert.strictEqual(sliderToF(1000), 10000); assert.strictEqual(sliderToF(500), 100);
});

console.log('\nMise en forme française');
test('formatTime', function () {
  assert.strictEqual(M.formatTime(0.02), '20' + NB + 'ms');
  assert.strictEqual(M.formatTime(1), '1' + NB + 's');
  assert.strictEqual(M.formatTime(1 / 2.4e9, 3), '0,417' + NB + 'ns');
  assert.strictEqual(M.formatTime(2.5e-6), '2,5' + NB + 'µs');
});
test('formatFrequency', function () {
  assert.strictEqual(M.formatFrequency(2450), '2,45' + NB + 'kHz');
  assert.strictEqual(M.formatFrequency(50), '50' + NB + 'Hz');
  assert.strictEqual(M.formatFrequency(2.4e9), '2,4' + NB + 'GHz');
});
test('formatPhase en multiples de π', function () {
  assert.strictEqual(M.formatPhase(Math.PI / 2), 'π/2');
  assert.strictEqual(M.formatPhase(-Math.PI / 4), '−π/4');
  assert.strictEqual(M.formatPhase(Math.PI), 'π');
  assert.strictEqual(M.formatPhase(3 * Math.PI / 4), '3π/4');
  assert.strictEqual(M.formatPhase(0), '0');
  assert.strictEqual(M.formatPhase(1), '1');
});
test('lecture des nombres saisis', function () {
  assert.strictEqual(M.parseNumber('2,5'), 2.5);
  assert.strictEqual(M.parseNumber(' 1 000 '), 1000);
  assert.strictEqual(M.parseNumber('−3'), -3);
  assert.strictEqual(M.parseNumber('1e3'), 1000);
  assert.ok(isNaN(M.parseNumber('abc')));
  assert.ok(isNaN(M.parseNumber('2,5,1')));
  assert.ok(isNaN(M.parseNumber('')));
});

console.log('\nExercices du module « Comprendre les signaux »');
var list = EX.list;
test('au moins 8 exercices, identifiants uniques', function () {
  assert.ok(list.length >= 8, 'seulement ' + list.length);
  assert.strictEqual(new Set(list.map(function (e) { return e.id; })).size, list.length);
});
test('chaque exercice a une question, une explication et une bonne réponse', function () {
  list.forEach(function (e) {
    assert.ok(e.prompt && e.prompt.length > 20, e.id + ' : question');
    assert.ok(e.explanation && e.explanation.length > 40, e.id + ' : explication');
    if (e.type === 'qcm') assert.ok(e.options.some(function (o) { return o.id === e.answer; }), e.id + ' : réponse QCM');
    else assert.ok(isFinite(e.answer), e.id + ' : réponse numérique');
  });
});
test('les thèmes exigés sont couverts', function () {
  var skills = list.map(function (e) { return e.skill; }).join(' | ');
  ['Amplitude', 'Période', 'Fréquence', 'Conversion Hz / kHz', 'Effet de la fréquence', 'Effet de l’amplitude', 'Phase', 'Lecture de graphique', 'Situation pratique']
    .forEach(function (k) { assert.ok(skills.indexOf(k) >= 0, 'thème manquant : ' + k); });
});

// Réponses attendues, recalculées ici de façon indépendante (à la main).
var expectedQcm = {
  e1: '3 V',                                                    // amplitude lue sur le graphique A = 3 V
  e4: '2,45 kHz',                                               // 2450 / 1000
  e5: 'Elle passe de 5' + NB + 'ms à 2,5' + NB + 'ms.',         // 1/200 = 5 ms -> 1/400 = 2,5 ms
  e6: 'Les crêtes atteignent ±4 V et la période reste 10' + NB + 'ms.',
  e7: '<var>x</var>₂ est en avance de 5' + NB + 'ms sur <var>x</var>₁.' // (π/2)/(2π·50) = 5 ms
};
var expectedNum = { e2: 20, e3: 400, e8: 500, e9: 5, e10: 2 * Math.sin(Math.PI / 4) };

Object.keys(expectedQcm).forEach(function (id) {
  test(id + ' : la proposition correcte est « ' + expectedQcm[id].replace(/<[^>]+>/g, '') + ' »', function () {
    var e = EX.byId(id);
    var good = e.options.filter(function (o) { return o.id === e.answer; })[0];
    assert.strictEqual(good.label, expectedQcm[id]);
    assert.strictEqual(EX.check(e, e.answer).correct, true);
    e.options.filter(function (o) { return o.id !== e.answer; }).forEach(function (o) {
      assert.strictEqual(EX.check(e, o.id).correct, false, 'mauvaise proposition acceptée : ' + o.label);
    });
  });
});
Object.keys(expectedNum).forEach(function (id) {
  test(id + ' : bonne réponse numérique = ' + expectedNum[id], function () {
    var e = EX.byId(id);
    close(e.answer, expectedNum[id], 1e-9);
  });
});
test('e2 : « 20 », « 20,0 » et « 20 ms » acceptés ; « 0,02 » (en secondes) refusé', function () {
  var e = EX.byId('e2');
  assert.ok(EX.check(e, '20').correct); assert.ok(EX.check(e, '20,0').correct); assert.ok(EX.check(e, '20 ms').correct);
  assert.strictEqual(EX.check(e, '0,02').correct, false);
});
test('e3 : 400 accepté, 0,4 (kHz confondus) refusé', function () {
  var e = EX.byId('e3'); assert.ok(EX.check(e, '400').correct); assert.strictEqual(EX.check(e, '0,4').correct, false);
});
test('e10 : 1,41 et 1,414 acceptés ; 1,4 et le résultat en mode degrés refusés', function () {
  var e = EX.byId('e10');
  assert.ok(EX.check(e, '1,41').correct); assert.ok(EX.check(e, '1.414').correct);
  assert.strictEqual(EX.check(e, '1,4').correct, false);
  var degMode = 2 * Math.sin(2 * Math.PI * 100 * 0.00125 * Math.PI / 180); // erreur typique : calculatrice en degrés
  assert.strictEqual(EX.check(e, degMode.toFixed(3)).correct, false);
});
test('e8 et e9 cohérents avec le graphique et la situation', function () {
  var e8 = EX.byId('e8'); close(e8.figure.f * e8.figure.win, 3, 1e-12); // 3 périodes visibles
  assert.ok(EX.check(e8, '500').correct); assert.strictEqual(EX.check(e8, '3').correct, false);
  var e9 = EX.byId('e9'); assert.ok(EX.check(e9, '5').correct); assert.strictEqual(EX.check(e9, '50').correct, false);
});
test('une saisie illisible est signalée sans être comptée', function () {
  var r = EX.check(EX.byId('e2'), 'vingt');
  assert.ok(r.invalid); assert.strictEqual(r.correct, undefined);
  assert.ok(EX.check(EX.byId('e1'), '').invalid);
});

console.log('\nValidation des adresses e-mail');
['etudiant@gmail.com', 'prenom.nom@ista.ac.cd', 'a.b-c+tag@sub.domaine.fr', 'MAJ@Exemple.COM'].forEach(function (e) {
  test('acceptée : ' + e, function () { assert.ok(V.checkEmail(e).ok); });
});
['', '@', 'nom@', '@gmail.com', 'nom@gmail', 'nom@@gmail.com', 'nom@gmail..com', 'nom @gmail.com', 'nom@-gmail.com', '.nom@gmail.com', 'nom.@gmail.com', 'nom@gmail.c', 'nom@gmail.123'].forEach(function (e) {
  test('refusée : « ' + e + ' »', function () { assert.strictEqual(V.checkEmail(e).ok, false); });
});
test('normalisation en minuscules', function () { assert.strictEqual(V.checkEmail('  Nom@Gmail.COM ').email, 'nom@gmail.com'); });
test('code : 6 chiffres acceptés, lettres refusées', function () {
  assert.ok(V.checkCode('123 456').ok); assert.strictEqual(V.checkCode('12a456').ok, false); assert.strictEqual(V.checkCode('123').ok, false);
});
test('nom complet requis', function () { assert.strictEqual(V.checkName(' a ').ok, false); assert.ok(V.checkName('Brenda Mbala').ok); });

console.log('\nProgression : fusion entre appareils');
test('la fusion n’efface aucune activité', function () {
  var a = S.emptyState(), b = S.emptyState();
  a.updatedAt = '2026-10-01T10:00:00.000Z'; b.updatedAt = '2026-10-02T10:00:00.000Z';
  a.lessons.signaux = { chapters: { c1: '2026-10-01T09:00:00.000Z' }, last: 'c1' };
  b.lessons.signaux = { chapters: { c1: '2026-10-02T09:00:00.000Z', c2: '2026-10-02T09:30:00.000Z' }, last: 'c2' };
  a.exercises.signaux = { items: { e1: { attempts: 2, correct: 1, lastCorrect: true, lastAt: '2026-10-01T10:00:00.000Z' } }, series: [{ at: '2026-10-01T10:00:00.000Z', score: 7, total: 10 }], current: null };
  b.exercises.signaux = { items: { e2: { attempts: 1, correct: 0, lastCorrect: false, lastAt: '2026-10-02T10:00:00.000Z' } }, series: [{ at: '2026-10-02T10:00:00.000Z', score: 9, total: 10 }], current: null };
  a.activity = [{ id: 'x1', at: '2026-10-01T10:00:00.000Z', text: 'A' }];
  b.activity = [{ id: 'x2', at: '2026-10-02T10:00:00.000Z', text: 'B' }];
  var m = S.merge(a, b);
  assert.deepStrictEqual(Object.keys(m.lessons.signaux.chapters).sort(), ['c1', 'c2']);
  assert.strictEqual(m.lessons.signaux.chapters.c1, '2026-10-01T09:00:00.000Z', 'la date la plus ancienne est conservée');
  assert.strictEqual(m.lessons.signaux.last, 'c2', 'la reprise suit l’appareil le plus récent');
  assert.deepStrictEqual(Object.keys(m.exercises.signaux.items).sort(), ['e1', 'e2']);
  assert.strictEqual(m.exercises.signaux.series.length, 2);
  assert.strictEqual(m.activity.length, 2);
  assert.strictEqual(m.activity[0].text, 'B', 'activités triées de la plus récente à la plus ancienne');
});
test('la fusion est idempotente', function () {
  var a = S.emptyState(); a.activity = [{ id: 'z', at: '2026-10-01T10:00:00.000Z', text: 'Z' }];
  a.exercises.signaux = { items: {}, series: [{ at: '2026-10-01T10:00:00.000Z', score: 5, total: 10 }], current: null };
  var m = S.merge(a, a);
  assert.strictEqual(m.activity.length, 1); assert.strictEqual(m.exercises.signaux.series.length, 1);
});
test('état vide détecté ; données invalides ignorées', function () {
  assert.ok(S.isEmpty(S.emptyState()));
  assert.ok(S.isEmpty(S.normalize('n’importe quoi')));
  var s = S.emptyState(); s.lessons.signaux = { chapters: { c1: 'x' } }; assert.strictEqual(S.isEmpty(s), false);
});

/* ------------------------- Nouvelles simulations ------------------------- */
var W = require(path.join(root, 'modules/ondes-em/wave-math.js'));
var PM = require(path.join(root, 'modules/propagation/propagation-math.js'));
var D = require(path.join(root, 'modules/modulation/modulation-math.js'));

console.log('\nOndes électromagnétiques');
test('c = 299 792 458 m/s (valeur exacte)', function () { assert.strictEqual(W.C, 299792458); });
test('λ(100 MHz, vide) = 2,998 m', function () { close(W.wavelength(100e6, 1), 2.99792458, 1e-12); });
test('λ(100 MHz, coaxial 0,66) = 1,979 m', function () { close(W.wavelength(100e6, 0.66), 1.9786302228, 1e-9); });
test('λ(2,4 GHz) ≈ 12,49 cm', function () { close(W.wavelength(2.4e9), 0.124913524, 1e-9); });
test('f pour λ/2 = 15 cm : 999,3 MHz', function () { close(W.frequencyFor(0.30), 999308193.3, 0.1); });
test('nombre d’onde k = 2π/λ', function () { close(W.wavenumber(1), 2 * Math.PI, 1e-12); });
test('bandes UIT : 100 MHz VHF, 300 MHz UHF, 2,4 GHz UHF, 3,5 GHz SHF, 1 MHz MF, 300 GHz EHF', function () {
  assert.strictEqual(W.band(100e6).id, 'VHF'); assert.strictEqual(W.band(300e6).id, 'UHF'); assert.strictEqual(W.band(2.4e9).id, 'UHF');
  assert.strictEqual(W.band(3.5e9).id, 'SHF'); assert.strictEqual(W.band(1e6).id, 'MF'); assert.strictEqual(W.band(300e9).id, 'EHF'); assert.strictEqual(W.band(1e3), null);
});
test('bandes contiguës, de 3 kHz à 300 GHz, chacune d’une décade', function () {
  W.BANDS.forEach(function (b, i) { close(b.max / b.min, 10, 1e-9); if (i) assert.strictEqual(b.min, W.BANDS[i - 1].max); });
});
test('écriture scientifique : 2,998 × 10⁸', function () { assert.strictEqual(M.formatSci(299792458, 4), '2,998' + NB + '×' + NB + '10⁸'); assert.strictEqual(M.formatSci(250, 4), '250'); });
test('formatLength', function () { assert.strictEqual(M.formatLength(0.1249, 4), '12,49' + NB + 'cm'); assert.strictEqual(M.formatLength(66583, 4), '66,58' + NB + 'km'); });

console.log('\nPropagation radio (espace libre)');
test('FSPL(1 km, 1 MHz) = 32,45 dB (constante de la formule pratique)', function () { close(PM.fspl(1000, 1e6), 32.4478, 1e-3); });
test('FSPL = 20log(d km) + 20log(f MHz) + 32,45 pour d = 5 km, f = 900 MHz', function () {
  close(PM.fspl(5000, 900e6), 20 * Math.log10(5) + 20 * Math.log10(900) + 32.4478, 1e-3);
});
test('doubler la distance ou la fréquence ajoute 6,02 dB', function () {
  close(PM.fspl(10000, 900e6) - PM.fspl(5000, 900e6), 6.0206, 1e-4); close(PM.fspl(5000, 1800e6) - PM.fspl(5000, 900e6), 6.0206, 1e-4);
});
var link = { pt: 30, gt: 6, gr: 2, f: 900e6, d: 5000, loss: 0, sens: -90 };
test('bilan de liaison par défaut : Pr = −67,51 dBm, marge 22,49 dB', function () { close(PM.received(link), -67.512, 1e-3); close(PM.margin(link), 22.488, 1e-3); });
test('à la portée maximale, la marge vaut exactement 0 dB', function () {
  var d = PM.maxRange(link); close(PM.margin(Object.assign({}, link, { d: d })), 0, 1e-9); close(d, 66583.76, 0.05);
});
test('les pertes supplémentaires réduisent la portée de façon cohérente (20 dB → ÷ 10)', function () {
  close(PM.maxRange(link) / PM.maxRange(Object.assign({}, link, { loss: 20 })), 10, 1e-9);
});
test('conversions dBm ↔ W : 30 dBm = 1 W, 0 dBm = 1 mW, PIRE = Pt + Gt', function () {
  close(PM.dbmToWatt(30), 1, 1e-12); close(PM.dbmToWatt(0), 0.001, 1e-15); close(PM.wattToDbm(100), 50, 1e-12); assert.strictEqual(PM.eirp(link), 36);
});

console.log('\nModulation AM / FM');
test('fonctions de Bessel : J0(1), J1(1), J1(5), J2(10) (valeurs de table)', function () {
  close(D.besselJ(0, 1), 0.7651976866, 1e-9); close(D.besselJ(1, 1), 0.4400505857, 1e-9);
  close(D.besselJ(1, 5), -0.3275791376, 1e-9); close(D.besselJ(2, 10), 0.2546303137, 1e-9);
});
test('J0 s’annule en 2,4048 (porteuse FM supprimée)', function () { close(D.besselJ(0, 2.404825557695773), 0, 1e-12); });
test('somme des Jn(β)² = 1 (conservation de la puissance FM) pour β = 0,5 … 10', function () {
  [0.5, 1, 2, 5, 10].forEach(function (b) { close(D.fmPowerWithin(b, 40), 1, 1e-9); });
});
test('règle de Carson : ≥ 98 % de la puissance pour β = 1, 2, 5, 10', function () {
  [1, 2, 5, 10].forEach(function (b) { assert.ok(D.fmPowerWithin(b, Math.floor(b + 1)) >= 0.98, 'β = ' + b); });
});
test('AM : bande = 2fm, rendement 1/3 à m = 1, enveloppe en t = 0 = Ac(1 + m)', function () {
  assert.strictEqual(D.amBandwidth(4000), 8000); close(D.amEfficiency(1), 1 / 3, 1e-12); close(D.am(0, 1.5, 0.4, 1000, 20000), 2.1, 1e-12);
});
test('FM : β = Δf/fm et Carson 2(Δf + fm) = 30 kHz pour Δf = 10 kHz, fm = 5 kHz', function () { assert.strictEqual(D.beta(10000, 5000), 2); assert.strictEqual(D.carson(10000, 5000), 30000); });

// Analyse spectrale numérique (indépendante des formules du spectre) :
// amplitude d'une raie = 2/N |Σ s(tk) e^{−j2πf tk}| sur un nombre entier de périodes.
function lineAmp(sig, f, T, N) {
  var re = 0, im = 0;
  for (var k = 0; k < N; k++) { var t = k * T / N, v = sig(t); re += v * Math.cos(2 * Math.PI * f * t); im -= v * Math.sin(2 * Math.PI * f * t); }
  return 2 / N * Math.sqrt(re * re + im * im);
}
test('AM : la transformée de Fourier numérique retrouve Ac en fc et m·Ac/2 en fc ± fm', function () {
  var Ac = 1.2, m = 0.6, fmod = 1000, fc = 20000, T = 0.002, N = 4000;
  var sig = function (t) { return D.am(t, Ac, m, fmod, fc); };
  D.amSpectrum(Ac, m, fmod, fc).forEach(function (r) { close(lineAmp(sig, r.f, T, N), r.amp, 1e-9); });
  close(lineAmp(sig, fc + 2 * fmod, T, N), 0, 1e-9);
});
test('FM : la transformée de Fourier numérique retrouve Ac·|Jn(β)| pour chaque raie', function () {
  var Ac = 1, df = 5000, fmod = 1000, fc = 20000, b = D.beta(df, fmod), T = 0.001, N = 8000;
  var sig = function (t) { return D.fm(t, Ac, b, fmod, fc); };
  D.fmSpectrum(Ac, b, fmod, fc, 9).forEach(function (r) { close(lineAmp(sig, r.f, T, N), r.amp, 1e-6); });
});
test('FM : la fréquence instantanée est la dérivée de la phase', function () {
  var fc = 20000, df = 5000, fmod = 1000, b = D.beta(df, fmod), h = 1e-9;
  [0, 0.00013, 0.0004, 0.00071].forEach(function (t) {
    var ph = function (x) { return 2 * Math.PI * fc * x + b * Math.sin(2 * Math.PI * fmod * x); };
    close((ph(t + h) - ph(t - h)) / (2 * h) / (2 * Math.PI), D.instFrequency(t, fc, df, fmod), 0.05);
  });
});
test('surmodulation : le détecteur d’enveloppe s’écarte du message si m > 1', function () {
  var t = 0.0005; // cos(2π·1000·t) = −1
  close(D.envelopeDetector(t, 1, 0.8, 1000), D.amEnvelope(t, 1, 0.8, 1000), 1e-12);
  assert.ok(D.envelopeDetector(t, 1, 1.3, 1000) > 0 && D.amEnvelope(t, 1, 1.3, 1000) < 0);
});


/* =====================================================================
   Version 3 : modules complets
   ===================================================================== */
var KIT = require(path.join(root, 'core/exercise-kit.js'));
var W = require(path.join(root, 'modules/ondes-em/wave-math.js'));
var A = require(path.join(root, 'modules/antennes/antenna-math.js'));
var P = require(path.join(root, 'modules/propagation/propagation-math.js'));
var CH = require(path.join(root, 'modules/chaine/chain-math.js'));
var F = require(path.join(root, 'modules/fibre/fiber-math.js'));
var MO = require(path.join(root, 'modules/mobiles/mobile-math.js'));
var IP = require(path.join(root, 'modules/ip/ip-math.js'));
var DEG = Math.PI / 180;

console.log('\nOutil commun des exercices');
test('réponse numérique : unité retirée, virgule acceptée, tolérance relative', function () {
  var ex = { type: 'numeric', answer: 2.5, unit: 'GHz', tol: { rel: 0.01 } };
  assert.ok(KIT.check(ex, '2,5 GHz').correct); assert.ok(KIT.check(ex, '2.51').correct); assert.ok(!KIT.check(ex, '2.6').correct);
  assert.ok(KIT.check(ex, 'abc').invalid);
});
test('réponse numérique : tolérance absolue', function () {
  var ex = { type: 'numeric', answer: 33.333, unit: 'cm', tol: { abs: 0.06 } };
  assert.ok(KIT.check(ex, '33,3').correct); assert.ok(!KIT.check(ex, '33,2').correct);
});
test('réponse texte : saisie invalide signalée sans être comptée fausse', function () {
  var ex = { type: 'text', validate: function (t) { return /^[01]{8}$/.test(t) ? null : 'huit bits'; }, accept: function (t) { return t === '01000001'; }, expected: '01000001' };
  assert.ok(KIT.check(ex, '0100').invalid); assert.ok(KIT.check(ex, '01000001').correct); assert.ok(!KIT.check(ex, '01000011').correct);
});

console.log('\nSéries d’exercices de tous les modules');
var MODS = ['signaux', 'ondes-em', 'antennes', 'propagation', 'chaine', 'modulation', 'fibre', 'mobiles', 'ip'];
MODS.forEach(function (m) {
  var E = require(path.join(root, 'modules', m, 'exercises.js'));
  test(m + ' : au moins 8 exercices, identifiants uniques, explication présente', function () {
    assert.ok(E.list.length >= 8, 'nombre : ' + E.list.length);
    var ids = {};
    E.list.forEach(function (e) { assert.ok(!ids[e.id], 'doublon ' + e.id); ids[e.id] = 1; assert.ok(e.title && e.skill && e.prompt && e.explanation && e.explanation.length > 40, e.id); });
  });
  test(m + ' : chaque bonne réponse est acceptée et une mauvaise est refusée', function () {
    E.list.forEach(function (e) {
      if (e.type === 'qcm') {
        assert.ok(E.check(e, e.answer).correct, e.id + ' bonne réponse');
        var labels = e.options.map(function (o) { return o.label; });
        assert.strictEqual(new Set(labels).size, labels.length, e.id + ' propositions distinctes');
        assert.strictEqual(e.options.filter(function (o) { return o.id === e.answer; }).length, 1, e.id);
        var wrong = e.options.filter(function (o) { return o.id !== e.answer; })[0];
        assert.ok(!E.check(e, wrong.id).correct, e.id + ' mauvaise réponse');
      } else if (e.type === 'text') {
        assert.ok(E.check(e, e.expected).correct, e.id);
        var bad = /^[01]+$/.test(e.expected) ? e.expected.replace(/.$/, function (c) { return c === '1' ? '0' : '1'; }) : '1.2.3.4';
        assert.ok(!E.check(e, bad).correct, e.id + ' mauvaise réponse');
      } else {
        assert.ok(E.check(e, String(e.answer).replace('.', ',')).correct, e.id);
        assert.ok(!E.check(e, String(e.answer * 1.5 + 1)).correct, e.id + ' mauvaise réponse');
      }
    });
  });
});

console.log('\nOndes électromagnétiques');
test('λ à 100 MHz dans le vide ≈ 2,998 m ; dans un câble k = 0,66 : × 0,66', function () { close(W.wavelength(100e6, 1), 2.99792458, 1e-9); close(W.wavelength(100e6, 0.66), 0.66 * 2.99792458, 1e-9); });
test('bande de 2,4 GHz = UHF, de 5 GHz = SHF', function () { assert.strictEqual(W.band(2.4e9).id, 'UHF'); assert.strictEqual(W.band(5e9).id, 'SHF'); });

console.log('\nAntennes');
var HALF = { type: 'half', N: 1, d: 0.5, beta: 0 }, SHORT = { type: 'short', N: 1, d: 0.5, beta: 0 };
test('directivité du dipôle demi-onde = 1,64 (2,15 dBi)', function () { close(A.directivity(HALF), 1.641, 0.01); close(A.toDb(A.directivity(HALF)), 2.15, 0.03); });
test('directivité du dipôle court = 1,5 (1,76 dBi)', function () { close(A.directivity(SHORT), 1.5, 0.01); });
test('largeur à −3 dB dans le plan vertical : 78° (demi-onde) et 90° (court)', function () {
  close(A.beamwidth(A.cut(HALF, 'V', 0, 0.25), 0), 78, 1.2); close(A.beamwidth(A.cut(SHORT, 'V', 0, 0.25), 0), 90, 1.2);
});
test('réseau de N dipôles alimentés en phase : directivité croissante avec N', function () {
  var d2 = A.directivity({ type: 'half', N: 2, d: 0.5, beta: 0 }), d4 = A.directivity({ type: 'half', N: 4, d: 0.5, beta: 0 });
  assert.ok(d4 > d2 && d2 > A.directivity(HALF));
});
test('facteur de réseau maximal (= 1) pour ψ = 0, nul pour ψ = 2π/N', function () { close(A.arrayFactor(4, 0), 1, 1e-12); close(A.arrayFactor(4, 2 * Math.PI / 4), 0, 1e-12); });
test('perte de polarisation : 3 dB à 45°, 0 dB à 0°', function () { close(A.polarizationLoss(45).db, 3.0103, 1e-3); close(A.polarizationLoss(45).plf, 0.5, 1e-12); close(A.polarizationLoss(0).db, 0, 1e-9); });

console.log('\nPropagation');
test('FSPL : 900 MHz, 5 km ≈ 105,5 dB', function () { close(P.fspl(5000, 900e6), 32.45 + 20 * Math.log10(5) + 20 * Math.log10(900), 0.01); });
test('portée calculée : la puissance reçue y vaut la sensibilité', function () {
  var p = { pt: 30, gt: 6, gr: 2, f: 900e6, loss: 0, sens: -90 }, d = P.maxRange(p);
  close(P.received(Object.assign({}, p, { d: d })), -90, 1e-6);
  close(P.maxRangeFn(function (x) { return P.received(Object.assign({}, p, { d: x })) >= -90; }), d, d * 1e-6);
});
test('deux rayons : au-delà de la rupture, 12 dB par doublement de distance', function () {
  var a = P.twoRayLoss(40000, 900e6, 30, 1.5), b = P.twoRayLoss(80000, 900e6, 30, 1.5); close(b - a, 12.04, 0.1);
});
test('diffraction sur une arête : 6 dB pour ν = 0, 0 dB sous ν = −0,78', function () { close(P.knifeEdgeLoss(0), 6.03, 0.02); close(P.knifeEdgeLoss(-1), 0, 1e-12); assert.ok(P.knifeEdgeLoss(1) > 13 && P.knifeEdgeLoss(1) < 14.5); });
test('ν = √2 · h / F₁ au milieu du trajet', function () { var F1 = P.fresnelRadius(900e6, 2500, 2500); close(P.knifeEdgeNu(F1, 2500, 2500, 900e6), Math.SQRT2, 1e-9); });
test('rayon de Fresnel : 2 km à 2,4 GHz ≈ 7,9 m ; horizon 25 m / 4 m = 28,8 km', function () { close(P.fresnelRadius(2.4e9, 1000, 1000), Math.sqrt(0.1249 * 500), 0.01); close(P.radioHorizon(25, 4), 28840, 1); });

console.log('\nChaîne de transmission');
test('Q(0) = 0,5 et erfc cohérente', function () { close(CH.Q(0), 0.5, 1e-7); close(CH.erfc(1), 0.157299, 1e-6); });
test('TEB BPSK : 10⁻³ vers 6,79 dB, 10⁻⁵ vers 9,59 dB', function () { close(CH.snrForBer(1e-3, 'none'), 6.79, 0.02); close(CH.snrForBer(1e-5, 'none'), 9.59, 0.02); });
test('code à répétition : TEB = 3p² − 2p³', function () { var p = CH.berUncoded(4); close(CH.berRepetition(4), 3 * p * p - 2 * p * p * p, 1e-15); });
test('texte → bits → texte (ASCII 8 bits)', function () { assert.strictEqual(CH.textToBits('A'), '01000001'); assert.strictEqual(CH.bitsToText(CH.textToBits('TELECOM')), 'TELECOM'); });
test('Monte-Carlo : TEB mesuré proche de la théorie (200 000 bits à 4 dB)', function () {
  var m = CH.measureBer(4, 'none', 200000, 7), th = CH.berUncoded(4); assert.ok(Math.abs(m.ber - th) < 4 * Math.sqrt(th / 200000), m.ber + ' / ' + th);
});
test('transmission sans bruit notable : message intact', function () { var t = CH.transmit({ text: 'TELECOM', coding: 'none', pt: 10, att: 60, noise: -106, seed: 1 }); assert.strictEqual(t.text, 'TELECOM'); assert.strictEqual(t.rawErrors, 0); });
test('bruit thermique : −174 dBm/Hz ; Shannon 1 MHz à 0 dB = 1 Mbit/s', function () { close(CH.thermalNoiseDbm(1), -173.98, 0.02); close(CH.shannon(1e6, 0), 1e6, 1e-6); });

console.log('\nFibre optique');
test('angle critique 1,48/1,46 ≈ 80,6° ; ON ≈ 0,243 ; acceptance ≈ 14°', function () { close(F.criticalAngle(1.48, 1.46), Math.asin(1.46 / 1.48) / DEG, 1e-9); close(F.criticalAngle(1.48, 1.46), 80.57, 0.01); close(F.numericalAperture(1.48, 1.46), 0.2425, 0.001); close(F.acceptanceAngle(1.48, 1.46, 1), 14.03, 0.05); });
test('rayon dans le cône guidé, hors du cône non guidé', function () { assert.ok(F.ray(1, 1.48, 1.46, 10).guided); assert.ok(!F.ray(1, 1.48, 1.46, 20).guided); });
test('bilan : 0 dBm, 80 km à 0,2 dB/km, 3 épissures, 2 connecteurs → −17,3 dBm', function () { close(F.budget({ pt: 0, alpha: 0.2, L: 80, splices: 3, spliceLoss: 0.1, connectors: 2, connectorLoss: 0.5 }).pr, -17.3, 1e-9); });

console.log('\nRéseaux mobiles');
test('tailles de motif N = i² + ij + j² : 3, 4, 7, 12', function () { assert.deepStrictEqual([MO.clusterSize(1, 1), MO.clusterSize(2, 0), MO.clusterSize(2, 1), MO.clusterSize(2, 2)], [3, 4, 7, 12]); });
test('C/I pour N = 7, n = 4 ≈ 18,66 dB ; plus petit motif pour 18 dB = 7', function () { close(MO.toDb(MO.carrierToInterference(7, 4)), 18.66, 0.01); assert.strictEqual(MO.minClusterFor(18, 4), 7); });
test('grille hexagonale : N groupes, cellules voisines toujours différentes', function () {
  [3, 4, 7, 12].forEach(function (N) {
    var g = MO.grid(4, N), groups = new Set(g.map(function (c) { return c.group; }));
    assert.strictEqual(groups.size, N, 'N = ' + N);
    var key = {}; g.forEach(function (c) { key[c.q + ',' + c.r] = c.group; });
    g.forEach(function (c) { [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]].forEach(function (dv) { var k = (c.q + dv[0]) + ',' + (c.r + dv[1]); if (k in key) assert.notStrictEqual(key[k], c.group); }); });
  });
});
test('distance de réutilisation D = R√(3N)', function () { close(MO.reuseDistance(2, 7), 2 * Math.sqrt(21), 1e-12); });

console.log('\nRéseaux IP');
var ipv = function (s) { return IP.parseIp(s).value; };
test('192.168.10.77/26 : réseau .64, diffusion .127, 62 hôtes', function () {
  assert.strictEqual(IP.toString(IP.network(ipv('192.168.10.77'), 26)), '192.168.10.64'); assert.strictEqual(IP.toString(IP.broadcast(ipv('192.168.10.77'), 26)), '192.168.10.127'); assert.strictEqual(IP.hostCount(26), 62);
});
test('masques : /20 = 255.255.240.0 ; 255.255.255.192 = /26 ; masque non contigu refusé', function () {
  assert.strictEqual(IP.toString(IP.prefixToMask(20)), '255.255.240.0'); assert.strictEqual(IP.parseMask('255.255.255.192').prefix, 26); assert.ok(!IP.parseMask('255.0.255.0').ok); assert.ok(!IP.parseIp('192.168.1.256').ok); assert.ok(!IP.parseIp('1.2.3').ok);
});
test('/31 = 2 adresses utilisables, /32 = 1 ; préfixe pour 500 hôtes = /23', function () { assert.strictEqual(IP.hostCount(31), 2); assert.strictEqual(IP.hostCount(32), 1); assert.strictEqual(IP.prefixForHosts(500), 23); assert.strictEqual(IP.prefixForHosts(50), 26); });
test('adresses privées RFC 1918 et spéciales', function () {
  assert.ok(IP.classify(ipv('10.1.2.3')).private); assert.ok(IP.classify(ipv('172.31.255.1')).private); assert.ok(!IP.classify(ipv('172.32.0.1')).private);
  assert.ok(IP.classify(ipv('192.168.0.1')).private); assert.ok(!IP.classify(ipv('8.8.8.8')).private); assert.ok(/boucle/.test(IP.classify(ipv('127.0.0.1')).label));
});
test('plus long préfixe : /16 préféré à /8 et à la route par défaut', function () {
  var t = [{ dest: ipv('10.0.0.0'), prefix: 8 }, { dest: ipv('10.1.0.0'), prefix: 16 }, { dest: ipv('10.1.2.0'), prefix: 24 }, { dest: 0, prefix: 0 }];
  assert.strictEqual(IP.longestPrefixMatch(t, ipv('10.1.3.7')).prefix, 16); assert.strictEqual(IP.longestPrefixMatch(t, ipv('10.1.2.7')).prefix, 24); assert.strictEqual(IP.longestPrefixMatch(t, ipv('9.9.9.9')).prefix, 0);
});
test('parcours PC-A → serveur : 2 routeurs, TTL 64 → 62', function () { var r = IP.route('PC-A', ipv('172.16.5.10'), 64, 'none'); assert.ok(r.delivered); assert.strictEqual(r.ttlAtArrival, 62); assert.deepStrictEqual(r.hops.map(function (h) { return h.at; }), ['PC-A', 'R1', 'R2', 'Serveur']); });
test('TTL minimal pour 2 routeurs = 3 ; avec TTL = 2, destruction chez R2', function () { assert.ok(IP.route('PC-A', ipv('172.16.5.10'), 3, 'none').delivered); var r = IP.route('PC-A', ipv('172.16.5.10'), 2, 'none'); assert.ok(!r.delivered); assert.strictEqual(r.reason, 'ttl'); assert.strictEqual(r.failedAt, 'R2'); });
test('les adresses MAC changent à chaque saut, pas les adresses IP', function () {
  var r = IP.route('PC-A', ipv('192.168.2.30'), 64, 'none'), frames = r.hops.filter(function (h) { return h.frame; }).map(function (h) { return h.frame; });
  assert.ok(frames.length >= 2); frames.forEach(function (f) { assert.strictEqual(f.ipDst, ipv('192.168.2.30')); assert.strictEqual(f.ipSrc, ipv('192.168.1.10')); });
  assert.notStrictEqual(frames[0].macDst, frames[1].macDst);
});
test('pannes : passerelle fausse ou masque /16 → échec ARP vers PC-C ; masque /16 n’empêche pas d’atteindre le serveur', function () {
  assert.strictEqual(IP.route('PC-A', ipv('192.168.2.30'), 64, 'gateway').reason, 'arp');
  assert.strictEqual(IP.route('PC-A', ipv('192.168.2.30'), 64, 'mask').reason, 'arp');
  assert.ok(IP.route('PC-A', ipv('172.16.5.10'), 64, 'mask').delivered);
  assert.ok(IP.route('PC-A', ipv('192.168.1.20'), 64, 'gateway').delivered);
});
test('destination sans route : destruction chez R2 (pas de route par défaut)', function () { var r = IP.route('PC-A', ipv('8.8.8.8'), 64, 'none'); assert.strictEqual(r.reason, 'noroute'); assert.strictEqual(r.failedAt, 'R2'); });

console.log('\n' + passed + ' tests réussis, ' + failed + ' échec(s).');
process.exit(failed ? 1 : 0);
