'use strict';
// Veille des recruteurs du Tour de France 2027.
// Ce fichier est tenu par Claude : la tâche planifiée du lundi (« Veille recruteurs Tour 2027 ») le réécrit puis publie le site.
// « nouveautes » = offres apparues depuis la dernière vérification. L'encart de l'accueil perso les montre
// tant qu'Aurélien n'a pas touché « Vu » (réglage « vv-<id> »). Une liste vide = pas d'encart.
const VEILLE = {
  verifie: '2026-11-16',
  prochaine: '2026-11-23',
  nouveautes: [
    {
      id: 'alentours-tdf2027',
      qui: 'Alentours Événementiel',
      quoi: 'Intendance logistique, conduite de char, ligne d\'arrivée, fan park, navettes',
      condition: 'Dispo du 30/06 au 25/07/2027, permis depuis 3 ans',
      lien: 'https://alentoursevenementiel.com/recrutement-roadshow/'
    }
  ]
};
