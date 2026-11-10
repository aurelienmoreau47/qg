'use strict';
// QG d'Aurélien, étape 4 : notes, tâches, dossiers + Google Agenda (semaine, cours, prochain match) + Où je suis (lieux, week-ends libres)
// + planning repas (liens Jow, texte, captures et photos des plats).
// Tout ce qui est modifié est gardé dans l'appareil tout de suite, puis envoyé au Google Sheet dès que ça capte.
// Le Sheet renvoie tout : c'est comme ça que le téléphone et le PC restent pareils.

const URL_SCRIPT_EN_LIGNE = 'https://script.google.com/macros/s/AKfycbzVtXadj1IIZda8jBdQt4UlrqpFwWFppuB4TWmAGOj89XU1_zofTkBwOMnq7tU1ccYScQ/exec'; // adresse /exec du script Google (voir README)
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const URL_SCRIPT = LOCAL ? location.origin + '/exec' : URL_SCRIPT_EN_LIGNE;
const COLLS = ['dossiers', 'notes', 'reglages', 'repas'];

// ---------- stockage de l'appareil
const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem('qg-' + k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('qg-' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
};
// Le lien donné par le script finit par #k=CLÉ : on la garde, puis on l'efface de la barre d'adresse.
function lireCle(texte) { const m = String(texte || '').match(/[#&?]k=([A-Za-z0-9]{16,})/); return m ? m[1] : null; }
(function () { const k = lireCle(location.hash); if (k) { LS.set('cle', k); history.replaceState(null, '', location.pathname + location.search); } })();
let CLE = LS.get('cle', null);

const DB = Object.assign({ dossiers: {}, notes: {}, reglages: {}, repas: {} }, LS.get('db', {}));
const PEND = Object.assign({ dossiers: {}, notes: {}, reglages: {}, repas: {} }, LS.get('pend', {})); // éléments pas encore reçus par le Sheet : id -> heure de modif
const INFO = Object.assign({ t: 0 }, LS.get('sync', {}));
COLLS.forEach(c => Object.values(DB[c]).forEach(d => { if (d._neuf) delete DB[c][d.id]; })); // note ouverte puis appli fermée sans rien écrire
const SET = { theme: LS.get('theme', 'light') };
let stockageOK = true;
function persister() { stockageOK = LS.set('db', DB) && LS.set('pend', PEND); }

// ---------- petits outils
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const idNouveau = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOISC = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const memeJour = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
function quand(ms) { const d = new Date(ms); return memeJour(d, new Date()) ? `${pad(d.getHours())}h${pad(d.getMinutes())}` : `${d.getDate()} ${MOISC[d.getMonth()]}`; }
function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y) / 864e5 + 1) / 7); }
// Jours au format 2026-11-10 (heure de l'appareil)
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const jourDe = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = jourDe(s); d.setDate(d.getDate() + n); return iso(d); };
const lundiDe = s => { const d = jourDe(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
const auj = () => iso(new Date());
const ecart = (a, b) => Math.round((jourDe(b) - jourDe(a)) / 864e5);
const fmtCourt = s => { const d = jourDe(s); return `${JOURS[d.getDay()].slice(0, 3)}. ${d.getDate()} ${MOISC[d.getMonth()]}`; };
const hh = t => String(t || '').replace(':', 'h');
const plageTxt = (a, b) => { const x = jourDe(a), y = jourDe(b); return x.getMonth() === y.getMonth() ? `${x.getDate()} – ${y.getDate()} ${MOISC[y.getMonth()]}` : `${x.getDate()} ${MOISC[x.getMonth()]} – ${y.getDate()} ${MOISC[y.getMonth()]}`; };
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }

// Le texte des notes ne garde que la mise en forme simple (gras, italique, listes) : rien d'autre n'entre.
const BALISES = new Set(['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'DIV', 'UL', 'OL', 'LI', 'SPAN']);
function propre(html) {
  const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
  const racine = doc.body.firstChild;
  (function nettoyer(el) {
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.remove(); return; }
      if (!BALISES.has(n.tagName)) {
        if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'TEMPLATE'].includes(n.tagName)) { n.remove(); return; }
        nettoyer(n); n.replaceWith(...n.childNodes); return;
      }
      [...n.attributes].forEach(a => n.removeAttribute(a.name));
      nettoyer(n);
    });
  })(racine);
  return racine.innerHTML;
}
const texteDe = html => { const d = document.createElement('div'); d.innerHTML = propre(html); return d.textContent.trim(); };

// ---------- données
const vivants = c => Object.values(DB[c]).filter(d => !d.suppr && !d._neuf);
const dossiers = () => vivants('dossiers').sort((a, b) => (a.c || 0) - (b.c || 0) || String(a.n).localeCompare(String(b.n)));
const dossier = id => DB.dossiers[id] && !DB.dossiers[id].suppr ? DB.dossiers[id] : null;
const notes = () => Object.values(DB.notes).filter(n => !n.suppr && !n._neuf).sort((a, b) => b.maj - a.maj);
const fMode = id => (dossier(id) || {}).m;
const dossierNom = id => { const f = dossier(id); if (!f) return 'Sans dossier'; const p = f.p && dossier(f.p); return p ? `${p.n} › ${f.n}` : f.n; };
const notesEspace = () => notes().filter(n => (fMode(n.f) || 'perso') === S.mode);

function enregistrer(c, doc) {
  delete doc._neuf;
  doc.maj = Date.now();
  DB[c][doc.id] = doc;
  PEND[c][doc.id] = doc.maj;
  persister();
  if (!stockageOK) toast('Mémoire du téléphone pleine : la modification n\'est pas gardée hors ligne');
  planifier();
  renderSync();
}

// ---------- envoi et réception
const ST = { enCours: false, horsLigne: false, erreur: null, lien: false };
const nbAttente = () => COLLS.reduce((a, c) => a + Object.keys(PEND[c]).length, 0) + PH_ATT.length;
let planT;
function planifier(ms) { clearTimeout(planT); planT = setTimeout(synchroniser, ms == null ? 1500 : ms); }
async function appel(corps) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(URL_SCRIPT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corps), signal: ctl.signal });
    return JSON.parse(await r.text()); // une page d'erreur Google n'est pas du JSON : on retentera
  } finally { clearTimeout(to); }
}
async function synchroniser() {
  if (ST.enCours || !CLE || URL_SCRIPT === 'A_REMPLIR') { renderSync(); return; }
  ST.enCours = true; renderSync();
  const envoi = {}, envoyes = {};
  COLLS.forEach(c => {
    envoi[c] = Object.keys(PEND[c]).map(id => DB[c][id]).filter(Boolean);
    envoi[c].forEach(d => { envoyes[c + ':' + d.id] = d.maj; });
  });
  let encore = false;
  try {
    const r = await appel({ a: 'sync', k: CLE, docs: envoi });
    if (r && r.ok) {
      const finis = (r.recus || []).concat((r.refus || []).map(x => x.id));
      finis.forEach(cle => {
        const [c, id] = [cle.slice(0, cle.indexOf(':')), cle.slice(cle.indexOf(':') + 1)];
        if (PEND[c] && PEND[c][id] === envoyes[cle]) delete PEND[c][id]; // modifié pendant l'envoi : on le renverra
      });
      (r.refus || []).forEach(x => toast('Pas enregistré : ' + x.raison));
      COLLS.forEach(c => {
        const neuf = {};
        (r[c] || []).forEach(d => { neuf[d.id] = d; });
        Object.keys(PEND[c]).forEach(id => { if (DB[c][id]) neuf[id] = DB[c][id]; });
        Object.values(DB[c]).forEach(d => { if (d._neuf) neuf[d.id] = d; }); // note ouverte pas encore écrite
        DB[c] = neuf;
      });
      persister();
      INFO.t = Date.now(); LS.set('sync', INFO);
      Object.assign(ST, { horsLigne: false, erreur: null, lien: false });
      encore = nbAttente() - PH_ATT.length > 0;
      envoyerPhotos();
      rafraichir();
    } else if (r && r.code === 'lien') { ST.lien = true; ST.erreur = r.erreur; }
    else { ST.erreur = (r && r.erreur) || 'réponse inattendue du Sheet'; }
  } catch (e) { ST.horsLigne = true; }
  ST.enCours = false;
  renderSync();
  if (encore) planifier(300);
}
function renderSync() {
  const b = $('#sync'), n = nbAttente();
  let cls = '', txt;
  if (!CLE) { cls = 'err'; txt = 'Pas branché'; }
  else if (URL_SCRIPT === 'A_REMPLIR') { cls = 'err'; txt = 'Adresse du Sheet à régler'; }
  else if (ST.lien) { cls = 'err'; txt = 'Lien refusé'; }
  else if (ST.horsLigne) { cls = 'off'; txt = 'Hors ligne' + (n ? ` · ${n} en attente` : ''); }
  else if (ST.erreur) { cls = 'err'; txt = 'Sheet indisponible' + (n ? ` · ${n} en attente` : ''); }
  else if (ST.enCours) { cls = 'busy'; txt = 'Envoi…'; }
  else if (n) { cls = 'busy'; txt = `${n} à envoyer`; }
  else txt = INFO.t ? 'À jour' : 'Jamais synchronisé';
  b.className = 'sync ' + cls; $('#sync-t').textContent = txt;
  b.title = ST.erreur ? ST.erreur : (INFO.t ? `Dernière synchro : ${quand(INFO.t)}. Touche pour synchroniser.` : 'Touche pour synchroniser');
}

