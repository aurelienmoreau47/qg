'use strict';
// Guide du renfo hanches et tronc (Prépa backyard, étapes 2 et 3) : écran plein (#guide) ouvert depuis la page Prépa.
// Aperçu → échauffement minuté → 8 exercices au niveau de chacun (séries, minuteur, repos) → question Oui / Non qui fait monter la dose ou le niveau → fin (renfo noté « rf-<jour> »). Écran « Mes niveaux ».
// Le programme (niveaux A à D, fourchettes, consignes, progression) est dans prepa.js ; ici les silhouettes animées, la règle de niveau et le déroulé.
// Chargé avant app.js : il utilise $, esc, auj, enregistrer et DB d'app.js au moment des appels.

// ---------- Silhouettes : une pose = positions des articulations dans un cadre 240 × 160 (sol à y = 146)
// H tête, N épaules, P bassin, K/A/T genou/cheville/orteils, E/W coude/main ; 1 = côté proche, 2 = côté éloigné.
// Vue de côté (tête vers la droite) sauf « face ». Poses dessinées d'après les photos du programme Run RCT, sans les reprendre.
const POSES = {
  ours: { a: { H: [182, 95], N: [168, 101], P: [118, 101], K1: [124, 130], A1: [97, 136], T1: [105, 146], K2: [120, 130], A2: [93, 136], T2: [101, 146], E1: [170, 124], W1: [171, 146], E2: [166, 124], W2: [167, 146] },
    b: { H: [182, 97], N: [168, 101], P: [120, 109], K1: [90, 121], A1: [60, 134], T1: [66, 146], K2: [86, 121], A2: [56, 134], T2: [62, 146], E1: [170, 124], W1: [171, 146], E2: [166, 124], W2: [167, 146] } },
  lateral: { face: true, appui: true,
    a: { H: [46, 108], N: [60, 120], P: [115, 139], K1: [152, 139], A1: [188, 138], T1: [194, 131], K2: [152, 142], A2: [188, 142], T2: [194, 136], E1: [62, 96], W1: [64, 74], E2: [60, 146], W2: [80, 146] },
    b: { H: [46, 108], N: [60, 120], P: [115, 127], K1: [152, 132], A1: [188, 137], T1: [194, 130], K2: [152, 135], A2: [188, 141], T2: [194, 135], E1: [62, 96], W1: [64, 74], E2: [60, 146], W2: [80, 146] } },
  pont: { a: { H: [30, 135], N: [50, 140], P: [102, 141], K1: [128, 112], A1: [150, 140], T1: [161, 146], K2: [124, 112], A2: [146, 140], T2: [157, 146], E1: [72, 143], W1: [94, 144], E2: [70, 142], W2: [92, 143] },
    b: { H: [30, 135], N: [50, 140], P: [98, 116], K1: [132, 104], A1: [150, 140], T1: [161, 146], K2: [128, 104], A2: [146, 140], T2: [157, 146], E1: [72, 143], W1: [94, 144], E2: [70, 142], W2: [92, 143] } },
  squat: { face: true, bande: ['K1', 'K2', -7],
    a: { H: [120, 26], N: [120, 44], P: [120, 84], K1: [110, 112], A1: [108, 140], T1: [101, 146], K2: [130, 112], A2: [132, 140], T2: [139, 146], E1: [100, 62], W1: [111, 81], E2: [140, 62], W2: [129, 81] },
    b: { H: [120, 50], N: [120, 68], P: [120, 104], K1: [99, 117], A1: [108, 140], T1: [101, 146], K2: [141, 117], A2: [132, 140], T2: [139, 146], E1: [100, 86], W1: [111, 101], E2: [140, 86], W2: [129, 101] } },
  jambe: { a: { H: [30, 135], N: [50, 140], P: [102, 141], K1: [136, 141], A1: [170, 141], T1: [175, 133], K2: [126, 112], A2: [146, 140], T2: [157, 146], E1: [72, 143], W1: [94, 144], E2: [70, 142], W2: [92, 143] },
    b: { H: [30, 135], N: [50, 140], P: [102, 141], K1: [131, 124], A1: [161, 107], T1: [164, 99], K2: [126, 112], A2: [146, 140], T2: [157, 146], E1: [72, 143], W1: [94, 144], E2: [70, 142], W2: [92, 143] } },
  fente: { chaise: true,
    a: { H: [114, 26], N: [112, 43], P: [110, 82], K1: [128, 110], A1: [126, 140], T1: [138, 146], K2: [96, 112], A2: [66, 106], T2: [55, 112], E1: [100, 62], W1: [110, 80], E2: [104, 62], W2: [113, 80] },
    b: { H: [110, 48], N: [108, 64], P: [104, 104], K1: [134, 112], A1: [126, 140], T1: [138, 146], K2: [90, 132], A2: [66, 106], T2: [55, 112], E1: [96, 84], W1: [105, 102], E2: [100, 84], W2: [108, 102] } },
  souleve: { bande: ['T1', 'W1', 0],
    a: { H: [120, 26], N: [120, 44], P: [118, 84], K1: [120, 112], A1: [118, 140], T1: [130, 146], K2: [117, 112], A2: [115, 140], T2: [127, 146], E1: [121, 64], W1: [121, 85], E2: [118, 64], W2: [118, 85] },
    b: { H: [152, 50], N: [139, 60], P: [106, 83], K1: [123, 110], A1: [118, 140], T1: [130, 146], K2: [120, 110], A2: [115, 140], T2: [127, 146], E1: [140, 82], W1: [140, 104], E2: [137, 82], W2: [137, 104] } },
  laterale: { face: true,
    a: { H: [120, 26], N: [120, 44], P: [120, 84], K1: [113, 112], A1: [112, 140], T1: [105, 146], K2: [127, 112], A2: [128, 140], T2: [135, 146], E1: [104, 66], W1: [114, 57], E2: [136, 66], W2: [126, 57] },
    b: { H: [103, 45], N: [102, 62], P: [98, 100], K1: [74, 112], A1: [66, 140], T1: [58, 146], K2: [122, 120], A2: [146, 140], T2: [152, 146], E1: [86, 84], W1: [96, 75], E2: [118, 84], W2: [108, 75] } },
  // Échauffement : pour la course, la pose B est la pose A avec les côtés inversés
  course: { alterne: true, a: { H: [124, 28], N: [122, 46], P: [116, 84], K1: [134, 104], A1: [128, 130], T1: [139, 133], K2: [108, 112], A2: [90, 124], T2: [86, 133], E1: [106, 62], W1: [112, 79], E2: [130, 64], W2: [142, 54] } },
  genoux: { alterne: true, a: { H: [120, 24], N: [120, 42], P: [118, 80], K1: [142, 82], A1: [138, 110], T1: [148, 113], K2: [118, 110], A2: [116, 138], T2: [128, 144], E1: [106, 58], W1: [112, 75], E2: [130, 60], W2: [140, 50] } },
  talons: { alterne: true, a: { H: [122, 26], N: [121, 44], P: [118, 82], K1: [114, 112], A1: [98, 92], T1: [92, 86], K2: [119, 111], A2: [117, 139], T2: [129, 145], E1: [106, 60], W1: [112, 77], E2: [132, 62], W2: [142, 52] } },
  chasses: { face: true,
    a: { H: [120, 30], N: [120, 48], P: [120, 86], K1: [102, 113], A1: [94, 140], T1: [87, 146], K2: [138, 113], A2: [146, 140], T2: [153, 146], E1: [100, 64], W1: [92, 80], E2: [140, 64], W2: [148, 80] },
    b: { H: [120, 24], N: [120, 42], P: [120, 80], K1: [114, 108], A1: [112, 134], T1: [105, 140], K2: [126, 108], A2: [128, 134], T2: [135, 140], E1: [102, 58], W1: [96, 74], E2: [138, 58], W2: [144, 74] } }
};
// Niveaux B à D (étape 3) : silhouettes dessinées d'après les photos du programme, sans les reprendre
(function () {
  const DOS = { H: [30, 135], N: [50, 140], E1: [72, 143], W1: [94, 144], E2: [70, 142], W2: [92, 143] };
  const PL = { H: [184, 114], N: [168, 120], P: [120, 126], K1: [90, 133], A1: [60, 140], T1: [66, 146], K2: [86, 133], A2: [56, 140], T2: [62, 146], E1: [168, 145], W1: [192, 145], E2: [164, 145], W2: [188, 145] };
  const LAT = { H: [46, 108], N: [60, 120], E1: [62, 96], W1: [64, 74], E2: [60, 146], W2: [80, 146] };
  const HANCHES = { E1: [100, 70], W1: [110, 88], E2: [140, 70], W2: [130, 88] };
  const F6B = { H: [116, 52], N: [114, 70], P: [112, 106], K1: [142, 108], A1: [140, 138], T1: [152, 146], K2: [110, 136], A2: [80, 134], T2: [74, 146], E1: [122, 86], W1: [134, 78], E2: [104, 88], W2: [98, 104] };
  const FX90 = Object.assign({}, DOS, { P: [102, 141], K1: [110, 104], A1: [146, 104], T1: [152, 96], K2: [136, 141], A2: [170, 141], T2: [175, 133] });
  const CB = { a: { P: [112, 140], K2: [146, 142], A2: [180, 143], T2: [186, 137] }, b: { P: [112, 124], K2: [146, 128], A2: [178, 124], T2: [184, 118] } };
  const o = (...x) => Object.assign({}, ...x);
  const DEBOUT = { H: [120, 26], N: [120, 44], P: [120, 84] };
  Object.assign(POSES, {
    trot: { face: true, appui: true,
      a: { H: [44, 94], N: [60, 104], P: [115, 122], K1: [152, 131], A1: [188, 139], T1: [194, 132], K2: [152, 134], A2: [188, 143], T2: [194, 137], E1: [72, 120], W1: [68, 138], E2: [60, 125], W2: [60, 146] },
      b: { H: [44, 94], N: [60, 104], P: [115, 122], K1: [152, 131], A1: [188, 139], T1: [194, 132], K2: [152, 134], A2: [188, 143], T2: [194, 137], E1: [61, 82], W1: [62, 60], E2: [60, 125], W2: [60, 146] } },
    planche: { a: PL, b: o(PL, { P: [120, 124], H: [184, 113] }) },
    planchejambe: { a: PL, b: o(PL, { K1: [92, 118], A1: [64, 104], T1: [64, 113] }) },
    lateralS: { face: true, appui: true, a: POSES.lateral.b, b: o(POSES.lateral.b, { P: [115, 129] }) },
    copenG: { face: true, appui: true, banc: [140, 204],
      a: o(LAT, CB.a, { K1: [146, 116], A1: [182, 114], T1: [188, 107] }),
      b: o(LAT, CB.b, { K1: [146, 116], A1: [182, 114], T1: [188, 107] }) },
    copenC: { face: true, appui: true, banc: [170, 212],
      a: o(LAT, CB.a, { K1: [148, 128], A1: [184, 116], T1: [190, 109] }),
      b: o(LAT, CB.b, { K1: [148, 119], A1: [184, 114], T1: [190, 107] }) },
    pontS: { a: POSES.pont.b, b: o(POSES.pont.b, { P: [98, 118] }) },
    pontJ: { a: POSES.pont.b, b: o(POSES.pont.b, { A1: [164, 80], T1: [172, 74] }) },
    pontU: { a: o(DOS, { P: [102, 141], K2: [126, 112], A2: [146, 140], T2: [157, 146], K1: [110, 106], A1: [140, 86], T1: [144, 76] }),
      b: o(DOS, { P: [98, 116], K2: [128, 104], A2: [146, 140], T2: [157, 146], K1: [104, 80], A1: [134, 60], T1: [138, 50] }) },
    marcheF: { face: true, bande: ['A1', 'A2', -3],
      a: o({ H: [120, 36], N: [120, 54], P: [120, 90], K1: [104, 116], A1: [96, 140], T1: [89, 146], K2: [136, 116], A2: [144, 140], T2: [151, 146] }, HANCHES),
      b: o({ H: [120, 36], N: [120, 54], P: [120, 90], K1: [110, 116], A1: [108, 140], T1: [101, 146], K2: [130, 116], A2: [132, 140], T2: [139, 146] }, HANCHES) },
    marcheT: { face: true, bande: ['A1', 'A2', -3],
      a: o(DEBOUT, { K1: [107, 112], A1: [96, 140], T1: [89, 146], K2: [133, 112], A2: [144, 140], T2: [151, 146], E1: [100, 62], W1: [111, 81], E2: [140, 62], W2: [129, 81] }),
      b: o(DEBOUT, { K1: [114, 112], A1: [108, 140], T1: [101, 146], K2: [126, 112], A2: [132, 140], T2: [139, 146], E1: [100, 62], W1: [111, 81], E2: [140, 62], W2: [129, 81] }) },
    marcheAv: { alterne: true, bande: ['A1', 'A2', -3],
      a: { H: [124, 36], N: [122, 54], P: [118, 90], K1: [134, 114], A1: [132, 140], T1: [144, 146], K2: [106, 116], A2: [100, 140], T2: [111, 146], E1: [110, 70], W1: [116, 86], E2: [132, 72], W2: [142, 62] } },
    flexB: { bande: ['A1', 'A2', 0], a: o(DOS, { P: [102, 141], K1: [138, 140], A1: [172, 140], T1: [177, 132], K2: [136, 141], A2: [170, 141], T2: [175, 133] }), b: FX90 },
    flexC: { bande: ['A1', 'A2', 0], a: o(FX90, { K2: [136, 134], A2: [170, 128], T2: [175, 120] }), b: FX90 },
    flexD: { bande: ['A1', 'A2', 2],
      a: { H: [120, 26], N: [120, 44], P: [118, 84], K1: [120, 112], A1: [118, 140], T1: [130, 146], K2: [117, 112], A2: [115, 140], T2: [127, 146], E1: [128, 62], W1: [138, 46], E2: [124, 62], W2: [134, 46] },
      b: { H: [120, 26], N: [120, 44], P: [118, 84], K1: [146, 82], A1: [146, 110], T1: [158, 112], K2: [117, 112], A2: [115, 140], T2: [127, 146], E1: [128, 62], W1: [138, 46], E2: [124, 62], W2: [134, 46] } },
    fente6: { a: { H: [118, 30], N: [116, 48], P: [114, 86], K1: [134, 109], A1: [140, 138], T1: [152, 146], K2: [102, 113], A2: [80, 134], T2: [74, 146], E1: [124, 64], W1: [136, 56], E2: [106, 66], W2: [100, 82] }, b: F6B },
    fenteSaut: { alterne: true, a: F6B },
    curlS: { serviette: 'A1',
      a: o(DOS, { P: [96, 124], K1: [130, 130], A1: [166, 140], T1: [170, 130], K2: [126, 131], A2: [162, 141], T2: [166, 131] }),
      b: o(DOS, { P: [98, 116], K1: [132, 104], A1: [150, 140], T1: [156, 131], K2: [128, 104], A2: [146, 140], T2: [152, 131] }) },
    curlU: { serviette: 'A2',
      a: o(DOS, { P: [96, 124], K2: [130, 130], A2: [166, 140], T2: [170, 130], K1: [104, 90], A1: [134, 74], T1: [138, 64] }),
      b: o(DOS, { P: [98, 116], K2: [132, 104], A2: [150, 140], T2: [156, 131], K1: [106, 80], A1: [136, 64], T1: [140, 54] }) },
    nordique: { meuble: true,
      a: { H: [108, 48], N: [106, 66], P: [102, 106], K1: [100, 140], A1: [68, 142], T1: [60, 136], K2: [96, 140], A2: [64, 142], T2: [56, 136], E1: [116, 82], W1: [128, 76], E2: [112, 84], W2: [124, 78] },
      b: { H: [166, 82], N: [152, 92], P: [124, 116], K1: [100, 140], A1: [68, 142], T1: [60, 136], K2: [96, 140], A2: [64, 142], T2: [56, 136], E1: [160, 110], W1: [170, 124], E2: [156, 112], W2: [166, 126] } },
    lateraleB: { face: true, ballon: true,
      a: o(POSES.laterale.a, { E1: [108, 64], W1: [116, 80], E2: [132, 64], W2: [124, 80] }),
      b: o(POSES.laterale.b, { E1: [88, 84], W1: [80, 104], E2: [100, 86], W2: [88, 104] }) },
    croise: { face: true, a: POSES.laterale.b,
      b: { H: [120, 28], N: [120, 46], P: [120, 86], K1: [116, 113], A1: [130, 140], T1: [137, 146], K2: [124, 113], A2: [110, 140], T2: [103, 146], E1: [106, 64], W1: [100, 80], E2: [134, 64], W2: [140, 80] } }
  });
})();
(function () {
  const inv = p => { const q = Object.assign({}, p); [['K1', 'K2'], ['A1', 'A2'], ['T1', 'T2'], ['E1', 'E2'], ['W1', 'W2']].forEach(([x, y]) => { q[x] = p[y]; q[y] = p[x]; }); return q; };
  Object.values(POSES).forEach(p => { if (p.alterne) p.b = inv(p.a); });
})();
const g1 = v => v.toFixed(1);
const gLigne = (pts, cls) => `<polyline points="${pts.map(p => g1(p[0]) + ',' + g1(p[1])).join(' ')}" class="${cls}"/>`;
function dessinerPose(nom, e) {
  const d = POSES[nom] || POSES.course, q = {};
  for (const k in d.a) q[k] = [d.a[k][0] + (d.b[k][0] - d.a[k][0]) * e, d.a[k][1] + (d.b[k][1] - d.a[k][1]) * e];
  const loin = d.face ? 'n' : 'f';
  let s = '<line x1="8" y1="146.5" x2="232" y2="146.5" class="sol"/>';
  if (d.chaise) s += '<path d="M36 112H74M38 112V146M72 112V146M38 112V80" class="chaise"/>';
  if (d.banc) s += `<path d="M${d.banc[0]} 120H${d.banc[1]}M${d.banc[0] + 4} 120V146M${d.banc[1] - 4} 120V146" class="chaise"/>`;
  if (d.serviette) { const a = q[d.serviette]; s += `<line x1="${g1(a[0] - 9)}" y1="144" x2="${g1(a[0] + 12)}" y2="144" class="serviette"/>`; }
  s += gLigne([q.N, q.E2, q.W2], (d.appui ? 'f' : loin) + ' bras');
  s += gLigne([q.P, q.K2, q.A2, q.T2], loin + ' jb');
  s += gLigne([q.N, q.P], 'n tr');
  s += `<circle cx="${g1(q.H[0])}" cy="${g1(q.H[1])}" r="10" class="tete"/>`;
  s += gLigne([q.P, q.K1, q.A1, q.T1], 'n jb');
  s += gLigne([q.N, q.E1, q.W1], 'n bras');
  if (d.bande) { const [x, y, dy] = d.bande; s += `<line x1="${g1(q[x][0])}" y1="${g1(q[x][1] + dy)}" x2="${g1(q[y][0])}" y2="${g1(q[y][1] + dy)}" class="bande"/>`; }
  if (d.meuble) s += '<rect x="30" y="116" width="58" height="17" rx="3" class="meuble"/><line x1="35" y1="133" x2="35" y2="146" class="chaise"/>';
  if (d.ballon) s += `<circle cx="${g1((q.W1[0] + q.W2[0]) / 2)}" cy="${g1((q.W1[1] + q.W2[1]) / 2 + 4)}" r="8" class="ballon"/>`;
  return s;
}
const figure = (nom, v) => `<svg class="g-fig" viewBox="0 0 240 160" data-pose="${nom}" data-v="${v || 2.4}" aria-hidden="true">${dessinerPose(nom, 0)}</svg>`;
let G_ANIM = false;
function animerFigures(t) {
  const figs = document.querySelectorAll('#v-guide svg[data-pose], #v-prepa svg[data-pose]');
  if (!figs.length) { G_ANIM = false; return; }
  const calme = matchMedia('(prefers-reduced-motion: reduce)').matches;
  figs.forEach(svg => {
    const per = +svg.dataset.v, f = calme ? 0.5 : (t / 1000 % per) / per, tri = 1 - Math.abs(2 * f - 1);
    const x = Math.min(1, Math.max(0, (tri - 0.12) / 0.76));
    svg.innerHTML = dessinerPose(svg.dataset.pose, x * x * (3 - 2 * x));
  });
  requestAnimationFrame(animerFigures);
}
function lancerAnimations() { if (!G_ANIM) { G_ANIM = true; requestAnimationFrame(animerFigures); } }

