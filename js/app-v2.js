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
