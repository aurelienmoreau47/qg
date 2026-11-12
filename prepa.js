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
  alerte: 'Arrêt et consultation si le genou fait boiter, gonfle, ou fait encore mal le lendemain.',
  // Renfo hanches et tronc du Run RCT (Leppänen et al., BJSM 2024), joué par le guide (guide.js).
  // Dose de départ de la règle validée le 12/11 : 3 séries au bas de la fourchette. pose = nom d'une silhouette de guide.js.
  // « cote » (de chaque côté) et la durée de 1 min 15 par mouvement d'échauffement sont des adaptations, pas dans l'étude.
  renfo: {
    series: 3, repos: 45, echauffementSec: 300,
    echauffement: [
      { nom: 'Footing en huit', det: 'Trottine en dessinant un huit sur 10 à 15 m.', pose: 'course', v: 0.7 },
      { nom: 'Montées de genoux', det: '10 à 15 m, retour en trottinant.', pose: 'genoux', v: 0.6 },
      { nom: 'Talons-fesses', det: '10 à 15 m, retour en trottinant.', pose: 'talons', v: 0.6 },
      { nom: 'Pas chassés', det: '10 à 15 m, retour en trottinant.', pose: 'chasses', v: 0.7 }
    ],
    exercices: [
      { groupe: 'Planche ventrale', niveau: 'A', nom: 'Extensions depuis la position ours', pose: 'ours', reps: 8, consigne: 'À quatre pattes, genoux décollés sous les hanches : tends les deux jambes vers l\'arrière jusqu\'à la planche bras tendus, puis reviens.' },
      { groupe: 'Planche latérale', niveau: 'A', nom: 'Planche latérale, montées de bassin', pose: 'lateral', reps: 8, cote: true, consigne: 'Sur l\'avant-bras, jambes tendues, l\'autre bras vers le plafond : descends le bassin près du sol puis remonte-le dans l\'alignement.' },
      { groupe: 'Pont fessier', niveau: 'A', nom: 'Montées de bassin', pose: 'pont', sec: 20, consigne: 'Sur le dos, genoux pliés, pieds à plat : monte et redescends le bassin sans t\'arrêter jusqu\'à la fin du minuteur.' },
      { groupe: 'Abducteurs', niveau: 'A', nom: 'Squat avec mini-élastique', pose: 'squat', reps: 10, mat: 'Mini-élastique', consigne: 'Élastique juste au-dessus des genoux, mains sur les hanches : descends en squat en poussant les genoux vers l\'extérieur.' },
      { groupe: 'Fléchisseurs de hanche', niveau: 'A', nom: 'Relevé de jambe tendue', pose: 'jambe', reps: 8, cote: true, consigne: 'Sur le dos, une jambe pliée : monte l\'autre jambe tendue jusqu\'à la hauteur du genou plié, puis redescends lentement.' },
      { groupe: 'Fentes', niveau: 'A', nom: 'Split squat, pied arrière sur une chaise', pose: 'fente', reps: 8, cote: true, mat: 'Une chaise', consigne: 'Pied arrière posé sur la chaise, buste droit : descends le genou arrière vers le sol, puis remonte.' },
      { groupe: 'Ischios', niveau: 'A', nom: 'Soulevé de terre avec élastique', pose: 'souleve', reps: 12, mat: 'Élastique long', consigne: 'Debout sur l\'élastique, un bout dans chaque main : penche le buste en avant dos droit, genoux un peu fléchis, puis redresse-toi.' },
      { groupe: 'Fentes latérales', niveau: 'A', nom: 'Fentes latérales alternées', pose: 'laterale', reps: 6, alterne: true, consigne: 'Grand pas sur le côté, plie ce genou en gardant l\'autre jambe tendue, reviens au centre et change de côté.' }
    ]
  }
};
