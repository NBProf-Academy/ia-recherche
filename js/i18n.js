/* =====================================
   NBProf Research Hub
   Système multilingue
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const languageButton =
        document.getElementById("languageButton");

    const languageMenu =
        document.getElementById("languageMenu");

    const currentLanguageLabel =
        document.getElementById("currentLanguageLabel");

    const languageOptions =
        document.querySelectorAll(".language-option");

    const availableLanguages = {
        fr: {
            label: "Français",
            direction: "ltr"
        },
        en: {
            label: "English",
            direction: "ltr"
        },
        ar: {
            label: "العربية",
            direction: "rtl"
        }
    };

    async function loadLanguage(languageCode) {
        const language =
            availableLanguages[languageCode] || availableLanguages.fr;

        try {
            const response = await fetch(
                `lang/${languageCode}.json`,
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error(
                    `Impossible de charger la langue ${languageCode}`
                );
            }

            const translations = await response.json();

            document
                .querySelectorAll("[data-i18n]")
                .forEach((element) => {
                    const key = element.dataset.i18n;

                    if (translations[key] !== undefined) {
                        element.textContent = translations[key];
                    }
                });

            document
                .querySelectorAll("[data-i18n-placeholder]")
                .forEach((element) => {
                    const key =
                        element.dataset.i18nPlaceholder;

                    if (translations[key] !== undefined) {
                        element.setAttribute(
                            "placeholder",
                            translations[key]
                        );
                    }
                });

            document.documentElement.lang = languageCode;
            document.documentElement.dir = language.direction;

            currentLanguageLabel.textContent =
                language.label;

            languageOptions.forEach((option) => {
                option.classList.toggle(
                    "active",
                    option.dataset.lang === languageCode
                );
            });

            localStorage.setItem(
                "nbprof-language",
                languageCode
            );

            closeLanguageMenu();

        } catch (error) {
            console.error(error);
        }
    }

    function openLanguageMenu() {
        languageMenu.hidden = false;
        languageButton.setAttribute(
            "aria-expanded",
            "true"
        );
    }

    function closeLanguageMenu() {
        languageMenu.hidden = true;
        languageButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    function toggleLanguageMenu() {
        if (languageMenu.hidden) {
            openLanguageMenu();
        } else {
            closeLanguageMenu();
        }
    }

    languageButton.addEventListener(
        "click",
        (event) => {
            event.stopPropagation();
            toggleLanguageMenu();
        }
    );

    languageOptions.forEach((option) => {
        option.addEventListener("click", () => {
            loadLanguage(option.dataset.lang);
        });
    });

    document.addEventListener("click", (event) => {
        if (
            !languageMenu.contains(event.target) &&
            !languageButton.contains(event.target)
        ) {
            closeLanguageMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeLanguageMenu();
            languageButton.focus();
        }
    });

    const savedLanguage =
        localStorage.getItem("nbprof-language");

    const browserLanguage =
        navigator.language
            .slice(0, 2)
            .toLowerCase();

    const initialLanguage =
        availableLanguages[savedLanguage]
            ? savedLanguage
            : availableLanguages[browserLanguage]
                ? browserLanguage
                : "fr";

    loadLanguage(initialLanguage);
});