// ---------- Google Agenda
// Copie gardée dans l'appareil, par semaine (clé = lundi) : on lit l'agenda même sans réseau.
// Ajouter, modifier ou supprimer un événement demande le réseau (Google Agenda reste la référence).
const AG = Object.assign({ cals: [], sem: {} }, LS.get('ag', {}));
const AGS = { enCours: false, erreur: null, horsLigne: false, essai: 0 };
const ESPACES = { perso: 'Perso', raf: 'RAF', cours: 'Cours (accueil perso)', masque: 'Masqué' };
const VIEUX = 5 * 60e3; // au-delà, on redemande à Google
function espaceDefaut(c) {
  if (c.prim || c.n === '👀') return 'perso';
  if (/^raf$/i.test(String(c.n).trim())) return 'raf';
  if (/@import\.calendar\.google\.com$/.test(c.id)) return 'cours';
  return 'masque';
}
const regAgendas = () => { const r = DB.reglages.agendas; return (r && !r.suppr && r.v) || {}; };
const espaceDe = c => regAgendas()[c.id] || espaceDefaut(c);
const calInfo = id => AG.cals.find(c => c.id === id);
const calsDe = sp => AG.cals.filter(c => espaceDe(c) === sp).map(c => c.id);
const nomCal = c => !c ? 'Agenda' : c.prim ? 'Perso' : /@import\.calendar\.google\.com$/.test(c.id) && /^HYP\b/.test(c.n) ? 'Emploi du temps MBA' : c.n;
const evsSemaine = w => (AG.sem[w] || { evs: [] }).evs;
const dansSemaine = (e, w) => e.d <= addDays(w, 6) && (e.e || e.fd || e.d) >= w;
const evCle = e => e.cal + '|' + e.id + '|' + e.d;
const evOrdre = (a, b) => a.d.localeCompare(b.d) || (a.all ? 0 : 1) - (b.all ? 0 : 1) || String(a.s || '').localeCompare(String(b.s || ''));
function evOn(ds, cals) {
  return evsSemaine(lundiDe(ds)).filter(e => cals.includes(e.cal) && (e.all ? ds >= e.d && ds <= (e.e || e.d) : e.d === ds))
    .sort((a, b) => (a.all ? 0 : 1) - (b.all ? 0 : 1) || String(a.s || '').localeCompare(String(b.s || '')));
}
function aVenir(cals, n) {
  const t = auj(), vu = new Set(), out = [];
  Object.keys(AG.sem).sort().forEach(w => evsSemaine(w).forEach(e => {
    if (!cals.includes(e.cal) || e.d <= t || vu.has(evCle(e))) return;
    vu.add(evCle(e)); out.push(e);
  }));
  return out.sort(evOrdre).slice(0, n);
}
function garderAgenda() {
  const ref = lundiDe(auj());
  Object.keys(AG.sem).forEach(w => { if (w < addDays(ref, -28) || w > addDays(ref, 7 * 26)) delete AG.sem[w]; });
  if (!LS.set('ag', AG)) { AG.sem = {}; LS.set('ag', AG); }
}
async function chargerAgenda(lundi, nb) {
  if (!CLE || AGS.enCours || URL_SCRIPT === 'A_REMPLIR') return;
  AGS.enCours = true; AGS.essai = Date.now();
  try {
    const r = await appel({ a: 'agenda', k: CLE, de: lundi, jusqua: addDays(lundi, 7 * nb) });
    if (r && r.ok) {
      AG.cals = r.cals || [];
      for (let i = 0; i < nb; i++) { const w = addDays(lundi, 7 * i); AG.sem[w] = { t: r.t, evs: (r.evs || []).filter(e => dansSemaine(e, w)) }; }
      AG.t = r.t; garderAgenda();
      Object.assign(AGS, { erreur: null, horsLigne: false });
    } else if (r && r.code === 'lien') { ST.lien = true; ST.erreur = r.erreur; renderSync(); }
    else AGS.erreur = r && r.erreur === 'action inconnue' ? 'Le script Google doit être mis à jour pour l\'agenda (version qg 2).' : 'Agenda indisponible : ' + ((r && r.erreur) || 'réponse inattendue de Google');
  } catch (e) { AGS.horsLigne = true; }
  AGS.enCours = false;
  rafraichir();
}
// Au démarrage, au réveil et toutes les minutes : la semaine en cours et les 6 suivantes.
function agendaAJour() {
  const l = lundiDe(auj());
  if ([l, addDays(l, 7)].some(w => !AG.sem[w] || Date.now() - AG.sem[w].t > VIEUX)) chargerAgenda(l, 7);
}
function chargerSiBesoin(w) {
  if (AG.sem[w] && Date.now() - AG.sem[w].t < 2 * VIEUX) return;
  if (AGS.enCours || Date.now() - AGS.essai < 15000) return;
  setTimeout(() => chargerAgenda(w, 4), 0);
}
function agendaEtat() {
  if (AGS.erreur) return AGS.erreur;
  if (AGS.horsLigne) { const d = new Date(AG.t || 0); return AG.t ? `Hors ligne : agenda tel qu'il était le ${d.getDate()} ${MOISC[d.getMonth()]} à ${pad(d.getHours())}h${pad(d.getMinutes())}.` : 'Hors ligne : l\'agenda s\'affichera au retour du réseau.'; }
  return '';
}
const EVX = {}; // événements affichés, retrouvés au toucher
function evHTML(e) {
  const c = calInfo(e.cal) || {}, k = evCle(e);
  EVX[k] = e;
  const tag = c.ro ? 'div' : 'button', at = c.ro ? '' : ` type="button" data-ev="${esc(k)}" title="${e.rec ? 'Événement répété' : 'Modifier ou supprimer'}"`;
  const st = `--cc:${esc(c.c || '#8A96A3')}`;
  if (e.all) return `<${tag}${at} class="ev all" style="${st}">${esc(e.t)}${e.e ? `<small>jusqu'au ${fmtCourt(e.e)}</small>` : e.lieu ? `<small>${esc(e.lieu)}</small>` : ''}</${tag}>`;
  return `<${tag}${at} class="ev" style="${st}"><span class="dot"></span><span class="time">${hh(e.s)} – ${hh(e.f)}</span><span class="t">${esc(e.t)}${e.lieu ? `<small> · ${esc(e.lieu)}</small>` : ''}</span></${tag}>`;
}
function agendaBlock(sp, titre) {
  const cals = calsDe(sp), etat = agendaEtat();
  let corps;
  if (!AG.cals.length) corps = `<p class="empty">${esc(etat || 'Chargement de l\'agenda…')}</p>`;
  else {
    const today = evOn(auj(), cals), next = aVenir(cals, 5);
    corps = (today.length ? `<div class="row"><span class="when">Aujourd'hui</span><div class="evs">${today.map(evHTML).join('')}</div></div>` : '')
      + (next.length ? next.map(e => `<div class="row"><span class="when">${fmtCourt(e.d)}</span><div class="evs">${evHTML(e)}</div></div>`).join('') : '<p class="empty">Rien de prévu ces prochaines semaines.</p>');
  }
  return `<div class="block a-agenda"><div class="bh"><h2>${titre}</h2><a class="link" href="#agenda" data-wk-now>Semaine ›</a></div><div class="panel">${corps}</div>${etat && AG.cals.length ? `<p class="cmeta">${esc(etat)}</p>` : ''}</div>`;
}
function prochainMatch() {
  const t = auj(), cals = calsDe('raf'); let m = null;
  Object.values(AG.sem).forEach(s => s.evs.forEach(e => { if (cals.includes(e.cal) && /\bRAF x\b/i.test(e.t) && e.d >= t && (!m || e.d < m.d)) m = e; }));
  return m;
}
function matchBlock() {
  const m = prochainMatch(); if (!m) return '';
  const j = ecart(auj(), m.d);
  const det = ['Match à domicile', m.cat ? `catégorie ${m.cat}` : '', m.all ? '' : `coup d'envoi ${hh(m.s)}`].filter(Boolean).join(', ');
  return `<div class="match a-match"><span class="k">Prochain match à domicile</span><span class="t">${esc(m.t.replace(/^[^\p{L}\p{N}]+/u, ''))}</span><span class="d">${cap(fmtCourt(m.d))} · ${esc(det)}</span><span class="j">${j === 0 ? 'Jour J' : 'J-' + j}</span></div>`;
}
// « &Relation presse - MARTIN - MES5 26-27 » -> Relation presse, Martin
function coursTexte(t) {
  const p = String(t).split(' - ').map(x => x.trim());
  let mat = (p[0] || '').replace(/&/g, '').replace(/^Evaluation/i, 'Évaluation').trim();
  const prof = /^[A-ZÀ-Ý' -]+$/.test(p[1] || '') ? p[1].toLowerCase().replace(/(^|[ '-])\S/g, x => x.toUpperCase()) : (p[1] || '');
  const ev = /^Évaluation/.test(mat), memo = p.slice(3).join(' - ').replace(/&/g, '').replace(/ - .*$/, '').replace(/^eval\s*/i, '').trim();
  if (ev && memo) mat = 'Éval. ' + memo;
  return { mat, prof, ev };
}
function coursBlock() {
  const t = auj(), ws = lundiDe(t), cals = calsDe('cours');
  const evs = evsSemaine(ws).filter(e => cals.includes(e.cal) && !e.all);
  const days = [...Array(7)].map((_, i) => addDays(ws, i)).filter(d => evs.some(e => e.d === d));
  if (!days.length) return '';
  const sel = days.includes(S.cday) ? S.cday : days.includes(t) ? t : (days.find(d => d >= t) || days[0]);
  const nT = evs.filter(e => e.d === t).length;
  const nomJ = d => d === t ? 'Aujourd\'hui' : cap(fmtCourt(d));
  return `<div class="block a-cours"><div class="bh"><h2>${nT ? `Cours aujourd'hui · ${nT} séance${nT > 1 ? 's' : ''}` : 'Semaine de cours'}</h2></div>
    <div class="panel pad">
      <div class="ctabs" role="group" aria-label="Jour">${days.map(d => `<button type="button" data-cday="${d}" aria-pressed="${d === sel}">${d === t ? 'Aujourd\'hui' : cap(fmtCourt(d).replace(/ \S+$/, ''))}</button>`).join('')}</div>
      <div class="cdays" style="--n:${days.length}">${days.map(d => `<div class="cday${d === sel ? ' sel' : ''}${d === t ? ' is-today' : ''}"><h4>${nomJ(d)}</h4>${evs.filter(e => e.d === d).sort((a, b) => a.s.localeCompare(b.s)).map(e => {
        const c = coursTexte(e.t);
        return `<div class="course"><span class="time">${hh(e.s)} – ${hh(e.f)}</span><span class="t">${esc(c.mat)}${c.ev ? '<span class="chip">Éval</span>' : ''}</span>${c.prof ? `<span class="w">${esc(c.prof)}</span>` : ''}</div>`;
      }).join('')}</div>`).join('')}</div>
    </div></div>`;
}
function renderAgenda() {
  lieuxCtx();
  const vue = `<div class="seg" role="group" aria-label="Vue"><button type="button" data-ag="semaine" aria-pressed="${S.ag === 'semaine'}">Semaine</button><button type="button" data-ag="mois" aria-pressed="${S.ag === 'mois'}">Mois · Où je suis</button></div>`;
  $('#v-agenda').innerHTML = `<div class="block">${vue}${S.ag === 'mois' ? moisHTML() : semaineHTML()}</div>`;
}
function semaineHTML() {
  const ws = S.week, we = addDays(ws, 6), vis = calsDe(S.mode), t = auj();
  const charge = !!AG.sem[ws];
  chargerSiBesoin(ws);
  const etat = agendaEtat() || (!charge ? (AGS.enCours ? 'Chargement de la semaine…' : 'Semaine pas encore chargée.') : '');
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  return `
    <div class="wk-bar">
      <button class="btn" type="button" data-wk="-1" aria-label="Semaine précédente">‹</button>
      <div class="lbl"><strong>Semaine ${isoWeek(jourDe(ws))}</strong><span>${plageTxt(ws, we)}</span></div>
      <button class="btn" type="button" data-wk="1" aria-label="Semaine suivante">›</button>
      <button class="btn" type="button" data-wk="0">Aujourd'hui</button>
      <span class="sp"></span>
      <button class="btn primary" type="button" data-new="event">+ Événement</button>
    </div>
    <div class="legend">${vis.map(id => { const c = calInfo(id); return `<span style="--cc:${esc(c.c || '#8A96A3')}"><i></i>${esc(nomCal(c))}</span>`; }).join('') || '<span>Aucun agenda dans cet espace.</span>'}<button type="button" class="link" data-goset="set-agendas">Choisir les agendas ›</button></div>
    ${etat ? `<p class="notice">${esc(etat)}</p>` : ''}
    <div class="week">${days.map(d => {
      const evs = charge ? evOn(d, vis) : [], dd = jourDe(d), p = lieuDu(d);
      return `<section class="day${d === t ? ' today' : ''}${evs.length ? '' : ' empty'}"><h3><span>${cap(JOURS[dd.getDay()].slice(0, 3))}.</span><span class="num">${dd.getDate()}</span></h3>
        <div class="dbody"><button type="button" class="where" data-day="${d}" style="--pc:${esc(couleurLieu(p))}" title="Changer le lieu"><i${p.libre ? ' class="free"' : ''}></i>${esc(nomLieu(p))}</button>${evs.length ? `<div class="evs">${evs.map(evHTML).join('')}</div>` : `<p class="none">${charge ? 'Rien de prévu' : '…'}</p>`}</div></section>`;
    }).join('')}</div>`;
}

// ---------- Où je suis
// Gardé dans l'onglet « Réglages » du Sheet : « lieux » = la liste des lieux et le lieu par défaut,
// une ligne « ou-… » par période saisie. La saisie la plus récente gagne sur les jours qu'elle couvre.
const LIEUX_DEPART = { rodez: { n: 'Rodez', c: '#C4473A' }, urcisse: { n: 'St Urcisse', c: '#3F8F4F' }, mtp: { n: 'Montpellier', c: '#356FC4' }, leucate: { n: 'Port Leucate', c: '#C98F22' } };
const INIT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
function regLieux() {
  const r = DB.reglages.lieux, v = r && !r.suppr && r.v;
  return { l: (v && v.l) || LIEUX_DEPART, def: v && 'def' in v ? v.def : 'rodez' };
}
function garderLieux(l, def) { enregistrer('reglages', { id: 'lieux', v: { l, def } }); }
const periodes = () => Object.values(DB.reglages).filter(r => /^ou-/.test(r.id) && !r.suppr && r.v && r.v.d && r.v.e).sort((a, b) => (a.v.t || 0) - (b.v.t || 0));
// Contexte recalculé à chaque affichage : lieux, périodes, jours de match à domicile.
let CX = null;
function lieuxCtx() {
  const mj = new Set(), cals = calsDe('raf');
  Object.values(AG.sem).forEach(s => s.evs.forEach(e => { if (cals.includes(e.cal) && /\bRAF x\b/i.test(e.t)) mj.add(e.d); }));
  CX = Object.assign(regLieux(), { ps: periodes(), mj });
  return CX;
}
function lieuDu(ds) {
  const L = CX.l;
  for (let i = CX.ps.length - 1; i >= 0; i--) {
    const r = CX.ps[i].v;
    if (ds >= r.d && ds <= r.e && (r.p === 'libre' || L[r.p])) return r.p === 'libre' ? { libre: true } : { p: r.p };
  }
  const semaine = (jourDe(ds).getDay() + 6) % 7 < 5;
  if ((semaine || CX.mj.has(ds)) && L[CX.def]) return { p: CX.def, auto: true };
  return { libre: true, vide: true };
}
const nomLieu = p => p.libre ? 'Libre' : CX.l[p.p].n;
const couleurLieu = p => p.libre ? 'var(--ok)' : CX.l[p.p].c;
const nomCourt = n => n.length <= 5 ? n : n.slice(0, 4).trim() + '.';
const weLibre = d => lieuDu(d).libre && lieuDu(addDays(d, 1)).libre;
function prochainWeLibre(de) {
  for (let i = 0; i < 200; i++) {
    const d = addDays(de, i);
    if (jourDe(d).getDay() === 6 && weLibre(d)) {
      const a = jourDe(d), b = jourDe(addDays(d, 1));
      return `sam. ${a.getDate()}${a.getMonth() !== b.getMonth() ? ' ' + MOISC[a.getMonth()] : ''} – dim. ${b.getDate()} ${MOISC[b.getMonth()]}`;
    }
  }
  return 'aucun dans les 6 prochains mois';
}
function weLibresDuMois(ym) {
  const out = []; let d = ym + '-01';
  while (d.slice(0, 7) === ym) { if (jourDe(d).getDay() === 6 && weLibre(d)) out.push(plageTxt(d, addDays(d, 1))); d = addDays(d, 1); }
  return out;
}
function locBlock() {
  const t = auj(), now = lieuDu(t), days = [...Array(14)].map((_, i) => addDays(t, i));
  const vus = [...new Set(days.map(lieuDu).filter(p => !p.libre).map(p => p.p))];
  return `<div class="block a-loc"><div class="bh"><h2>Où je suis</h2><a class="link" href="#agenda" data-goto="mois">Voir le mois ›</a></div>
    <div class="panel pad">
      <p class="loc-now"><span>Aujourd'hui</span><strong style="color:${esc(couleurLieu(now))}">${esc(nomLieu(now))}</strong></p>
      <div class="strip">${days.map(d => {
        const p = lieuDu(d), dd = jourDe(d), lib = `${fmtCourt(d)} : ${esc(nomLieu(p))}${p.auto ? ' (par défaut)' : ''}`;
        return `<button type="button" class="sc${p.libre ? ' free' : ''}${p.auto ? ' auto' : ''}${d === t ? ' today' : ''}" data-day="${d}" style="--pc:${esc(couleurLieu(p))}" title="${lib}" aria-label="${lib}"><span>${INIT[dd.getDay()]}</span><b>${dd.getDate()}</b></button>`;
      }).join('')}</div>
      <div class="legend">${vus.map(k => `<span style="--cc:${esc(CX.l[k].c)}"><i></i>${esc(CX.l[k].n)}</span>`).join('')}<span><i class="free"></i>Libre</span></div>
      <p class="nf">Prochain week-end libre : <strong>${prochainWeLibre(t)}</strong></p>
    </div></div>`;
}
function moisHTML() {
  const ym = S.month, first = ym + '-01', start = lundiDe(first), t = auj();
  // Les jours de match viennent de l'agenda : on charge les semaines du mois affiché si besoin.
  const sems = [...Array(6)].map((_, i) => addDays(start, 7 * i));
  if (CLE && sems.some(w => !AG.sem[w] || Date.now() - AG.sem[w].t > 2 * VIEUX) && !AGS.enCours && Date.now() - AGS.essai > 15000) setTimeout(() => chargerAgenda(start, 6), 0);
  const fd = jourDe(first);
  let cells = '', d = start;
  for (let i = 0; i < 42; i++) {
    if (i % 7 === 0 && i > 0 && d.slice(0, 7) !== ym) break;
    const p = lieuDu(d), dd = jourDe(d), autre = d.slice(0, 7) !== ym, match = CX.mj.has(d);
    cells += `<button type="button" class="mcell${autre ? ' other' : ''}${p.libre ? ' free' : ''}${p.auto ? ' auto' : ''}${d === t ? ' today' : ''}${d < t ? ' past' : ''}" ${autre ? 'tabindex="-1" aria-hidden="true"' : `data-day="${d}"`} style="--pc:${esc(couleurLieu(p))}" aria-label="${cap(fmtCourt(d))} : ${esc(nomLieu(p))}${match ? ', match' : ''}">
      <span class="mn">${dd.getDate()}</span><span class="pl"><span class="long">${esc(nomLieu(p))}</span><span class="short">${esc(p.libre ? 'Libre' : nomCourt(nomLieu(p)))}</span></span>${match ? '<span class="mt">Match</span>' : ''}</button>`;
    d = addDays(d, 1);
  }
  const fw = weLibresDuMois(ym), def = CX.l[CX.def];
  return `<div class="mbar"><button class="btn" type="button" data-mo="-1" aria-label="Mois précédent">‹</button><strong>${cap(MOIS[fd.getMonth()])} ${fd.getFullYear()}</strong><button class="btn" type="button" data-mo="1" aria-label="Mois suivant">›</button><button class="btn" type="button" data-mo="0">Ce mois</button><span class="sp"></span><button class="btn primary" type="button" data-day="${t}">+ Lieu</button></div>
    <div class="legend">${Object.values(CX.l).map(p => `<span style="--cc:${esc(p.c)}"><i></i>${esc(p.n)}</span>`).join('')}<span><i class="free"></i>Libre</span><button type="button" class="link" data-goset="set-lieux">Gérer les lieux ›</button></div>
    <div class="panel pad"><div class="month">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span class="mh">${x}</span>`).join('')}${cells}</div></div>
    <div class="block"><h2>Week-ends libres en ${MOIS[fd.getMonth()]}</h2>${fw.length ? `<div class="freelist">${fw.map(x => `<span>${x}</span>`).join('')}</div>` : '<p class="cmeta">Aucun : tous tes week-ends sont pris.</p>'}</div>
    <p class="cmeta">Touche un jour pour dire où tu es. En semaine et les jours de match, sans rien de noté, l'appli te met à ${esc(def ? def.n : '…')} (en plus pâle). Un week-end sans rien de noté est libre.</p>`;
}
function openPlace(ds) {
  lieuxCtx();
  const p = lieuDu(ds), cur = p.auto || p.vide ? '' : p.libre ? 'libre' : p.p;
  $('#ov-add').hidden = true;
  $('#pl-d').value = ds; $('#pl-e').value = ds; $('#pl-err').hidden = true;
  $('#pl-list').innerHTML = Object.entries(CX.l).map(([k, v]) => `<label style="--pc:${esc(v.c)}"><input type="radio" name="pl" value="${esc(k)}" ${k === cur ? 'checked' : ''}><i></i>${esc(v.n)}</label>`).join('')
    + `<label class="free" style="--pc:var(--ok)"><input type="radio" name="pl" value="libre" ${cur === 'libre' ? 'checked' : ''}><i></i>Libre</label>`;
  $('#ov-place').hidden = false;
}
function fermerPlace() { $('#ov-place').hidden = true; }
function enregistrerPeriode(p, d, e) {
  // Les anciennes saisies entièrement recouvertes ne servent plus : on les retire pour garder le Sheet lisible.
  periodes().filter(r => r.v.d >= d && r.v.e <= e).forEach(r => { r.suppr = true; enregistrer('reglages', r); });
  enregistrer('reglages', { id: idNouveau('ou-'), v: { p, d, e, t: Date.now() } });
}

