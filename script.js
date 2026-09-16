/* =========================================================
   ANGOLAN SLANG DICTIONARY
   USER APP
========================================================= */


/* =========================================================
   APP STATE
========================================================= */

const appState = {
    currentPage: "home",
    previousPage: null,

    words: [],
    categories: [],

    savedWords: new Set(),

    loadingWords: true,
    wordsError: null
};


/* =========================================================
   SUPABASE DATA
========================================================= */

async function loadDictionaryData() {

    appState.loadingWords = true;
    appState.wordsError = null;

    try {

        /* ---------------------------------------------
           1. LOAD ACTIVE CATEGORIES
        --------------------------------------------- */

        const {
            data: categories,
            error: categoriesError
        } = await supabaseClient
            .from("categories")
            .select(`
                id,
                name,
                description,
                display_order
            `)
            .eq("is_active", true)
            .order("display_order", {
                ascending: true
            });

        if (categoriesError) {
            throw categoriesError;
        }

        appState.categories = categories || [];


        /* ---------------------------------------------
           2. LOAD PUBLISHED WORDS
        --------------------------------------------- */

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
            .eq("is_published", true)
            .order("word", {
                ascending: true
            });

        if (wordsError) {
            throw wordsError;
        }

        const loadedWords = words || [];


        /* ---------------------------------------------
           3. LOAD MEANINGS
        --------------------------------------------- */

        const wordIds = loadedWords.map(word => word.id);

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
                .in("word_id", wordIds)
                .order("display_order", {
                    ascending: true
                });

            if (error) {
                throw error;
            }

            meanings = data || [];
        }


        /* ---------------------------------------------
           4. LOAD EXAMPLES
        --------------------------------------------- */

        const meaningIds = meanings.map(
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
                .in("meaning_id", meaningIds)
                .order("display_order", {
                    ascending: true
                });

            if (error) {
                throw error;
            }

            examples = data || [];
        }


        /* ---------------------------------------------
           5. ORGANISE MEANINGS
        --------------------------------------------- */

        const meaningsByWord = {};

        meanings.forEach(meaning => {

            if (!meaningsByWord[meaning.word_id]) {
                meaningsByWord[meaning.word_id] = [];
            }

            meaningsByWord[meaning.word_id].push({
                id: meaning.id,
                meaning: meaning.meaning,
                displayOrder: meaning.display_order,
                examples: []
            });

        });


        /* ---------------------------------------------
           6. ATTACH EXAMPLES
        --------------------------------------------- */

        examples.forEach(example => {

            const meaning = meanings.find(
                item => item.id === example.meaning_id
            );

            if (!meaning) {
                return;
            }

            const wordMeanings =
                meaningsByWord[meaning.word_id];

            if (!wordMeanings) {
                return;
            }

            const targetMeaning =
                wordMeanings.find(
                    item => item.id === meaning.id
                );

            if (!targetMeaning) {
                return;
            }

            targetMeaning.examples.push({
                id: example.id,
                exampleText: example.example_text,
                audioPath: example.audio_path,
                displayOrder: example.display_order
            });

        });


        /* ---------------------------------------------
           7. BUILD FINAL WORD OBJECTS
        --------------------------------------------- */

        appState.words = loadedWords.map(word => {

            const category =
                appState.categories.find(
                    item => item.id === word.category_id
                );

            const wordMeanings =
                meaningsByWord[word.id] || [];

            const firstMeaning =
                wordMeanings[0] || null;

            const firstExample =
                firstMeaning &&
                firstMeaning.examples.length > 0
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
                    Boolean(word.is_premium),

                isPublished:
                    Boolean(word.is_published),

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

        });

        console.log(
            "Dictionary loaded:",
            appState.words.length,
            "words"
        );

    } catch (error) {

        console.error(
            "Error loading dictionary:",
            error
        );

        appState.words = [];

        appState.wordsError =
            "We couldn't load the dictionary right now.";

    } finally {

        appState.loadingWords = false;
    }
}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeApp() {

    await loadDictionaryData();

    renderPage();
}


/* =========================================================
   NAVIGATION
========================================================= */