// ---------- Niveaux (étape 3) : chaque groupe a sa lettre et sa dose, gardées dans Réglages (« nv-<cle> » = { l, d })
const LETTRES = 'ABCD';
const SUF = { cote: ['de chaque côté', 'par côté'], alt: ['en alternant', 'alternés'], dir: ['dans chaque direction', 'par direction'], ar: ['aller et retour', 'aller-retour'] };
const R = () => PREPA.renfo;
const GR = () => R().groupes;
function niveau(i) {
  const g = GR()[i], r = DB.reglages['nv-' + g.cle], v = r && !r.suppr && r.v;
  if (v && g.niveaux[v.l]) { const x = g.niveaux[v.l]; return { l: v.l, d: Math.min(x.max, Math.max(x.min, +v.d || x.min)) }; }
  return { l: 0, d: g.niveaux[0].min };
}
const exoG = i => GR()[i].niveaux[niveau(i).l];
const nbSeries = x => x.s2 ? R().seriesCourtes : R().series;
// Règle validée le 12/11 : Oui = + progression ; Oui au plafond = niveau suivant au bas de sa fourchette ; Non = identique
function suivant(i, v) {
  const g = GR()[i], x = g.niveaux[v.l];
  if (v.d < x.max) return { l: v.l, d: Math.min(x.max, v.d + (R().progression[x.u] || 2)), monte: false };
  if (v.l < g.niveaux.length - 1) return { l: v.l + 1, d: g.niveaux[v.l + 1].min, monte: true };
  return { l: v.l, d: x.max, monte: false, max: true };
}
const garderNiveau = (i, v) => enregistrer('reglages', { id: 'nv-' + GR()[i].cle, v: { l: v.l, d: v.d } });
const unite = (x, d) => x.u === 's' ? `${d} s` : x.u === 'p' ? `× ${d} pas` : `× ${d}`;
const doseTxt = (x, d) => unite(x, d) + (x.c ? ' ' + SUF[x.c][0] : '');
const court = (x, d) => `${nbSeries(x)} × ${d}${x.u === 's' ? ' s' : x.u === 'p' ? ' pas' : ''}`;