// ---------- Repas
// Un repas par case (id « 2026-11-10|soir »), synchronisé comme les notes (onglet Repas du Sheet).
// Les photos (capture de recette, photo du plat) sont réduites dans l'appareil, gardées dans sa mémoire
// (cache « qg-photos »), puis envoyées une par une à l'onglet Photos. Un autre appareil les demande au besoin.
const MOMENTS = { midi: 'Midi', soir: 'Soir' };
const repas = k => { const r = DB.repas[k]; return r && !r.suppr ? r : null; };
const FORK = '<svg class="fork" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v7a2 2 0 0 0 2 2v9M11 3v7a2 2 0 0 1-2 2M17 21V3c-2 1-3 4-3 7s1 4 3 4"/></svg>';
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
const TH = ['yellow', 'green', 'blue', 'pink', 'lilac', 'grey'];
const fondVignette = t => `var(--n-${TH[[...String(t || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % TH.length]})`;
const lienSur = u => /^https:\/\/(app\.jow\.com|(www\.)?jow\.fr)\//i.test(u || '');
const imageJowSure = u => /^https:\/\/static\.jow\.fr\/[\w/.-]+$/.test(u || '');

// --- photos
const PH = { mem: {}, enCours: {}, essai: {} };
let PH_ATT = LS.get('photosAtt', []);
const PH_CACHE = 'qg-photos';
const phCle = id => new URL('_photo/' + id, location.href).href;
async function phGarder(id, data) {
  PH.mem[id] = data;
  try { const c = await caches.open(PH_CACHE); await c.put(phCle(id), new Response(data)); return true; } catch (e) { return false; }
}
async function phLire(id) {
  if (PH.mem[id]) return PH.mem[id];
  try { const c = await caches.open(PH_CACHE), r = await c.match(phCle(id)); if (r) { const d = await r.text(); PH.mem[id] = d; return d; } } catch (e) { }
  return null;
}
async function phCharger(id) { // pour l'affichage : la mémoire de l'appareil, sinon le Sheet
  const d = await phLire(id); if (d) return d;
  if (!CLE || PH.enCours[id] || Date.now() - (PH.essai[id] || 0) < 60000) return null;
  PH.enCours[id] = true; PH.essai[id] = Date.now();
  let x = null;
  try { const r = await appel({ a: 'photo', k: CLE, id }); if (r && r.ok && /^data:image\//.test(r.data || '')) { await phGarder(id, r.data); x = r.data; } } catch (e) { }
  delete PH.enCours[id];
  return x;
}
function phImg(id) { const d = PH.mem[id]; return `<img class="ph" data-ph="${esc(id)}" alt=""${d ? ` src="${esc(d)}"` : ' hidden'}>`; }
function hydrater() {
  // L'écran peut être redessiné pendant le chargement : on met la photo sur toutes les images qui l'attendent.
  const ids = new Set([...document.querySelectorAll('img[data-ph][hidden]')].map(el => el.dataset.ph));
  ids.forEach(async id => {
    const d = await phCharger(id);
    if (d) document.querySelectorAll('img[data-ph][hidden]').forEach(el => { if (el.dataset.ph === id) { el.src = d; el.hidden = false; } });
  });
}
let phEnvoi = false;
async function envoyerPhotos() {
  if (phEnvoi || !PH_ATT.length || !CLE) return;
  phEnvoi = true;
  const retirer = id => { PH_ATT = PH_ATT.filter(x => x !== id); LS.set('photosAtt', PH_ATT); };
  for (const id of PH_ATT.slice()) {
    const data = await phLire(id);
    if (!data) { retirer(id); continue; } // photo perdue (mémoire du téléphone vidée) : rien à envoyer
    let r;
    try { r = await appel({ a: 'photoEnvoi', k: CLE, id, data }); } catch (e) { ST.horsLigne = true; break; }
    if (r && r.ok) retirer(id);
    else if (r && /illisible|lourde|valable/.test(r.erreur || '')) { retirer(id); toast('Photo refusée par le Sheet : ' + r.erreur); }
    else break; // le Sheet ne répond pas : on retentera à la prochaine synchro
  }
  phEnvoi = false; renderSync();
}
async function ajouterPhoto(id, data) {
  await phGarder(id, data);
  PH_ATT.push(id); LS.set('photosAtt', PH_ATT);
  planifier(300);
}
// Réduit une image (capture ou photo) avant de la garder : JPEG, plus grand côté limité.
function compresser(file, max, q) {
  return new Promise((ok, ko) => {
    if (!file) { ko(new Error('aucun fichier')); return; }
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const w = im.naturalWidth, h = im.naturalHeight; let s = Math.min(1, max / Math.max(w, h)), d = '';
      const cv = document.createElement('canvas');
      for (let i = 0; i < 6; i++) {
        cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
        d = cv.toDataURL('image/jpeg', q);
        if (d.length <= 600000) break;
        s *= 0.8; q = Math.max(0.5, q - 0.05);
      }
      URL.revokeObjectURL(u); ok(d);
    };
    im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('image illisible')); };
    im.src = u;
  });
}

