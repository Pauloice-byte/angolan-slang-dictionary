/* =========================================
   ANGOLAN SLANG DICTIONARY
   MAIN APPLICATION
========================================= */


/* =========================================
   APP STATE
========================================= */

const appState = {

    currentPage: "home",

    previousPage: "home",

    savedWords: JSON.parse(
        localStorage.getItem(
            "angolanSlangSavedWords"
        )
    ) || [],

};


/* =========================================
   TEMPORARY DEMO DATA

   IMPORTANT:
   This is NOT the permanent dictionary.

   These entries exist only so that we can
   build and test the application interface.

   Later:

   Supabase
       ↓
   loadWords()
       ↓
   App
========================================= */

const demoWords = [

    {
        id: 1,
        word: "Kota",
        meaning: "Temporary demonstration meaning.",
        example: "Temporary example.",
        alternatives: []
    },

    {
        id: 2,
        word: "Bazar",
        meaning: "Temporary demonstration meaning.",
        example: "Temporary example.",
        alternatives: []
    },

    {
        id: 3,
        word: "Mambo",
        meaning: "Temporary demonstration meaning.",
        example: "Temporary example.",
        alternatives: []
    }

];


/* =========================================
   DAILY WORDS

   Temporary only.
========================================= */

const dailyWords = [

    demoWords[0],

    demoWords[1],

    demoWords[2]

];


/* =========================================
   NAVIGATION
========================================= */

function navigateTo(page) {

    appState.previousPage =
        appState.currentPage;

    appState.currentPage = page;

    closeMenu();

    updateNavigation();

    renderPage();

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================
   UPDATE NAVIGATION
========================================= */

function updateNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach((item) => {

        item.classList.remove("active");


        if (
            item.dataset.page ===
            appState.currentPage
        ) {

            item.classList.add("active");

        }

    });

}


/* =========================================
   PAGE ROUTER
========================================= */

function renderPage() {

    const mainContent =
        document.getElementById(
            "main-content"
        );


    switch (
        appState.currentPage
    ) {

        case "home":

            mainContent.innerHTML =
                renderHome();

            break;


        case "dictionary":

            mainContent.innerHTML =
                renderComingSoon(
                    "Dictionary",
                    "The complete dictionary experience is being built."
                );

            break;


        case "search":

            mainContent.innerHTML =
                renderComingSoon(
                    "Search",
                    "Search will allow users to find words, meanings and expressions."
                );

            break;


        case "saved":

            mainContent.innerHTML =
                renderComingSoon(
                    "Saved Words",
                    "Your favourite words will appear here."
                );

            break;


        case "daily":

            mainContent.innerHTML =
                renderDailyPage();

            break;


        case "updates":

            mainContent.innerHTML =
                renderUpdates();

            break;


        case "about":

            mainContent.innerHTML =
                renderAbout();

            break;


        case "settings":

            mainContent.innerHTML =
                renderComingSoon(
                    "Settings",
                    "Personalisation and application settings will appear here."
                );

            break;


        default:

            mainContent.innerHTML =
                renderHome();

    }

}


/* =========================================
   HOME PAGE
========================================= */

function renderHome() {

    return `

        <section class="home-page">

            <section class="hero">

                <p class="eyebrow">
                    ANGOLA IN WORDS
                </p>


                <h2>

                    The words.

                    <br>

                    The culture.

                    <br>

                    <span>
                        The meaning.
                    </span>

                </h2>


                <p class="hero-description">

                    Discover the expressions,
                    slang and everyday language
                    that bring Angolan culture
                    to life.

                </p>


                <button
                    class="primary-button"
                    type="button"
                    onclick="navigateTo('dictionary')"
                >

                    Explore Dictionary

                    <span>
                        →
                    </span>

                </button>

            </section>


            <section class="home-search">

                <div
                    class="search-box"
                    onclick="navigateTo('search')"
                >

                    <span>
                        ⌕
                    </span>


                    <input
                        type="text"
                        placeholder="Search for a word..."
                        readonly
                        aria-label="Search dictionary"
                    >

                </div>

            </section>


            <section class="daily-section">

                <div class="section-heading">

                    <div>

                        <p class="eyebrow">
                            DISCOVER TODAY
                        </p>


                        <h2>
                            3 Words of the Day
                        </h2>

                    </div>


                    <button
                        class="text-button"
                        type="button"
                        onclick="navigateTo('daily')"
                    >
                        View all →
                    </button>

                </div>


                <div class="daily-slider">

    <div class="daily-slider-track">

        ${dailyWords.map(
            (item, index) => `

            <article class="daily-slide">

                <div class="daily-card">

                    <span class="daily-number">

                        ${String(index + 1).padStart(2, "0")} / 03

                    </span>

                    <h3>

                        ${item.word}

                    </h3>

                    <p>

                        Discover today's word.

                    </p>

                    <button
                        type="button"
                        onclick="openDemoWord(${item.id})"
                    >

                        Discover →

                    </button>

                </div>

            </article>

        `
        ).join("")}

    </div>

</div>


<div class="slider-dots">

    ${dailyWords.map(
        (_, index) => `

        <button
            class="slider-dot ${index === 0 ? "active" : ""}"
            type="button"
            aria-label="Go to word ${index + 1}"
        ></button>

    `
    ).join("")}

</div>

            </section>

        </section>

    `;

}


/* =========================================
   DAILY PAGE
========================================= */

