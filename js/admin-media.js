/* =========================================
   ADMIN MEDIA — WORD AUDIO
========================================= */

let allWords = [];
let selectedWord = null;


/* =========================================
   ELEMENTS
========================================= */

const wordsContainer =
    document.getElementById("wordsContainer");

const searchInput =
    document.getElementById("searchInput");

const statusFilter =
    document.getElementById("statusFilter");

const wordCount =
    document.getElementById("wordCount");

const audioModal =
    document.getElementById("audioModal");

const modalWord =
    document.getElementById("modalWord");

const closeModal =
    document.getElementById("closeModal");

const cancelButton =
    document.getElementById("cancelButton");

const audioFile =
    document.getElementById("audioFile");

const selectedFile =
    document.getElementById("selectedFile");

const existingAudioSection =
    document.getElementById("existingAudioSection");

const audioPlayer =
    document.getElementById("audioPlayer");

const uploadAudioButton =
    document.getElementById("uploadAudioButton");

const deleteAudioButton =
    document.getElementById("deleteAudioButton");

const modalMessage =
    document.getElementById("modalMessage");

const mediaMessage =
    document.getElementById("mediaMessage");


/* =========================================
   ADMIN CHECK
========================================= */

async function checkAdmin() {

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
        !profile ||
        profile.role !== "admin"
    ) {

        window.location.href =
            "app.html";

        return false;
    }


    return true;
}


/* =========================================
   LOAD WORDS
========================================= */

async function loadWords() {

    wordsContainer.innerHTML = `
        <div class="empty-state">
            Loading words...
        </div>
    `;


    const {
        data,
        error
    } = await supabaseClient
        .from("words")
        .select(`
            id,
            word,
            pronunciation,
            word_audio_path,
            is_published,
            is_premium,
            categories (
                name
            )
        `)
        .order("word", {
            ascending: true
        });


    if (error) {

        console.error(error);

        wordsContainer.innerHTML = `
            <div class="empty-state">
                Unable to load words.
            </div>
        `;

        mediaMessage.textContent =
            error.message ||
            "Unable to load words.";

        return;
    }


    allWords = data || [];

    renderWords();
}


/* =========================================
   SIGNED AUDIO URL
========================================= */

async function getAudioURL(path) {

    if (!path) {
        return null;
    }


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

        console.error(
            "Signed URL error:",
            error
        );

        return null;
    }


    return data?.signedUrl || null;
}


/* =========================================
   RENDER WORDS
========================================= */

function renderWords() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    const filter =
        statusFilter.value;


    const filteredWords =
        allWords.filter(word => {

            const matchesSearch =
                !searchTerm ||
                word.word
                    .toLowerCase()
                    .includes(searchTerm);


            const hasAudio =
                Boolean(
                    word.word_audio_path
                );


            const matchesFilter =
                filter === "all" ||
                (
                    filter === "with-audio" &&
                    hasAudio
                ) ||
                (
                    filter === "without-audio" &&
                    !hasAudio
                );


            return (
                matchesSearch &&
                matchesFilter
            );
        });


    wordCount.textContent =
        `${filteredWords.length} ${
            filteredWords.length === 1
                ? "word"
                : "words"
        }`;


    if (filteredWords.length === 0) {

        wordsContainer.innerHTML = `
            <div class="empty-state">
                No words found.
            </div>
        `;

        return;
    }


    wordsContainer.innerHTML =
        filteredWords.map(word => {

            const hasAudio =
                Boolean(
                    word.word_audio_path
                );


            return `
                <div class="admin-word-card">

                    <div class="admin-word-main">

                        <h3>
                            ${escapeHTML(word.word)}
                        </h3>

                        <p>
                            ${
                                word.categories?.name
                                    ? escapeHTML(
                                        word.categories.name
                                    )
                                    : "No category"
                            }
                        </p>

                    </div>


                    <div class="admin-word-meta">

                        <span>
                            ${
                                hasAudio
                                    ? "Audio uploaded"
                                    : "No audio"
                            }
                        </span>

                        ${
                            word.is_premium
                                ? `
                                    <span>
                                        Premium
                                    </span>
                                `
                                : `
                                    <span>
                                        Free
                                    </span>
                                `
                        }

                    </div>


                    <div class="admin-word-actions">

                        <button
                            type="button"
                            class="btn btn-primary small"
                            data-word-id="${word.id}"
                        >
                            ${
                                hasAudio
                                    ? "Manage Audio"
                                    : "Upload Audio"
                            }
                        >

                    </div>

                </div>
            `;

        }).join("");
}