// --- affichage
function repasHTML(m, k) {
  const pic = m.photo ? phImg(m.photo) : imageJowSure(m.jimg) ? `<img src="${esc(m.jimg)}" alt="" loading="lazy">` : m.img ? phImg(m.img) : '';
  const lbl = m.photo ? 'Changer ta photo du plat' : 'Ajouter ta photo du plat';
  const lien = lienSur(m.url);
  return `<div class="meal"><button type="button" class="thumb" data-photo="${esc(k)}" style="--th:${fondVignette(m.title)}" aria-label="${lbl}" title="${lbl}">${FORK}${pic}${m.photo ? '' : `<span class="cam">${CAM}</span>`}</button>
    <div class="mi"><strong>${esc(m.title)}</strong>${m.mm ? `<span class="mm">${esc(m.mm)}</span>` : ''}
      ${lien || m.img ? `<span class="acts">${lien ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">Ouvrir dans Jow ↗</a>` : ''}${m.img ? `<button type="button" data-view-img="${esc(k)}">Voir la capture</button>` : ''}</span>` : ''}</div>
    <span class="mbtns">${S.mDel === k ? '' : `<button type="button" class="icon-btn" data-meal-move="${esc(k)}" aria-label="Déplacer ce repas" title="Déplacer ce repas">${MOVE}</button>`}<button type="button" class="icon-btn del${S.mDel === k ? ' armed' : ''}" data-meal-del="${esc(k)}" aria-label="Retirer ce repas" title="Retirer ce repas">${S.mDel === k ? 'Retirer ?' : '×'}</button></span></div>`;
}
const MOVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 3 8l4 4"/><path d="M3 8h13"/><path d="m17 20 4-4-4-4"/><path d="M21 16H8"/></svg>';

// --- déplacer un repas : vers une case libre, ou échange avec le repas déjà en place
function openMove(k) {
  const m = repas(k); if (!m) return;
  S.mv = k;
  $('#mv-h').textContent = `Déplacer « ${m.title} »`;
  $('#mv-d').value = m.d; $('#mv-m').value = m.mo;
  majMove(); $('#ov-move').hidden = false;
}
function fermerMove() { $('#ov-move').hidden = true; S.mv = null; }
function majMove() {
  const to = $('#mv-d').value + '|' + $('#mv-m').value, b = repas(to), info = $('#mv-info');
  const meme = !$('#mv-d').value || to === S.mv;
  $('#mv-ok').disabled = meme;
  info.textContent = !$('#mv-d').value ? 'Choisis un jour.' : meme ? 'Choisis un autre jour ou un autre moment.' : b ? `Case prise : les deux repas échangeront leur place (« ${b.title} » ira au ${fmtCourt(S.mv.split('|')[0])}, ${S.mv.split('|')[1]}).` : 'Case libre.';
}
function deplacerRepas() {
  const from = S.mv, a = repas(from), d = $('#mv-d').value, mo = $('#mv-m').value === 'midi' ? 'midi' : 'soir', to = d + '|' + mo;
  if (!a || !d || to === from) return;
  const b = repas(to);
  const copie = (m, k) => { const c = JSON.parse(JSON.stringify(m)); const [cd, cm] = k.split('|'); c.id = k; c.d = cd; c.mo = cm; delete c.suppr; return c; };
  enregistrer('repas', copie(a, to));
  if (b) enregistrer('repas', copie(b, from));
  else { const v = DB.repas[from]; v.suppr = true; enregistrer('repas', v); }
  fermerMove(); render();
  toast(b ? `Échangé : ${a.title} ⇄ ${b.title}` : `${a.title} : ${fmtCourt(d)}, ${mo}`);
}
const caseRepas = (d, mo) => { const k = d + '|' + mo, m = repas(k); return m ? repasHTML(m, k) : `<button type="button" class="addslot" data-meal-add="${k}">+ ${MOMENTS[mo]}</button>`; };
function repasBlock() {
  const t = auj();
  return `<div class="block a-repas"><div class="bh"><h2>Repas du jour</h2><a class="link" href="#repas" data-rw-now>Planning repas ›</a></div>
    <div class="rtoday">${['midi', 'soir'].map(mo => `<div class="slot"><span class="sl">${MOMENTS[mo]}</span>${caseRepas(t, mo)}</div>`).join('')}</div></div>`;
}
function renderRepas() {
  lieuxCtx();
  const ws = S.rweek, t = auj(), days = [...Array(7)].map((_, i) => addDays(ws, i));
  const n = days.reduce((a, d) => a + (repas(d + '|midi') ? 1 : 0) + (repas(d + '|soir') ? 1 : 0), 0);
  $('#v-repas').innerHTML = `<div class="block">
    <div class="wk-bar">
      <button class="btn" type="button" data-rw="-1" aria-label="Semaine précédente">‹</button>
      <div class="lbl"><strong>Semaine ${isoWeek(jourDe(ws))}</strong><span>${plageTxt(ws, addDays(ws, 6))} · ${n} repas sur 14</span></div>
      <button class="btn" type="button" data-rw="1" aria-label="Semaine suivante">›</button>
      <button class="btn" type="button" data-rw="0">Cette semaine</button>
      <span class="sp"></span>
      <button class="btn primary" type="button" data-new="meal">+ Repas</button>
    </div>
    <p class="cmeta">Touche la vignette d'un repas pour y mettre la photo de ton plat.</p>
    <div class="rhead"><h2>Jour</h2><h2>Midi</h2><h2>Soir</h2></div>
    <div class="rdays">${days.map(d => {
      const p = lieuDu(d);
      return `<div class="rday${d === t ? ' today' : ''}"><div class="dl">${cap(fmtCourt(d))}<small>${esc(nomLieu(p))}</small></div>
        ${['midi', 'soir'].map(mo => `<div class="slot"><span class="sl">${MOMENTS[mo]}</span>${caseRepas(d, mo)}</div>`).join('')}</div>`;
    }).join('')}</div></div>`;
}

// --- fenêtre « Ajouter un repas »
function lienJow(txt) {
  const m = String(txt || '').match(/https?:\/\/[^\s"'<>«»]+/i);
  if (!m) return null;
  const u = m[0].replace(/[).,;!]+$/, '').replace(/^http:/i, 'https:');
  return lienSur(u) ? u : null;
}
function openRepas(k) {
  const [d, mo] = (k || `${auj()}|${new Date().getHours() < 15 ? 'midi' : 'soir'}`).split('|');
  $('#ov-add').hidden = true;
  $('#ml-form').reset(); $('#ml-d').value = d; $('#ml-m').value = mo;
  ['#ml-jow', '#ml-prev', '#ml-pprev', '#ml-err'].forEach(s => { $(s).hidden = true; });
  S.mimg = null; S.mphoto = null; S.mjow = null; S.mEnvoi = false; $('#ml-title').dataset.auto = '1';
  choixSource('jow'); majRemplace();
  $('#ov-meal').hidden = false;
}
function fermerRepas() { $('#ov-meal').hidden = true; S.mjow = null; }
function choixSource(t) {
  S.mt = t;
  document.querySelectorAll('[data-mt]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mt === t));
  document.querySelectorAll('[data-mp]').forEach(p => { p.hidden = p.dataset.mp !== t; });
  $('#ml-title').placeholder = t === 'jow' ? 'Rempli tout seul avec le lien' : t === 'img' ? 'Ex. : Curry de pois chiches' : 'Ex. : Restes, chez les parents, restau…';
}
function majRemplace() { const m = repas($('#ml-d').value + '|' + $('#ml-m').value), p = $('#ml-rempl'); p.hidden = !m; if (m) p.textContent = `Remplacera « ${m.title} ».`; }
let jowT;
function chercherJow() {
  const brut = $('#ml-url').value.trim(), url = lienJow(brut), box = $('#ml-jow');
  if (!url) {
    S.mjow = null;
    box.innerHTML = brut ? '<div class="mi"><strong>Pas de lien Jow ici</strong><span class="mm">Colle ce que l\'appli Jow a copié, ou un lien jow.fr.</span></div>' : '';
    box.hidden = !brut; return;
  }
  if (S.mjow && S.mjow.url === url) return;
  const j = S.mjow = { url, enCours: true };
  apercuJow();
  appel({ a: 'jow', k: CLE, url })
    .then(r => { if (r && r.ok) j.res = r; else j.err = (r && r.erreur === 'action inconnue') ? 'Le script Google doit être mis à jour (qg 3) : écris le nom du plat.' : ((r && r.erreur) || 'Jow n\'a pas répondu : écris le nom du plat.'); })
    .catch(() => { j.err = 'Pas de réseau : écris le nom du plat, le lien est gardé.'; })
    .then(() => { j.enCours = false; if (S.mjow === j) apercuJow(); });
}
function apercuJow() {
  const j = S.mjow, box = $('#ml-jow'); if (!j) { box.hidden = true; return; }
  const r = j.res;
  box.innerHTML = `<div class="thumb" style="--th:${fondVignette(r ? r.title : 'Jow')}">${FORK}${r && imageJowSure(r.img) ? `<img src="${esc(r.img)}" alt="">` : ''}</div>
    <div class="mi"><strong>${esc(r ? r.title : j.enCours ? 'Je cherche la recette…' : 'Lien Jow gardé')}</strong><span class="mm">${esc(r ? (r.mm || 'Recette Jow') : j.enCours ? 'Jow' : j.err)}</span></div>`;
  box.hidden = false;
  if (r && $('#ml-title').dataset.auto === '1') $('#ml-title').value = r.title;
}
async function enregistrerRepas() {
  if (S.mEnvoi) return;
  const d = $('#ml-d').value, mo = $('#ml-m').value === 'midi' ? 'midi' : 'soir', er = $('#ml-err');
  const err = msg => { er.textContent = msg; er.hidden = false; };
  let title = $('#ml-title').value.trim();
  if (!d) return err('Choisis un jour.');
  const m = { id: d + '|' + mo, d, mo };
  if (S.mt === 'jow') {
    const url = lienJow($('#ml-url').value);
    if (!url) return err('Je ne trouve pas de lien Jow dans ce que tu as collé.');
    const j = S.mjow && S.mjow.url === url ? S.mjow : null;
    if (j && j.enCours && !title) return err('Je cherche encore la recette : réessaie dans un instant.');
    m.url = url;
    if (j && j.res) { if (imageJowSure(j.res.img)) m.jimg = j.res.img; if (j.res.mm) m.mm = j.res.mm; title = title || j.res.title; }
    if (!title) { $('#ml-title').focus(); return err('Lien gardé, mais écris le nom du plat.'); }
  } else if (S.mt === 'img') {
    if (!S.mimg) return err('Choisis d\'abord une capture d\'écran.');
    title = title || 'Recette (capture)';
  } else {
    if (!title) return err('Écris ce que tu manges (ex. : Restes, chez les parents).');
    m.text = true;
  }
  m.title = title.slice(0, 150);
  S.mEnvoi = true;
  if (S.mt === 'img') { m.img = idNouveau('p'); await ajouterPhoto(m.img, S.mimg); }
  if (S.mphoto) { m.photo = idNouveau('p'); await ajouterPhoto(m.photo, S.mphoto); }
  S.mEnvoi = false;
  enregistrer('repas', m);
  fermerRepas(); S.rweek = lundiDe(d); render();
  toast(`${m.title} : ${fmtCourt(d)}, ${mo}`);
}
async function voirCapture(k) {
  const m = repas(k); if (!m || !m.img) return;
  const im = $('#img-big'); im.removeAttribute('src'); $('#img-msg').hidden = false; $('#img-msg').textContent = 'Chargement de la capture…';
  $('#ov-img').hidden = false;
  const d = await phCharger(m.img);
  if (d) { im.src = d; $('#img-msg').hidden = true; } else $('#img-msg').textContent = 'Capture pas encore disponible sur cet appareil (elle arrive avec le réseau).';
}

// ---------- fenêtre d'un événement (ajout, modification, suppression dans Google Agenda)
const EVF = { edit: null, delArm: false, envoi: false };
function calOptions(sel) {
  const ok = AG.cals.filter(c => !c.ro && (['perso', 'raf'].includes(espaceDe(c)) || c.id === sel));
  ok.sort((a, b) => (espaceDe(b) === S.mode ? 1 : 0) - (espaceDe(a) === S.mode ? 1 : 0));
  return ok.map(c => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${esc(nomCal(c))}${espaceDe(c) !== S.mode && ESPACES[espaceDe(c)] !== nomCal(c) ? ` · espace ${ESPACES[espaceDe(c)]}` : ''}</option>`).join('');
}
function majHeures() { const all = $('#ev-all').checked; $('#ev-hours').hidden = all; $('#ev-endday').hidden = !all; }
function openEv(e) {
  if (e && e.rec) { toast('Événement répété : modifie-le dans Google Agenda'); return; }
  if (!AG.cals.length) { toast('L\'agenda n\'est pas encore chargé : vérifie le réseau'); return; }
  $('#ov-add').hidden = true;
  EVF.edit = e || null; EVF.delArm = false;
  $('#ev-form').reset(); $('#ev-err').hidden = true;
  $('#ev-h').textContent = e ? 'Modifier l\'événement' : 'Nouvel événement dans Google Agenda';
  $('#ev-ok').textContent = e ? 'Enregistrer' : 'Ajouter à l\'agenda';
  const del = $('#ev-del'); del.hidden = !e; del.textContent = 'Supprimer'; del.classList.remove('danger');
  const defaut = e ? e.cal : (AG.cals.find(c => !c.ro && c.prim && espaceDe(c) === S.mode) || AG.cals.find(c => !c.ro && espaceDe(c) === S.mode) || {}).id;
  $('#ev-cal').innerHTML = calOptions(defaut);
  if (e) {
    $('#ev-title').value = e.t; $('#ev-date').value = e.d; $('#ev-all').checked = !!e.all;
    if (e.all) $('#ev-e').value = e.e || ''; else { $('#ev-start').value = e.s; $('#ev-end').value = e.f; }
  } else $('#ev-date').value = S.view === 'agenda' && S.week !== lundiDe(auj()) ? S.week : auj();
  majHeures();
  $('#ov-ev').hidden = false; setTimeout(() => $('#ev-title').focus(), 30);
}
function fermerEv() { $('#ov-ev').hidden = true; EVF.edit = null; EVF.delArm = false; }
async function envoyerEv(op) {
  if (EVF.envoi) return;
  const er = $('#ev-err'), e = EVF.edit; er.hidden = true;
  const c = { a: 'evt', k: CLE, op, cal: op === 'suppr' ? e.cal : $('#ev-cal').value };
  if (e) { c.id = e.id; c.calAvant = e.cal; }
  if (op !== 'suppr') {
    c.t = $('#ev-title').value.trim(); c.d = $('#ev-date').value; c.all = $('#ev-all').checked;
    if (c.all) { const fin = $('#ev-e').value; if (fin && fin !== c.d) c.e = fin; } else { c.s = $('#ev-start').value; c.f = $('#ev-end').value; }
    const msg = !c.t ? 'Écris un titre.' : !c.d ? 'Choisis un jour.' : !c.cal ? 'Choisis un agenda.'
      : c.all ? (c.e && c.e < c.d ? 'La date de fin doit être après le début.' : '') : (!c.s || !c.f || c.f <= c.s ? 'L\'heure de fin doit être après l\'heure de début.' : '');
    if (msg) { er.textContent = msg; er.hidden = false; return; }
  }
  const btn = op === 'suppr' ? $('#ev-del') : $('#ev-ok'), lib = btn.textContent;
  EVF.envoi = true; btn.textContent = 'Envoi…'; ['#ev-ok', '#ev-del'].forEach(s => { $(s).disabled = true; });
  let r;
  try { r = await appel(c); } catch (x) { r = { ok: false, erreur: 'Pas de réseau : rien n\'est parti. Réessaie quand ça capte.' }; }
  EVF.envoi = false; btn.textContent = lib; ['#ev-ok', '#ev-del'].forEach(s => { $(s).disabled = false; });
  if (!r || !r.ok) { er.textContent = (r && r.erreur) || 'Google n\'a pas répondu, réessaie.'; er.hidden = false; if (op === 'suppr') { EVF.delArm = false; btn.textContent = 'Supprimer'; btn.classList.remove('danger'); } return; }
  // La copie de l'appareil est corrigée tout de suite, Google renverra la version complète au prochain chargement.
  if (e) Object.values(AG.sem).forEach(s => { s.evs = s.evs.filter(x => !(x.id === e.id && x.cal === e.cal)); });
  if (r.ev) Object.keys(AG.sem).forEach(w => { if (dansSemaine(r.ev, w)) AG.sem[w].evs.push(r.ev); });
  garderAgenda();
  fermerEv();
  if (op === 'ajout') { S.week = lundiDe(r.ev.d); if (S.view !== 'agenda') { location.hash = 'agenda'; return toast(`Ajouté dans l'agenda ${nomCal(calInfo(c.cal))}`); } }
  render();
  toast(op === 'suppr' ? 'Supprimé de Google Agenda' : op === 'modif' ? 'Modifié dans Google Agenda' : `Ajouté dans l'agenda ${nomCal(calInfo(c.cal))}`);
}

