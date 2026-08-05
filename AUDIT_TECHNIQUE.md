# Audit technique — Sprint 0

## Anomalies constatées dans le dépôt reçu
- deux interfaces complètes superposées dans `index-v2.html` ;
- identifiants dupliqués : `cardsContainer`, `noResults`, `installModal`, `installNow` ;
- deux systèmes d’installation PWA et trois enregistrements du service worker ;
- références vers des fichiers absents (`splash.png`, favicons, `icone-512.png`) ;
- icônes déclarées 192×192 et 512×512 mais dont les dimensions réelles ne correspondaient pas ;
- manifeste lié à un chemin absolu `/ia-recherche/`, fragile selon le domaine de publication ;
- deux gestionnaires `fetch` concurrents dans le service worker ;
- traductions disponibles mais non reliées à la majorité des éléments de l’interface ;
- dossiers `pages`, `data` et `images` pratiquement vides.

## Corrections réalisées
- séparation claire du HTML, du CSS, du JavaScript et des données ;
- unicité de tous les identifiants ;
- système PWA unique et cache versionné ;
- chemins relatifs compatibles avec GitHub Pages ;
- icônes générées aux dimensions déclarées ;
- traduction complète de l’accueil et des parcours ;
- création de six parcours méthodologiques ;
- conservation de l’ancienne page dans `index-legacy.html`.

## Prochaine étape recommandée
Sprint 1 : espace projet du chercheur avec création d’un projet, progression par étapes et sauvegarde locale, avant toute authentification serveur.