/* =========================================
   OPEN MODAL
========================================= */

async function openAudioModal(word) {

    selectedWord = word;


    modalWord.textContent =
        word.word;


    modalMessage.textContent = "";

    audioFile.value = "";

    selectedFile.textContent = "";


    if (word.word_audio_path) {

        existingAudioSection
            .classList
            .remove("hidden");

        deleteAudioButton
            .classList
            .remove("hidden");


        modalMessage.textContent =
            "Loading current audio...";


        const audioURL =
            await getAudioURL(
                word.word_audio_path
            );


        if (audioURL) {

            audioPlayer.src =
                audioURL;

            audioPlayer.load();

            modalMessage.textContent = "";

        } else {

            modalMessage.textContent =
                "Unable to load current audio.";
        }

    } else {

        existingAudioSection
            .classList
            .add("hidden");

        deleteAudioButton
            .classList
            .add("hidden");

        audioPlayer.removeAttribute(
            "src"
        );

        audioPlayer.load();
    }


    audioModal
        .classList
        .remove("hidden");
}


/* =========================================
   CLOSE MODAL
========================================= */

function closeAudioModal() {

    selectedWord = null;

    audioPlayer.pause();

    audioPlayer.removeAttribute(
        "src"
    );

    audioPlayer.load();


    audioModal
        .classList
        .add("hidden");
}


/* =========================================
   FILE SELECTION
========================================= */

audioFile.addEventListener(
    "change",
    function () {

        const file =
            audioFile.files[0];


        selectedFile.textContent =
            file
                ? `Selected: ${file.name}`
                : "";

    }
);


/* =========================================
   UPLOAD AUDIO
========================================= */

async function uploadAudio() {

    if (!selectedWord) {
        return;
    }


    const file =
        audioFile.files[0];


    if (!file) {

        modalMessage.textContent =
            "Please select an audio file.";

        return;
    }


    if (!file.type.startsWith("audio/")) {

        modalMessage.textContent =
            "Please select a valid audio file.";

        return;
    }


    if (
        file.size >
        10 * 1024 * 1024
    ) {

        modalMessage.textContent =
            "Please keep the audio file under 10 MB.";

        return;
    }


    uploadAudioButton.disabled =
        true;

    deleteAudioButton.disabled =
        true;


    modalMessage.textContent =
        "Uploading audio...";


    try {

        /*
         * Delete previous audio
         * if there is one.
         */

        if (
            selectedWord.word_audio_path
        ) {

            await supabaseClient
                .storage
                .from("audio")
                .remove([
                    selectedWord.word_audio_path
                ]);
        }


        /*
         * Determine file extension.
         */

        const extension =
            getFileExtension(
                file.name
            );


        /*
         * Store using the word ID.
         */

        const filePath =
            `words/${selectedWord.id}.${extension}`;


        const {
            error: uploadError
        } = await supabaseClient
            .storage
            .from("audio")
            .upload(
                filePath,
                file,
                {
                    upsert: true,
                    contentType: file.type
                }
            );


        if (uploadError) {
            throw uploadError;
        }


        /*
         * Save storage path
         * to the words table.
         */

        const {
            error: updateError
        } = await supabaseClient
            .from("words")
            .update({
                word_audio_path:
                    filePath
            })
            .eq(
                "id",
                selectedWord.id
            );


        if (updateError) {

            await supabaseClient
                .storage
                .from("audio")
                .remove([
                    filePath
                ]);

            throw updateError;
        }


        mediaMessage.textContent =
            "Word audio uploaded successfully.";


        modalMessage.textContent =
            "Audio uploaded successfully.";


        /*
         * Reload the words.
         */

        await loadWords();


        /*
         * Refresh selected word.
         */

        const updatedWord =
            allWords.find(
                word =>
                    word.id ===
                    selectedWord.id
            );


        if (updatedWord) {

            await openAudioModal(
                updatedWord
            );
        }


    } catch (error) {

        console.error(error);

        modalMessage.textContent =
            error.message ||
            "Unable to upload audio.";

    } finally {

        uploadAudioButton.disabled =
            false;

        deleteAudioButton.disabled =
            false;
    }
}