// ---------- Déroulé
const G = { actif: false, ecran: 'apercu', ex: 0, serie: 1, cote: 1, total: 0, fin: 0, reste: 0, marche: false, apres: null, tic: null, echI: 0, wl: null, son: null, rep: null, journal: {}, ouvert: -1 };
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const renfoFaitAujourdhui = () => { const r = DB.reglages['rf-' + auj()]; return !!(r && !r.suppr && r.v); };

// Son court et vibration à la fin d'un minuteur (le son n'est possible qu'après un toucher dans le guide)
function preparerSon() { try { if (!G.son) G.son = new (window.AudioContext || window.webkitAudioContext)(); if (G.son.state === 'suspended') G.son.resume(); } catch (e) { G.son = null; } }
function signal() {
  try { if (navigator.vibrate) navigator.vibrate([180, 90, 180]); } catch (e) { }
  if (!G.son) return;
  try {
    [0, 0.22].forEach(d => { const o = G.son.createOscillator(), g = G.son.createGain(), t = G.son.currentTime + d; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); g.connect(G.son.destination); o.start(t); o.stop(t + 0.18); });
  } catch (e) { }
}
// Écran du téléphone gardé allumé pendant le guide
async function garderEcran() { try { if (G.actif && 'wakeLock' in navigator && document.visibilityState === 'visible' && !G.wl) { G.wl = await navigator.wakeLock.request('screen'); G.wl.addEventListener('release', () => { G.wl = null; }); } } catch (e) { G.wl = null; } }
document.addEventListener('visibilitychange', () => { if (G.actif && document.visibilityState === 'visible') { garderEcran(); majChrono(); } });