function renderDailyPage() {

    return `

        <section class="home-page">

            <p class="eyebrow">
                TODAY'S DISCOVERY
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                3 Words of the Day
            </h2>


            <div
                class="daily-grid"
                style="
                    margin-top: 30px;
                "
            >

                ${dailyWords.map(
                    (item, index) => `

                    <article class="daily-card">

                        <span class="daily-number">

                            0${index + 1}

                        </span>


                        <h3>

                            ${item.word}

                        </h3>


                        <p>

                            Discover today's word.

                        </p>


                        <button
                            type="button"
                            onclick="openDemoWord(${item.id})"
                        >

                            Discover →

                        </button>

                    </article>

                `
                ).join("")}

            </div>

        </section>

    `;

}


/* =========================================
   TEMPORARY WORD PREVIEW
========================================= */

function openDemoWord(id) {

    const word =
        demoWords.find(
            (item) => item.id === id
        );


    if (!word) {

        return;

    }


    appState.previousPage =
        appState.currentPage;


    const mainContent =
        document.getElementById(
            "main-content"
        );


    mainContent.innerHTML = `

        <section class="home-page">

            <button
                class="text-button"
                type="button"
                onclick="navigateTo(
                    '${appState.previousPage}'
                )"
            >

                ← Back

            </button>


            <div
                class="hero"
                style="
                    margin-top: 25px;
                "
            >

                <p class="eyebrow">
                    WORD PREVIEW
                </p>


                <h2>

                    ${word.word}

                </h2>


                <p
                    class="hero-description"
                >

                    ${word.meaning}

                </p>


                <div
                    style="
                        margin-top: 28px;
                        padding: 22px;
                        background: var(--surface-soft);
                        border-radius: var(--radius-md);
                        color: var(--text-secondary);
                        line-height: 1.7;
                    "
                >

                    “${word.example}”

                </div>

            </div>

        </section>

    `;


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================
   UPDATES PAGE
========================================= */

function renderUpdates() {

    return `

        <section class="home-page">

            <p class="eyebrow">
                WHAT'S NEW
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                Updates
            </h2>


            <div
                class="hero"
                style="
                    margin-top: 30px;
                "
            >

                <p class="eyebrow">

                    COMING SOON

                </p>


                <h3
                    style="
                        font-size: 28px;
                    "
                >

                    New update

                </h3>


                <p class="hero-description">

                    A new dictionary update
                    will be announced here.

                    In the future, updates such as
                    “New update coming on September 1st, 2026”
                    can be created directly from
                    the admin dashboard.

                </p>

            </div>

        </section>

    `;

}


/* =========================================
   ABOUT PAGE
========================================= */

function renderAbout() {

    return `

        <section class="home-page">

            <p class="eyebrow">
                THE PROJECT
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                About
            </h2>


            <div
                class="hero"
                style="
                    margin-top: 30px;
                "
            >

                <h3
                    style="
                        font-size: 30px;
                    "
                >

                    Angolan Slang Dictionary

                </h3>


                <p class="hero-description">

                    A digital dictionary designed
                    to preserve, explore and share
                    Angolan slang, expressions
                    and everyday language.

                </p>

            </div>

        </section>

    `;

}


/* =========================================
   GENERIC PLACEHOLDER PAGE
========================================= */

function renderComingSoon(
    title,
    description
) {

    return `

        <section class="home-page">

            <div class="hero">

                <p class="eyebrow">
                    UNDER DEVELOPMENT
                </p>


                <h2>

                    ${title}

                </h2>


                <p class="hero-description">

                    ${description}

                </p>


                <div
                    style="
                        margin-top: 30px;
                        padding: 20px;
                        background: var(--gold-light);
                        border-radius: var(--radius-md);
                        color: var(--text-primary);
                    "
                >

                    We are building this section
                    step by step.

                </div>

            </div>

        </section>

    `;

}


/* =========================================
   MENU
========================================= */

const menuButton =
    document.getElementById(
        "menu-button"
    );


const closeMenuButton =
    document.getElementById(
        "close-menu"
    );


const sideMenu =
    document.getElementById(
        "side-menu"
    );


const menuOverlay =
    document.getElementById(
        "menu-overlay"
    );


function openMenu() {

    sideMenu.classList.add("open");

    menuOverlay.classList.add("open");

}


function closeMenu() {

    sideMenu.classList.remove("open");

    menuOverlay.classList.remove("open");

}


menuButton.addEventListener(
    "click",
    openMenu
);


closeMenuButton.addEventListener(
    "click",
    closeMenu
);


menuOverlay.addEventListener(
    "click",
    closeMenu
);


/* =========================================
   BOTTOM NAVIGATION
========================================= */

document
    .querySelectorAll(".nav-item")
    .forEach((item) => {

        item.addEventListener(
            "click",
            () => {

                navigateTo(
                    item.dataset.page
                );

            }
        );

    });


/* =========================================
   INITIALIZE APPLICATION
========================================= */
document.addEventListener(
    "scroll",
    () => {

        const slider =
            document.querySelector(
                ".daily-slider"
            );


        if (!slider) {

            return;

        }


        const slideWidth =
            slider.clientWidth;


        const currentIndex =
            Math.round(
                slider.scrollLeft /
                slideWidth
            );


        const dots =
            document.querySelectorAll(
                ".slider-dot"
            );


        dots.forEach(
            (dot, index) => {

                dot.classList.toggle(
                    "active",
                    index === currentIndex
                );

            }
        );

    },
    true
);
renderPage();
