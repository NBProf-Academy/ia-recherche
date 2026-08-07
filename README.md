<div align="center">

<img src="./icon-192.png" alt="NBProf Research Hub" width="120" />

# NBProf Research Hub

### De l’idée à la soutenance

Une application web progressive (PWA) pour organiser un projet de recherche, suivre son avancement et transformer les données du chercheur en feuille de route, tableau de bord et rapport de synthèse.

**Version stable : v1.0.0**

[🌐 Ouvrir l’application](https://nbprof-academy.github.io/ia-recherche/) · [📦 Release v1.0.0](https://github.com/NBProf-Academy/ia-recherche/releases/tag/v1.0.0)

</div>

---

## À propos

**NBProf Research Hub** est un environnement de travail destiné aux étudiants, doctorants, enseignants-chercheurs et à toute personne souhaitant structurer un projet de recherche scientifique.

L’application adopte une approche **local-first** : les projets, jalons, tâches et notes de recherche sont enregistrés dans le navigateur de l’utilisateur. Le dépôt ne contient pas de backend pour stocker ces données sur un serveur distant.

L’objectif est de proposer un parcours simple et progressif : **définir une idée, structurer un projet, planifier les étapes, suivre les échéances, analyser l’avancement et préparer une synthèse exploitable**.

---

## Fonctionnalités principales

### 🧭 Assistant guidé de recherche — v1.0

L’assistant accompagne la création d’un projet en **4 étapes** :

1. **Votre sujet** — titre provisoire et idée/question de départ ;
2. **Votre objectif** — objectif principal, livrable visé, étape actuelle et rythme de planification ;
3. **Votre feuille de route** — génération d’une première structure de jalons et de tâches ;
4. **Validation** — contrôle final avant l’ajout du projet à l’espace personnel.

La feuille de route générée comprend des **jalons**, des **tâches initiales**, des **priorités** et des **échéances**. Elle reste modifiable après création.

### 📁 Gestion des projets

- création et modification des projets ;
- suivi par étape du cycle de recherche ;
- gestion des jalons ;
- création, modification et suppression des tâches ;
- priorités **faible / moyenne / élevée** ;
- dates d’échéance ;
- détection des tâches en retard ;
- calcul automatique de la progression ;
- notes de recherche ;
- import et export des sauvegardes au format JSON.

### 📊 Tableau de bord du chercheur

Le tableau de bord fournit une vue synthétique du portefeuille de recherche :

- nombre de projets actifs ;
- progression globale ;
- tâches en retard ;
- échéances proches ;
- priorités élevées ;
- vue globale des projets ;
- section **À traiter maintenant** ;
- répartition par étape du cycle de recherche ;
- recherche instantanée ;
- filtres par étape, priorité et échéance ;
- tri par mise à jour, progression, échéance ou nom.

### 📄 Rapport intelligent du chercheur

Le module Rapport transforme les données locales en une synthèse prête à être consultée ou imprimée :

- résumé exécutif automatique ;
- indicateurs clés ;
- état des projets ;
- tâches terminées et en retard ;
- échéances proches ;
- priorités élevées ;
- points d’attention ;
- répartition par étape de recherche ;
- impression et **export PDF A4** via le navigateur.

### 🔎 Parcours, méthodes et outils

NBProf Research Hub propose également des parcours pratiques pour :

- trouver des articles scientifiques ;
- réaliser une revue de littérature ;
- rédiger un travail scientifique ;
- gérer les références bibliographiques ;
- préparer et analyser les données ;
- préparer une publication ou une soutenance.

Un répertoire d’outils accompagne ces parcours afin d’orienter le chercheur vers des ressources adaptées à chaque besoin.

---

## 🌍 Langues

L’interface est disponible en :

- 🇫🇷 Français
- 🇬🇧 English
- 🇲🇦 العربية

Le choix de langue est mémorisé localement dans le navigateur.

---

## 📱 PWA et fonctionnement hors connexion

NBProf Research Hub est une **Progressive Web App**.

Après une première visite en ligne, les ressources essentielles peuvent être mises en cache par le service worker afin de faciliter l’utilisation hors connexion. L’application peut également être installée depuis un navigateur compatible sur ordinateur, tablette ou smartphone.

> Les données de projet sont liées au navigateur et au domaine utilisés. Une suppression des données du navigateur peut effacer les projets locaux. Utilisez régulièrement **Exporter mes projets** pour conserver une sauvegarde JSON.

---

## 🔐 Confidentialité et stockage des données

Le projet suit une logique **local-first** :

- aucun compte utilisateur n’est requis dans la version v1.0.0 ;
- aucun backend de synchronisation des projets n’est inclus ;
- les données de recherche sont enregistrées dans le stockage local du navigateur ;
- l’utilisateur peut exporter ses projets dans un fichier JSON puis les réimporter ;
- les rapports sont générés à partir des données présentes sur l’appareil.

Cette architecture privilégie la simplicité et le contrôle local des données. Elle implique toutefois que **la sauvegarde des projets relève de l’utilisateur**.

---

## 🚀 Utiliser l’application en ligne

La version publique est disponible sur GitHub Pages :

**https://nbprof-academy.github.io/ia-recherche/**

Pour forcer le chargement de la dernière version après une mise à jour :

- **macOS :** `Cmd + Maj + R`
- **Windows / Linux :** `Ctrl + F5`

---

## 💻 Lancer le projet en local

Aucune compilation n’est nécessaire. Le projet repose sur des fichiers HTML, CSS et JavaScript statiques.

### 1. Télécharger le dépôt

Téléchargez le code source depuis GitHub ou depuis la Release v1.0.0.

### 2. Ouvrir le dossier dans un terminal

```bash
cd chemin/vers/ia-recherche
```

### 3. Lancer un serveur HTTP local

Avec Python 3 :

```bash
python3 -m http.server 8080
```

Puis ouvrez :

```text
http://localhost:8080/
```

> L’utilisation d’un serveur HTTP local est recommandée pour tester correctement le service worker, les fichiers JSON et les chemins relatifs.

---

## 🗂️ Structure du projet

```text
ia-recherche/
├── index.html                 # Accueil
├── pages/
│   ├── assistant.html         # Assistant guidé v1.0
│   ├── dashboard.html         # Tableau de bord
│   ├── projets.html           # Gestion des projets
│   ├── rapport.html           # Rapport intelligent
│   └── parcours.html          # Parcours méthodologiques
├── js/
│   ├── assistant.js
│   ├── dashboard.js
│   ├── projects.js
│   ├── report.js
│   ├── journey.js
│   ├── i18n.js
│   └── app-v2.js
├── css/
│   └── style-v2.css
├── data/
│   ├── journeys.json
│   └── tools.json
├── lang/
│   ├── fr.json
│   ├── en.json
│   └── ar.json
├── manifest.json              # Configuration PWA
├── sw.js                      # Service worker / cache hors connexion
├── offline.html               # Page hors connexion
├── README_DEPLOIEMENT.md      # Notes de déploiement
└── CHANGELOG_*.md             # Historique des versions
```

---

## 🧱 Architecture technique

- **HTML5** — structure de l’interface ;
- **CSS3** — design responsive et mise en page d’impression ;
- **JavaScript natif** — logique applicative ;
- **JSON** — parcours, outils, traductions et sauvegardes ;
- **localStorage** — persistance locale des projets et préférences ;
- **Service Worker + Web App Manifest** — fonctionnalités PWA ;
- **GitHub Pages** — hébergement statique ;
- **GitHub Actions** — déploiement automatisé.

Le projet ne nécessite actuellement ni framework JavaScript, ni base de données, ni serveur applicatif.

---

## 🧪 Historique fonctionnel

| Version | Évolution principale |
|---|---|
| **v1.0.0** | Assistant guidé de création d’un projet de recherche |
| **v0.9.0** | Rapport intelligent et export PDF |
| **v0.8.0** | Recherche, filtres et tri du tableau de bord |
| **v0.7.0** | Tableau de bord du chercheur |
| **v0.6.0** | Échéances, priorités et indicateurs de tâches |
| **v0.5.0** | Édition avancée des projets |
| **v0.4.1** | Import des sauvegardes de projets |

Les détails de chaque évolution sont disponibles dans les fichiers `CHANGELOG_*.md` et dans les Releases GitHub.

---

## ✅ État de la version v1.0.0

La version v1.0.0 a été :

- testée localement ;
- validée fonctionnellement ;
- fusionnée dans la branche `main` ;
- déployée sur GitHub Pages ;
- sauvegardée dans `version-stable-v1.0.0` ;
- publiée comme Release GitHub officielle sous le tag `v1.0.0`.

---

## 🛠️ Déploiement

Le dépôt est configuré pour être publié sur GitHub Pages. Pour les détails techniques et les vérifications de déploiement, consultez :

[`README_DEPLOIEMENT.md`](./README_DEPLOIEMENT.md)

---

## ⚠️ Limites actuelles

La version v1.0.0 est volontairement **local-first**. Elle ne propose pas encore :

- de compte utilisateur ;
- de synchronisation multi-appareils ;
- de stockage cloud des projets ;
- de collaboration temps réel ;
- de génération par un modèle d’IA distant.

L’Assistant guidé de la v1.0 fournit une **structure méthodologique initiale** à adapter au contexte scientifique réel de chaque recherche.

---

## 🤝 Signaler un problème ou proposer une amélioration

Les retours peuvent être déposés dans l’onglet **Issues** du dépôt GitHub. Pour un signalement technique, indiquez si possible :

- le navigateur et le système utilisés ;
- la page concernée ;
- les étapes permettant de reproduire le problème ;
- une capture d’écran si elle aide au diagnostic.

---

<div align="center">

### NBProf Research Hub

**De l’idée à la soutenance.**

© 2026 Noamane Boulahcen — NB Prof

</div>
