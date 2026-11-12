'use strict';
// Plan de la prépa backyard (Les 24 heures du Monastrail, 10/04/2027).
// Ce fichier est tenu par Claude : après les captures Strava d'Aurélien, il ajoute le résultat d'une séance,
// détaille la semaine suivante ou ajuste le plan, puis publie (changer CACHE dans sw.js et VERSION_APPLI dans app.js).
// Une séance « faite » cochée dans l'appli est gardée dans l'onglet Réglages du Sheet (id « pf-<id de la séance> ») ;
// « faite: true » ici sert seulement de valeur de départ.
// Jours au format 2026-11-13. Semaine 1 = lundi 16/11/2026, semaine 0 = la mise en route d'avant.
const PREPA = {
  course: { nom: 'Les 24 heures du Monastrail', jour: '2027-04-10', heure: '15h', boucleKm: 6.706, boucleDplus: 110 },
  s1: '2026-11-16',
  objectifs: [
    { k: 'Repli', de: 5, a: 6 },
    { k: 'Socle', de: 8, a: 8, principal: true },
    { k: 'Cible', de: 10, a: 12 }
  ],
  phases: [
    { nom: 'Mise en route', de: 0, a: 0, vol: '2 séances', resume: 'Deux sorties légères avant le début du plan.' },
    { nom: 'Reprise', de: 1, a: 6, vol: '1h15 → 2h10', resume: '3 séances course-marche, renfo avant chaque séance.' },
    { nom: 'Construction', de: 7, a: 13, vol: '2h30 → 4h', resume: '3 à 4 séances, sortie longue jusqu\'à 2h30, marche rapide en côte.' },
    { nom: 'Spécifique', de: 14, a: 18, vol: '4h45 → 6h', resume: 'Mini-backyards, une sortie de nuit après le travail.' },
    { nom: 'Affûtage', de: 19, a: 21, vol: '4h → 3h', resume: 'Volume en baisse de 30 à 50 %, sommeil soigné la dernière semaine.' }
  ],
  // Repères des semaines : lt = allégée, mb = mini-backyard, af = affûtage
  reperes: { 4: ['lt', 'Allégée'], 8: ['lt', 'Allégée'], 11: ['mb', 'Mini-backyard 3'], 12: ['lt', 'Allégée'], 14: ['mb', 'Mini-backyard 5'], 16: ['lt', 'Allégée'], 17: ['mb', 'Mini-backyard 6, de nuit'], 19: ['af', 'Affûtage'], 20: ['af', 'Affûtage'], 21: ['af', 'Course'] },
  // Semaines détaillées (remplies au fur et à mesure). Séance : id unique, jour et moment facultatifs, resultat écrit par Claude.
  semaines: {
    0: { vol: '2 séances', seances: [
      { id: 's0a', jour: '2026-11-11', quoi: 'Course très lente, 20 min', consigne: 'Allure où tu peux parler, marche autorisée.', faite: true, resultat: '24 min, 3,87 km à 6:13/km, essoufflé : <b>trop vite</b>.' },
      { id: 's0b', jour: '2026-11-13', moment: 'midi', quoi: 'Sortie avec les collègues, 25 min max', consigne: '7 à 8 min/km, petits pas, course-marche 2 min / 1 min si besoin.' }
    ] },
    1: { vol: '1h15', seances: [
      { id: 's1a', quoi: 'Séance 1 · 20 min', consigne: 'Course très lente, allure où tu peux parler. Marche autorisée.' },
      { id: 's1b', quoi: 'Séance 2 · 25 min', consigne: 'Même consigne.' },
      { id: 's1c', quoi: 'Séance 3 · 30 min', consigne: 'Même consigne.' }
    ] }
  },
  alerte: 'Arrêt et consultation si le genou fait boiter, gonfle, ou fait encore mal le lendemain.'
};