function navigateTo(page) {

    if (appState.currentPage !== page) {

        appState.previousPage =
            appState.currentPage;

    }

    appState.currentPage = page;

    closeMenu();

    renderPage();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   PAGE RENDERER
========================================================= */

function renderPage() {

    const main =
        document.getElementById("main-content");

    if (!main) {
        return;
    }

    updateNavigation();

    switch (appState.currentPage) {

        case "home":
            renderHome(main);
            break;

        case "dictionary":
            renderDictionary(main);
            break;

        case "search":
            renderDictionary(main, true);
            break;

        case "saved":
            renderSaved(main);
            break;

        case "daily":
            renderDaily(main);
            break;

        case "updates":
            renderUpdates(main);
            break;

        case "about":
            renderAbout(main);
            break;

        case "settings":
            renderSettings(main);
            break;

        default:
            renderHome(main);
    }
}


/* =========================================================
   NAVIGATION STATE
========================================================= */

function updateNavigation() {

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            const page =
                item.dataset.page;

            item.classList.toggle(
                "active",
                page === appState.currentPage
            );

        });
}


/* =========================================================
   HOME
========================================================= */

function renderHome(main) {

    const totalWords =
        appState.words.length;

    const freeWords =
        appState.words.filter(
            word => !word.isPremium
        ).length;

    const premiumWords =
        appState.words.filter(
            word => word.isPremium
        ).length;


    if (appState.loadingWords) {

        main.innerHTML = `
            <section class="page-section">

                <div class="section-heading">
                    <p class="eyebrow">
                        ANGOLAN SLANG
                    </p>

                    <h1>
                        Your dictionary
                    </h1>
                </div>

                <div class="app-card">
                    <p>
                        Loading your dictionary...
                    </p>
                </div>

            </section>
        `;

        return;
    }


    const firstWord =
        appState.words.length > 0
            ? appState.words[0]
            : null;


    main.innerHTML = `

        <section class="hero-section">

            <div class="hero-content">

                <p class="eyebrow">
                    ANGOLAN SLANG DICTIONARY
                </p>

                <h1>
                    Discover Angola,
                    one word at a time.
                </h1>

                <p class="hero-description">
                    Explore Angolan words,
                    expressions and meanings
                    in one place.
                </p>

                <button
                    class="primary-button"
                    type="button"
                    onclick="navigateTo('dictionary')"
                >
                    Explore Dictionary
                </button>

            </div>

        </section>


        <section class="page-section">

            <div class="section-heading">

                <p class="eyebrow">
                    DICTIONARY
                </p>

                <h2>
                    ${totalWords} words available
                </h2>

            </div>


            ${
                firstWord
                    ? `
                        <article class="app-card word-card">

                            <div class="word-card-top">

                                <div>

                                    <span class="word-category">
                                        ${
                                            escapeHtml(
                                                firstWord.categoryName
                                            )
                                        }
                                    </span>

                                    <h3>
                                        ${
                                            escapeHtml(
                                                firstWord.word
                                            )
                                        }
                                    </h3>

                                </div>

                                ${
                                    firstWord.isPremium
                                        ? `
                                            <span class="premium-badge">
                                                Coming Soon
                                            </span>
                                        `
                                        : ""
                                }

                            </div>

                            <p>
                                ${
                                    escapeHtml(
                                        firstWord.firstMeaning
                                    )
                                }
                            </p>

                            ${
                                firstWord.firstExample
                                    ? `
                                        <p class="word-example">
                                            “${
                                                escapeHtml(
                                                    firstWord.firstExample
                                                )
                                            }”
                                        </p>
                                    `
                                    : ""
                            }

                            <button
                                class="secondary-button"
                                type="button"
                                onclick="openWord(${firstWord.id})"
                            >
                                Open Word
                            </button>

                        </article>
                    `
                    : `
                        <div class="app-card">

                            <h3>
                                Your dictionary is ready
                            </h3>

                            <p>
                                Published words will appear here.
                            </p>

                        </div>
                    `
            }

        </section>


        <section class="page-section">

            <div class="section-heading">

                <p class="eyebrow">
                    YOUR DICTIONARY
                </p>

                <h2>
                    Explore by category
                </h2>

            </div>

            <div class="category-grid">

                ${
                    appState.categories
                        .map(category => `

                            <button
                                class="category-card"
                                type="button"
                                onclick="filterByCategory(${category.id})"
                            >

                                <strong>
                                    ${escapeHtml(category.name)}
                                </strong>

                            </button>

                        `)
                        .join("")
                }

            </div>

        </section>


        <section class="page-section">

            <div class="app-card premium-card">

                <p class="eyebrow">
                    PREMIUM
                </p>

                <h2>
                    More of Angola is coming.
                </h2>

                <p>
                    ${freeWords} free words are
                    currently available.
                    ${
                        premiumWords
                            ? `${premiumWords} premium words are marked as Coming Soon.`
                            : ""
                    }
                </p>

                <span class="premium-badge">
                    Coming Soon
                </span>

            </div>

        </section>

    `;
}


