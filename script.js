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

    user: null,

    profile: null,

    words: [],

    categories: [],

    dailyWords: [],

    savedWords: [],

    dictionaryLoaded: false,

    dailyLoaded: false,

    savedLoaded: false

};


/* =========================================
   AUTHENTICATION
========================================= */

async function loadCurrentUser() {

    try {

        const {
            data: {
                user
            },
            error
        } = await supabaseClient.auth.getUser();


        if (error) {

            console.error(
                "Authentication error:",
                error
            );

            return null;

        }


        if (!user) {

            return null;

        }


        appState.user = user;


        /* =====================================
           LOAD PROFILE
        ===================================== */

        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select(
                "id, email, full_name, role, onboarding_completed"
            )
            .eq(
                "id",
                user.id
            )
            .single();


        if (profileError) {

            console.error(
                "Profile loading error:",
                profileError
            );

            return user;

        }


        appState.profile = profile;


        return user;

    }

    catch (error) {

        console.error(
            "User loading error:",
            error
        );

        return null;

    }

}


/* =========================================
   GET USER NAME
========================================= */

function getUserName() {

    if (
        appState.profile &&
        appState.profile.full_name
    ) {

        return appState.profile.full_name
            .trim()
            .split(" ")[0];

    }


    if (
        appState.user &&
        appState.user.user_metadata &&
        appState.user.user_metadata.full_name
    ) {

        return appState.user.user_metadata.full_name
            .trim()
            .split(" ")[0];

    }


    return "there";

}


/* =========================================
   LOAD CATEGORIES
========================================= */

async function loadCategories() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("categories")
            .select(
                "id, name, description, display_order"
            )
            .eq(
                "is_active",
                true
            )
            .order(
                "display_order",
                {
                    ascending: true
                }
            );


        if (error) {

            throw error;

        }


        appState.categories =
            data || [];


    }

    catch (error) {

        console.error(
            "Category loading error:",
            error
        );

        appState.categories = [];

    }

}


/* =========================================
   LOAD WORDS FROM SUPABASE
========================================= */