// Minuteur calé sur l'heure (juste même si le téléphone ralentit l'appli)
function chrono(sec, apres) {
  arreterChrono(); G.total = sec; G.reste = sec; G.fin = Date.now() + sec * 1000; G.marche = true; G.apres = apres;
  G.tic = setInterval(majChrono, 250);
}
function arreterChrono() { clearInterval(G.tic); G.tic = null; G.marche = false; G.total = 0; G.apres = null; }
function pause() {
  if (!G.total) return;
  if (G.marche) { G.reste = Math.max(1, Math.ceil((G.fin - Date.now()) / 1000)); G.marche = false; }
  else { G.fin = Date.now() + G.reste * 1000; G.marche = true; }
  renderGuide();
}
function majChrono() {
  if (!G.total) return;
  if (G.marche) G.reste = Math.max(0, Math.ceil((G.fin - Date.now()) / 1000));
  if (G.marche && G.reste <= 0) { const f = G.apres; arreterChrono(); signal(); if (f) f(); return; }
  const fg = $('#g-rfg'), lab = $('#g-rlab');
  if (fg) fg.setAttribute('stroke-dashoffset', (2 * Math.PI * 52 * (1 - G.reste / G.total)).toFixed(1));
  if (lab) lab.textContent = G.ecran === 'exo' ? G.reste : mmss(G.reste);
  if (G.ecran === 'echauffement' && echIndex() !== G.echI) renderGuide();
}
const echIndex = () => Math.min(R().echauffement.length - 1, Math.floor((R().echauffementSec - G.reste) / (R().echauffementSec / R().echauffement.length)));
function anneau(cls, label, sous) {
  const c = 2 * Math.PI * 52, off = G.total ? c * (1 - G.reste / G.total) : 0;
  return `<div class="g-ring ${cls}"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="g-rfg" cx="60" cy="60" r="52" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg><div class="lab"><b id="g-rlab">${label}</b><span>${sous}</span></div></div>`;
}