/* =========================================================
   DICTIONARY
========================================================= */

function renderDictionary(main, focusSearch = false) {

    if (appState.loadingWords) {

        main.innerHTML = `
            <section class="page-section">

                <div class="section-heading">

                    <p class="eyebrow">
                        DICTIONARY
                    </p>

                    <h1>
                        Explore Angolan slang
                    </h1>

                </div>

                <div class="app-card">
                    Loading dictionary...
                </div>

            </section>
        `;

        return;
    }


    if (appState.wordsError) {

        main.innerHTML = `
            <section class="page-section">

                <div class="app-card">

                    <h2>
                        Dictionary unavailable
                    </h2>

                    <p>
                        ${escapeHtml(appState.wordsError)}
                    </p>

                    <button
                        class="primary-button"
                        type="button"
                        onclick="reloadDictionary()"
                    >
                        Try Again
                    </button>

                </div>

            </section>
        `;

        return;
    }


    main.innerHTML = `

        <section class="page-section dictionary-page">

            <div class="section-heading">

                <p class="eyebrow">
                    ANGOLAN SLANG
                </p>

                <h1>
                    Dictionary
                </h1>

                <p>
                    Search words and expressions
                    from the Angolan dictionary.
                </p>

            </div>


            <div class="dictionary-search">

                <input
                    id="dictionary-search-input"
                    type="search"
                    placeholder="Search a word or expression..."
                    autocomplete="off"
                >

            </div>


            <div
                class="category-filter"
                id="category-filter"
            >

                <button
                    class="category-filter-button active"
                    type="button"
                    data-category="all"
                >
                    All
                </button>

                ${
                    appState.categories
                        .map(category => `

                            <button
                                class="category-filter-button"
                                type="button"
                                data-category="${category.id}"
                            >
                                ${escapeHtml(category.name)}
                            </button>

                        `)
                        .join("")
                }

            </div>


            <div class="dictionary-toolbar">

                <span id="dictionary-count">
                    ${appState.words.length} words
                </span>

                <select id="dictionary-sort">

                    <option value="alphabetical">
                        A–Z
                    </option>

                    <option value="recent">
                        Recently Added
                    </option>

                </select>

            </div>


            <div
                class="card-grid"
                id="dictionary-results"
            ></div>

        </section>

    `;


    const searchInput =
        document.getElementById(
            "dictionary-search-input"
        );

    const categoryFilter =
        document.getElementById(
            "category-filter"
        );

    const sortSelect =
        document.getElementById(
            "dictionary-sort"
        );


    let selectedCategory = "all";
    let searchTerm = "";
    let sortMode = "alphabetical";


    function updateResults() {

        let results =
            [...appState.words];


        /* SEARCH */

        if (searchTerm) {

            results =
                results.filter(word => {

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

                });

        }


        /* CATEGORY */

        if (selectedCategory !== "all") {

            results =
                results.filter(
                    word =>
                        String(word.categoryId) ===
                        String(selectedCategory)
                );

        }


        /* SORT */

        if (sortMode === "recent") {

            results.sort(
                (a, b) =>
                    new Date(b.createdAt) -
                    new Date(a.createdAt)
            );

        } else {

            results.sort(
                (a, b) =>
                    a.word.localeCompare(
                        b.word
                    )
            );

        }


        renderDictionaryResults(results);

    }


    searchInput.addEventListener(
        "input",
        event => {

            searchTerm =
                event.target.value
                    .trim()
                    .toLowerCase();

            updateResults();

        }
    );


    sortSelect.addEventListener(
        "change",
        event => {

            sortMode =
                event.target.value;

            updateResults();

        }
    );


    categoryFilter
        .querySelectorAll(
            ".category-filter-button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    categoryFilter
                        .querySelectorAll(
                            ".category-filter-button"
                        )
                        .forEach(item =>
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

        });


    updateResults();


    if (focusSearch) {

        setTimeout(() => {

            searchInput.focus();

        }, 100);

    }
}


/* =========================================================
   DICTIONARY RESULTS
========================================================= */

