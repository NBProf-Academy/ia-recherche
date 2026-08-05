# NBProf Research Hub — version 0.3

## Contenu de cette livraison
- nouvelle page d’accueil stable ;
- catalogue de 14 outils chargé depuis `data/tools.json` ;
- interface français / anglais / arabe avec prise en charge RTL ;
- six parcours méthodologiques interactifs ;
- PWA corrigée avec icônes conformes, manifeste relatif et mode hors connexion ;
- ancienne page conservée dans `index-legacy.html`.

## Publication sur GitHub Pages
1. Sauvegarder le dépôt actuel ou créer une branche.
2. Remplacer les fichiers du dépôt par ceux de ce dossier.
3. Vérifier que GitHub Pages publie la branche principale depuis la racine.
4. Ouvrir `index.html` sur le site publié.
5. Après mise à jour, forcer une actualisation du navigateur pour renouveler le cache PWA.

## Fichiers principaux
- `index.html` : accueil officiel V0.3 ;
- `index-v2.html` : redirection de compatibilité ;
- `pages/parcours.html` : page dynamique des six parcours ;
- `data/tools.json` et `data/journeys.json` : contenu éditable ;
- `css/style-v2.css` : design ;
- `js/app-v2.js`, `js/i18n.js`, `js/journey.js` : logique ;
- `manifest.json` et `sw.js` : installation PWA et cache.