// ---------- état de l'écran
const S = { mode: LS.get('mode', 'perso') === 'raf' ? 'raf' : 'perso', view: 'accueil', nt: 'tout', folder: 'all', q: '', open: null, delArm: false, fDel: null, week: lundiDe(auj()), cday: null, ag: 'semaine', month: auj().slice(0, 7), plDel: null, rweek: lundiDe(auj()), mDel: null, mt: 'jow', mimg: null, mphoto: null, mjow: null, mEnvoi: false, photoKey: null };
const PIN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-label="Épinglée"><path d="M16 3H8v2l1 1v5l-3 3v2h5v6l1 1 1-1v-6h5v-2l-3-3V6l1-1z"/></svg>';
const FLAG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H7v9z"/></svg>';
const FOLDER_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>';
const COLORS = [['default', 'Sans couleur'], ['grey', 'Gris bleu'], ['blue', 'Bleu'], ['pink', 'Rose'], ['yellow', 'Jaune'], ['green', 'Vert'], ['lilac', 'Lilas']];

function cardHTML(n, showFolder) {
  let body = '';
  if (n.type === 'list') {
    const items = n.items || [];
    // Aperçu seulement : on coche une tâche dans sa liste ouverte, jamais sur la carte (toucher la carte ouvre la liste).
    const open = items.map((it, i) => ({ it, i })).filter(o => !o.it.ok);
    const done = items.length - open.length;
    body = `<ul class="cl">${open.slice(0, 7).map(o => `<li><span class="ck"><i class="dot" aria-hidden="true"></i><span class="${o.it.urg ? 'u' : ''}">${esc(o.it.t)}</span>${o.it.urg ? `<span class="flag-i" title="Urgente">${FLAG}</span>` : ''}</span></li>`).join('')}</ul>`
      + (open.length > 7 ? `<p class="more">+ ${open.length - 7} autres</p>` : '')
      + (done ? `<p class="more">${done} terminée${done > 1 ? 's' : ''}</p>` : '')
      + (!items.length ? '<p class="more">Liste vide</p>' : '');
  } else body = `<div class="preview">${propre(n.html) || '<p class="more">Note vide</p>'}</div>`;
  return `<article class="card" tabindex="0" role="button" data-open="${n.id}" style="--nc:var(--n-${COLORS.some(c => c[0] === n.color) ? n.color : 'default'})"><header><h3>${esc(n.title || 'Sans titre')}</h3>${n.pin ? PIN : ''}</header>${body}${showFolder ? `<footer>${esc(dossierNom(n.f))}</footer>` : ''}</article>`;
}
function urgentBlock() {
  const items = [];
  notesEspace().filter(n => n.type === 'list').forEach(n => (n.items || []).forEach((it, i) => { if (it.urg && !it.ok) items.push({ n, it, i }); }));
  return `<div class="block a-urgent"><div class="bh"><h2>Tâches urgentes</h2>${items.length ? `<span class="cnt">${items.length}</span>` : ''}</div><div class="panel">${items.length ? `<ul class="urg">${items.map(o => `<li><label class="ck"><input type="checkbox" data-card="${o.n.id}" data-idx="${o.i}" aria-label="Fait : ${esc(o.it.t)}"><span>${esc(o.it.t)}</span></label><button type="button" class="link" data-open="${o.n.id}">${esc(o.n.title || 'Sans titre')}</button></li>`).join('')}</ul>` : '<p class="empty">Rien d\'urgent. Dans une liste de tâches, touche le drapeau d\'une tâche pour la faire remonter ici.</p>'}</div></div>`;
}
function pinsBlock(title) {
  const pinned = notesEspace().filter(n => n.pin);
  return `<div class="block a-pins"><h2>${title}</h2>${pinned.length ? `<div class="grid">${pinned.map(n => cardHTML(n, false)).join('')}</div>` : '<div class="empty-state"><strong>Aucune note épinglée</strong>Ouvre une note et touche l\'épingle pour la retrouver ici.</div>'}</div>`;
}
function renderAccueil() {
  if (S.mode === 'raf') {
    let last = '';
    const f = dossiers().filter(x => x.p && x.m === 'raf').slice(-1)[0];
    if (f) {
      const ns = notes().filter(n => n.f === f.id);
      last = `<div class="block a-last"><div class="bh"><h2>Dernier dossier de match · ${esc(f.n)}</h2><a class="link" href="#notes" data-gofolder="${f.id}">Dossier ›</a></div><div class="panel"><div class="mini-notes">${ns.map(n => `<button type="button" data-open="${n.id}">${esc(n.title || 'Sans titre')}<small>${quand(n.maj)}</small></button>`).join('') || '<p class="empty">Dossier vide.</p>'}</div></div></div>`;
    }
    $('#v-accueil').innerHTML = `<div class="home raf">${matchBlock()}${urgentBlock()}${agendaBlock('raf', 'Agenda RAF')}${last}${pinsBlock('Notes épinglées RAF')}</div>`;
    return;
  }
  // Ordre voulu : Où je suis, Cours, Tâches urgentes, Repas, Agenda perso, Notes épinglées
  lieuxCtx();
  const cours = coursBlock();
  $('#v-accueil').innerHTML = `<div class="home perso${cours ? ' has-cours' : ''}">${locBlock()}${cours}${urgentBlock()}${repasBlock()}${agendaBlock('perso', 'Agenda perso')}${pinsBlock('Notes épinglées')}</div>`;
}

function renderNotes() {
  const tout = S.nt === 'tout', type = S.nt === 'taches' ? 'list' : 'text';
  const mine = notesEspace(), mineT = tout ? mine.slice().sort((a, b) => (b.maj || 0) - (a.maj || 0)) : mine.filter(n => n.type === type);
  const fs = dossiers();
  const cnt = id => { const ids = [id, ...fs.filter(f => f.p === id).map(f => f.id)]; return mineT.filter(n => ids.includes(n.f)).length; };
  const tops = fs.filter(f => !f.p && f.m === S.mode);
  if (S.folder !== 'all' && fMode(S.folder) !== S.mode) S.folder = 'all';
  let fl = `<button type="button" data-folder="all" aria-pressed="${S.folder === 'all'}">Tous les dossiers <span class="c">${mineT.length}</span></button>`;
  tops.forEach(f => {
    fl += `<button type="button" data-folder="${f.id}" aria-pressed="${S.folder === f.id}">${esc(f.n)} <span class="c">${cnt(f.id)}</span></button>`;
    fs.filter(c => c.p === f.id).forEach(c => { fl += `<button type="button" class="child" data-folder="${c.id}" aria-pressed="${S.folder === c.id}">${esc(c.n)} <span class="c">${cnt(c.id)}</span></button>`; });
  });
  fl += '<button type="button" class="manage" data-goset="set-dossiers">Gérer les dossiers</button>';
  const q = S.q.trim().toLowerCase();
  let list, head = '', subs = '';
  if (q) {
    list = mineT.filter(n => (n.title + ' ' + (n.items || []).map(i => i.t).join(' ') + ' ' + texteDe(n.html)).toLowerCase().includes(q));
    head = `<div class="crumb"><h2>Recherche « ${esc(S.q)} » · ${list.length} résultat${list.length > 1 ? 's' : ''}</h2></div>`;
  } else if (S.folder === 'all') {
    list = mineT; head = `<div class="crumb"><h2>${tout ? 'Toutes les listes et notes' : S.nt === 'taches' ? 'Toutes les listes de tâches' : 'Toutes les notes'}</h2></div>`;
  } else {
    const f = dossier(S.folder); list = mineT.filter(n => n.f === S.folder);
    const parent = f.p && dossier(f.p);
    head = `<div class="crumb">${parent ? `<button type="button" data-folder="${parent.id}">${esc(parent.n)}</button><h2>›</h2>` : ''}<h2>${esc(f.n)}</h2></div>`;
    const kids = fs.filter(c => c.p === f.id);
    if (kids.length) subs = `<div class="subs">${kids.map(c => `<button type="button" data-folder="${c.id}">${FOLDER_IC}${esc(c.n)} <small>${cnt(c.id)}</small></button>`).join('')}</div>`;
  }
  const pin = list.filter(n => n.pin), rest = list.filter(n => !n.pin), showF = S.folder === 'all' || !!q;
  let grid;
  if (!list.length) grid = `<div class="empty-state"><strong>${q ? 'Rien trouvé' : 'Rien ici pour l\'instant'}</strong>${q ? 'Essaie un autre mot.' : `Touche ${tout ? '« + Liste » ou « + Note »' : `« + ${S.nt === 'taches' ? 'Liste de tâches' : 'Note'} »`} pour en créer une${S.folder !== 'all' ? ' dans ce dossier' : ''}.`}</div>`;
  else if (pin.length && rest.length) grid = `<h2>Épinglées à l'accueil</h2><div class="grid">${pin.map(n => cardHTML(n, showF)).join('')}</div><h2>Autres</h2><div class="grid">${rest.map(n => cardHTML(n, showF)).join('')}</div>`;
  else grid = `<div class="grid">${list.map(n => cardHTML(n, showF)).join('')}</div>`;
  const nT = mine.filter(n => n.type === 'list').length, nN = mine.filter(n => n.type === 'text').length;
  $('#v-notes').innerHTML = `<div class="notes">
    <div class="folders" role="group" aria-label="Dossiers">${fl}</div>
    <div class="notes-main">
      <div class="nbar"><div class="seg" role="group" aria-label="Type"><button type="button" data-nt="tout" aria-pressed="${tout}">Tout <small>${nT + nN}</small></button><button type="button" data-nt="taches" aria-pressed="${S.nt === 'taches'}">Tâches <small>${nT}</small></button><button type="button" data-nt="notes" aria-pressed="${S.nt === 'notes'}">Notes <small>${nN}</small></button></div>
        ${tout ? '<span class="nbtns"><button class="btn primary" type="button" data-new="list">+ Liste</button><button class="btn primary" type="button" data-new="text">+ Note</button></span>' : `<button class="btn primary" type="button" data-new="${type}">+ ${S.nt === 'taches' ? 'Liste de tâches' : 'Note'}</button>`}</div>
      <label class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="q" type="search" placeholder="Chercher dans les ${tout ? 'notes et tâches' : S.nt === 'taches' ? 'tâches' : 'notes'} ${S.mode === 'raf' ? 'RAF' : 'perso'}" value="${esc(S.q)}" autocomplete="off"></label>
      ${head}${subs}${grid}
    </div></div>`;
}

