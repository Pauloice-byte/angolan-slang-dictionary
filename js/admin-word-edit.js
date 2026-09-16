const wordForm =
    document.getElementById("wordForm");

const editMessage =
    document.getElementById("editMessage");

const saveButton =
    document.getElementById("saveButton");

const logoutButton =
    document.getElementById("logoutButton");


const wordInput =
    document.getElementById("word");

const pronunciationInput =
    document.getElementById("pronunciation");

const wordTypeInput =
    document.getElementById("wordType");

const categoryInput =
    document.getElementById("category");

const packInput =
    document.getElementById("pack");

const shortMeaningInput =
    document.getElementById("shortMeaning");

const contextNotesInput =
    document.getElementById("contextNotes");

const meaningInput =
    document.getElementById("meaning");

const exampleInput =
    document.getElementById("example");

const translationInput =
    document.getElementById("translation");

const usageLabelInput =
    document.getElementById("usageLabel");

const isPremiumInput =
    document.getElementById("isPremium");

const isPublishedInput =
    document.getElementById("isPublished");


let wordId = null;

let currentMeaningId = null;

let currentExampleId = null;


/* =========================================
   GET WORD ID
========================================= */

function getWordId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    return params.get("id");
}


/* =========================================
   ADMIN ACCESS
========================================= */

async function checkAdminAccess() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href =
            "login.html";

        return false;
    }


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();


    if (
        profileError ||
        !profile
    ) {

        window.location.href =
            "login.html";

        return false;
    }


    if (profile.role !== "admin") {

        window.location.href =
            "app.html";

        return false;
    }


    return true;
}


/* =========================================
   LOAD CATEGORIES
========================================= */

async function loadCategories() {

    const {
        data,
        error
    } = await supabaseClient
        .from("categories")
        .select("id, name")
        .order(
            "display_order",
            {
                ascending: true
            }
        );


    if (error) {

        throw error;
    }


    categoryInput.innerHTML = `
        <option value="">
            Select category
        </option>
    `;


    data.forEach(
        function (category) {

            const option =
                document.createElement("option");


            option.value =
                category.id;


            option.textContent =
                category.name;


            categoryInput.appendChild(
                option
            );
        }
    );
}


/* =========================================
   LOAD PACKS
========================================= */