function guideOuvrir() { G.actif = true; G.ecran = 'apercu'; G.ex = 0; G.serie = 1; G.cote = 1; G.rep = null; G.journal = {}; G.ouvert = -1; arreterChrono(); garderEcran(); }
function guideFermer() { arreterChrono(); G.actif = false; try { if (G.wl) G.wl.release(); } catch (e) { } G.wl = null; }
function allerG(ecran) {
  arreterChrono(); G.ecran = ecran; G.cote = 1;
  if (ecran === 'apercu') { G.ex = 0; G.serie = 1; G.journal = {}; }
  if (ecran === 'echauffement') chrono(R().echauffementSec, () => allerG('exo'));
  if (ecran === 'repos') chrono(R().repos, () => allerG('exo'));
  if (ecran === 'question') G.rep = null;
  if (ecran === 'fin' && !renfoFaitAujourdhui()) enregistrer('reglages', { id: 'rf-' + auj(), v: true });
  renderGuide(); window.scrollTo(0, 0); const v = $('#v-guide'); if (v) v.scrollTop = 0;
}
function serieFaite() { if (G.serie < nbSeries(exoG(G.ex))) { G.serie++; allerG('repos'); } else allerG('question'); }
function exoSuivant() { if (G.ex < GR().length - 1) { G.ex++; G.serie = 1; allerG('exo'); } else allerG('fin'); }
function repondre(oui) {
  const i = G.ex, avant = niveau(i), x = exoG(i), s = suivant(i, avant);
  if (oui && !s.max) garderNiveau(i, s);
  G.rep = { oui, monte: oui && s.monte, max: oui && !!s.max, avant, x };
  G.journal[i] = Object.assign({}, G.rep, { apres: niveau(i) });
  renderGuide();
}