/* =========================================
   DELETE AUDIO
========================================= */

async function deleteAudio() {

    if (
        !selectedWord ||
        !selectedWord.word_audio_path
    ) {
        return;
    }


    const confirmed =
        confirm(
            `Delete pronunciation audio for "${selectedWord.word}"?`
        );


    if (!confirmed) {
        return;
    }


    uploadAudioButton.disabled =
        true;

    deleteAudioButton.disabled =
        true;


    modalMessage.textContent =
        "Deleting audio...";


    try {

        const path =
            selectedWord.word_audio_path;


        const {
            error: storageError
        } = await supabaseClient
            .storage
            .from("audio")
            .remove([
                path
            ]);


        if (storageError) {
            throw storageError;
        }


        const {
            error: updateError
        } = await supabaseClient
            .from("words")
            .update({
                word_audio_path: null
            })
            .eq(
                "id",
                selectedWord.id
            );


        if (updateError) {
            throw updateError;
        }


        mediaMessage.textContent =
            "Word audio deleted successfully.";


        modalMessage.textContent =
            "Audio deleted successfully.";


        await loadWords();


        const updatedWord =
            allWords.find(
                word =>
                    word.id ===
                    selectedWord.id
            );


        if (updatedWord) {

            await openAudioModal(
                updatedWord
            );

        } else {

            closeAudioModal();
        }


    } catch (error) {

        console.error(error);

        modalMessage.textContent =
            error.message ||
            "Unable to delete audio.";

    } finally {

        uploadAudioButton.disabled =
            false;

        deleteAudioButton.disabled =
            false;
    }
}


/* =========================================
   EVENTS
========================================= */

searchInput.addEventListener(
    "input",
    renderWords
);


statusFilter.addEventListener(
    "change",
    renderWords
);


wordsContainer.addEventListener(
    "click",
    async function (event) {

        const button =
            event.target.closest(
                "[data-word-id]"
            );


        if (!button) {
            return;
        }


        const word =
            allWords.find(
                item =>
                    item.id ===
                    button.dataset.wordId
            );


        if (word) {

            await openAudioModal(
                word
            );
        }

    }
);


closeModal.addEventListener(
    "click",
    closeAudioModal
);


cancelButton.addEventListener(
    "click",
    closeAudioModal
);


audioModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            audioModal
        ) {

            closeAudioModal();
        }

    }
);


uploadAudioButton.addEventListener(
    "click",
    uploadAudio
);


deleteAudioButton.addEventListener(
    "click",
    deleteAudio
);


/* =========================================
   HELPERS
========================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


function getFileExtension(filename) {

    const parts =
        filename.split(".");


    if (parts.length < 2) {
        return "mp3";
    }


    const extension =
        parts
            .pop()
            .toLowerCase()
            .replace(
                /[^a-z0-9]/g,
                ""
            );


    return extension || "mp3";
}


/* =========================================
   INIT
========================================= */

async function init() {

    const isAdmin =
        await checkAdmin();


    if (!isAdmin) {
        return;
    }


    await loadWords();
}


init();