async function loadPacks() {

    const {
        data,
        error
    } = await supabaseClient
        .from("packs")
        .select(
            "id, name, is_premium, is_published"
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


    packInput.innerHTML = `
        <option value="">
            No pack
        </option>
    `;


    data.forEach(
        function (pack) {

            const option =
                document.createElement("option");


            option.value =
                pack.id;


            option.textContent =
                pack.name;


            if (pack.is_premium) {

                option.textContent +=
                    " — Premium";
            }


            if (!pack.is_published) {

                option.textContent +=
                    " — Draft";
            }


            packInput.appendChild(
                option
            );
        }
    );
}


/* =========================================
   LOAD WORD
========================================= */

async function loadWord() {

    const {
        data: word,
        error: wordError
    } = await supabaseClient
        .from("words")
        .select(`
            *,
            categories (
                id,
                name
            ),
            packs (
                id,
                name
            )
        `)
        .eq(
            "id",
            wordId
        )
        .single();


    if (wordError) {

        throw wordError;
    }


    wordInput.value =
        word.word || "";


    pronunciationInput.value =
        word.pronunciation || "";


    wordTypeInput.value =
        word.word_type || "";


    categoryInput.value =
        word.category_id || "";


    packInput.value =
        word.pack_id || "";


    shortMeaningInput.value =
        word.short_meaning || "";


    contextNotesInput.value =
        word.context_notes || "";


    isPremiumInput.checked =
        Boolean(word.is_premium);


    isPublishedInput.checked =
        Boolean(word.is_published);


    /*
     * Load the first meaning.
     */

    const {
        data: meanings,
        error: meaningError
    } = await supabaseClient
        .from("meanings")
        .select("*")
        .eq(
            "word_id",
            wordId
        )
        .order(
            "display_order",
            {
                ascending: true
            }
        )
        .limit(1);


    if (meaningError) {

        throw meaningError;
    }


    if (meanings.length > 0) {

        const meaning =
            meanings[0];


        currentMeaningId =
            meaning.id;


        meaningInput.value =
            meaning.meaning || "";


        /*
         * Load first example.
         */

        const {
            data: examples,
            error: exampleError
        } = await supabaseClient
            .from("examples")
            .select("*")
            .eq(
                "meaning_id",
                meaning.id
            )
            .order(
                "display_order",
                {
                    ascending: true
                }
            )
            .limit(1);


        if (exampleError) {

            throw exampleError;
        }


        if (examples.length > 0) {

            const example =
                examples[0];


            currentExampleId =
                example.id;


            exampleInput.value =
                example.example_text || "";


            translationInput.value =
                example.translation || "";


            usageLabelInput.value =
                example.usage_label || "";
        }
    }


    editMessage.textContent =
        `Editing: ${word.word}`;
}


/* =========================================
   SAVE WORD
========================================= */

wordForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        saveButton.disabled = true;


        editMessage.textContent =
            "Saving changes...";


        try {

            /*
             * Update word.
             */

            const {
                error: wordError
            } = await supabaseClient
                .from("words")
                .update({

                    word:
                        wordInput.value.trim(),

                    pronunciation:
                        pronunciationInput.value.trim() ||
                        null,

                    word_type:
                        wordTypeInput.value ||
                        null,

                    category_id:
                        categoryInput.value ||
                        null,

                    pack_id:
                        packInput.value ||
                        null,

                    short_meaning:
                        shortMeaningInput.value.trim() ||
                        null,

                    context_notes:
                        contextNotesInput.value.trim() ||
                        null,

                    is_premium:
                        isPremiumInput.checked,

                    is_published:
                        isPublishedInput.checked

                })
                .eq(
                    "id",
                    wordId
                );


            if (wordError) {

                throw wordError;
            }


            /*
             * Save meaning.
             */

            let meaningId =
                currentMeaningId;


            if (meaningId) {

                const {
                    error: meaningError
                } = await supabaseClient
                    .from("meanings")
                    .update({

                        meaning:
                            meaningInput.value.trim(),

                        display_order: 1

                    })
                    .eq(
                        "id",
                        meaningId
                    );


                if (meaningError) {

                    throw meaningError;
                }

            } else {

                const {
                    data: newMeaning,
                    error: meaningError
                } = await supabaseClient
                    .from("meanings")
                    .insert({

                        word_id:
                            wordId,

                        meaning:
                            meaningInput.value.trim(),

                        display_order: 1

                    })
                    .select("id")
                    .single();


                if (meaningError) {

                    throw meaningError;
                }


                meaningId =
                    newMeaning.id;


                currentMeaningId =
                    meaningId;
            }


            /*
             * Save example.
             */

            if (currentExampleId) {

                const {
                    error: exampleError
                } = await supabaseClient
                    .from("examples")
                    .update({

                        example_text:
                            exampleInput.value.trim(),

                        translation:
                            translationInput.value.trim() ||
                            null,

                        usage_label:
                            usageLabelInput.value.trim() ||
                            null,

                        display_order: 1

                    })
                    .eq(
                        "id",
                        currentExampleId
                    );


                if (exampleError) {

                    throw exampleError;
                }

            } else {

                const {
                    data: newExample,
                    error: exampleError
                } = await supabaseClient
                    .from("examples")
                    .insert({

                        meaning_id:
                            meaningId,

                        example_text:
                            exampleInput.value.trim(),

                        translation:
                            translationInput.value.trim() ||
                            null,

                        usage_label:
                            usageLabelInput.value.trim() ||
                            null,

                        display_order: 1

                    })
                    .select("id")
                    .single();


                if (exampleError) {

                    throw exampleError;
                }


                currentExampleId =
                    newExample.id;
            }


            editMessage.textContent =
                "Changes saved successfully.";


            /*
             * Give the administrator a moment
             * to see the success message.
             */

            setTimeout(
                function () {

                    window.location.href =
                        "admin-words.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "SAVE WORD ERROR:",
                error
            );


            editMessage.textContent =
                error.message ||
                "Unable to save changes.";


            saveButton.disabled = false;
        }
    }
);


/* =========================================
   LOGOUT
========================================= */

logoutButton.addEventListener(
    "click",
    async function () {

        await supabaseClient.auth.signOut();

        window.location.href =
            "login.html";
    }
);


/* =========================================
   INITIALIZE
========================================= */

async function initialize() {

    const authorized =
        await checkAdminAccess();


    if (!authorized) {

        return;
    }


    wordId =
        getWordId();


    if (!wordId) {

        editMessage.textContent =
            "No word was selected.";


        saveButton.disabled = true;

        return;
    }


    try {

        await loadCategories();

        await loadPacks();

        await loadWord();

    } catch (error) {

        console.error(
            "LOAD WORD ERROR:",
            error
        );


        editMessage.textContent =
            error.message ||
            "Unable to load this word.";
    }
}


initialize();