function haut(n, txt) {
  const nb = GR().length + 1; let p = '';
  for (let i = 0; i < nb; i++) p += `<i class="${i < n ? 'done' : i === n ? 'now' : ''}"></i>`;
  return `<div class="g-top"><button type="button" class="g-quit" data-g="quitter" aria-label="Quitter le guide">×</button><div class="g-prog" style="--nb:${nb}" aria-hidden="true">${p}</div><span class="g-cnt">${txt}</span></div>`;
}
const badge = l => `<span class="g-lvl">Niveau ${LETTRES[l]}</span>`;
function vApercu() {
  const r = R(), n = GR().length, mats = [...new Set(GR().map((_, i) => exoG(i).mat).filter(Boolean))];
  const series = GR().reduce((t, _, i) => t + nbSeries(exoG(i)), 0);
  return `<div class="g-body g-pad">
    <div><p class="g-eye">Avant ta séance de course</p><h2 class="g-name g-xl">Renfo hanches et tronc</h2><p class="g-cons">Échauffement ${Math.round(r.echauffementSec / 60)} min puis ${n} exercices, ${series} séries. Repos de ${r.repos} s entre les séries.</p></div>
    <div class="g-chips"><span>Tapis</span>${mats.map(m => `<span>${esc(m)}</span>`).join('')}</div>
    ${renfoFaitAujourdhui() ? '<p class="g-mat g-okt">Déjà fait aujourd\'hui.</p>' : ''}
    <div class="g-list">
      <div class="g-li"><div class="g-th">${figure('course', 0.7)}</div><div class="g-nm">Échauffement<small>${r.echauffement.map(x => esc(x.nom.toLowerCase())).join(', ')}</small></div><span class="g-ds">${Math.round(r.echauffementSec / 60)} min</span></div>
      ${GR().map((g, i) => { const x = exoG(i), v = niveau(i); return `<div class="g-li"><div class="g-th">${figure(x.pose, x.v)}</div><div class="g-nm">${esc(x.nom)}<small>${esc(g.nom)} · niveau ${LETTRES[v.l]}</small></div><span class="g-ds">${court(x, v.d)}</span></div>`; }).join('')}
    </div>
    <div class="g-foot"><button type="button" class="g-big" data-g="echauffement">Démarrer l'échauffement</button><div class="g-row2"><button type="button" class="g-ghost" data-g="exo">Passer l'échauffement</button><button type="button" class="g-ghost" data-g="niveaux">Mes niveaux</button></div></div></div>`;
}
function vEchauffement() {
  const r = R(), i = echIndex(), m = r.echauffement[i]; G.echI = i;
  const part = r.echauffementSec / r.echauffement.length, partTxt = part % 60 ? `${Math.floor(part / 60)} min ${part % 60}` : `${part / 60} min`;
  return `${haut(0, 'Échauff.')}<div class="g-body">
    <div class="g-stage">${figure(m.pose, m.v)}<span class="g-tag">Échauffement</span></div>
    <div><p class="g-eye">Mouvement ${i + 1} sur ${r.echauffement.length} · environ ${partTxt}</p><h2 class="g-name">${esc(m.nom)}</h2><p class="g-cons">${esc(m.det)}</p></div>
    <div class="g-wrow">${anneau('small', mmss(G.reste), 'restant')}<div class="g-wl">${r.echauffement.map((x, k) => `<div class="${k < i ? 'done' : k === i ? 'now' : ''}"><i></i>${esc(x.nom)}</div>`).join('')}</div></div>
    <div class="g-foot"><div class="g-row2"><button type="button" class="g-ghost" data-g="pause">${G.marche ? 'Pause' : 'Reprendre'}</button><button type="button" class="g-ghost" data-g="ech-suiv">Mouvement suivant</button></div>
    <button type="button" class="g-big alt" data-g="exo">Passer aux exercices</button></div></div>`;
}
function vExo() {
  const n = GR().length, x = exoG(G.ex), v = niveau(G.ex), N = nbSeries(x), tenu = x.u === 's', minuteur = tenu && G.total > 0;
  const deuxCotes = tenu && x.c === 'cote', coteTxt = deuxCotes ? `, côté ${G.cote}` : '';
  const dots = [...Array(N)].map((_, k) => `<i class="${k + 1 < G.serie ? 'done' : k + 1 === G.serie ? 'now' : ''}"></i>`).join('');
  const val = tenu ? `${v.d}<small>s${deuxCotes ? ' par côté' : ''}</small>` : `× ${v.d}${x.u === 'p' ? '<small>pas</small>' : x.c ? `<small>${SUF[x.c][1]}</small>` : ''}`;
  const bouton = tenu ? (minuteur ? `<button type="button" class="g-big alt" data-g="pause">${G.marche ? 'Pause' : 'Reprendre'}</button>` : `<button type="button" class="g-big" data-g="go-sec">Démarrer ${v.d} s${coteTxt}</button>`) : '<button type="button" class="g-big" data-g="serie">Série faite</button>';
  return `${haut(G.ex + 1, `${G.ex + 1}/${n}`)}<div class="g-body">
    <div class="g-stage">${figure(x.pose, x.v)}<span class="g-tag">${esc(GR()[G.ex].nom)}</span></div>
    <div><h2 class="g-name">${esc(x.nom)}${badge(v.l)}</h2><p class="g-cons">${esc(x.consigne)}</p>${x.mat ? `<p class="g-mat">Matériel : ${esc(x.mat)}</p>` : ''}</div>
    ${minuteur ? `<div class="g-wrow">${anneau('small', G.reste, 'secondes' + coteTxt)}<div class="g-s">Série <b>${G.serie}</b> sur ${N}<div class="g-dots">${dots}</div></div></div>` : `<div class="g-dose"><div><div class="g-s">Série <b>${G.serie}</b> sur ${N}</div><div class="g-dots">${dots}</div></div><div class="g-v">${val}</div></div>`}
    <div class="g-foot">${bouton}<div class="g-row2"><button type="button" class="g-ghost" data-g="prec" ${G.ex === 0 ? 'disabled' : ''}>‹ Précédent</button><button type="button" class="g-ghost" data-g="suiv">Passer ›</button></div></div></div>`;
}
function vRepos() {
  const x = exoG(G.ex), n = GR().length;
  return `${haut(G.ex + 1, `${G.ex + 1}/${n}`)}<div class="g-body g-pad">
    <p class="g-eye g-c">Repos</p>
    ${anneau('', mmss(G.reste), 'avant la série ' + G.serie)}
    <div class="g-row2"><button type="button" class="g-ghost" data-g="moins">− 15 s</button><button type="button" class="g-ghost" data-g="plus">+ 15 s</button></div>
    <div class="g-li g-next"><div class="g-th">${figure(x.pose, x.v)}</div><div class="g-nm">Ensuite : série ${G.serie} sur ${nbSeries(x)}<small>${esc(x.nom)}</small></div><span class="g-ds">${doseTxt(x, niveau(G.ex).d)}</span></div>
    <div class="g-foot"><button type="button" class="g-big" data-g="exo">Passer le repos</button></div></div>`;
}
function vQuestion() {
  const i = G.ex, g = GR()[i], n = GR().length, r = G.rep, v = niveau(i), x = r ? r.x : exoG(i), lt = r ? r.avant.l : v.l;
  let bloc;
  if (!r) {
    const s = suivant(i, v);
    const siOui = s.monte ? `tu passes au niveau ${LETTRES[s.l]} (${esc(g.niveaux[s.l].nom.toLowerCase())})` : s.max ? 'tu restes au maximum' : `la prochaine fois, ${court(x, s.d)}`;
    bloc = `<div class="g-q"><h3>Toutes les séries faites proprement ?</h3><p>Oui : ${siOui}. Non : on garde ${court(x, v.d)}.</p>
      <div class="g-row2"><button type="button" class="g-big" data-g="oui">Oui</button><button type="button" class="g-big alt" data-g="non">Non</button></div></div>`;
  } else {
    const nx = g.niveaux[v.l];
    if (r.monte) bloc = `<div class="g-res lvl"><span class="k">Nouveau niveau</span><h3>Niveau ${LETTRES[v.l]} débloqué</h3><p>${esc(g.nom)} : ${court(x, r.avant.d)} faits proprement. La prochaine fois :</p>
        <div class="g-nx"><div class="g-th">${figure(nx.pose, nx.v)}</div><div><b>${esc(nx.nom)}</b><small>${court(nx, v.d)}${nx.c ? ' ' + SUF[nx.c][1] : ''}</small></div></div></div>`;
    else if (r.max) bloc = `<div class="g-res up"><span class="k">Niveau maximum</span><h3>Tu es au plafond</h3><p>${court(x, v.d)} au niveau ${LETTRES[v.l]} : c'est le haut du programme, on garde.</p></div>`;
    else if (r.oui) bloc = `<div class="g-res up"><span class="k">C'est noté</span><h3>${court(x, r.avant.d)} → ${court(x, v.d)}</h3><p>La prochaine fois, ${doseTxt(x, v.d)}.${v.d === x.max && v.l < g.niveaux.length - 1 ? ` Si ça passe encore proprement, niveau ${LETTRES[v.l + 1]}.` : ''}</p></div>`;
    else bloc = `<div class="g-res"><span class="k">C'est noté</span><h3>On garde ${court(x, v.d)}</h3><p>Même dose la prochaine fois. Rien ne baisse.</p></div>`;
    bloc += `<div class="g-foot"><button type="button" class="g-big" data-g="continuer">${i === n - 1 ? 'Terminer' : 'Exercice suivant'}</button><button type="button" class="g-lien" data-g="annuler">Annuler ma réponse</button></div>`;
  }
  return `${haut(i + 1, `${i + 1}/${n}`)}<div class="g-body g-pad">
    <div class="g-stage g-st2">${figure(x.pose, x.v)}<span class="g-tag">${esc(g.nom)}</span></div>
    <div><h2 class="g-name g-md">${esc(x.nom)}${badge(lt)}</h2></div>
    ${bloc}</div>`;
}
function vFin() {
  const j = G.journal, n = GR().length;
  const lignes = GR().map((g, i) => {
    const e = j[i];
    if (!e) { const x = exoG(i); return `<div class="g-li g-li2"><div class="g-nm">${esc(x.nom)}<small>passé, inchangé</small></div><span class="g-evo">${court(x, niveau(i).d)}</span></div>`; }
    const ev = e.monte ? `<span class="g-evo lvl">Niveau ${LETTRES[e.apres.l]}</span>` : e.oui && !e.max ? `<span class="g-evo up">${court(e.x, e.avant.d)} → ${e.apres.d}${e.x.u === 's' ? ' s' : ''}</span>` : `<span class="g-evo">= ${court(e.x, e.avant.d)}</span>`;
    return `<div class="g-li g-li2"><div class="g-nm">${esc(e.x.nom)}<small>niveau ${LETTRES[e.avant.l]}</small></div>${ev}</div>`;
  }).join('');
  const faits = Object.keys(j).length, montes = Object.values(j).filter(e => e.monte).length;
  return `${haut(n + 1, 'Fini')}<div class="g-body"><div class="g-fin"><div class="g-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h2>Renfo terminé</h2><p>${faits} exercice${faits > 1 ? 's' : ''} sur ${n}${montes ? `, ${montes} nouveau${montes > 1 ? 'x' : ''} niveau${montes > 1 ? 'x' : ''}` : ''}. C'est noté dans ta prépa. Bonne course.</p></div>
    <p class="g-eye">La prochaine fois</p>
    <div class="g-list">${lignes}</div>
    <div class="g-foot"><button type="button" class="g-big" data-g="quitter">Retour à la prépa</button><button type="button" class="g-ghost" data-g="niveaux">Mes niveaux</button></div></div>`;
}
function vNiveaux() {
  const pips = l => `<div class="g-pips" aria-label="Niveau ${LETTRES[l]}">${[...LETTRES].map((L, k) => `<i class="${k < l ? 'done' : k === l ? 'now' : ''}">${L}</i>`).join('')}</div>`;
  const rangs = GR().map((g, i) => {
    const v = niveau(i), x = g.niveaux[v.l], pc = x.max > x.min ? (v.d - x.min) / (x.max - x.min) * 100 : 100, ouvert = G.ouvert === i;
    let s = `<button type="button" class="g-nv" data-g="voir" data-i="${i}" aria-expanded="${ouvert}"><div class="g-th">${figure(x.pose, x.v)}</div>
      <div class="g-nm">${esc(g.nom)}<small>${esc(x.nom)} · ${court(x, v.d)}</small><div class="g-ligne">${pips(v.l)}<div class="g-barre"><i style="width:${Math.max(6, pc).toFixed(0)}%"></i></div></div></div></button>`;
    if (ouvert) s += `<div class="g-det">${g.niveaux.map((y, k) => `<div class="g-li${k > v.l ? ' g-avenir' : ''}"><div class="g-th">${figure(y.pose, y.v)}</div><div class="g-nm">${LETTRES[k]} · ${esc(y.nom)}<small>de ${court(y, y.min)} à ${court(y, y.max)}${y.c ? ' ' + SUF[y.c][1] : ''}</small>${y.mat ? `<span class="g-mat2">${esc(y.mat)}</span>` : ''}</div><span class="g-etat${k === v.l ? ' now' : ''}">${k < v.l ? 'Fait ✓' : k === v.l ? 'En cours' : 'À venir'}</span></div>`).join('')}
      <p class="g-note">Si un exercice fait mal ou devient trop facile, tu peux changer de niveau à la main.</p>
      <div class="g-row2"><button type="button" class="g-ghost" data-g="moins-niv" ${v.l === 0 ? 'disabled' : ''}>‹ Niveau ${LETTRES[Math.max(0, v.l - 1)]}</button><button type="button" class="g-ghost" data-g="plus-niv" ${v.l === g.niveaux.length - 1 ? 'disabled' : ''}>Niveau ${LETTRES[Math.min(g.niveaux.length - 1, v.l + 1)]} ›</button></div></div>`;
    return s;
  }).join('');
  return `<div class="g-top"><button type="button" class="g-quit" data-g="apercu" aria-label="Retour">‹</button><span class="g-titre">Mes niveaux</span></div><div class="g-body">
    <p class="g-regle">Chaque exercice a sa lettre. Quand toutes les séries passent proprement en haut de la fourchette, la lettre suivante se débloque et on repart du bas. Touche un exercice pour voir ses 4 niveaux.</p>
    <div class="g-list">${rangs}</div></div>`;
}
const VUES_G = { apercu: vApercu, echauffement: vEchauffement, exo: vExo, repos: vRepos, question: vQuestion, fin: vFin, niveaux: vNiveaux };
function renderGuide() {
  const v = $('#v-guide'); if (!v) return;
  if (!PREPA_OK || !PREPA.renfo || !PREPA.renfo.groupes) { v.innerHTML = '<div class="g-wrap"><p class="hint">Le programme n\'est pas chargé.</p></div>'; return; }
  if (!G.actif) guideOuvrir();
  v.innerHTML = `<div class="g-wrap">${(VUES_G[G.ecran] || vApercu)()}</div>`;
  lancerAnimations();
}
// Toucher dans le guide : renvoie vrai si c'était pour lui
function guideClic(t) {
  const b = t.closest('#v-guide [data-g]'); if (!b) return false;
  preparerSon();
  const a = b.dataset.g, r = R();
  if (a === 'quitter') { guideFermer(); location.hash = '#prepa'; }
  else if (a === 'pause') pause();
  else if (a === 'ech-suiv') { const part = r.echauffementSec / r.echauffement.length, i = echIndex() + 1; if (i >= r.echauffement.length) allerG('exo'); else { G.reste = Math.max(1, r.echauffementSec - i * part); G.fin = Date.now() + G.reste * 1000; renderGuide(); } }
  else if (a === 'serie') serieFaite();
  else if (a === 'go-sec') { const x = exoG(G.ex); chrono(niveau(G.ex).d, () => { if (x.c === 'cote' && G.cote === 1) { G.cote = 2; renderGuide(); } else { G.cote = 1; serieFaite(); } }); renderGuide(); }
  else if (a === 'moins') { G.reste = Math.max(1, G.reste - 15); G.fin = Date.now() + G.reste * 1000; majChrono(); }
  else if (a === 'plus') { G.reste += 15; G.total = Math.max(G.total, G.reste); G.fin = Date.now() + G.reste * 1000; majChrono(); }
  else if (a === 'oui' || a === 'non') repondre(a === 'oui');
  else if (a === 'annuler') { if (G.rep) { garderNiveau(G.ex, G.rep.avant); delete G.journal[G.ex]; G.rep = null; renderGuide(); } }
  else if (a === 'continuer' || a === 'suiv') exoSuivant();
  else if (a === 'prec') { G.ex = Math.max(0, G.ex - 1); G.serie = 1; allerG('exo'); }
  else if (a === 'voir') { const i = +b.dataset.i; G.ouvert = G.ouvert === i ? -1 : i; renderGuide(); }
  else if (a === 'moins-niv' || a === 'plus-niv') { const i = G.ouvert, g = GR()[i], l = niveau(i).l + (a === 'plus-niv' ? 1 : -1); if (g && g.niveaux[l]) { garderNiveau(i, { l, d: g.niveaux[l].min }); toast(`${g.nom} : niveau ${LETTRES[l]}`); renderGuide(); } }
  else if (VUES_G[a]) allerG(a);
  return true;
}