function renderParams() {
  const theme = `<section class="set-sec" id="set-theme"><h3>Apparence</h3>
    <div class="seg" role="group" aria-label="Thème">${[['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']].map(([k, l]) => `<button type="button" data-theme-set="${k}" aria-pressed="${SET.theme === k}">${l}</button>`).join('')}</div>
    <p class="cmeta">Automatique suit le réglage de ton téléphone ou de ton PC. Ce choix est gardé sur cet appareil.</p></section>`;
  const L = lieuxCtx();
  const lieux = `<section class="set-sec" id="set-lieux"><h3>Lieux</h3>
    <p class="cmeta">Les lieux proposés dans « Où je suis ». Le lieu par défaut remplit les jours de semaine et les jours de match où tu n'as rien noté. Ce choix vaut pour le téléphone et le PC.</p>
    <div class="set-rows">${Object.entries(L.l).map(([k, p]) => `<div class="set-row">
      <input type="color" value="${esc(p.c)}" data-pl-color="${esc(k)}" aria-label="Couleur de ${esc(p.n)}">
      <input class="in" value="${esc(p.n)}" data-pl-name="${esc(k)}" maxlength="40" aria-label="Nom du lieu">
      <label class="chk"><input type="radio" name="defp" value="${esc(k)}" ${L.def === k ? 'checked' : ''}> Par défaut</label>
      <button type="button" class="btn small${S.plDel === k ? ' danger' : ''}" data-pl-del="${esc(k)}" ${L.def === k ? 'disabled title="Choisis d\'abord un autre lieu par défaut"' : ''}>${S.plDel === k ? (L.ps.some(r => r.v.p === k) ? 'Confirmer (ses jours notés redeviennent vides)' : 'Confirmer') : 'Supprimer'}</button></div>`).join('')}
      <form class="set-row" id="pl-add"><input type="color" value="#7C8794" id="pa-c" aria-label="Couleur du nouveau lieu"><input class="in" id="pa-n" maxlength="40" placeholder="Nouveau lieu (ex. : Toulouse)" autocomplete="off" aria-label="Nom du nouveau lieu"><button class="btn primary small" type="submit">Ajouter</button></form>
    </div></section>`;
  const agendas = `<section class="set-sec" id="set-agendas"><h3>Agendas Google</h3>
    <p class="cmeta">Choisis où chaque agenda apparaît. « Cours » alimente seulement le bloc des cours de l'accueil perso, les semaines où tu as cours. Ce choix vaut pour le téléphone et le PC.</p>
    ${AG.cals.length ? `<div class="set-rows">${AG.cals.map(c => `<div class="set-row"><span class="nm" style="--cc:${esc(c.c || '#8A96A3')}"><i></i>${esc(nomCal(c))}${c.ro ? ' <small>· lecture seule</small>' : ''}</span>
      <select data-cal-sp="${esc(c.id)}" aria-label="Où afficher ${esc(nomCal(c))}">${Object.entries(ESPACES).map(([v, l]) => `<option value="${v}" ${espaceDe(c) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`).join('')}</div>`
      : `<p class="cmeta">${esc(agendaEtat() || 'Agendas pas encore chargés.')}</p>`}</section>`;
  const fs = dossiers();
  const fRows = m => fs.filter(f => !f.p && f.m === m).map(f => [f, ...fs.filter(c => c.p === f.id)]).flat().map(f => {
    const nb = notes().filter(n => n.f === f.id).length;
    const parents = fs.filter(x => !x.p && x.m === m && x.id !== f.id);
    const hasKids = fs.some(c => c.p === f.id);
    return `<div class="set-row${f.p ? ' child' : ''}"><input class="in" value="${esc(f.n)}" data-f-name="${f.id}" aria-label="Nom du dossier">
      <select data-f-parent="${f.id}" aria-label="Ranger dans" ${hasKids ? 'disabled title="Ce dossier contient des sous-dossiers"' : ''}><option value="">Dossier principal</option>${parents.map(p => `<option value="${p.id}" ${f.p === p.id ? 'selected' : ''}>dans ${esc(p.n)}</option>`).join('')}</select>
      <span class="cmeta">${nb} élément${nb > 1 ? 's' : ''}</span>
      <button type="button" class="btn small${S.fDel === f.id ? ' danger' : ''}" data-f-del="${f.id}">${S.fDel === f.id ? (nb ? 'Confirmer (contenu déplacé)' : 'Confirmer') : 'Supprimer'}</button></div>`;
  }).join('') || '<p class="cmeta">Aucun dossier.</p>';
  const dossiersSec = `<section class="set-sec" id="set-dossiers"><h3>Dossiers des notes et tâches</h3>
    <p class="cmeta">Renomme, range un dossier dans un autre ou supprime-le. Ce qu'il contient part dans le dossier au-dessus.</p>
    <h4>Perso</h4><div class="set-rows">${fRows('perso')}</div>
    <h4>RAF</h4><div class="set-rows">${fRows('raf')}</div>
    <form class="set-row" id="f-add"><input class="in" id="fa-n" placeholder="Nouveau dossier" autocomplete="off" aria-label="Nom du nouveau dossier">
      <select id="fa-p" aria-label="Où le créer">${['perso', 'raf'].map(m => `<option value="${m}|">${m === 'raf' ? 'RAF' : 'Perso'} · dossier principal</option>${fs.filter(f => !f.p && f.m === m).map(f => `<option value="${m}|${f.id}">${m === 'raf' ? 'RAF' : 'Perso'} · dans ${esc(f.n)}</option>`).join('')}`).join('')}</select>
      <button class="btn primary small" type="submit">Créer</button></form></section>`;
  const n = nbAttente();
  const syncSec = `<section class="set-sec" id="set-sync"><h3>Synchronisation</h3>
    <p class="cmeta">${INFO.t ? `Dernière synchro réussie : ${quand(INFO.t)}.` : 'Pas encore synchronisé.'} ${n ? `${n} modification${n > 1 ? 's' : ''} en attente d'envoi.` : 'Rien en attente.'}</p>
    <p class="cmeta">Tes notes sont gardées dans ce téléphone ou ce PC et dans ton Google Sheet « QG d'Aurélien ». Sans réseau, tu peux tout lire, cocher et écrire : l'envoi se fait au retour du réseau.</p>
    <div class="set-row"><button type="button" class="btn primary small" data-sync-now>Synchroniser maintenant</button></div></section>`;
  $('#v-parametres').innerHTML = `<div class="set">${theme}${lieux}${agendas}${dossiersSec}${syncSec}</div>`;
}

function renderSetup() {
  $('#v-setup').innerHTML = `<form class="setup panel pad" id="setup-form">
    <p>Pour brancher l'appli sur ton Google Sheet, ouvre une fois le lien donné par le script (il finit par <b>#k=</b> suivi d'une longue suite de lettres et de chiffres), ou colle-le ici.</p>
    <input class="in" id="setup-in" placeholder="Colle le lien ici" autocomplete="off">
    <div><button class="btn primary" type="submit">Brancher</button></div></form>`;
}

const VIEWS = ['accueil', 'agenda', 'repas', 'notes', 'parametres'];
function render() {
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
  document.documentElement.setAttribute('data-sp', S.mode);
  const setup = !CLE;
  $('#v-setup').hidden = !setup;
  VIEWS.forEach(v => { $('#v-' + v).hidden = setup || S.view !== v; });
  document.querySelectorAll('[data-view]').forEach(a => { if (a.dataset.view === S.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const sp = S.mode === 'raf' ? 'Espace RAF' : 'Espace perso';
  const now = new Date();
  $('#foot').textContent = INFO.t ? `Dernière synchro : ${quand(INFO.t)}` : '';
  if (setup) { $('#h1').textContent = 'Bienvenue'; $('#sub').textContent = 'Une seule fois par appareil'; renderSetup(); return; }
  if (S.view === 'accueil') { $('#h1').textContent = cap(`${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]}`); $('#sub').textContent = `${sp} · semaine ${isoWeek(now)}`; renderAccueil(); }
  if (S.view === 'agenda') { $('#h1').textContent = 'Agenda'; $('#sub').textContent = `${sp} · Google Agenda`; renderAgenda(); }
  if (S.view === 'repas') { $('#h1').textContent = 'Repas'; $('#sub').textContent = 'Planning de la semaine'; renderRepas(); }
  if (S.view === 'notes') {
    $('#h1').textContent = 'Notes et tâches'; $('#sub').textContent = sp;
    const had = document.activeElement && document.activeElement.id === 'q', pos = had ? document.activeElement.selectionStart : 0;
    renderNotes();
    if (had) { const i = $('#q'); i.focus(); i.setSelectionRange(pos, pos); }
  }
  if (S.view === 'parametres') {
    $('#h1').textContent = 'Paramètres'; $('#sub').textContent = 'Thème, lieux, agendas, dossiers et synchronisation';
    if (!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#v-parametres'))) renderParams();
  }
  hydrater();
}
// Après une synchro : on redessine sans déranger ce qui est en cours de saisie.
function rafraichir() {
  purgerTerminees();
  const a = document.activeElement;
  if (a && a.closest && (a.closest('#v-parametres') || a.id === 'q')) { renderSync(); return; }
  render();
  if (S.open && !note()) { S.open = null; $('#ov-editor').hidden = true; }
}

// ---------- éditeur de note ou de liste
const note = () => (S.open ? DB.notes[S.open] : null);
const touch = n => enregistrer('notes', n);
const GRIP = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

// Une tâche cochée garde l'heure où elle l'a été : au bout de 7 jours elle disparaît de sa liste.
const SEPT_JOURS = 7 * 86400000;
function cocher(it, ok) { if (!it) return; it.ok = ok; if (ok) it.okT = Date.now(); else delete it.okT; }
function purgerTerminees() {
  const now = Date.now();
  Object.values(DB.notes).forEach(n => {
    if (n.suppr || n._neuf || n.type !== 'list' || !Array.isArray(n.items) || n.id === S.open) return;
    let change = false;
    // Déjà cochée avant cette version (sans heure) : le compte des 7 jours démarre maintenant.
    n.items.forEach(it => { if (it.ok && !it.okT) { it.okT = now; change = true; } });
    const garde = n.items.filter(it => !(it.ok && now - it.okT >= SEPT_JOURS));
    if (garde.length !== n.items.length) { n.items = garde; change = true; }
    if (change) enregistrer('notes', n);
  });
}

// Classer les tâches : appui sur la poignée, on fait glisser la ligne, l'ordre est gardé au lâcher.
let DRAG = null;
document.addEventListener('pointerdown', e => {
  const g = e.target.closest && e.target.closest('[data-grip]'); if (!g) return;
  const li = g.closest('li'), ul = li && li.parentNode, n = note(); if (!li || !n) return;
  e.preventDefault();
  DRAG = { li, ul, n, id: e.pointerId, y: e.clientY };
  li.classList.add('drag'); ul.classList.add('dragging');
  try { g.setPointerCapture(e.pointerId); } catch (err) { }
});
document.addEventListener('pointermove', e => {
  if (!DRAG || e.pointerId !== DRAG.id) return;
  e.preventDefault();
  const { li, ul } = DRAG, y = e.clientY;
  const autres = [...ul.children].filter(x => x !== li);
  const apres = autres.find(x => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
  if (apres) { if (li.nextSibling !== apres) ul.insertBefore(li, apres); } else if (ul.lastChild !== li) ul.appendChild(li);
  // Faire défiler la fenêtre de la liste quand on approche du bord.
  const box = $('#ed-body'); if (box) { const r = box.getBoundingClientRect(); if (y < r.top + 40) box.scrollTop -= 12; else if (y > r.bottom - 40) box.scrollTop += 12; }
}, { passive: false });
function finDrag(e) {
  if (!DRAG || (e && e.pointerId !== DRAG.id)) return;
  const { li, ul, n } = DRAG; DRAG = null;
  li.classList.remove('drag'); ul.classList.remove('dragging');
  const ordre = [...ul.querySelectorAll('[data-row]')].map(x => +x.dataset.row);
  const avant = n.items.map((it, i) => i).filter(i => !n.items[i].ok);
  if (ordre.join() === avant.join()) return;
  n.items = [...ordre.map(i => n.items[i]), ...n.items.filter(it => it.ok)];
  touch(n); renderEditor();
}
document.addEventListener('pointerup', finDrag);
document.addEventListener('pointercancel', finDrag);

// Glisser le doigt à gauche ou à droite dans l'Agenda et les Repas : semaine (ou mois) suivante ou précédente.
let SW = null;
document.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { SW = null; return; }
  const z = e.target.closest && e.target.closest('#v-agenda, #v-repas');
  if (!z || e.target.closest('input, textarea, select, [contenteditable], .seg, .ctabs')) { SW = null; return; }
  SW = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), z: z.id };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!SW) return;
  const s = SW; SW = null;
  const p = e.changedTouches[0], dx = p.clientX - s.x, dy = p.clientY - s.y;
  if (Date.now() - s.t > 800 || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  const v = dx < 0 ? 1 : -1;
  if (s.z === 'v-repas') { S.rweek = addDays(S.rweek, 7 * v); renderRepas(); hydrater(); }
  else if (S.ag === 'mois') { const d = jourDe(S.month + '-01'); d.setMonth(d.getMonth() + v); S.month = iso(d).slice(0, 7); renderAgenda(); }
  else { S.week = addDays(S.week, 7 * v); renderAgenda(); }
}, { passive: true });

// Puces automatiques : « - » (ou « * ») suivi d'une espace en début de ligne devient une puce.
function pucesAuto(rt) {
  const s = getSelection(); if (!s.rangeCount) return false;
  const r = s.getRangeAt(0); if (!r.collapsed) return false;
  const node = r.startContainer; if (node.nodeType !== 3 || !rt.contains(node)) return false;
  if (!/^[-*•][\s ]$/.test(node.textContent.slice(0, r.startOffset))) return false;
  let bloc = node.parentNode; while (bloc !== rt && !/^(P|DIV|LI)$/.test(bloc.tagName)) bloc = bloc.parentNode;
  if (bloc.tagName === 'LI') return false;
  const w = document.createTreeWalker(bloc, NodeFilter.SHOW_TEXT);
  let premier = w.nextNode(); while (premier && premier !== node && !premier.textContent.trim()) premier = w.nextNode();
  if (premier !== node) return false;
  node.textContent = node.textContent.slice(r.startOffset);
  // La ligne devient un élément de liste (accolé à la liste juste au-dessus s'il y en a une).
  const li = document.createElement('li');
  if (bloc === rt) { // texte posé directement dans la note, sans paragraphe
    let debut = node; while (debut.previousSibling && debut.previousSibling.nodeName !== 'BR' && !/^(P|DIV|UL|OL)$/.test(debut.previousSibling.nodeName)) debut = debut.previousSibling;
    const ref = debut.previousSibling; let x = debut;
    while (x && x.nodeName !== 'BR' && !/^(P|DIV|UL|OL)$/.test(x.nodeName)) { const suiv = x.nextSibling; li.appendChild(x); x = suiv; }
    if (x && x.nodeName === 'BR') x.remove();
    const ul = document.createElement('ul'); ul.appendChild(li); rt.insertBefore(ul, ref ? ref.nextSibling : rt.firstChild);
  } else {
    while (bloc.firstChild) li.appendChild(bloc.firstChild);
    const prec = bloc.previousElementSibling;
    if (prec && prec.tagName === 'UL') { prec.appendChild(li); bloc.remove(); }
    else { const ul = document.createElement('ul'); ul.appendChild(li); bloc.replaceWith(ul); }
  }
  if (!li.textContent) { li.innerHTML = '<br>'; }
  const nr = document.createRange();
  if (node.isConnected && node.textContent) nr.setStart(node, 0); else nr.setStart(li, 0);
  nr.collapse(true); s.removeAllRanges(); s.addRange(nr);
  return true;
}
function openEditor(id) { if (!DB.notes[id]) return; S.open = id; S.delArm = false; renderEditor(); $('#ov-editor').hidden = false; }
function renderEditor(keepFocus) {
  const n = note(); if (!n) return;
  $('#editor').style.setProperty('--nc', `var(--n-${COLORS.some(c => c[0] === n.color) ? n.color : 'default'})`);
  $('#ed-title').value = n.title || ''; $('#ed-title').placeholder = n.type === 'list' ? 'Nom de la liste' : 'Titre';
  $('#ed-pin').setAttribute('aria-pressed', !!n.pin);
  $('#ed-bold').hidden = n.type !== 'text';
  $('#ed-colors').innerHTML = COLORS.map(([k, l]) => `<button type="button" data-color="${k}" style="--sc:var(--n-${k})" aria-label="${l}" title="${l}" aria-pressed="${n.color === k}"></button>`).join('');
  const fs = dossiers();
  $('#ed-folder').innerHTML = fs.map(f => `<option value="${f.id}" ${f.id === n.f ? 'selected' : ''}>${f.m === 'raf' ? 'RAF' : 'Perso'} · ${esc(dossierNom(f.id))}</option>`).join('') + (dossier(n.f) ? '' : '<option value="" selected>Sans dossier</option>');
  const del = $('#ed-del'); del.textContent = S.delArm ? 'Confirmer la suppression' : 'Supprimer'; del.classList.toggle('danger', S.delArm);
  $('#ed-meta').textContent = n._neuf ? 'Nouvelle' : `Modification : ${quand(n.maj)}`;
  const body = $('#ed-body');
  if (n.type === 'list') {
    const rows = (n.items || []).map((it, i) => ({ it, i })), open = rows.filter(o => !o.it.ok), done = rows.filter(o => o.it.ok);
    const row = o => `<li class="${o.it.ok ? 'ok' : ''}${o.it.urg && !o.it.ok ? ' urgent' : ''}" data-row="${o.i}">${o.it.ok ? '' : `<span class="grip" data-grip="${o.i}" aria-hidden="true" title="Glisser pour classer">${GRIP}</span>`}<input type="checkbox" ${o.it.ok ? 'checked' : ''} data-ed-idx="${o.i}" aria-label="Fait : ${esc(o.it.t)}"><input class="it" value="${esc(o.it.t)}" data-ed-text="${o.i}" aria-label="Tâche">${o.it.ok ? '' : `<button type="button" class="fl" data-ed-urg="${o.i}" aria-pressed="${!!o.it.urg}" aria-label="Urgente" title="${o.it.urg ? 'Retirer l\'urgence' : 'Marquer urgente (visible à l\'accueil)'}">${FLAG}</button>`}<button type="button" class="x" data-ed-del="${o.i}" aria-label="Retirer la tâche">×</button></li>`;
    const wasOpen = body.querySelector('details') && body.querySelector('details').open;
    body.innerHTML = `<p class="ed-hint">Le drapeau rend une tâche urgente : elle remonte sur l'accueil. La poignée ⋮⋮ fait glisser une tâche pour la classer. Une tâche terminée disparaît seule au bout de 7 jours.</p><ul class="ed-list" id="ed-open">${open.map(row).join('')}</ul>
      <form class="add-item" id="add-item"><span>+</span><input id="new-item" placeholder="Nouvelle tâche" autocomplete="off" aria-label="Nouvelle tâche" enterkeyhint="enter"></form>
      ${done.length ? `<details class="done"${wasOpen ? ' open' : ''}><summary>${done.length} terminée${done.length > 1 ? 's' : ''}</summary><ul class="ed-list">${done.map(row).join('')}</ul></details>` : ''}`;
    if (keepFocus === true) $('#new-item').focus();
  } else if (!body.querySelector('#rt') || keepFocus !== 'text') {
    body.innerHTML = `<div class="rt" id="rt" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Texte de la note">${propre(n.html) || '<p><br></p>'}</div>`;
  }
}
function closeEditor() {
  const n = note();
  if (n) {
    const vide = !String(n.title || '').trim() && (n.type === 'list' ? !(n.items || []).length : !texteDe(n.html));
    if (n._neuf) delete DB.notes[n.id];
    else if (vide) { n.suppr = true; enregistrer('notes', n); }
  }
  S.open = null; $('#ov-editor').hidden = true; render();
}
function newNote(type) {
  const fs = dossiers();
  const f = S.view === 'notes' && S.folder !== 'all' ? S.folder : ((fs.find(x => !x.p && x.m === S.mode) || {}).id || '');
  const n = { id: idNouveau('n'), title: '', f, type, color: 'default', pin: false, maj: Date.now(), items: [], html: '', _neuf: true };
  DB.notes[n.id] = n; // gardée seulement à la première saisie
  $('#ov-add').hidden = true; if (S.nt !== 'tout') S.nt = type === 'list' ? 'taches' : 'notes';
  openEditor(n.id); setTimeout(() => $('#ed-title').focus(), 30);
}
function goSection(id) {
  S.view = 'parametres';
  if (location.hash !== '#parametres') history.pushState(null, '', '#parametres');
  render(); window.scrollTo(0, 0);
  setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
}

