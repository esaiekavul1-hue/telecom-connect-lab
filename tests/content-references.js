/*
 * Cas de référence numériques : valeurs calculées à la main ou lues dans les
 * documents cités (docs/VERIFICATION-SCIENTIFIQUE.md), indépendamment du code testé.
 */
'use strict';
var C = require('../modules/circuits/circuit-math.js');
var K = require('../core/module-kit.js');

module.exports = function (m, test, assert) {
  function close(a, b, eps, msg) { assert.ok(Math.abs(a - b) <= (eps == null ? 1e-6 : eps), (msg || '') + ' attendu ' + b + ', obtenu ' + a); }

  test('kit : Q(0) = 0,5 et Q(3) = 1,3499·10⁻³', function () { close(K.qf(0), 0.5, 1e-6); close(K.qf(3), 1.3499e-3, 2e-7); });

  test('ac : résonance et facteur Q (L = 10 mH, C = 1 µF, R = 50 Ω)', function () { close(m.ac.math.f0(10e-3, 1e-6), 1591.549, 0.01); close(m.ac.math.qFactor(50, 10e-3, 1e-6), 2, 1e-9); });
  test('ac : à la résonance, Z = R et cos φ = 1', function () { var f = m.ac.math.f0(10e-3, 1e-6), r = m.ac.math.series('rlc', 10, 50, 10e-3, 1e-6, f); close(r.Z, 50, 1e-6); close(r.pf, 1, 1e-9); });
  test('ac : S² = P² + Q² sur 100 cas', function () { for (var i = 1; i <= 100; i++) { var r = m.ac.math.series('rlc', 10 + i, 10 + i * 3, 0.001 * i, 1e-6 * i, 50 * i); close(r.S * r.S, r.P * r.P + r.Q * r.Q, 1e-6); } });

  test('analyse : Thévenin identique au solveur nodal', function () {
    for (var i = 1; i <= 40; i++) {
      var E1 = 3 + i, E2 = i % 5, R1 = 100 + 13 * i, R2 = 220 + 7 * i, R3 = 330 + 11 * i, RL = 150 + 17 * i;
      var sol = C.solveDC([{ type: 'V', id: 'E1', a: 'a', b: '0', value: E1 }, { type: 'R', id: 'R1', a: 'a', b: 'n', value: R1 }, { type: 'V', id: 'E2', a: 'b', b: '0', value: E2 }, { type: 'R', id: 'R2', a: 'b', b: 'n', value: R2 }, { type: 'R', id: 'R3', a: 'n', b: '0', value: R3 }, { type: 'R', id: 'RL', a: 'n', b: '0', value: RL }]);
      var t = m.analyse.math.thevenin(E1, E2, R1, R2, R3), l = m.analyse.math.load(t.Vth, t.Rth, RL);
      close(l.U, sol.v.n, 1e-9); close(l.P, sol.elements.RL.p, 1e-9);
    }
  });
  test('analyse : la puissance est maximale pour RL = Rth', function () { var A = m.analyse.math, p = A.pMax(10, 100); close(A.load(10, 100, 100).P, p, 1e-12); assert.ok(A.load(10, 100, 90).P < p && A.load(10, 100, 110).P < p); });
  test('analyse : la superposition égale le calcul direct', function () { var A = m.analyse.math; close(A.superpose(12, 6, 100, 200, 300).total, A.thevenin(12, 6, 100, 200, 300).Vth, 1e-12); });

  test('diodes : V_T et point de fonctionnement vérifiant Kirchhoff', function () { var D = m.diodes.math; close(D.VT, 0.02585, 1e-5); var o = D.operating(5, 1000, 1e-12, 1.8); close((5 - o.Vd) / 1000, D.shockley(1e-12, 1.8, o.Vd), 1e-8); });
  test('diodes : sans condensateur, moyenne double alternance = 2Vp/π', function () { var r = m.diodes.math.rectifier({ type: 'bridge', Vp: 10, f: 50, C: 0, R: 100, Vf: 0 }); close(r.vavg, 20 / Math.PI, 0.01); });
  test('diodes : sans condensateur, moyenne simple alternance = Vp/π', function () { var r = m.diodes.math.rectifier({ type: 'half', Vp: 10, f: 50, C: 0, R: 100, Vf: 0 }); close(r.vavg, 10 / Math.PI, 0.01); });
  test('diodes : ondulation d’un pont proche de I/(2fC)', function () { var r = m.diodes.math.rectifier({ type: 'bridge', Vp: 16, f: 50, C: 10000e-6, R: 100, Vf: 0.7 }), I = r.vavg / 100; close(r.ripple, I / (2 * 50 * 10000e-6), 0.03); });
  test('diodes : Zener, loi des nœuds et hors régulation', function () { var z = m.diodes.math.zener(12, 100, 5.1, 220, 0.178); close(z.Is, 0.069, 1e-9); close(z.Is, z.Iz + z.Il, 1e-12); assert.strictEqual(m.diodes.math.zener(5, 1000, 5.1, 100, 0.178).reg, false); });

  test('transistors : point de repos calculé à la main', function () {
    var b = m.transistors.math.bias({ Vcc: 12, R1: 47000, R2: 10000, Rc: 2200, Re: 470, beta: 200, bypass: true });
    var Vth = 12 * 10 / 57, Rth = 47 * 10 / 57 * 1000, Ib = (Vth - 0.65) / (Rth + 201 * 470);
    close(b.Ic, 200 * Ib, 1e-9); assert.strictEqual(b.region, 'active'); close(b.Vce, 12 - 200 * Ib * 2200 - 201 * Ib * 470, 1e-9);
  });
  test('transistors : blocage, saturation, continuité triode/saturation', function () { var T = m.transistors.math; assert.strictEqual(T.bias({ Vcc: 12, R1: 1e6, R2: 1000, Rc: 1000, Re: 100, beta: 100, bypass: true }).region, 'cutoff'); assert.strictEqual(T.bias({ Vcc: 12, R1: 1000, R2: 1e6, Rc: 2200, Re: 470, beta: 200, bypass: true }).region, 'saturation'); close(T.nmosId(4, 2 - 1e-9, 0.1, 2, 0).Id, T.nmosId(4, 2, 0.1, 2, 0).Id, 1e-6); close(T.nmosId(4, 5, 0.1, 2, 0).Id, 0.2, 1e-12); });

  test('aop : gains, GBW, pente, Sallen-Key, Wien', function () { var A = m.aop.math; close(A.gain('inv', 100, 10), -10); close(A.gain('non', 90, 10), 10); close(A.bandwidth(1.5e6, 'non', 99, 1), 15000, 1e-6); close(A.fullPower(0.5e6, 10), 7957.75, 0.01); var sk = A.sallenKey(1000, 20e-9, 10e-9); close(sk.Q, Math.SQRT1_2, 1e-9); close(A.lp2(sk.f0, sk.f0, sk.Q), sk.Q, 1e-9); close(A.wien(10000, 16e-9), 994.72, 0.01); });

  test('logique : additionneur complet exhaustif', function () { for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++) { var f = m.logique.math.fullAdder(a, b, c), t = a + b + c; assert.strictEqual(f.s, t % 2); assert.strictEqual(f.c, t >> 1); } });
  test('logique : additionneur 4 bits exhaustif, De Morgan, tables', function () { var L = m.logique.math; for (var a = 0; a < 16; a++) for (var b = 0; b < 16; b++) { var r = L.add4(a, b, 0); assert.strictEqual(r.sum + 16 * r.carry, a + b); } assert.deepStrictEqual(L.truth('nand'), [1, 1, 1, 0]); assert.deepStrictEqual(L.truth('xor'), [0, 1, 1, 0]); assert.deepStrictEqual(L.truth('nor'), [1, 0, 0, 0]); [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(function (x) { assert.strictEqual(L.GATES.nand(x[0], x[1]), (1 - x[0]) | (1 - x[1])); assert.strictEqual(L.GATES.nor(x[0], x[1]), (1 - x[0]) & (1 - x[1])); }); });
  test('logique : bascule D, front montant seulement', function () { var D = m.logique.math.dff; assert.strictEqual(D(0, 1, 1, 0), 1); assert.strictEqual(D(1, 1, 1, 0), 0); assert.strictEqual(D(1, 0, 1, 0), 0); });

  test('can : SNR mesuré par simulation proche de 6,02N + 1,76', function () { var A = m.can.math; [8, 10, 12].forEach(function (N) { close(A.measuredSnr(N, 300000), A.sqnr(N), 0.4); }); });
  test('can : repliement, codes et R-2R', function () { var A = m.can.math; close(A.alias(900, 1000), 100); close(A.alias(7000, 10000), 3000); assert.strictEqual(A.code(2.5, 5, 10), 512); assert.strictEqual(A.code(9, 5, 10), 1023); close(A.r2r([0, 0, 0, 1], 5), 2.5); });

  test('mesures : incertitude, valeur efficace, déclenchement', function () { var A = m.mesures.math; close(A.resolutionErr(12, 0.5, 2, 0.01), 0.08); close(A.rmsTotal(2.5, 1.2), Math.sqrt(1.44 + 3.125), 1e-9); assert.strictEqual(A.triggerOffset(A.SIGNALS.a, 10, 'dc'), null); });

  test('rf : charge adaptée, court-circuit, 75 Ω sur 50 Ω', function () { var R = m.rf.math; close(R.abs(R.gamma({ re: 50, im: 0 }, 50)), 0); assert.ok(!isFinite(R.vswr(R.gamma({ re: 0, im: 0 }, 50)))); close(R.vswr(R.gamma({ re: 75, im: 0 }, 50)), 1.5, 1e-9); close(R.returnLoss({ re: 0.1, im: 0 }), 20, 1e-9); });
  test('rf : quart d’onde et demi-onde', function () { var R = m.rf.math, z = R.zin({ re: 100, im: 0 }, 50, 0.25); close(z.re, 25, 1e-6); close(z.im, 0, 1e-6); close(R.zin({ re: 80, im: 30 }, 50, 0.5).re, 80, 1e-6); });
  test('rf : le réseau en L annule la réflexion', function () { var R = m.rf.math, L = R.lMatch(50, 200); close(L.Q, Math.sqrt(3), 1e-9); var Y = { g: 1 / 200, b: 1 / L.Xparallel }, d = Y.g * Y.g + Y.b * Y.b; close(Y.g / d, 50, 1e-9); close(-Y.b / d + L.Xseries, 0, 1e-9); });

  test('fourier : Parseval (carré) et somme des harmoniques', function () { var F = m.fourier.math; close(F.truncErr('square', 1, F.harmonics('square', 1, 4001)), 0, 0.02); assert.ok(F.truncErr('square', 1, F.harmonics('square', 1, 1)) > 0.4); close(F.harmonics('square', 2, 3)[1].a, 8 / (3 * Math.PI)); close(F.synth(F.harmonics('square', 1, 2001), 1, 0.25), 1, 0.01); });
  test('fourier : réponse du filtre', function () { close(m.fourier.math.lpResp(1, 1).mag, Math.SQRT1_2); close(m.fourier.math.lpResp(1, 1).ph, -Math.PI / 4); });

  test('numerique : BER BPSK de référence, QPSK identique', function () { var N = m.numerique.math; close(N.ber('bpsk', 9.59), 1e-5, 2e-6); assert.strictEqual(N.ber('bpsk', 6), N.ber('qpsk', 6)); });
  test('numerique : approximation 16-QAM contre Monte-Carlo', function () { var N = m.numerique.math; [8, 10].forEach(function (e) { var mc = N.simulateQam16(e, 1600000), th = N.ber('qam16', e); assert.ok(Math.abs(mc - th) / th < 0.1, 'à ' + e + ' dB : ' + mc + ' / ' + th); }); });
  test('numerique : Shannon et Hamming exhaustif', function () { var N = m.numerique.math; close(N.shannon(1e6, 10 * Math.log10(15)), 4e6, 1e-3); for (var v = 0; v < 16; v++) { var d = [v >> 3 & 1, v >> 2 & 1, v >> 1 & 1, v & 1], c = N.hammingEncode(d); assert.strictEqual(N.syndrome(c), 0); for (var i = 0; i < 7; i++) { var e = c.slice(); e[i] ^= 1; assert.strictEqual(N.syndrome(e), i + 1); assert.deepStrictEqual(N.hammingDecode(e).data, d); } } });
  test('numerique : distance minimale du code = 3', function () { var N = m.numerique.math, min = 9; for (var a = 0; a < 16; a++) for (var b = a + 1; b < 16; b++) { var x = N.hammingEncode([a >> 3 & 1, a >> 2 & 1, a >> 1 & 1, a & 1]), y = N.hammingEncode([b >> 3 & 1, b >> 2 & 1, b >> 1 & 1, b & 1]), d = 0; for (var i = 0; i < 7; i++) if (x[i] !== y[i]) d++; min = Math.min(min, d); } assert.strictEqual(min, 3); });
  test('numerique : CRC, le mot complet laisse un reste nul', function () { var N = m.numerique.math, g = [1, 0, 1, 1], r = N.crc([1, 1, 0, 1], g); assert.deepStrictEqual(r, [0, 0, 1]); var w = [1, 1, 0, 1].concat(r), rr = w.concat([]); for (var i = 0; i <= w.length - g.length; i++) if (rr[i]) for (var j = 0; j < g.length; j++) rr[i + j] ^= g[j]; assert.ok(rr.every(function (x) { return x === 0; })); });

  test('multiplexage : maxima ALOHA, E1, orthogonalité', function () { var A = m.multiplexage.math; close(A.aloha('pure', 0.5), 0.5 / Math.E, 1e-12); close(A.aloha('slotted', 1), 1 / Math.E, 1e-12); close(A.tdm(32, 8, 125e-6), 2.048e6, 1e-3); A.WALSH.forEach(function (x, i) { A.WALSH.forEach(function (y, j) { close(A.correlate(x, y), i === j ? 1 : 0); }); }); });

  test('qualite : plancher −174 dBm/Hz, cascade, dBm', function () { var Q = m.qualite.math; close(Q.noiseDbm(1), -173.98, 0.02); close(Q.friis([{ g: 20, nf: 1 }, { g: 0, nf: 10 }]).F, Math.pow(10, 0.1) + 9 / 100, 1e-9); close(Q.wToDbm(1), 30, 1e-9); close(Q.dbmToW(-30), 1e-6, 1e-12); });

  test('satellite : orbite géostationnaire, constante −228,6', function () { var S = m.satellite.math; close(S.period(35786) / 3600, 23.934, 0.01); close(S.KDB, -228.6, 0.01); close(S.slant(35786, 90), 35786, 1e-6); close(S.fspl(1000, 1), 152.45, 1e-9); close(S.delay(2 * 35786) * 1000, 238.74, 0.05); });

  test('5g : table 3GPP, débit 100 MHz', function () { var G = m['5g'].math; close(G.scs(3), 120); close(G.ts(1), 1e-3 / 28); assert.strictEqual(G.NRB[1][100], 273); assert.strictEqual(G.NRB[0][20], 106); assert.strictEqual(G.NRB[0][100], undefined); close(G.peak({ mu: 1, bw: 100, layers: 4, qm: 8, scale: 1, dir: 'dl' }), 1e-6 * 4 * 8 * (948 / 1024) * (273 * 12 / (1e-3 / 28)) * 0.86, 1e-6); close(G.arrayFactor(8, 0, 0), 1); });

  test('sans-fil : canaux et limite de Shannon', function () { var F = m['sans-fil'].math; close(F.centre(1), 2412); close(F.centre(11), 2462); close(F.centre(14), 2484); assert.strictEqual(F.overlap(1, 6), false); assert.strictEqual(F.overlap(1, 4), true); close(F.collisionProb(2, 16), 1 / 16); close(F.pathLoss(2437, 1, 3, 0, 0), 20 * Math.log10(2437) - 27.55, 1e-9); });

  test('ingenierie : Erlang B de référence, somme directe', function () { var E = m.ingenierie.math; function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); } function dir(A, N) { var s = 0; for (var i = 0; i <= N; i++) s += Math.pow(A, i) / fact(i); return Math.pow(A, N) / fact(N) / s; } [[2, 3], [10, 15], [5, 8], [30, 40]].forEach(function (x) { close(E.erlangB(x[0], x[1]), dir(x[0], x[1]), 1e-9); }); close(E.erlangB(2, 3), 4 / 19, 1e-12); });
  test('ingenierie : disponibilités', function () { var E = m.ingenierie.math; close(E.parallel(0.99, 2), 0.9999, 1e-12); close(E.series([0.99, 0.99]), 0.9801, 1e-12); close(E.downtimeMin(0.999) / 60, 8.766, 0.001); });

  test('binaire : complément à deux, plages, UTF-8', function () { var B = m.binaire.math; assert.strictEqual(B.toSigned(B.fromInt(-128, 8)), -128); for (var i = -128; i < 128; i++) assert.strictEqual(B.toSigned(B.fromInt(i, 8)), i); assert.strictEqual(B.signedRange(4).min, -8); assert.strictEqual(B.signedRange(8).max, 127); [[0x41, 1], [0xE9, 2], [0x20AC, 3], [0x1F600, 4], [0x7F, 1], [0x80, 2], [0x7FF, 2], [0x800, 3], [0xFFFF, 3], [0x10000, 4]].forEach(function (x) { assert.strictEqual(B.utf8Len(x[0]), x[1]); }); });
  test('binaire : dépassement détecté correctement', function () { var B = m.binaire.math; assert.strictEqual(B.addBits(B.fromInt(100, 8), B.fromInt(100, 8)).overflow, 1); assert.strictEqual(B.addBits(B.fromInt(-1, 8), B.fromInt(1, 8)).overflow, 0); assert.strictEqual(B.addBits(B.fromInt(-1, 8), B.fromInt(1, 8)).carry, 1); });

  test('ordinateur : programmes et AMAT', function () { var O = m.ordinateur.math, s = O.freshState('somme'); for (var i = 0; i < 20; i++) O.step(s); assert.strictEqual(s.mem[13], 12); assert.strictEqual(s.halted, 1); assert.deepStrictEqual(s.out, [12]); var b = O.freshState('boucle'); for (i = 0; i < 100; i++) O.step(b); assert.deepStrictEqual(b.out, [3, 2, 1]); close(O.amat(1, 0.05, 100), 6); });

  test('systemes : exemple OSTEP (110 s et 50 s), Round Robin, Belady', function () { var S = m.systemes.math, J = [{ id: 'A', d: 100 }, { id: 'B', d: 10 }, { id: 'C', d: 10 }]; close(S.fifo(J).s.turn, 110); close(S.sjf(J).s.turn, 50); var rr = S.rr([{ id: 'A', d: 5 }, { id: 'B', d: 5 }, { id: 'C', d: 5 }], 1); close(rr.s.resp, 1); close(rr.s.turn, 14); var R = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]; assert.strictEqual(S.pageFaults(R, 3, 'fifo').faults, 9); assert.strictEqual(S.pageFaults(R, 4, 'fifo').faults, 10); });

  test('reseaux-info : chaque cas s’arrête à la bonne étape', function () { var R = m['reseaux-info'].math; assert.ok(/200/.test(R.run('ok').slice(-1)[0][0])); assert.ok(/résolu/.test(R.run('dns').slice(-1)[0][0])); assert.ok(/refusée/.test(R.run('port').slice(-1)[0][0])); assert.ok(/500/.test(R.run('app').slice(-1)[0][0])); assert.ok(/404/.test(R.run('notfound').slice(-1)[0][0])); close(R.pageTime({ rtt: 50, dns: true, tls: false, sizeKo: 500, mbps: 10 }), 550, 1e-9); });

  test('donnees : sélection, jointure, moyenne, atomicité', function () { var D = m.donnees.math; assert.strictEqual(D.query({ join: false, filiere: 'Reseaux', min: 0, agg: null }).length, 2); assert.strictEqual(D.query({ join: true, filiere: 'toutes', min: 14, agg: null }).length, 3); var g = D.query({ join: true, filiere: 'Telecom', min: 0, agg: 'moy' }); close(g[0].moyenne, (16 + 12 + 9) / 3, 0.01); close(D.transfer({ amt: 30, tx: 1, crash: 1 }).A, 100); close(D.transfer({ amt: 30, tx: 0, crash: 1 }).A + D.transfer({ amt: 30, tx: 0, crash: 1 }).B, 120); });

  test('cloud : consolidation et élasticité', function () { var A = m.cloud.math; assert.strictEqual(A.hosts(30, 4, 2, 64, 4), 3); assert.strictEqual(A.hosts(20, 2, 0.1, 64, 8), 1); assert.strictEqual(A.hosts(1, 100, 2, 64, 8), Infinity); close(A.demand(12, 20, 100), 100, 1e-9); close(A.demand(3, 20, 100), 20, 1e-9); });

  test('maintenance : capacités OSTEP', function () { var A = m.maintenance.math; close(A.raid(0, 4, 2).cap, 8); close(A.raid(1, 4, 2).cap, 4); close(A.raid(5, 4, 2).cap, 6); assert.strictEqual(A.alive(0, 4, 1), false); assert.strictEqual(A.alive(5, 4, 1), true); assert.strictEqual(A.alive(5, 4, 2), false); assert.strictEqual(A.backup321({ copies: 3, media: 2, offsite: 1 }).ok, true); assert.strictEqual(A.backup321({ copies: 3, media: 1, offsite: 1 }).ok, false); });

  test('iot-intro : LED, signal', function () { var A = m['iot-intro'].math; close(A.ledR(5, 2, 0.01), 300); assert.strictEqual(A.adcCode(2.5, 5, 10), 512); close(A.dataRate(10, 20, 60), 26.667, 0.001); });
  test('iot-capteurs : aller-retour CTN', function () { var A = m['iot-capteurs'].math; close(A.ntcR(25, 10000, 3950), 10000, 1e-6); for (var t = -10; t <= 80; t += 5) close(A.tempFromR(A.ntcR(t, 10000, 3950), 10000, 3950), t, 1e-9); close(A.rFromV(A.dividerV(3.3, 10000, 4700), 3.3, 10000), 4700, 1e-6); assert.deepStrictEqual(A.movingAvg([2, 4, 6], 2), [2, 3, 5]); });

  test('iot-com : formule Semtech recalculée à la main (SF7 et SF12)', function () {
    var A = m['iot-com'].math;
    var r = A.airtime({ sf: 7, bw: 125000, cr: 1, pl: 20, pre: 8 });
    // n = 8 + ceil((160 − 28 + 28 + 16)/28)·5 = 8 + ceil(6,2857)·5 = 8 + 35 = 43 ; T = (12,25 + 43)·1,024 ms.
    assert.strictEqual(r.nPay, 43); close(r.total, 55.25 * 1.024e-3, 1e-9); assert.strictEqual(r.de, 0);
    var r2 = A.airtime({ sf: 12, bw: 125000, cr: 1, pl: 59, pre: 8 });
    // n = 8 + ceil((472 − 48 + 28 + 16)/(4·10))·5 = 8 + 12·5 = 68 ; T = (12,25 + 68)·32,768 ms.
    assert.strictEqual(r2.de, 1); assert.strictEqual(r2.nPay, 68); close(r2.total * 1000, 80.25 * 32.768, 0.001);
    close(A.sensitivity(12, 125000), -137.03, 0.02);
  });

  test('iot-mqtt : correspondance des topics selon la spécification', function () {
    var A = m['iot-mqtt'].math;
    [['sport/#', 'sport/tennis/player1', 1], ['sport/#', 'sport', 1], ['sport/tennis/+', 'sport/tennis/player1', 1], ['sport/tennis/+', 'sport/tennis/player1/ranking', 0], ['sport/+', 'sport', 0], ['+/+', '/finance', 1], ['+', '/finance', 0], ['#', 'a/b/c', 1]].forEach(function (x) { assert.strictEqual(A.matches(x[0], x[1]), !!x[2], x[0] + ' / ' + x[1]); });
    assert.strictEqual(A.validFilter('sport/tennis#'), false); assert.strictEqual(A.validFilter('sport/#/ranking'), false); assert.strictEqual(A.validFilter('sport+'), false); assert.strictEqual(A.validTopic('a/+'), false);
  });
  test('iot-mqtt : QoS sur lien parfait, doublons QoS 1, unicité QoS 2', function () {
    var A = m['iot-mqtt'].math, none = function () { return false; };
    assert.deepStrictEqual(A.deliver(0, none), { delivered: 1, duplicates: 0, packets: 1 }); assert.strictEqual(A.deliver(1, none).packets, 2); assert.strictEqual(A.deliver(2, none).packets, 4);
    var ackLost = function (i) { return i === 1; }; assert.strictEqual(A.deliver(1, ackLost).duplicates, 1); assert.strictEqual(A.deliver(2, ackLost).duplicates, 0);
    close(A.keepAliveLimit(60), 90);
  });

  test('iot-energie : courant moyen et autonomie à la main', function () { var A = m['iot-energie'].math; close(A.avgCurrent({ period: 100, active: 1, tx: 0, iSleep: 0.1, iActive: 50, iTx: 0 }), 0.599, 1e-9); close(A.lifeHours(1000, 0.5, 0), 1600, 1e-9); close(A.solarNeed(5, 3.7, 4, 0.5), 0.222, 1e-9); assert.strictEqual(A.CORE.length, 6); });

  test('iot-projets : extérieur et comportement du régulateur', function () {
    var A = m['iot-projets'].math; close(A.outside(15, 26, 6), 32, 1e-9); close(A.outside(3, 26, 6), 20, 1e-9);
    var base = { mode: 'hyst', set: 26, hyst: 2, sample: 5, noise: 0, fan: 10, tau: 40, mean: 26, swing: 6, sun: 6, watt: 30, T0: 26, lo: 18, hi: 30 };
    var a = A.simulate(base), b = A.simulate(Object.assign({}, base, { hyst: 6 }));
    assert.ok(b.sw < a.sw, 'une hystérésis plus large réduit les commutations');
    assert.strictEqual(a.msgs, 288);
  });
};
