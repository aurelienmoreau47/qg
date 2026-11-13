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
    { nom: 'Reprise', de: 1, a: 6, vol: '1h05 → 2h10', resume: '3 séances course-marche, renfo avant chaque séance.' },
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
      { id: 's0b', jour: '2026-11-13', moment: 'midi', quoi: 'Sortie avec les collègues, 25 min max', consigne: '7 à 8 min/km, petits pas, course-marche 2 min / 1 min si besoin.', faite: true, resultat: '31 min, 4,60 km à 6:42/km, 57 m D+, genou 2/10 en fin de course : mieux que mercredi, mais <b>6 min de trop</b> et la côte finale montée en courant.' }
    ] },
    1: { vol: '1h05', seances: [
      { id: 's1a', quoi: 'Séance 1 · 20 min', consigne: 'Course très lente, allure où tu peux parler. Marche toutes les montées. Arrête-toi au chrono, même si tu te sens bien. Bois 1 à 2 grands verres d\'eau (300 à 600 ml) dans les 2 à 4 h avant.' },
      { id: 's1b', quoi: 'Séance 2 · 20 min', consigne: 'Même consigne.' },
      { id: 's1c', quoi: 'Séance 3 · 25 min', consigne: 'Même consigne.' }
    ] }
  },
  alerte: 'Arrêt et consultation si le genou fait boiter, gonfle, ou fait encore mal le lendemain.',
  // Renfo hanches et tronc du Run RCT (Leppänen et al., BJSM 2024), joué par le guide (guide.js) : 8 groupes, niveaux A à D.
  // Fourchettes du programme (u : r = répétitions, s = secondes, p = pas ; min-max). s2 = exercice à 1-3 séries dans le programme : 2 séries.
  // Règle de niveau validée le 12/11 (cahier des charges) : départ au bas de la fourchette ; Oui = + progression.r / .s ;
  // Oui au plafond = niveau suivant, bas de fourchette ; Non = identique. Niveau de chaque groupe gardé dans Réglages : « nv-<cle> » = { l: 0 à 3, d: dose }.
  // Adaptations (pas dans l'étude) : « de chaque côté » (c: 'cote'), « en alternant » sur 8C/8D, élastique long (7A), chaise (6A),
  // nordiques seul talons calés (7C, choix du 12/11, Bergmann 2026), consigne de 5C déduite de la photo, durée de 1 min 15 par mouvement d'échauffement.
  // pose = nom d'une silhouette de guide.js ; v = durée d'un mouvement de l'animation (s).
  renfo: {
    series: 3, seriesCourtes: 2, repos: 45, echauffementSec: 300,
    progression: { r: 2, s: 5, p: 2 },
    echauffement: [
      { nom: 'Footing en huit', det: 'Trottine en dessinant un huit sur 10 à 15 m.', pose: 'course', v: 0.7 },
      { nom: 'Montées de genoux', det: '10 à 15 m, retour en trottinant.', pose: 'genoux', v: 0.6 },
      { nom: 'Talons-fesses', det: '10 à 15 m, retour en trottinant.', pose: 'talons', v: 0.6 },
      { nom: 'Pas chassés', det: '10 à 15 m, retour en trottinant.', pose: 'chasses', v: 0.7 }
    ],
    groupes: [
      { cle: 'ventrale', nom: 'Planche ventrale', niveaux: [
        { nom: 'Extensions depuis la position ours', pose: 'ours', u: 'r', min: 8, max: 16, consigne: 'À quatre pattes, genoux décollés sous les hanches : tends les deux jambes vers l\'arrière jusqu\'à la planche bras tendus, puis reviens.' },
        { nom: 'T-rotation', pose: 'trot', u: 'r', min: 8, max: 16, c: 'alt', consigne: 'En planche bras tendus, pivote sur le côté en levant un bras vers le plafond, reviens, puis change de côté.' },
        { nom: 'Planche statique', pose: 'planche', u: 's', min: 20, max: 40, v: 3.2, consigne: 'Sur les avant-bras et la pointe des pieds, corps aligné : tiens la position sans creuser le dos.' },
        { nom: 'Planche avec levers de jambe', pose: 'planchejambe', u: 's', min: 20, max: 40, consigne: 'En planche sur les avant-bras, lève une jambe tendue puis l\'autre, en alternant jusqu\'à la fin du minuteur.' }
      ] },
      { cle: 'laterale', nom: 'Planche latérale', niveaux: [
        { nom: 'Planche latérale, montées de bassin', pose: 'lateral', u: 'r', min: 8, max: 12, c: 'cote', consigne: 'Sur l\'avant-bras, jambes tendues, l\'autre bras vers le plafond : descends le bassin près du sol puis remonte-le dans l\'alignement.' },
        { nom: 'Planche latérale statique', pose: 'lateralS', u: 's', min: 20, max: 40, c: 'cote', v: 3.2, consigne: 'Sur l\'avant-bras, jambes tendues, l\'autre bras vers le plafond : tiens le bassin dans l\'alignement.' },
        { nom: 'Copenhague, genou sur la chaise', pose: 'copenG', u: 'r', min: 4, max: 10, s2: true, c: 'cote', mat: 'Une chaise', consigne: 'En planche latérale, l\'intérieur du genou du dessus posé sur la chaise : monte la jambe du dessous vers la chaise en soulevant le bassin, puis redescends.' },
        { nom: 'Copenhague, cheville sur la chaise', pose: 'copenC', u: 'r', min: 4, max: 10, s2: true, c: 'cote', mat: 'Une chaise', consigne: 'Même mouvement, mais la cheville du dessus posée sur la chaise : la jambe tendue rend l\'exercice plus dur.' }
      ] },
      { cle: 'pont', nom: 'Pont fessier', niveaux: [
        { nom: 'Montées de bassin', pose: 'pont', u: 's', min: 20, max: 40, consigne: 'Sur le dos, genoux pliés, pieds à plat : monte et redescends le bassin sans t\'arrêter jusqu\'à la fin du minuteur.' },
        { nom: 'Pont statique', pose: 'pontS', u: 's', min: 20, max: 40, v: 3.2, consigne: 'Sur le dos, genoux pliés : monte le bassin et tiens-le en haut, fesses serrées.' },
        { nom: 'Pont avec extensions de genou', pose: 'pontJ', u: 's', min: 20, max: 40, consigne: 'Bassin en haut et immobile, tends une jambe vers le ciel puis repose le pied, et change de jambe.' },
        { nom: 'Pont sur une jambe', pose: 'pontU', u: 'r', min: 8, max: 12, c: 'cote', consigne: 'Une jambe repliée en l\'air, l\'autre pied au sol : monte et redescends le bassin en poussant sur ce pied.' }
      ] },
      { cle: 'abducteurs', nom: 'Abducteurs', niveaux: [
        { nom: 'Squat avec mini-élastique', pose: 'squat', u: 'r', min: 10, max: 15, mat: 'Mini-élastique', consigne: 'Élastique juste au-dessus des genoux, mains sur les hanches : descends en squat en poussant les genoux vers l\'extérieur.' },
        { nom: 'Marche latérale, genoux fléchis', pose: 'marcheF', u: 'p', min: 20, max: 30, mat: 'Mini-élastique', v: 1.6, consigne: 'Élastique aux chevilles, genoux un peu fléchis : avance sur le côté à petits pas sans laisser les pieds se rapprocher.' },
        { nom: 'Marche avant et arrière, genoux fléchis', pose: 'marcheAv', u: 'p', min: 20, max: 30, mat: 'Mini-élastique', v: 1.6, consigne: 'Élastique aux chevilles, genoux fléchis : avance à pas écartés, puis recule de la même façon.' },
        { nom: 'Marche latérale, jambes tendues', pose: 'marcheT', u: 'p', min: 20, max: 30, mat: 'Mini-élastique', v: 1.6, consigne: 'Élastique aux chevilles, jambes tendues : pas sur le côté, l\'effort vient de la hanche.' }
      ] },
      { cle: 'flechisseurs', nom: 'Fléchisseurs de hanche', niveaux: [
        { nom: 'Relevé de jambe tendue', pose: 'jambe', u: 'r', min: 8, max: 12, c: 'cote', consigne: 'Sur le dos, une jambe pliée : monte l\'autre jambe tendue jusqu\'à la hauteur du genou plié, puis redescends lentement.' },
        { nom: 'Flexion de hanche avec élastique, sur le dos', pose: 'flexB', u: 'r', min: 8, max: 12, c: 'cote', mat: 'Mini-élastique', consigne: 'Sur le dos, élastique autour des pieds : ramène un genou au-dessus de la hanche contre l\'élastique, puis redescends lentement.' },
        { nom: 'Flexion de hanche tenue, sur le dos', pose: 'flexC', u: 'r', min: 8, max: 12, c: 'cote', mat: 'Mini-élastique', consigne: 'Élastique aux pieds, un genou tenu au-dessus de la hanche sans bouger : l\'autre jambe, tendue, s\'éloigne vers le sol et revient.' },
        { nom: 'Flexion de hanche avec élastique, debout', pose: 'flexD', u: 'r', min: 8, max: 12, c: 'cote', mat: 'Mini-élastique', consigne: 'Dos contre un mur, élastique aux pieds : monte un genou à hauteur de hanche, puis redescends lentement.' }
      ] },
      { cle: 'fentes', nom: 'Fentes', niveaux: [
        { nom: 'Split squat, pied arrière sur une chaise', pose: 'fente', u: 'r', min: 8, max: 12, c: 'cote', mat: 'Une chaise', consigne: 'Pied arrière posé sur la chaise, buste droit : descends le genou arrière vers le sol, puis remonte.' },
        { nom: 'Fentes sur place', pose: 'fente6', u: 'r', min: 8, max: 12, c: 'cote', consigne: 'Un grand pas en avant, pieds fixes : descends le genou arrière vers le sol, puis remonte.' },
        { nom: 'Fentes marchées', pose: 'fente6', u: 'r', min: 4, max: 10, s2: true, c: 'ar', consigne: 'Avance en fentes, une jambe puis l\'autre, puis fais demi-tour et reviens de la même façon.' },
        { nom: 'Fentes sautées', pose: 'fenteSaut', u: 'r', min: 6, max: 12, c: 'alt', v: 1.4, consigne: 'En fente, saute et change de jambe en l\'air, réception souple, genou au-dessus du pied.' }
      ] },
      { cle: 'ischios', nom: 'Ischios', niveaux: [
        { nom: 'Soulevé de terre avec élastique', pose: 'souleve', u: 'r', min: 12, max: 15, mat: 'Élastique long', consigne: 'Debout sur l\'élastique, un bout dans chaque main : penche le buste en avant dos droit, genoux un peu fléchis, puis redresse-toi.' },
        { nom: 'Curl ischios avec une serviette', pose: 'curlS', u: 'r', min: 8, max: 12, mat: 'Une serviette', consigne: 'Sur le dos, talons sur une serviette, bassin levé : fais glisser les talons loin de toi, puis ramène-les.' },
        { nom: 'Nordiques, talons calés', pose: 'nordique', u: 'r', min: 4, max: 10, s2: true, mat: 'Un meuble lourd et un coussin', v: 3.2, consigne: 'À genoux sur un coussin, talons calés sous un meuble lourd qui ne bouge pas : descends le corps droit vers l\'avant le plus lentement possible, rattrape-toi avec les mains.' },
        { nom: 'Curl sur une jambe avec une serviette', pose: 'curlU', u: 'r', min: 4, max: 10, s2: true, c: 'cote', mat: 'Une serviette', consigne: 'Comme le curl serviette, mais un seul talon sur la serviette, l\'autre jambe en l\'air.' }
      ] },
      { cle: 'fentes-lat', nom: 'Fentes latérales', niveaux: [
        { nom: 'Fentes latérales alternées', pose: 'laterale', u: 'r', min: 6, max: 10, c: 'alt', consigne: 'Grand pas sur le côté, plie ce genou en gardant l\'autre jambe tendue, reviens au centre et change de côté.' },
        { nom: 'Fentes 3D', pose: 'laterale', u: 'r', min: 2, max: 4, c: 'dir', consigne: 'Fente vers l\'avant, puis sur le côté, puis en diagonale arrière, avec chaque jambe.' },
        { nom: 'Fentes latérales avec cercles de bras', pose: 'lateraleB', u: 'r', min: 6, max: 10, c: 'alt', mat: 'Ballon (facultatif)', consigne: 'Fente sur le côté en faisant un grand cercle avec les bras tendus, reviens au centre et change de côté.' },
        { nom: 'Fente latérale avec pas croisé', pose: 'croise', u: 'r', min: 6, max: 10, c: 'alt', consigne: 'Fente sur le côté, puis en revenant croise la jambe derrière l\'autre, et change de côté.' }
      ] }
    ]
  }
};