// ---------- clics
document.addEventListener('click', e => {
  const t = e.target;
  const md = t.closest('[data-mode]');
  if (md) { S.mode = md.dataset.mode; LS.set('mode', S.mode); S.q = ''; if (S.view === 'parametres') { S.view = 'accueil'; history.pushState(null, '', '#accueil'); } render(); window.scrollTo(0, 0); return; }
  const nw = t.closest('[data-new]');
  if (nw) { if (!CLE) return; const k = nw.dataset.new; if (k === 'menu') $('#ov-add').hidden = false; else if (k === 'event') openEv(); else if (k === 'meal') openRepas(); else newNote(k); return; }
  if (!$('#ov-meal').hidden && t.closest('#ov-meal')) {
    if (t === $('#ov-meal') || t.closest('#ml-cancel')) fermerRepas();
    else { const mt = t.closest('[data-mt]'); if (mt) choixSource(mt.dataset.mt); }
    return;
  }
  if (!$('#ov-img').hidden && t.closest('#ov-img')) { if (t === $('#ov-img') || t.closest('#img-close')) $('#ov-img').hidden = true; return; }
  if (!$('#ov-move').hidden && t.closest('#ov-move')) { if (t === $('#ov-move') || t.closest('#mv-cancel')) fermerMove(); return; }
  const mmv = t.closest('[data-meal-move]'); if (mmv) { openMove(mmv.dataset.mealMove); return; }
  const ma = t.closest('[data-meal-add]'); if (ma) { openRepas(ma.dataset.mealAdd); return; }
  const mdl = t.closest('[data-meal-del]');
  if (mdl) {
    const k = mdl.dataset.mealDel; if (S.mDel !== k) { S.mDel = k; render(); return; }
    const m = repas(k); S.mDel = null; if (m) { m.suppr = true; enregistrer('repas', m); }
    render(); toast('Repas retiré'); return;
  }
  if (S.mDel && !t.closest('[data-meal-del]')) { S.mDel = null; render(); }
  const phb = t.closest('[data-photo]'); if (phb) { S.photoKey = phb.dataset.photo; const i = $('#photo-in'); i.value = ''; i.click(); return; }
  const vi = t.closest('[data-view-img]'); if (vi) { voirCapture(vi.dataset.viewImg); return; }
  const rw = t.closest('[data-rw]'); if (rw) { const v = +rw.dataset.rw; S.rweek = v === 0 ? lundiDe(auj()) : addDays(S.rweek, 7 * v); renderRepas(); hydrater(); return; }
  if (t.closest('[data-rw-now]')) { S.rweek = lundiDe(auj()); return; }
  if (t === $('#ov-add')) { $('#ov-add').hidden = true; return; }
  if (!$('#ov-ev').hidden && t.closest('#ov-ev')) {
    if (t === $('#ov-ev') || t.closest('#ev-cancel')) { fermerEv(); return; }
    if (t.closest('#ev-del')) {
      if (!EVF.delArm) { EVF.delArm = true; $('#ev-del').textContent = 'Confirmer la suppression'; $('#ev-del').classList.add('danger'); return; }
      envoyerEv('suppr'); return;
    }
    return;
  }
  if (!$('#ov-place').hidden && t.closest('#ov-place')) { if (t === $('#ov-place') || t.closest('#pl-cancel')) fermerPlace(); return; }
  const dy = t.closest('[data-day]'); if (dy) { openPlace(dy.dataset.day); return; }
  const ag = t.closest('[data-ag]'); if (ag) { S.ag = ag.dataset.ag; renderAgenda(); return; }
  const mo = t.closest('[data-mo]');
  if (mo) { const v = +mo.dataset.mo; if (!v) S.month = auj().slice(0, 7); else { const d = jourDe(S.month + '-01'); d.setMonth(d.getMonth() + v); S.month = iso(d).slice(0, 7); } renderAgenda(); return; }
  const gt = t.closest('[data-goto]'); if (gt) { S.ag = gt.dataset.goto; S.month = auj().slice(0, 7); if (S.view === 'agenda') { e.preventDefault(); render(); } return; }
  const pd = t.closest('[data-pl-del]');
  if (pd) {
    const k = pd.dataset.plDel, L = regLieux(); if (k === L.def || !L.l[k]) return;
    if (S.plDel !== k) { S.plDel = k; renderParams(); return; }
    const l = JSON.parse(JSON.stringify(L.l)), nm = l[k].n; delete l[k];
    garderLieux(l, L.def); S.plDel = null; renderParams(); toast(`Lieu « ${nm} » supprimé`); return;
  }
  const ev = t.closest('[data-ev]'); if (ev) { openEv(EVX[ev.dataset.ev]); return; }
  const wk = t.closest('[data-wk]'); if (wk) { const v = +wk.dataset.wk; S.week = v === 0 ? lundiDe(auj()) : addDays(S.week, 7 * v); renderAgenda(); return; }
  if (t.closest('[data-wk-now]')) { S.week = lundiDe(auj()); S.ag = 'semaine'; if (S.view === 'agenda') { e.preventDefault(); render(); } return; }
  const cd = t.closest('[data-cday]'); if (cd) { S.cday = cd.dataset.cday; renderAccueil(); return; }
  if (t.closest('label.ck')) return;
  const op = t.closest('[data-open]'); if (op) { openEditor(op.dataset.open); return; }
  const gs = t.closest('[data-goset]'); if (gs) { goSection(gs.dataset.goset); return; }
  const gf = t.closest('[data-gofolder]'); if (gf) { S.folder = gf.dataset.gofolder; S.nt = 'tout'; return; }
  const nt = t.closest('[data-nt]'); if (nt) { S.nt = nt.dataset.nt; S.q = ''; renderNotes(); return; }
  const fo = t.closest('[data-folder]'); if (fo) { S.folder = fo.dataset.folder; S.q = ''; renderNotes(); return; }
  const th = t.closest('[data-theme-set]');
  if (th) { SET.theme = th.dataset.themeSet; LS.set('theme', SET.theme); const r = document.documentElement; if (SET.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', SET.theme); renderParams(); return; }
  const fd = t.closest('[data-f-del]');
  if (fd) {
    const id = fd.dataset.fDel; if (S.fDel !== id) { S.fDel = id; renderParams(); return; }
    const f = dossier(id); if (!f) return;
    const cible = f.p || (dossiers().find(x => !x.p && x.m === f.m && x.id !== id) || {}).id;
    const contenu = notes().filter(n => n.f === id);
    if (contenu.length && !cible) { S.fDel = null; renderParams(); toast('Impossible : c\'est le dernier dossier de cet espace et il n\'est pas vide'); return; }
    contenu.forEach(n => { n.f = cible; enregistrer('notes', n); });
    dossiers().filter(c => c.p === id).forEach(c => { delete c.p; enregistrer('dossiers', c); });
    f.suppr = true; enregistrer('dossiers', f);
    if (S.folder === id) S.folder = 'all';
    S.fDel = null; renderParams(); toast(`Dossier « ${f.n} » supprimé${contenu.length ? `, contenu déplacé dans ${dossierNom(cible)}` : ''}`); return;
  }
  if (t.closest('[data-sync-now]') || t.closest('#sync')) {
    if (!CLE) { toast('Ouvre d\'abord le lien donné par le script'); return; }
    if (URL_SCRIPT === 'A_REMPLIR') { toast('L\'adresse du Sheet n\'est pas encore réglée dans l\'appli'); return; }
    ST.horsLigne = false; synchroniser().then(() => { toast(ST.horsLigne ? 'Pas de réseau : réessaie plus tard' : ST.erreur ? ST.erreur : 'À jour'); if (S.view === 'parametres') renderParams(); }); return;
  }
  const n = note();
  if (n && t.closest('#ov-editor')) {
    const col = t.closest('[data-color]'); if (col) { n.color = col.dataset.color; touch(n); renderEditor('text'); return; }
    if (t.closest('#ed-pin')) { n.pin = !n.pin; touch(n); renderEditor('text'); toast(n.pin ? 'Épinglée : visible sur l\'accueil' : 'Retirée de l\'accueil'); return; }
    const ur = t.closest('[data-ed-urg]'); if (ur) { const it = n.items[+ur.dataset.edUrg]; it.urg = !it.urg; touch(n); renderEditor(); toast(it.urg ? 'Tâche urgente : elle apparaît sur l\'accueil' : 'Urgence retirée'); return; }
    const dl = t.closest('[data-ed-del]'); if (dl) { n.items.splice(+dl.dataset.edDel, 1); touch(n); renderEditor(); return; }
    if (t.closest('#ed-dup')) {
      if (n._neuf) return;
      const c = JSON.parse(JSON.stringify(n)); c.id = idNouveau('n'); c.title = (n.title || 'Sans titre') + ' (copie)'; c.pin = false;
      if (c.items) c.items.forEach(i => { i.ok = false; i.urg = false; delete i.okT; });
      enregistrer('notes', c);
      openEditor(c.id); toast(n.type === 'list' ? 'Copie créée, cases décochées' : 'Copie créée : renomme-la (ex. Déroulé REIMS)'); setTimeout(() => $('#ed-title').select(), 30); return;
    }
    if (t.closest('#ed-del')) {
      if (!S.delArm) { S.delArm = true; renderEditor('text'); return; }
      if (n._neuf) delete DB.notes[n.id]; else { n.suppr = true; enregistrer('notes', n); }
      S.open = null; $('#ov-editor').hidden = true; render(); toast('Supprimée'); return;
    }
    if (t.closest('#ed-close') || t === $('#ov-editor')) { closeEditor(); return; }
    if (t.closest('#ed-bold')) { document.execCommand('bold'); const r = $('#rt'); if (r) { n.html = propre(r.innerHTML); touch(n); } return; }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#ov-img').hidden) $('#ov-img').hidden = true; else if (!$('#ov-move').hidden) fermerMove(); else if (!$('#ov-meal').hidden) fermerRepas(); else if (!$('#ov-place').hidden) fermerPlace(); else if (!$('#ov-ev').hidden) fermerEv(); else if (!$('#ov-editor').hidden) closeEditor(); else $('#ov-add').hidden = true; }
  if (e.key === 'Enter' && e.target.matches('[data-open]')) openEditor(e.target.dataset.open);
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-card]')) {
    const n = DB.notes[t.dataset.card], it = n && n.items[+t.dataset.idx]; if (!it) return;
    cocher(it, t.checked); enregistrer('notes', n);
    setTimeout(() => { render(); toast(`Fait : ${it.t}`); }, 180); return;
  }
  if (t.matches('[data-ed-idx]')) { const n = note(); cocher(n.items[+t.dataset.edIdx], t.checked); touch(n); renderEditor(); return; }
  if (t.id === 'ed-folder') { const n = note(); n.f = t.value; touch(n); toast(`Rangée dans ${dossierNom(t.value)}`); return; }
  if (t.matches('[data-f-parent]')) { const f = dossier(t.dataset.fParent); if (t.value) f.p = t.value; else delete f.p; enregistrer('dossiers', f); renderParams(); return; }
  if (t.matches('[data-f-name]')) { renderParams(); return; }
  if (t.matches('[data-cal-sp]')) {
    const c = calInfo(t.dataset.calSp); if (!c) return;
    const v = Object.assign({}, regAgendas(), { [c.id]: t.value });
    enregistrer('reglages', { id: 'agendas', v }); renderParams(); toast(`${nomCal(c)} : ${ESPACES[t.value]}`); return;
  }
  if (t.matches('[data-pl-color]') || t.name === 'defp') {
    const L = regLieux(), l = JSON.parse(JSON.stringify(L.l));
    if (t.name === 'defp') { if (!l[t.value]) return; garderLieux(l, t.value); S.plDel = null; renderParams(); toast(`Lieu par défaut : ${l[t.value].n}`); return; }
    const k = t.dataset.plColor; if (!l[k]) return; l[k].c = t.value; garderLieux(l, L.def); renderParams(); return;
  }
  if (t.matches('[data-pl-name]')) { renderParams(); return; }
  if (t.id === 'ml-d' || t.id === 'ml-m') { majRemplace(); return; }
  if (t.id === 'mv-d' || t.id === 'mv-m') { majMove(); return; }
  if (t.id === 'ml-file' || t.id === 'ml-photo' || t.id === 'photo-in') {
    const f = t.files && t.files[0]; if (!f) return;
    const capture = t.id === 'ml-file';
    compresser(f, capture ? 1600 : 1000, capture ? 0.7 : 0.72).then(async d => {
      if (t.id === 'photo-in') {
        const m = repas(S.photoKey); if (!m) return;
        const id = idNouveau('p'); await ajouterPhoto(id, d);
        m.photo = id; enregistrer('repas', m); render(); toast('Photo du plat ajoutée'); return;
      }
      if (capture) S.mimg = d; else S.mphoto = d;
      const im = $(capture ? '#ml-prev' : '#ml-pprev'); im.src = d; im.hidden = false;
    }).catch(() => toast('Image illisible : essaie une autre photo'));
    return;
  }
  if (t.id === 'pl-d') { const f = $('#pl-e'); if (t.value && (!f.value || f.value < t.value)) f.value = t.value; return; }
  if (t.id === 'ev-all') { majHeures(); return; }
  if (t.id === 'ev-start') { const s = t.value, f = $('#ev-end').value; if (s && (!f || f <= s)) { const [h, m] = s.split(':').map(Number); $('#ev-end').value = `${pad(Math.min(23, h + 1))}:${pad(h >= 23 ? 59 : m)}`; } return; }
});
document.addEventListener('input', e => {
  const t = e.target, n = note();
  if (t.id === 'q') { S.q = t.value; renderNotes(); const i = $('#q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); return; }
  if (t.matches('[data-f-name]')) { const f = dossier(t.dataset.fName); if (f && t.value.trim()) { f.n = t.value.trim(); enregistrer('dossiers', f); } return; }
  if (t.id === 'ml-url') { clearTimeout(jowT); jowT = setTimeout(chercherJow, 500); return; }
  if (t.id === 'ml-title') { t.dataset.auto = t.value ? '0' : '1'; return; }
  if (t.matches('[data-pl-name]')) {
    const L = regLieux(), l = JSON.parse(JSON.stringify(L.l)), k = t.dataset.plName;
    if (l[k] && t.value.trim()) { l[k].n = t.value.trim(); garderLieux(l, L.def); } return;
  }
  if (!n) return;
  if (t.id === 'ed-title') { n.title = t.value; touch(n); return; }
  if (t.matches('[data-ed-text]')) { n.items[+t.dataset.edText].t = t.value; touch(n); return; }
  if (t.id === 'rt') { if (!e.isComposing) pucesAuto(t); n.html = propre(t.innerHTML); touch(n); }
});
// Clavier du téléphone : la saisie peut se terminer après l'espace, on revérifie à ce moment-là.
document.addEventListener('compositionend', e => {
  const n = note(); if (!n || e.target.id !== 'rt') return;
  if (pucesAuto(e.target)) { n.html = propre(e.target.innerHTML); touch(n); }
});
// Coller du texte dans une note : seulement le texte, sans la mise en forme du site d'origine.
document.addEventListener('paste', e => {
  if (e.target.closest && e.target.closest('#rt')) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const id = e.target.id;
  if (id === 'ev-form') { envoyerEv(EVF.edit ? 'modif' : 'ajout'); return; }
  if (id === 'ml-form') { enregistrerRepas(); return; }
  if (id === 'mv-form') { deplacerRepas(); return; }
  if (id === 'pl-form') {
    const d = $('#pl-d').value, en = $('#pl-e').value, er = $('#pl-err'), c = document.querySelector('input[name="pl"]:checked');
    const msg = !d || !en ? 'Choisis les deux dates.' : en < d ? 'La date de fin doit être après la date de début.' : ecart(d, en) > 366 ? 'Une période d\'un an au plus.' : !c ? 'Choisis un lieu ou « Libre ».' : '';
    if (msg) { er.textContent = msg; er.hidden = false; return; }
    enregistrerPeriode(c.value, d, en); fermerPlace(); render();
    toast(`${c.value === 'libre' ? 'Libre' : regLieux().l[c.value].n} : ${fmtCourt(d)}${en !== d ? ' au ' + fmtCourt(en) : ''}`); return;
  }
  if (id === 'pl-add') {
    const nm = $('#pa-n').value.trim(); if (!nm) return;
    const L = regLieux(), l = JSON.parse(JSON.stringify(L.l)); l[idNouveau('l')] = { n: nm, c: $('#pa-c').value };
    garderLieux(l, L.def); renderParams(); toast(`Lieu « ${nm} » ajouté`); return;
  }
  if (id === 'add-item') {
    const i = $('#new-item'), v = i.value.trim(); if (!v) return; const n = note();
    const fd = n.items.findIndex(x => x.ok); n.items.splice(fd < 0 ? n.items.length : fd, 0, { t: v }); touch(n); renderEditor(true); return;
  }
  if (id === 'f-add') {
    const nm = $('#fa-n').value.trim(); if (!nm) return;
    const [m, p] = $('#fa-p').value.split('|');
    const f = { id: idNouveau('f'), n: nm, m, c: Date.now() }; if (p) f.p = p;
    enregistrer('dossiers', f); renderParams(); toast(`Dossier « ${nm} » créé`); return;
  }
  if (id === 'setup-form') {
    const k = lireCle($('#setup-in').value);
    if (!k) { toast('Je ne trouve pas la clé dans ce lien (#k=…)'); return; }
    LS.set('cle', k); CLE = k; render(); synchroniser(); toast('Appli branchée'); return;
  }
});

// ---------- navigation et réveils
function route() { const h = location.hash.slice(1); S.view = VIEWS.includes(h) ? h : 'accueil'; S.mDel = null; render(); window.scrollTo(0, 0); }
window.addEventListener('hashchange', route);
window.addEventListener('online', () => { ST.horsLigne = false; AGS.horsLigne = false; synchroniser(); agendaAJour(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { synchroniser(); agendaAJour(); } });
setInterval(() => { if (document.visibilityState === 'visible') { synchroniser(); agendaAJour(); } }, 60000);
if ('serviceWorker' in navigator && !LOCAL) navigator.serviceWorker.register('sw.js').catch(() => { });
purgerTerminees(); renderSync(); route(); synchroniser(); agendaAJour();
