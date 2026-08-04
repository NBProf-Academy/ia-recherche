/* =====================================
   NBProf Research Hub V2
   Recherche principale
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("hubSearch");
    const searchButton = document.getElementById("hubSearchButton");

    if (!searchInput || !searchButton) {
        return;
    }

    function launchHubSearch() {
        const query = searchInput.value
            .toLowerCase()
            .trim();

        /*
         * Les variables tools, activecat,
         * searchTerm et renderCards existent
         * déjà dans index-v2.html.
         */
        if (
            typeof tools === "undefined" ||
            typeof renderCards !== "function"
        ) {
            console.error(
                "Le catalogue des outils n’est pas disponible."
            );
            return;
        }

        searchTerm = query;
        activecat = "all";

        document
            .querySelectorAll(".tab")
            .forEach((tab) => {
                tab.classList.toggle(
                    "active",
                    tab.dataset.cat === "all"
                );
            });

        renderCards();

        const resultsArea =
            document.getElementById("cardsContainer");

        if (resultsArea) {
            resultsArea.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    searchButton.addEventListener(
        "click",
        launchHubSearch
    );

    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            launchHubSearch();
        }
    });

    /*
     * Recherche instantanée à partir de 2 caractères.
     */
    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();

        if (query.length === 0 || query.length >= 2) {
            launchHubSearch();
        }
    });
});
/* =====================================
   Parcours rapides du chercheur
===================================== */

document.addEventListener("DOMContentLoaded", () => {

    const goalCards = document.querySelectorAll(".goal-card");

    const goalConfiguration = {

        recherche: {
            category: "recherche",
            message: "Outils recommandés pour trouver des articles scientifiques."
        },

        revue: {
            category: "lecture",
            message: "Outils recommandés pour lire, comprendre et synthétiser la littérature."
        },

        bibliographie: {
            category: "biblio",
            message: "Outils recommandés pour organiser vos références bibliographiques."
        },

        soutenance: {
            category: "presentation",
            message: "Outils recommandés pour préparer votre présentation et votre soutenance."
        }

    };

    goalCards.forEach((card) => {

        card.addEventListener("click", () => {

            const goal = card.dataset.goal;
            const configuration = goalConfiguration[goal];

            /*
             * Parcours qui ne possèdent pas encore
             * de catégorie dans le catalogue actuel.
             */
            if (!configuration) {

                const labels = {
                    redaction: "Le parcours « Rédaction scientifique » sera ajouté prochainement.",
                    analyse: "Le parcours « Analyse des données » sera ajouté prochainement."
                };

                if (typeof showToast === "function") {
                    showToast(
                        labels[goal] || "Ce parcours est en préparation.",
                        3500
                    );
                } else {
                    alert(
                        labels[goal] || "Ce parcours est en préparation."
                    );
                }

                return;
            }

            /*
             * Réinitialiser la recherche textuelle.
             */
            searchTerm = "";
            activecat = configuration.category;

            const oldSearch =
                document.getElementById("searchInput");

            const hubSearch =
                document.getElementById("hubSearch");

            if (oldSearch) {
                oldSearch.value = "";
            }

            if (hubSearch) {
                hubSearch.value = "";
            }

            /*
             * Activer le bon onglet.
             */
            document
                .querySelectorAll(".tab")
                .forEach((tab) => {

                    tab.classList.toggle(
                        "active",
                        tab.dataset.cat === configuration.category
                    );

                });

            /*
             * Afficher les outils correspondants.
             */
            renderCards();

            if (typeof showToast === "function") {
                showToast(configuration.message, 3000);
            }

            const resultsArea =
                document.getElementById("cardsContainer");

            if (resultsArea) {

                resultsArea.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });

});
