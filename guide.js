'use strict';
// Guide du renfo hanches et tronc (Prépa backyard, étape 2) : écran plein (#guide) ouvert depuis la page Prépa.
// Aperçu → échauffement minuté → 8 exercices (séries, minuteur pour les exercices tenus, repos) → fin (renfo noté « rf-<jour> » dans les réglages).
// Le programme (exercices, doses, consignes) est dans prepa.js ; ici les silhouettes animées et le déroulé.
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
  s += gLigne([q.N, q.E2, q.W2], (d.appui ? 'f' : loin) + ' bras');
  s += gLigne([q.P, q.K2, q.A2, q.T2], loin + ' jb');
  s += gLigne([q.N, q.P], 'n tr');
  s += `<circle cx="${g1(q.H[0])}" cy="${g1(q.H[1])}" r="10" class="tete"/>`;
  s += gLigne([q.P, q.K1, q.A1, q.T1], 'n jb');
  s += gLigne([q.N, q.E1, q.W1], 'n bras');
  if (d.bande) { const [x, y, dy] = d.bande; s += `<line x1="${g1(q[x][0])}" y1="${g1(q[x][1] + dy)}" x2="${g1(q[y][0])}" y2="${g1(q[y][1] + dy)}" class="bande"/>`; }
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

// ---------- Déroulé
const G = { actif: false, ecran: 'apercu', ex: 0, serie: 1, total: 0, fin: 0, reste: 0, marche: false, apres: null, tic: null, echI: 0, wl: null, son: null };
const R = () => PREPA.renfo;
const doseTxt = x => x.sec ? `${x.sec} s` : `× ${x.reps}${x.cote ? ' de chaque côté' : x.alterne ? ' en alternant' : ''}`;
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

function guideOuvrir() { G.actif = true; G.ecran = 'apercu'; G.ex = 0; G.serie = 1; arreterChrono(); garderEcran(); }
function guideFermer() { arreterChrono(); G.actif = false; try { if (G.wl) G.wl.release(); } catch (e) { } G.wl = null; }
function allerG(ecran) {
  arreterChrono(); G.ecran = ecran;
  if (ecran === 'echauffement') chrono(R().echauffementSec, () => allerG('exo'));
  if (ecran === 'repos') chrono(R().repos, () => allerG('exo'));
  if (ecran === 'fin' && !renfoFaitAujourdhui()) enregistrer('reglages', { id: 'rf-' + auj(), v: true });
  renderGuide(); window.scrollTo(0, 0);
}
function serieFaite() { if (G.serie < R().series) { G.serie++; allerG('repos'); } else exoSuivant(); }
function exoSuivant() { if (G.ex < R().exercices.length - 1) { G.ex++; G.serie = 1; allerG('exo'); } else allerG('fin'); }