function renderDictionaryResults(words) {

    const container =
        document.getElementById(
            "dictionary-results"
        );

    const count =
        document.getElementById(
            "dictionary-count"
        );


    if (!container) {
        return;
    }


    if (count) {

        count.textContent =
            `${words.length} ${
                words.length === 1
                    ? "word"
                    : "words"
            }`;

    }


    if (words.length === 0) {

        container.innerHTML = `

            <div class="app-card empty-state">

                <h3>
                    No words found
                </h3>

                <p>
                    Try another search or category.
                </p>

            </div>

        `;

        return;
    }


    container.innerHTML =
        words
            .map(word => {

                const isSaved =
                    appState.savedWords.has(
                        word.id
                    );


                return `

                    <article
                        class="app-card word-card"
                    >

                        <div class="word-card-top">

                            <div>

                                ${
                                    word.categoryName
                                        ? `
                                            <span class="word-category">
                                                ${escapeHtml(
                                                    word.categoryName
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                                <h3>
                                    ${escapeHtml(
                                        word.word
                                    )}
                                </h3>

                                ${
                                    word.pronunciation
                                        ? `
                                            <span class="word-pronunciation">
                                                ${escapeHtml(
                                                    word.pronunciation
                                                )}
                                            </span>
                                        `
                                        : ""
                                }

                            </div>


                            ${
                                word.isPremium
                                    ? `
                                        <span class="premium-badge">
                                            Coming Soon
                                        </span>
                                    `
                                    : `
                                        <button
                                            class="save-button ${
                                                isSaved
                                                    ? "saved"
                                                    : ""
                                            }"
                                            type="button"
                                            onclick="toggleSavedWord(${word.id})"
                                            aria-label="Save word"
                                        >
                                            ${
                                                isSaved
                                                    ? "♥"
                                                    : "♡"
                                            }
                                        </button>
                                    `
                            }

                        </div>


                        <p class="word-meaning">

                            ${
                                word.isPremium
                                    ? `
                                        <span>
                                            Premium content
                                            — Coming Soon
                                        </span>
                                    `
                                    : escapeHtml(
                                        word.firstMeaning ||
                                        word.shortMeaning ||
                                        "Meaning coming soon."
                                    )
                            }

                        </p>


                        ${
                            !word.isPremium &&
                            word.firstExample
                                ? `
                                    <p class="word-example">
                                        “${escapeHtml(
                                            word.firstExample
                                        )}”
                                    </p>
                                `
                                : ""
                        }


                        <div class="word-card-actions">

                            <button
                                class="secondary-button"
                                type="button"
                                onclick="openWord(${word.id})"
                            >
                                ${
                                    word.isPremium
                                        ? "View"
                                        : "Open Word"
                                }
                            </button>

                        </div>

                    </article>

                `;

            })
            .join("");
}


/* =========================================================
   OPEN WORD
========================================================= */

function openWord(wordId) {

    const word =
        appState.words.find(
            item => item.id === wordId
        );

    if (!word) {
        return;
    }


    appState.previousPage =
        appState.currentPage;

    appState.currentPage =
        "word-detail";


    const main =
        document.getElementById(
            "main-content"
        );


    renderWordDetail(
        main,
        word
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   WORD DETAIL
========================================================= */

function renderWordDetail(main, word) {

    if (word.isPremium) {

        main.innerHTML = `

            <section class="page-section">

                <button
                    class="back-button"
                    type="button"
                    onclick="goBack()"
                >
                    ← Back
                </button>


                <article class="app-card word-detail-card">

                    <span class="premium-badge">
                        Coming Soon
                    </span>

                    <p class="eyebrow">
                        PREMIUM WORD
                    </p>

                    <h1>
                        ${escapeHtml(word.word)}
                    </h1>

                    ${
                        word.pronunciation
                            ? `
                                <p class="word-pronunciation">
                                    ${escapeHtml(
                                        word.pronunciation
                                    )}
                                </p>
                            `
                            : ""
                    }

                    <div class="locked-content">

                        <h3>
                            Premium content
                        </h3>

                        <p>
                            The full meaning,
                            examples and additional
                            content for this word
                            will be available soon.
                        </p>

                        <span class="premium-badge">
                            Coming Soon
                        </span>

                    </div>

                </article>

            </section>

        `;

        return;
    }


    const isSaved =
        appState.savedWords.has(
            word.id
        );


    main.innerHTML = `

        <section class="page-section">

            <button
                class="back-button"
                type="button"
                onclick="goBack()"
            >
                ← Back
            </button>


            <article class="app-card word-detail-card">

                ${
                    word.categoryName
                        ? `
                            <span class="word-category">
                                ${escapeHtml(
                                    word.categoryName
                                )}
                            </span>
                        `
                        : ""
                }


                <div class="word-detail-header">

                    <div>

                        <h1>
                            ${escapeHtml(
                                word.word
                            )}
                        </h1>

                        ${
                            word.pronunciation
                                ? `
                                    <p class="word-pronunciation">
                                        ${escapeHtml(
                                            word.pronunciation
                                        )}
                                    </p>
                                `
                                : ""
                        }

                    </div>


                    <button
                        class="save-button ${
                            isSaved
                                ? "saved"
                                : ""
                        }"
                        type="button"
                        onclick="toggleSavedWord(${word.id})"
                    >
                        ${
                            isSaved
                                ? "♥"
                                : "♡"
                        }
                    </button>

                </div>


                ${
                    word.wordAudioPath
                        ? `
                            <button
                                class="audio-button"
                                type="button"
                                onclick="playWordAudio('${escapeAttribute(
                                    word.wordAudioPath
                                )}')"
                            >
                                ▶ Listen
                            </button>
                        `
                        : ""
                }


                <div class="word-detail-section">

                    <p class="eyebrow">
                        MEANING
                    </p>

                    ${
                        word.meanings.length > 0
                            ? word.meanings
                                .map(
                                    (meaning, index) => `
                                        <div class="meaning-item">

                                            <h3>
                                                ${
                                                    word.meanings.length > 1
                                                        ? `${index + 1}. `
                                                        : ""
                                                }${escapeHtml(
                                                    meaning.meaning
                                                )}
                                            </h3>

                                            ${
                                                meaning.examples
                                                    .map(
                                                        example => `
                                                            <div class="example-block">

                                                                <p>
                                                                    “${escapeHtml(
                                                                        example.exampleText
                                                                    )}”
                                                                </p>

                                                                ${
                                                                    example.audioPath
                                                                        ? `
                                                                            <button
                                                                                class="audio-button"
                                                                                type="button"
                                                                                onclick="playExampleAudio('${escapeAttribute(
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
                                )
                                .join("")
                            : `
                                <p>
                                    ${
                                        escapeHtml(
                                            word.shortMeaning ||
                                            "Meaning coming soon."
                                        )
                                    }
                                </p>
                            `
                    }

                </div>


                ${
                    word.contextNotes
                        ? `
                            <div class="word-detail-section">

                                <p class="eyebrow">
                                    CONTEXT
                                </p>

                                <p>
                                    ${escapeHtml(
                                        word.contextNotes
                                    )}
                                </p>

                            </div>
                        `
                        : ""
                }


            </article>

        </section>

    `;
}


/* =========================================================
   SAVED WORDS
========================================================= */

function toggleSavedWord(wordId) {

    if (appState.savedWords.has(wordId)) {

        appState.savedWords.delete(
            wordId
        );

    } else {

        appState.savedWords.add(
            wordId
        );

    }


    renderPage();
}


function renderSaved(main) {

    const words =
        appState.words.filter(
            word =>
                appState.savedWords.has(
                    word.id
                )
        );


    main.innerHTML = `

        <section class="page-section">

            <div class="section-heading">

                <p class="eyebrow">
                    YOUR WORDS
                </p>

                <h1>
                    Saved
                </h1>

            </div>


            ${
                words.length === 0
                    ? `
                        <div class="app-card">

                            <h3>
                                No saved words yet
                            </h3>

                            <p>
                                Save words from the
                                dictionary to find them here.
                            </p>

                        </div>
                    `
                    : `
                        <div class="card-grid">

                            ${
                                words
                                    .map(
                                        word => `

                                            <article
                                                class="app-card word-card"
                                            >

                                                <span class="word-category">
                                                    ${escapeHtml(
                                                        word.categoryName
                                                    )}
                                                </span>

                                                <h3>
                                                    ${escapeHtml(
                                                        word.word
                                                    )}
                                                </h3>

                                                <p>
                                                    ${escapeHtml(
                                                        word.firstMeaning
                                                    )}
                                                </p>

                                                <button
                                                    class="secondary-button"
                                                    type="button"
                                                    onclick="openWord(${word.id})"
                                                >
                                                    Open Word
                                                </button>

                                            </article>

                                        `
                                    )
                                    .join("")
                            }

                        </div>
                    `
            }

        </section>

    `;
}


/* =========================================================
   DAILY 3
========================================================= */

/*
   IMPORTANT:

   Daily 3 is NOT generated here.

   Supabase already determines the user's
   Daily 3 through the daily_three system.

   We will connect this page directly to
   daily_three in the next step.
*/

function renderDaily(main) {

    main.innerHTML = `

        <section class="page-section">

            <div class="section-heading">

                <p class="eyebrow">
                    DAILY 3
                </p>

                <h1>
                    Your 3 Words of the Day
                </h1>

                <p>
                    Your personalised daily words
                    are loaded from Supabase.
                </p>

            </div>


            <div class="app-card">

                <h3>
                    Daily 3
                </h3>

                <p>
                    Your daily selection will appear
                    here once the Daily 3 connection
                    is activated.
                </p>

            </div>

        </section>

    `;
}


/* =========================================================
   OTHER PAGES
========================================================= */

function renderUpdates(main) {

    main.innerHTML = `

        <section class="page-section">

            <div class="app-card">

                <p class="eyebrow">
                    UPDATES
                </p>

                <h1>
                    Updates
                </h1>

                <p>
                    New dictionary content and
                    features will appear here.
                </p>

            </div>

        </section>

    `;
}


function renderAbout(main) {

    main.innerHTML = `

        <section class="page-section">

            <div class="app-card">

                <p class="eyebrow">
                    ABOUT
                </p>

                <h1>
                    About the Dictionary
                </h1>

                <p>
                    The Angolan Slang Dictionary is
                    a growing collection of Angolan
                    words, expressions and meanings.
                </p>

            </div>

        </section>

    `;
}


function renderSettings(main) {

    main.innerHTML = `

        <section class="page-section">

            <div class="app-card">

                <p class="eyebrow">
                    SETTINGS
                </p>

                <h1>
                    Settings
                </h1>

                <p>
                    Account and app settings will
                    appear here.
                </p>

            </div>

        </section>

    `;
}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function filterByCategory(categoryId) {

    navigateTo("dictionary");

    setTimeout(() => {

        const button =
            document.querySelector(
                `.category-filter-button[data-category="${categoryId}"]`
            );

        if (button) {
            button.click();
        }

    }, 0);
}


/* =========================================================
   RELOAD DICTIONARY
========================================================= */

async function reloadDictionary() {

    await loadDictionaryData();

    renderPage();
}


/* =========================================================
   BACK
========================================================= */

function goBack() {

    const page =
        appState.previousPage ||
        "dictionary";

    appState.currentPage =
        page;

    appState.previousPage =
        null;

    renderPage();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   AUDIO
========================================================= */

async function createAudioUrl(path) {

    if (!path) {
        return null;
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

        return data?.signedUrl || null;

    } catch (error) {

        console.error(
            "Could not create audio URL:",
            error
        );

        return null;
    }
}


async function playWordAudio(path) {

    const url =
        await createAudioUrl(path);

    if (!url) {
        return;
    }

    const audio =
        new Audio(url);

    audio.play().catch(
        error =>
            console.error(
                "Audio playback error:",
                error
            )
    );
}


async function playExampleAudio(path) {

    const url =
        await createAudioUrl(path);

    if (!url) {
        return;
    }

    const audio =
        new Audio(url);

    audio.play().catch(
        error =>
            console.error(
                "Audio playback error:",
                error
            )
    );
}


/* =========================================================
   MENU
========================================================= */

function openMenu() {

    const menu =
        document.getElementById(
            "side-menu"
        );

    const overlay =
        document.getElementById(
            "menu-overlay"
        );

    if (menu) {
        menu.classList.add("open");
    }

    if (overlay) {
        overlay.classList.add("open");
    }

    document.body.classList.add(
        "menu-open"
    );
}


function closeMenu() {

    const menu =
        document.getElementById(
            "side-menu"
        );

    const overlay =
        document.getElementById(
            "menu-overlay"
        );

    if (menu) {
        menu.classList.remove("open");
    }

    if (overlay) {
        overlay.classList.remove("open");
    }

    document.body.classList.remove(
        "menu-open"
    );
}


/* =========================================================
   HTML SAFETY
========================================================= */

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

    return escapeHtml(value);
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const menuButton =
            document.getElementById(
                "menu-button"
            );

        const closeButton =
            document.getElementById(
                "close-menu"
            );

        const overlay =
            document.getElementById(
                "menu-overlay"
            );


        if (menuButton) {

            menuButton.addEventListener(
                "click",
                openMenu
            );

        }


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeMenu
            );

        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeMenu
            );

        }


        document
            .querySelectorAll(
                ".bottom-navigation .nav-item"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const page =
                            button.dataset.page;

                        if (page) {
                            navigateTo(page);
                        }

                    }
                );

            });


        initializeApp();

    }
);
