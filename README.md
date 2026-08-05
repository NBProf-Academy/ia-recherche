# NBProf Research Hub

Ce dossier est prêt à être ajouté comme sous-dossier `recherche/` à la racine du dépôt de votre site NBProf.

## Installation sur GitHub Pages

1. Dans le dépôt de votre site, créez un dossier `recherche`.
2. Copiez tout le contenu de ce dossier dans `recherche/`.
3. Publiez vos modifications sur la branche utilisée par GitHub Pages.
4. Ajoutez à votre site principal un lien vers `recherche/`.

L’application sera alors accessible à l’adresse :

`https://<votre-identifiant-github>.github.io/<votre-depot>/recherche/`

Si votre site est un dépôt utilisateur publié directement à la racine (`<identifiant>.github.io`), l’adresse devient :

`https://<votre-identifiant-github>.github.io/recherche/`

Les chemins sont relatifs : aucun réglage supplémentaire n’est requis pour ce sous-dossier. Après une mise à jour, rechargez la page sans cache afin de renouveler le cache hors connexion.

## Vérification sur ordinateur

Téléversez **l’intégralité** du dossier, en conservant notamment `css/style-v2.css`, `js/` et `sw.js`. Une image de très grande taille au chargement indique généralement qu’une ancienne page ou qu’une feuille de style absente est encore utilisée. Après publication, ouvrez la page avec une actualisation forcée (`Ctrl + F5` sous Windows ; `Cmd + Maj + R` sur Mac). Cette version porte un nouveau cache PWA et remplacera automatiquement l’ancien cache après le premier rechargement en ligne.