async function loadDictionaryWords() {

    try {

        /* =====================================
           WORDS
        ===================================== */

        const {
            data: words,
            error: wordsError
        } = await supabaseClient
            .from("words")
            .select(`
                id,
                word,
                pronunciation,
                word_type,
                category_id,
                pack_id,
                is_premium,
                is_published,
                word_audio_path,
                short_meaning,
                context_notes,
                created_at
            `)
            .eq(
                "is_published",
                true
            )
            .order(
                "word",
                {
                    ascending: true
                }
            );


        if (wordsError) {

            throw wordsError;

        }


        const loadedWords =
            words || [];


        /* =====================================
           MEANINGS
        ===================================== */

        const wordIds =
            loadedWords.map(
                word => word.id
            );


        let meanings = [];


        if (wordIds.length > 0) {

            const {
                data,
                error
            } = await supabaseClient
                .from("meanings")
                .select(`
                    id,
                    word_id,
                    meaning,
                    display_order
                `)
                .in(
                    "word_id",
                    wordIds
                )
                .order(
                    "display_order",
                    {
                        ascending: true
                    }
                );


            if (error) {

                throw error;

            }


            meanings =
                data || [];

        }


        /* =====================================
           EXAMPLES
        ===================================== */

        const meaningIds =
            meanings.map(
                meaning => meaning.id
            );


        let examples = [];


        if (meaningIds.length > 0) {

            const {
                data,
                error
            } = await supabaseClient
                .from("examples")
                .select(`
                    id,
                    meaning_id,
                    example_text,
                    audio_path,
                    display_order
                `)
                .in(
                    "meaning_id",
                    meaningIds
                )
                .order(
                    "display_order",
                    {
                        ascending: true
                    }
                );


            if (error) {

                throw error;

            }


            examples =
                data || [];

        }


        /* =====================================
           ORGANISE MEANINGS
        ===================================== */

        const meaningsByWord = {};


        meanings.forEach(
            meaning => {

                if (
                    !meaningsByWord[
                        meaning.word_id
                    ]
                ) {

                    meaningsByWord[
                        meaning.word_id
                    ] = [];

                }


                meaningsByWord[
                    meaning.word_id
                ].push({

                    id:
                        meaning.id,

                    meaning:
                        meaning.meaning,

                    displayOrder:
                        meaning.display_order,

                    examples: []

                });

            }
        );


        /* =====================================
           ATTACH EXAMPLES
        ===================================== */

        examples.forEach(
            example => {

                const meaning =
                    meanings.find(
                        item =>
                            item.id ===
                            example.meaning_id
                    );


                if (!meaning) {

                    return;

                }


                const wordMeanings =
                    meaningsByWord[
                        meaning.word_id
                    ];


                if (!wordMeanings) {

                    return;

                }


                const targetMeaning =
                    wordMeanings.find(
                        item =>
                            item.id ===
                            meaning.id
                    );


                if (!targetMeaning) {

                    return;

                }


                targetMeaning.examples.push({

                    id:
                        example.id,

                    exampleText:
                        example.example_text,

                    audioPath:
                        example.audio_path,

                    displayOrder:
                        example.display_order

                });

            }
        );


        /* =====================================
           CREATE FINAL WORD OBJECTS
        ===================================== */

        appState.words =
            loadedWords.map(
                word => {

                    const category =
                        appState.categories.find(
                            item =>
                                item.id ===
                                word.category_id
                        );


                    const wordMeanings =
                        meaningsByWord[
                            word.id
                        ] || [];


                    const firstMeaning =
                        wordMeanings[0];


                    const firstExample =
                        firstMeaning &&
                        firstMeaning.examples &&
                        firstMeaning.examples.length > 0

                            ? firstMeaning.examples[0]

                            : null;


                    return {

                        id:
                            word.id,

                        word:
                            word.word,

                        pronunciation:
                            word.pronunciation || "",

                        wordType:
                            word.word_type || "",

                        categoryId:
                            word.category_id || null,

                        categoryName:
                            category
                                ? category.name
                                : "",

                        packId:
                            word.pack_id || null,

                        isPremium:
                            Boolean(
                                word.is_premium
                            ),

                        isPublished:
                            Boolean(
                                word.is_published
                            ),

                        wordAudioPath:
                            word.word_audio_path || "",

                        shortMeaning:
                            word.short_meaning || "",

                        contextNotes:
                            word.context_notes || "",

                        createdAt:
                            word.created_at,

                        meanings:
                            wordMeanings,

                        firstMeaning:
                            firstMeaning
                                ? firstMeaning.meaning
                                : word.short_meaning || "",

                        firstExample:
                            firstExample
                                ? firstExample.exampleText
                                : ""

                    };

                }
            );


        appState.dictionaryLoaded =
            true;


        console.log(
            "Words loaded from Supabase:",
            appState.words.length
        );


    }

    catch (error) {

        console.error(
            "Dictionary loading error:",
            error
        );

        appState.words = [];

        appState.dictionaryLoaded =
            false;

    }

}


/* =========================================
   LOAD SAVED WORDS FROM SUPABASE
========================================= */

async function loadSavedWords() {

    if (!appState.user) {

        appState.savedWords = [];

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("saved_words")
            .select(
                "word_id"
            )
            .eq(
                "user_id",
                appState.user.id
            );


        if (error) {

            throw error;

        }


        appState.savedWords =
            (data || []).map(
                item =>
                    item.word_id
            );


        appState.savedLoaded =
            true;


        console.log(
            "Saved words loaded:",
            appState.savedWords.length
        );


    }

    catch (error) {

        console.error(
            "Saved words loading error:",
            error
        );

        appState.savedWords = [];

        appState.savedLoaded =
            false;

    }

}


/* =========================================
   LOAD DAILY 3
========================================= */

async function loadDailyWords() {

    if (!appState.user) {

        appState.dailyWords = [];

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .rpc(
                "get_or_create_daily_three"
            );


        if (error) {

            throw error;

        }


        let dailyRecord = data;


        if (
            Array.isArray(
                dailyRecord
            )
        ) {

            dailyRecord =
                dailyRecord[0];

        }


        if (!dailyRecord) {

            appState.dailyWords = [];

            return;

        }


        const wordIds = [

            dailyRecord.word_1_id,

            dailyRecord.word_2_id,

            dailyRecord.word_3_id

        ].filter(
            id =>
                id !== null &&
                id !== undefined
        );


        if (!wordIds.length) {

            appState.dailyWords = [];

            return;

        }


        /*
           Use the words already loaded from
           Supabase instead of querying them again.
        */

        appState.dailyWords =
            wordIds
                .map(
                    id =>
                        appState.words.find(
                            word =>
                                word.id === id
                        )
                )
                .filter(Boolean);


        appState.dailyLoaded =
            true;


    }

    catch (error) {

        console.error(
            "Daily 3 loading error:",
            error
        );

        appState.dailyWords = [];

        appState.dailyLoaded =
            false;

    }

}


