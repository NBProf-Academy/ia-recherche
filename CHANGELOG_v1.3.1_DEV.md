# NBProf Research Hub v1.3.1 — Recherche scientifique unifiée

## Nouveautés
- La barre de recherche de l’accueil devient un point d’entrée scientifique unifié.
- Les publications NBProf pertinentes sont affichées en priorité.
- Recherche externe via Semantic Scholar, avec repli Crossref en cas d’indisponibilité.
- Classement local transparent par pertinence estimée (métadonnées + rang du moteur).
- Filtres : Tous / NBProf / Articles scientifiques / Outils.
- Affichage des auteurs, année, revue, DOI, résumé et PDF ouvert lorsqu’ils sont disponibles.
- Catalogue local `data/publications.json`, extensible pour ajouter les prochaines publications NBProf.
- Interface FR / EN / AR et responsive mobile.
- Cache PWA mis à jour vers v1.3.1-dev.

## Choix technique
Aucune clé API privée n’est intégrée au dépôt. OpenAlex exige désormais une clé API ; il pourra être ajouté plus tard via un proxy sécurisé. Cette version privilégie Semantic Scholar et Crossref, utilisables sans exposer de secret dans le code client.

## Prudence scientifique
La pertinence affichée est une estimation de classement, pas une évaluation de la qualité méthodologique. L’utilisateur doit vérifier le texte intégral et la qualité scientifique avant citation.
