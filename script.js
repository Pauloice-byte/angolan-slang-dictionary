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

    savedWords: JSON.parse(
        localStorage.getItem(
            "angolanSlangSavedWords"
        )
    ) || [],

    dictionaryLoaded: false,

    dailyLoaded: false

};


/* =========================================
   AUTHENTICATION
========================================= */

/*
   We keep authentication here, but we do NOT
   redirect automatically when the user is
   already inside the application.

   Login.js remains responsible for routing.
*/

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
           LOAD USER PROFILE
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
   LOAD DICTIONARY WORDS
========================================= */

async function loadDictionaryWords() {

    try {

        /* =====================================
           LOAD PUBLISHED WORDS
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
           LOAD MEANINGS
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
           LOAD EXAMPLES
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

                    id: meaning.id,

                    meaning: meaning.meaning,

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

                    id: example.id,

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
           BUILD APP WORD OBJECTS
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
                        firstMeaning.examples.length
                            ? firstMeaning.examples[0]
                            : null;


                    return {

                        id: word.id,

                        word: word.word,

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
                            word.word_audio_path ||
                            "",

                        shortMeaning:
                            word.short_meaning ||
                            "",

                        contextNotes:
                            word.context_notes ||
                            "",

                        createdAt:
                            word.created_at,

                        meanings:
                            wordMeanings,

                        firstMeaning:
                            firstMeaning
                                ? firstMeaning.meaning
                                : word.short_meaning ||
                                  "",

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
            "Supabase dictionary loaded:",
            appState.words.length,
            "published words"
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
   LOAD DAILY 3
========================================= */

/*
   IMPORTANT:

   Daily 3 is NOT selected here.

   Supabase already handles the selection
   for the authenticated user.

   We simply retrieve the existing Daily 3
   record and then retrieve the three words.
*/

async function loadDailyWords() {

    try {

        if (!appState.user) {

            console.warn(
                "Cannot load Daily 3 without user."
            );

            appState.dailyWords = [];

            return;

        }


        /* =====================================
           GET TODAY'S USER DAILY 3
        ===================================== */

        const {
            data: dailyData,
            error: dailyError
        } = await supabaseClient
            .rpc(
                "get_or_create_daily_three"
            );


        if (dailyError) {

            throw dailyError;

        }


        let dailyRecord =
            dailyData;


        /*
           RPC responses can be returned as an
           object or as an array depending on
           the function definition.
        */

        if (
            Array.isArray(
                dailyRecord
            )
        ) {

            dailyRecord =
                dailyRecord[0];

        }


        if (!dailyRecord) {

            console.warn(
                "No Daily 3 record returned."
            );

            appState.dailyWords = [];

            return;

        }


        /* =====================================
           GET WORD IDS
        ===================================== */

        const wordIds = [

            dailyRecord.word_1_id,

            dailyRecord.word_2_id,

            dailyRecord.word_3_id

        ].filter(
            id => id !== null &&
                  id !== undefined
        );


        if (wordIds.length === 0) {

            appState.dailyWords = [];

            return;

        }


        /* =====================================
           GET WORD DATA
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
                is_premium,
                word_audio_path,
                short_meaning,
                context_notes
            `)
            .in(
                "id",
                wordIds
            );


        if (wordsError) {

            throw wordsError;

        }


        const dailyWords =
            words || [];


        /*
           Preserve the exact order from
           word_1_id → word_2_id → word_3_id.
        */

        appState.dailyWords =
            wordIds
                .map(
                    id =>
                        dailyWords.find(
                            word =>
                                word.id === id
                        )
                )
                .filter(Boolean);


        appState.dailyLoaded =
            true;


        console.log(
            "Daily 3 loaded:",
            appState.dailyWords
        );


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
   LOAD ALL APP DATA
========================================= */

async function loadAppData() {

    await loadCurrentUser();

    await loadCategories();

    await loadDictionaryWords();

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

            break;


        case "search":

            mainContent.innerHTML =
                renderSearch();

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

            /*
               Word detail is rendered directly
               by openWord().
            */

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

                    Welcome,

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

    const words =
        [...appState.words];


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
                    placeholder="Search for a word..."
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
                    ${words.length}
                    ${words.length === 1 ? "word" : "words"}
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

                ${renderDictionaryCards(words)}

            </div>

        </section>

    `;

}


/* =========================================
   DICTIONARY CARDS
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
                    Try another search or category.
                </p>

            </div>

        `;

    }


    return words.map(
        word => {

            const isSaved =
                appState.savedWords.includes(
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


                    <span
                        class="daily-number"
                        style="
                            display: block;
                            margin-top: 10px;
                        "
                    >
                        ${
                            word.wordType
                                ? escapeHtml(
                                    word.wordType
                                )
                                : "WORD"
                        }
                    </span>


                    <h3>

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

                                <p>

                                    ${escapeHtml(
                                        word.firstMeaning ||
                                        word.shortMeaning ||
                                        "Meaning not available."
                                    )}

                                </p>


                                ${
                                    word.firstExample
                                        ? `
                                            <div
                                                style="
                                                    margin-top: 15px;
                                                    padding: 16px;
                                                    background: var(--surface-soft);
                                                    border-radius: var(--radius-md);
                                                    color: var(--text-secondary);
                                                    line-height: 1.7;
                                                "
                                            >

                                                “${escapeHtml(
                                                    word.firstExample
                                                )}”

                                            </div>
                                        `
                                        : ""
                                }

                            `
                    }


                    <div
                        style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            margin-top: 20px;
                        "
                    >

                        <button
                            class="text-button"
                            type="button"
                            onclick="openWord(${word.id})"
                        >

                            Open →

                        </button>


                        ${
                            word.isPremium
                                ? ""
                                : `
                                    <button
                                        class="text-button"
                                        type="button"
                                        onclick="toggleSavedWord(${word.id})"
                                    >
                                        ${
                                            isSaved
                                                ? "♥ Saved"
                                                : "♡ Save"
                                        }
                                    </button>
                                `
                        }

                    </div>

                </article>

            `;

        }
    ).join("");

}


/* =========================================
   DICTIONARY SEARCH
========================================= */

function setupDictionary() {

    const searchInput =
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


    if (!searchInput) {

        return;

    }


    let selectedCategory =
        "all";


    function updateResults() {

        const searchTerm =
            searchInput.value
                .trim()
                .toLowerCase();


        let results =
            [...appState.words];


        if (searchTerm) {

            results =
                results.filter(
                    word => {

                        const searchableText = [

                            word.word,

                            word.shortMeaning,

                            word.firstMeaning,

                            word.categoryName

                        ]
                            .join(" ")
                            .toLowerCase();


                        return searchableText.includes(
                            searchTerm
                        );

                    }
                );

        }


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


    searchInput.addEventListener(
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
                SEARCH
            </p>


            <h2
                style="
                    font-size: clamp(42px, 7vw, 64px);
                    letter-spacing: -2px;
                "
            >
                Find a word.
            </h2>


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
                    placeholder="Search for a word..."
                    aria-label="Search dictionary"
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
   SETUP SEARCH PAGE
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


    if (!input) {

        return;

    }


    function search() {

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

                    const text = [

                        word.word,

                        word.shortMeaning,

                        word.firstMeaning,

                        word.categoryName

                    ]
                        .join(" ")
                        .toLowerCase();


                    return text.includes(
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
        search
    );


    setTimeout(
        () => input.focus(),
        100
    );

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
   OPEN REAL WORD
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

                </div>

            </section>

        `;

    }


    const isSaved =
        appState.savedWords.includes(
            word.id
        );


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
                                <span>▶</span>

                            </button>
                        `
                        : ""
                }


                <div
                    style="
                        margin-top: 28px;
                    "
                >

                    <p class="eyebrow">
                        MEANING
                    </p>


                    ${
                        word.meanings.length

                            ? word.meanings.map(
                                (meaning, index) => `

                                    <div
                                        style="
                                            margin-top: 15px;
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


                                        <h3
                                            style="
                                                margin-top: 5px;
                                            "
                                        >

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

                                <p
                                    class="hero-description"
                                >
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
                            isSaved
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
   SAVED WORDS
========================================= */

function toggleSavedWord(
    wordId
) {

    const index =
        appState.savedWords.indexOf(
            wordId
        );


    if (index >= 0) {

        appState.savedWords.splice(
            index,
            1
        );

    } else {

        appState.savedWords.push(
            wordId
        );

    }


    localStorage.setItem(
        "angolanSlangSavedWords",
        JSON.stringify(
            appState.savedWords
        )
    );


    if (
        appState.currentPage ===
        "saved"
    ) {

        renderPage();

        return;

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

        return;

    }


    renderPage();

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

                                <p class="hero-description">

                                    You haven't saved
                                    any words yet.

                                </p>

                                <button
                                    class="primary-button"
                                    type="button"
                                    onclick="navigateTo('dictionary')"
                                >

                                    Explore Dictionary

                                    <span>→</span>

                                </button>

                            </div>
                        `
                }

            </div>

        </section>

    `;

}


/* =========================================
   AUDIO
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

    /*
       First load the user's information,
       then Supabase dictionary data,
       then render the original interface.
    */

    await loadAppData();

    renderPage();

}


/* =========================================
   START
========================================= */

initializeApplication();