/* =========================================
   LOAD APP DATA
========================================= */

async function loadAppData() {

    await loadCurrentUser();

    await loadCategories();

    await loadDictionaryWords();

    await loadSavedWords();

    await loadDailyWords();

}


/* =========================================
   NAVIGATION
========================================= */

function navigateTo(page) {

    appState.previousPage =
        appState.currentPage;

    appState.currentPage =
        page;

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


    navItems.forEach(
        item => {

            item.classList.remove(
                "active"
            );


            if (
                item.dataset.page ===
                appState.currentPage
            ) {

                item.classList.add(
                    "active"
                );

            }

        }
    );

}


/* =========================================
   PAGE ROUTER
========================================= */

function renderPage() {

    const mainContent =
        document.getElementById(
            "main-content"
        );


    if (!mainContent) {

        return;

    }


    updateNavigation();


    switch (
        appState.currentPage
    ) {

        case "home":

            mainContent.innerHTML =
                renderHome();

            break;


        case "dictionary":

            mainContent.innerHTML =
                renderDictionary();

            setTimeout(
                setupDictionary,
                0
            );

            break;


        case "search":

            mainContent.innerHTML =
                renderSearch();

            setTimeout(
                setupSearch,
                0
            );

            break;


        case "saved":

            mainContent.innerHTML =
                renderSaved();

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


        case "word-detail":

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

    const userName =
        getUserName();


    const dailyWords =
        appState.dailyWords;


    return `

        <section class="home-page">

            <section class="hero">

                <p class="eyebrow">
                    ANGOLA IN WORDS
                </p>


                <h2>

                    Welcome1,

                    <br>

                    ${escapeHtml(userName)}.

                    <br>

                    <span>
                        Let's discover.
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


                ${
                    dailyWords.length > 0

                        ? `

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

                                                    ${escapeHtml(
                                                        item.word
                                                    )}

                                                </h3>

                                                <p>

                                                    ${
                                                        item.isPremium
                                                            ? "Premium word — Coming Soon."
                                                            : escapeHtml(
                                                                item.shortMeaning ||
                                                                "Discover today's word."
                                                            )
                                                    }

                                                </p>

                                                <button
                                                    type="button"
                                                    onclick="openWord(${item.id})"
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
                                        onclick="goToDailySlide(${index})"
                                    ></button>

                                `
                                ).join("")}

                            </div>

                        `

                        : `

                            <div class="daily-card">

                                <span class="daily-number">
                                    03
                                </span>

                                <h3>
                                    Your Daily 3
                                </h3>

                                <p>
                                    Your three words for today
                                    are being loaded.
                                </p>

                            </div>

                        `
                }

            </section>

        </section>

    `;

}


/* =========================================
   DICTIONARY PAGE
========================================= */

function renderDictionary() {

    return `

        <section class="home-page">

            <p class="eyebrow">
                THE DICTIONARY
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                Explore words.
            </h2>


            <p class="hero-description">

                Explore Angolan slang,
                expressions and everyday language.

            </p>


            <div
                class="search-box"
                style="
                    margin-top: 30px;
                "
            >

                <span>
                    ⌕
                </span>


                <input
                    id="dictionary-search"
                    type="search"
                    placeholder="Search for a word or meaning..."
                    aria-label="Search dictionary"
                >

            </div>


            <div
                id="dictionary-categories"
                style="
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 20px;
                "
            >

                <button
                    class="text-button dictionary-category active"
                    type="button"
                    data-category="all"
                >
                    All
                </button>


                ${
                    appState.categories.map(
                        category => `

                            <button
                                class="text-button dictionary-category"
                                type="button"
                                data-category="${category.id}"
                            >

                                ${escapeHtml(
                                    category.name
                                )}

                            </button>

                        `
                    ).join("")
                }

            </div>


            <div
                style="
                    margin-top: 25px;
                    color: var(--text-secondary);
                "
            >

                <span id="dictionary-count">
                    ${appState.words.length}
                    ${
                        appState.words.length === 1
                            ? "word"
                            : "words"
                    }
                </span>

            </div>


            <div
                id="dictionary-results"
                style="
                    display: grid;
                    gap: 18px;
                    margin-top: 20px;
                "
            >

                ${
                    renderDictionaryCards(
                        appState.words
                    )
                }

            </div>

        </section>

    `;

}


/* =========================================
   DICTIONARY CARD RENDERER
========================================= */

function renderDictionaryCards(
    words
) {

    if (!words.length) {

        return `

            <div class="hero">

                <p class="eyebrow">
                    DICTIONARY
                </p>


                <h3>
                    No words found.
                </h3>


                <p class="hero-description">
                    Try another word, meaning or category.
                </p>

            </div>

        `;

    }


    return words.map(
        word => {

            const saved =
                isWordSaved(
                    word.id
                );


            return `

                <article
                    class="daily-card"
                    style="
                        position: relative;
                    "
                >

                    ${
                        word.isPremium
                            ? `
                                <span
                                    style="
                                        position: absolute;
                                        top: 18px;
                                        right: 18px;
                                        background: var(--gold-light);
                                        color: var(--text-primary);
                                        padding: 6px 10px;
                                        border-radius: 999px;
                                        font-size: 11px;
                                        font-weight: 700;
                                        letter-spacing: .5px;
                                    "
                                >
                                    COMING SOON
                                </span>
                            `
                            : ""
                    }


                    ${
                        word.categoryName
                            ? `
                                <span class="eyebrow">
                                    ${escapeHtml(
                                        word.categoryName
                                    )}
                                </span>
                            `
                            : ""
                    }


                    ${
                        word.wordType
                            ? `
                                <span
                                    style="
                                        display: block;
                                        margin-top: 8px;
                                        color: var(--text-light);
                                        font-size: 12px;
                                        text-transform: uppercase;
                                        letter-spacing: .5px;
                                    "
                                >
                                    ${escapeHtml(
                                        word.wordType
                                    )}
                                </span>
                            `
                            : ""
                    }


                    <h3
                        style="
                            margin-top: 8px;
                        "
                    >

                        ${escapeHtml(
                            word.word
                        )}

                    </h3>


                    ${
                        word.pronunciation
                            ? `
                                <p
                                    style="
                                        color: var(--text-secondary);
                                        margin-top: -8px;
                                    "
                                >
                                    ${escapeHtml(
                                        word.pronunciation
                                    )}
                                </p>
                            `
                            : ""
                    }


                    ${
                        word.isPremium

                            ? `

                                <p
                                    style="
                                        margin-top: 15px;
                                        color: var(--text-secondary);
                                    "
                                >

                                    Premium content —
                                    Coming Soon.

                                </p>

                            `

                            : `

                                <p
                                    style="
                                        margin-top: 15px;
                                        color: var(--green);
                                        font-size: 13px;
                                        font-weight: 600;
                                    "
                                >

                                    Free word

                                </p>

                            `
                    }


                    <div
                        style="
                            display: flex;
                            align-items: center;
                            gap: 15px;
                            margin-top: 20px;
                            flex-wrap: wrap;
                        "
                    >

                        <button
                            class="text-button"
                            type="button"
                            onclick="openWord(${word.id})"
                        >

                            Open →

                        </button>


                        <button
                            class="text-button"
                            type="button"
                            onclick="toggleSavedWord(${word.id})"
                            aria-label="${
                                saved
                                    ? "Remove saved word"
                                    : "Save word"
                            }"
                        >

                            ${
                                saved
                                    ? "♥ Saved"
                                    : "♡ Save"
                            }

                        </button>

                    </div>

                </article>

            `;

        }
    ).join("");

}
/* =========================================
   DICTIONARY SEARCH + FILTER
========================================= */

function setupDictionary() {

    const input =
        document.getElementById(
            "dictionary-search"
        );


    const resultsContainer =
        document.getElementById(
            "dictionary-results"
        );


    const count =
        document.getElementById(
            "dictionary-count"
        );


    if (!input || !resultsContainer) {

        return;

    }


    let selectedCategory =
        "all";


    function updateResults() {

        const term =
            input.value
                .trim()
                .toLowerCase();


        let results =
            [...appState.words];


        /* =====================================
           SEARCH WORD + MEANINGS
        ===================================== */

        if (term) {

            results =
                results.filter(
                    word => {

                        const meaningText =
                            word.meanings
                                .map(
                                    meaning =>
                                        meaning.meaning
                                )
                                .join(" ");


                        const searchableText = [

                            word.word,

                            word.shortMeaning,

                            meaningText,

                            word.categoryName

                        ]
                            .join(" ")
                            .toLowerCase();


                        return searchableText.includes(
                            term
                        );

                    }
                );

        }


        /* =====================================
           CATEGORY
        ===================================== */

        if (
            selectedCategory !==
            "all"
        ) {

            results =
                results.filter(
                    word =>
                        String(
                            word.categoryId
                        ) ===
                        String(
                            selectedCategory
                        )
                );

        }


        resultsContainer.innerHTML =
            renderDictionaryCards(
                results
            );


        if (count) {

            count.textContent =
                `${results.length} ${
                    results.length === 1
                        ? "word"
                        : "words"
                }`;

        }

    }


    input.addEventListener(
        "input",
        updateResults
    );


    document
        .querySelectorAll(
            ".dictionary-category"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        document
                            .querySelectorAll(
                                ".dictionary-category"
                            )
                            .forEach(
                                item =>
                                    item.classList.remove(
                                        "active"
                                    )
                            );


                        button.classList.add(
                            "active"
                        );


                        selectedCategory =
                            button.dataset.category;


                        updateResults();

                    }
                );

            }
        );

}


/* =========================================
   SEARCH PAGE
========================================= */

function renderSearch() {

    return `

        <section class="home-page">

            <p class="eyebrow">
                SEARCH THE DICTIONARY
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                Find a word.
            </h2>


            <p class="hero-description">

                Search by the word itself
                or by its meaning.

            </p>


            <div
                class="search-box"
                style="
                    margin-top: 30px;
                "
            >

                <span>
                    ⌕
                </span>


                <input
                    id="main-search-input"
                    type="search"
                    placeholder="Search word or meaning..."
                    aria-label="Search word or meaning"
                    autocomplete="off"
                >

            </div>


            <div
                id="main-search-results"
                style="
                    display: grid;
                    gap: 18px;
                    margin-top: 25px;
                "
            ></div>

        </section>

    `;

}


/* =========================================
   SETUP SEARCH
========================================= */

function setupSearch() {

    const input =
        document.getElementById(
            "main-search-input"
        );


    const results =
        document.getElementById(
            "main-search-results"
        );


    if (!input || !results) {

        return;

    }


    function performSearch() {

        const term =
            input.value
                .trim()
                .toLowerCase();


        if (!term) {

            results.innerHTML = "";

            return;

        }


        const matches =
            appState.words.filter(
                word => {

                    const meaningText =
                        word.meanings
                            .map(
                                meaning =>
                                    meaning.meaning
                            )
                            .join(" ");


                    const searchableText = [

                        word.word,

                        word.shortMeaning,

                        meaningText,

                        word.categoryName

                    ]
                        .join(" ")
                        .toLowerCase();


                    return searchableText.includes(
                        term
                    );

                }
            );


        results.innerHTML =
            renderDictionaryCards(
                matches
            );

    }


    input.addEventListener(
        "input",
        performSearch
    );


    setTimeout(
        () => {

            input.focus();

        },
        100
    );

}


/* =========================================
   OPEN WORD
========================================= */

function openWord(id) {

    const word =
        appState.words.find(
            item =>
                item.id === id
        );


    if (!word) {

        return;

    }


    appState.previousPage =
        appState.currentPage;


    appState.currentPage =
        "word-detail";


    const mainContent =
        document.getElementById(
            "main-content"
        );


    mainContent.innerHTML =
        renderWordDetail(
            word
        );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================
   WORD DETAIL
========================================= */

function renderWordDetail(
    word
) {

    const saved =
        isWordSaved(
            word.id
        );


    /* =====================================
       PREMIUM WORD
    ===================================== */

    if (word.isPremium) {

        return `

            <section class="home-page">

                <button
                    class="text-button"
                    type="button"
                    onclick="goBack()"
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
                        PREMIUM
                    </p>


                    <h2>
                        ${escapeHtml(
                            word.word
                        )}
                    </h2>


                    ${
                        word.pronunciation
                            ? `
                                <p class="hero-description">
                                    ${escapeHtml(
                                        word.pronunciation
                                    )}
                                </p>
                            `
                            : ""
                    }


                    <div
                        style="
                            margin-top: 28px;
                            padding: 22px;
                            background: var(--gold-light);
                            border-radius: var(--radius-md);
                            color: var(--text-primary);
                            line-height: 1.7;
                        "
                    >

                        <strong>
                            Coming Soon
                        </strong>

                        <br><br>

                        This is premium dictionary
                        content. Full access is
                        coming soon.

                    </div>


                    <div
                        style="
                            margin-top: 20px;
                        "
                    >

                        <button
                            class="text-button"
                            type="button"
                            onclick="toggleSavedWord(${word.id})"
                        >

                            ${
                                saved
                                    ? "♥ Saved"
                                    : "♡ Save Word"
                            }

                        </button>

                    </div>

                </div>

            </section>

        `;

    }


    /* =====================================
       FREE WORD
    ===================================== */

    return `

        <section class="home-page">

            <button
                class="text-button"
                type="button"
                onclick="goBack()"
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

                    ${
                        word.categoryName
                            ? escapeHtml(
                                word.categoryName
                            )
                            : "DICTIONARY"
                    }

                </p>


                <div
                    style="
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 20px;
                    "
                >

                    <div>

                        <h2>

                            ${escapeHtml(
                                word.word
                            )}

                        </h2>


                        ${
                            word.wordType
                                ? `
                                    <p
                                        style="
                                            color: var(--text-secondary);
                                            text-transform: uppercase;
                                            font-size: 12px;
                                            letter-spacing: .5px;
                                        "
                                    >

                                        ${escapeHtml(
                                            word.wordType
                                        )}

                                    </p>
                                `
                                : ""
                        }


                        ${
                            word.pronunciation
                                ? `
                                    <p class="hero-description">

                                        ${escapeHtml(
                                            word.pronunciation
                                        )}

                                    </p>
                                `
                                : ""
                        }

                    </div>


                    <button
                        class="text-button"
                        type="button"
                        onclick="toggleSavedWord(${word.id})"
                        aria-label="Save word"
                    >

                        ${
                            saved
                                ? "♥"
                                : "♡"
                        }

                    </button>

                </div>


                ${
                    word.wordAudioPath
                        ? `
                            <button
                                class="primary-button"
                                type="button"
                                onclick="playAudio('${escapeAttribute(
                                    word.wordAudioPath
                                )}')"
                            >

                                Listen

                                <span>
                                    ▶
                                </span>

                            </button>
                        `
                        : ""
                }


                <div
                    style="
                        margin-top: 30px;
                    "
                >

                    <p class="eyebrow">
                        MEANING
                    </p>


                    ${
                        word.meanings.length > 0

                            ? word.meanings.map(
                                (meaning, index) => `

                                    <div
                                        style="
                                            margin-top: 20px;
                                        "
                                    >

                                        ${
                                            word.meanings.length > 1
                                                ? `
                                                    <span
                                                        style="
                                                            color: var(--text-secondary);
                                                            font-size: 13px;
                                                        "
                                                    >
                                                        Meaning ${index + 1}
                                                    </span>
                                                `
                                                : ""
                                        }


                                        <h3>

                                            ${escapeHtml(
                                                meaning.meaning
                                            )}

                                        </h3>


                                        ${
                                            meaning.examples
                                                .map(
                                                    example => `

                                                        <div
                                                            style="
                                                                margin-top: 15px;
                                                                padding: 20px;
                                                                background: var(--surface-soft);
                                                                border-radius: var(--radius-md);
                                                                color: var(--text-secondary);
                                                                line-height: 1.7;
                                                            "
                                                        >

                                                            “${escapeHtml(
                                                                example.exampleText
                                                            )}”


                                                            ${
                                                                example.audioPath
                                                                    ? `
                                                                        <br><br>

                                                                        <button
                                                                            class="text-button"
                                                                            type="button"
                                                                            onclick="playAudio('${escapeAttribute(
                                                                                example.audioPath
                                                                            )}')"
                                                                        >

                                                                            ▶ Listen

                                                                        </button>
                                                                    `
                                                                    : ""
                                                            }

                                                        </div>

                                                    `
                                                )
                                                .join("")
                                        }

                                    </div>

                                `
                            ).join("")

                            : `

                                <p class="hero-description">

                                    ${escapeHtml(
                                        word.shortMeaning ||
                                        "No meaning available."
                                    )}

                                </p>

                            `
                    }

                </div>


                ${
                    word.contextNotes
                        ? `
                            <div
                                style="
                                    margin-top: 30px;
                                "
                            >

                                <p class="eyebrow">
                                    CONTEXT
                                </p>

                                <p class="hero-description">

                                    ${escapeHtml(
                                        word.contextNotes
                                    )}

                                </p>

                            </div>
                        `
                        : ""
                }


                <div
                    style="
                        margin-top: 30px;
                    "
                >

                    <button
                        class="text-button"
                        type="button"
                        onclick="toggleSavedWord(${word.id})"
                    >

                        ${
                            saved
                                ? "♥ Saved"
                                : "♡ Save Word"
                        }

                    </button>

                </div>

            </div>

        </section>

    `;

}


/* =========================================
   SAVED WORD CHECK
========================================= */

function isWordSaved(
    wordId
) {

    return appState.savedWords.includes(
        wordId
    );

}


/* =========================================
   SAVE / REMOVE WORD
========================================= */

async function toggleSavedWord(
    wordId
) {

    if (!appState.user) {

        console.error(
            "No authenticated user."
        );

        return;

    }


    const alreadySaved =
        isWordSaved(
            wordId
        );


    /*
       Optimistic UI update.
    */

    if (alreadySaved) {

        appState.savedWords =
            appState.savedWords.filter(
                id =>
                    id !== wordId
            );

    } else {

        appState.savedWords.push(
            wordId
        );

    }


    try {

        if (alreadySaved) {

            const {
                error
            } = await supabaseClient
                .from("saved_words")
                .delete()
                .eq(
                    "user_id",
                    appState.user.id
                )
                .eq(
                    "word_id",
                    wordId
                );


            if (error) {

                throw error;

            }

        } else {

            const {
                error
            } = await supabaseClient
                .from("saved_words")
                .insert({

                    user_id:
                        appState.user.id,

                    word_id:
                        wordId

                });


            if (error) {

                throw error;

            }

        }


        /*
           Re-render the current page so
           the heart/save state changes.
        */

        if (
            appState.currentPage ===
            "word-detail"
        ) {

            const word =
                appState.words.find(
                    item =>
                        item.id ===
                        wordId
                );


            if (word) {

                document.getElementById(
                    "main-content"
                ).innerHTML =
                    renderWordDetail(
                        word
                    );

            }

        } else {

            renderPage();

        }

    }

    catch (error) {

        console.error(
            "Save word error:",
            error
        );


        /*
           Database operation failed,
           so restore the previous state.
        */

        if (alreadySaved) {

            appState.savedWords.push(
                wordId
            );

        } else {

            appState.savedWords =
                appState.savedWords.filter(
                    id =>
                        id !== wordId
                );

        }


        if (
            appState.currentPage ===
            "word-detail"
        ) {

            const word =
                appState.words.find(
                    item =>
                        item.id ===
                        wordId
                );


            if (word) {

                document.getElementById(
                    "main-content"
                ).innerHTML =
                    renderWordDetail(
                        word
                    );

            }

        }

    }

}


/* =========================================
   SAVED PAGE
========================================= */

function renderSaved() {

    const words =
        appState.words.filter(
            word =>
                appState.savedWords.includes(
                    word.id
                )
        );


    return `

        <section class="home-page">

            <p class="eyebrow">
                YOUR WORDS
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                Saved.
            </h2>


            <p class="hero-description">

                Words you found interesting
                and decided to keep.

            </p>


            <div
                style="
                    display: grid;
                    gap: 18px;
                    margin-top: 30px;
                "
            >

                ${
                    words.length

                        ? renderDictionaryCards(
                            words
                        )

                        : `

                            <div class="hero">

                                <p class="eyebrow">
                                    YOUR COLLECTION
                                </p>


                                <h3>
                                    No saved words yet.
                                </h3>


                                <p class="hero-description">

                                    When you find a word
                                    you like, tap the
                                    ♡ button to save it here.

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

                            </div>

                        `
                }

            </div>

        </section>

    `;

}


/* =========================================
   DAILY PAGE
========================================= */

function renderDailyPage() {

    const dailyWords =
        appState.dailyWords;


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


            ${
                dailyWords.length

                    ? `

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

                                        ${escapeHtml(
                                            item.word
                                        )}

                                    </h3>


                                    <p>

                                        ${
                                            item.isPremium
                                                ? "Premium content — Coming Soon."
                                                : escapeHtml(
                                                    item.shortMeaning ||
                                                    "Discover today's word."
                                                )
                                        }

                                    </p>


                                    <button
                                        type="button"
                                        onclick="openWord(${item.id})"
                                    >

                                        Discover →

                                    </button>

                                </article>

                            `
                            ).join("")}

                        </div>

                    `

                    : `

                        <div
                            class="hero"
                            style="
                                margin-top: 30px;
                            "
                        >

                            <p class="hero-description">

                                Your Daily 3 could not be
                                loaded right now.

                            </p>

                        </div>

                    `
            }

        </section>

    `;

}


/* =========================================
   AUDIO FROM SUPABASE STORAGE
========================================= */

async function playAudio(
    path
) {

    if (!path) {

        return;

    }


    try {

        const {
            data,
            error
        } = await supabaseClient
            .storage
            .from("audio")
            .createSignedUrl(
                path,
                3600
            );


        if (error) {

            throw error;

        }


        if (
            !data ||
            !data.signedUrl
        ) {

            return;

        }


        const audio =
            new Audio(
                data.signedUrl
            );


        await audio.play();

    }

    catch (error) {

        console.error(
            "Audio playback error:",
            error
        );

    }

}


/* =========================================
   DAILY SLIDER
========================================= */

function goToDailySlide(
    index
) {

    const slider =
        document.querySelector(
            ".daily-slider"
        );


    if (!slider) {

        return;

    }


    const width =
        slider.clientWidth;


    slider.scrollTo({

        left:
            width * index,

        behavior:
            "smooth"

    });

}


/* =========================================
   BACK
========================================= */

function goBack() {

    const previousPage =
        appState.previousPage ||
        "home";


    appState.currentPage =
        previousPage;


    renderPage();


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
                    COMING SOON
                </p>


                <h2>

                    ${escapeHtml(
                        title
                    )}

                </h2>


                <p class="hero-description">

                    ${escapeHtml(
                        description
                    )}

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

                    Coming Soon.

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

    if (sideMenu) {

        sideMenu.classList.add(
            "open"
        );

    }


    if (menuOverlay) {

        menuOverlay.classList.add(
            "open"
        );

    }

}


function closeMenu() {

    if (sideMenu) {

        sideMenu.classList.remove(
            "open"
        );

    }


    if (menuOverlay) {

        menuOverlay.classList.remove(
            "open"
        );

    }

}


if (menuButton) {

    menuButton.addEventListener(
        "click",
        openMenu
    );

}


if (closeMenuButton) {

    closeMenuButton.addEventListener(
        "click",
        closeMenu
    );

}


if (menuOverlay) {

    menuOverlay.addEventListener(
        "click",
        closeMenu
    );

}


/* =========================================
   BOTTOM NAVIGATION
========================================= */

document
    .querySelectorAll(".nav-item")
    .forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    navigateTo(
                        item.dataset.page
                    );

                }
            );

        }
    );


/* =========================================
   SLIDER SCROLL
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


        if (!slideWidth) {

            return;

        }


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


/* =========================================
   HTML SAFETY
========================================= */

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


/* =========================================
   INITIALIZE APPLICATION
========================================= */

async function initializeApplication() {

    await loadAppData();

    renderPage();

}


/* =========================================
   START
========================================= */

initializeApplication();