function haut(n, txt) {
  const nb = R().exercices.length + 1; let p = '';
  for (let i = 0; i < nb; i++) p += `<i class="${i < n ? 'done' : i === n ? 'now' : ''}"></i>`;
  return `<div class="g-top"><button type="button" class="g-quit" data-g="quitter" aria-label="Quitter le guide">×</button><div class="g-prog" style="--nb:${nb}" aria-hidden="true">${p}</div><span class="g-cnt">${txt}</span></div>`;
}
function vApercu() {
  const r = R(), mats = [...new Set(r.exercices.filter(x => x.mat).map(x => x.mat))];
  return `<div class="g-body g-pad">
    <div><p class="g-eye">Avant ta séance de course</p><h2 class="g-name g-xl">Renfo hanches et tronc</h2><p class="g-cons">Échauffement ${Math.round(r.echauffementSec / 60)} min puis ${r.exercices.length} exercices, environ 15 min. Repos de ${r.repos} s entre les séries.</p></div>
    <div class="g-chips"><span>Tapis</span>${mats.map(m => `<span>${esc(m)}</span>`).join('')}</div>
    ${renfoFaitAujourdhui() ? '<p class="g-mat g-okt">Déjà fait aujourd\'hui.</p>' : ''}
    <div class="g-list">
      <div class="g-li"><div class="g-th">${figure('course', 0.7)}</div><div class="g-nm">Échauffement<small>${r.echauffement.map(x => esc(x.nom.toLowerCase())).join(', ')}</small></div><span class="g-ds">${Math.round(r.echauffementSec / 60)} min</span></div>
      ${r.exercices.map(x => `<div class="g-li"><div class="g-th">${figure(x.pose)}</div><div class="g-nm">${esc(x.nom)}<small>${esc(x.groupe)} · niveau ${x.niveau}</small></div><span class="g-ds">${r.series} ${x.sec ? '× ' + x.sec + ' s' : '× ' + x.reps}</span></div>`).join('')}
    </div>
    <div class="g-foot"><button type="button" class="g-big" data-g="echauffement">Démarrer l'échauffement</button><button type="button" class="g-ghost" data-g="exo">Passer l'échauffement</button></div></div>`;
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
  const r = R(), x = r.exercices[G.ex], minuteur = x.sec && G.total > 0;
  const dots = [...Array(r.series)].map((_, k) => `<i class="${k + 1 < G.serie ? 'done' : k + 1 === G.serie ? 'now' : ''}"></i>`).join('');
  const bouton = x.sec ? (minuteur ? `<button type="button" class="g-big alt" data-g="pause">${G.marche ? 'Pause' : 'Reprendre'}</button>` : `<button type="button" class="g-big" data-g="go-sec">Démarrer ${x.sec} s</button>`) : '<button type="button" class="g-big" data-g="serie">Série faite</button>';
  return `${haut(G.ex + 1, `${G.ex + 1}/${r.exercices.length}`)}<div class="g-body">
    <div class="g-stage">${figure(x.pose)}<span class="g-tag">${esc(x.groupe)}</span></div>
    <div><h2 class="g-name">${esc(x.nom)}<span class="g-lvl">Niveau ${x.niveau}</span></h2><p class="g-cons">${esc(x.consigne)}</p>${x.mat ? `<p class="g-mat">Matériel : ${esc(x.mat)}</p>` : ''}</div>
    ${minuteur ? `<div class="g-wrow">${anneau('small', G.reste, 'secondes')}<div class="g-s">Série <b>${G.serie}</b> sur ${r.series}<div class="g-dots">${dots}</div></div></div>` : `<div class="g-dose"><div><div class="g-s">Série <b>${G.serie}</b> sur ${r.series}</div><div class="g-dots">${dots}</div></div><div class="g-v">${x.sec ? x.sec + '<small>s</small>' : '× ' + x.reps}${x.cote ? '<small>par côté</small>' : x.alterne ? '<small>alternés</small>' : ''}</div></div>`}
    <div class="g-foot">${bouton}<div class="g-row2"><button type="button" class="g-ghost" data-g="prec" ${G.ex === 0 ? 'disabled' : ''}>‹ Précédent</button><button type="button" class="g-ghost" data-g="suiv">Passer ›</button></div></div></div>`;
}
function vRepos() {
  const r = R(), x = r.exercices[G.ex];
  return `${haut(G.ex + 1, `${G.ex + 1}/${r.exercices.length}`)}<div class="g-body g-pad">
    <p class="g-eye g-c">Repos</p>
    ${anneau('', mmss(G.reste), 'avant la série ' + G.serie)}
    <div class="g-row2"><button type="button" class="g-ghost" data-g="moins">− 15 s</button><button type="button" class="g-ghost" data-g="plus">+ 15 s</button></div>
    <div class="g-li g-next"><div class="g-th">${figure(x.pose)}</div><div class="g-nm">Ensuite : série ${G.serie} sur ${r.series}<small>${esc(x.nom)}</small></div><span class="g-ds">${doseTxt(x)}</span></div>
    <div class="g-foot"><button type="button" class="g-big" data-g="exo">Passer le repos</button></div></div>`;
}
function vFin() {
  const r = R();
  return `${haut(r.exercices.length + 1, 'Fini')}<div class="g-body"><div class="g-fin"><div class="g-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
    <h2>Renfo terminé</h2><p>${r.exercices.length} exercices. C'est noté dans ta prépa. Bonne course.</p></div>
    <div class="g-list">${r.exercices.map(x => `<div class="g-li g-li2"><div class="g-nm">${esc(x.nom)}<small>niveau ${x.niveau}</small></div><span class="g-ds">${r.series} ${x.sec ? '× ' + x.sec + ' s' : '× ' + x.reps}</span></div>`).join('')}</div>
    <div class="g-foot"><button type="button" class="g-big" data-g="quitter">Retour à la prépa</button></div></div>`;
}
const VUES_G = { apercu: vApercu, echauffement: vEchauffement, exo: vExo, repos: vRepos, fin: vFin };
function renderGuide() {
  const v = $('#v-guide'); if (!v) return;
  if (!PREPA_OK || !PREPA.renfo) { v.innerHTML = '<div class="g-wrap"><p class="hint">Le programme n\'est pas chargé.</p></div>'; return; }
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
  else if (a === 'go-sec') { chrono(r.exercices[G.ex].sec, serieFaite); renderGuide(); }
  else if (a === 'moins') { G.reste = Math.max(1, G.reste - 15); G.fin = Date.now() + G.reste * 1000; majChrono(); }
  else if (a === 'plus') { G.reste += 15; G.total = Math.max(G.total, G.reste); G.fin = Date.now() + G.reste * 1000; majChrono(); }
  else if (a === 'suiv') exoSuivant();
  else if (a === 'prec') { G.ex = Math.max(0, G.ex - 1); G.serie = 1; allerG('exo'); }
  else if (VUES_G[a]) allerG(a);
  return true;
}
