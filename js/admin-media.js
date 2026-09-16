const wordList = document.getElementById("wordList");
const wordSearch = document.getElementById("wordSearch");
const mediaMessage = document.getElementById("mediaMessage");

let words = [];
let currentAudio = null;


/* =========================================
   ADMIN CHECK
========================================= */

async function checkAdmin() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return null;
    }

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (profileError || !profile || profile.role !== "admin") {
        window.location.href = "app.html";
        return null;
    }

    return user;
}


/* =========================================
   MESSAGE
========================================= */

function showMessage(message, type = "success") {

    mediaMessage.textContent = message;
    mediaMessage.style.display = "block";

    if (type === "error") {
        mediaMessage.style.background = "#fbe9e9";
        mediaMessage.style.color = "#a63d40";
    } else {
        mediaMessage.style.background = "#e8f5e9";
        mediaMessage.style.color = "#386a4b";
    }

    setTimeout(() => {
        mediaMessage.style.display = "none";
    }, 4000);
}


/* =========================================
   LOAD WORDS
========================================= */

async function loadWords() {

    wordList.innerHTML = `
        <div class="empty-state">
            Loading words...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from("words")
        .select(`
            id,
            word,
            pronunciation,
            word_audio_path,
            is_premium,
            is_published
        `)
        .order("word", { ascending: true });

    if (error) {
        console.error(error);

        wordList.innerHTML = `
            <div class="empty-state">
                Unable to load words.
            </div>
        `;

        showMessage(error.message, "error");
        return;
    }

    words = data || [];

    renderWords();
}


/* =========================================
   RENDER WORDS
========================================= */

function renderWords() {

    const searchTerm = wordSearch.value.trim().toLowerCase();

    const filteredWords = words.filter(word => {

        return word.word
            .toLowerCase()
            .includes(searchTerm);

    });


    if (filteredWords.length === 0) {

        wordList.innerHTML = `
            <div class="empty-state">
                No words found.
            </div>
        `;

        return;
    }


    wordList.innerHTML = filteredWords.map(word => {

        const hasAudio = !!word.word_audio_path;

        return `
            <article
                class="media-card"
                data-word-id="${word.id}"
            >

                <div class="media-word">

                    <h3>
                        ${escapeHtml(word.word)}
                    </h3>

                    <p>
                        ${word.pronunciation
                            ? escapeHtml(word.pronunciation)
                            : "No pronunciation provided."
                        }
                    </p>

                </div>


                <div class="media-status">

                    <span class="${hasAudio ? "uploaded" : "missing"}">
                        ${hasAudio
                            ? "Audio uploaded"
                            : "No audio"
                        }
                    </span>

                    ${
                        word.is_published
                            ? `<span>Published</span>`
                            : `<span>Draft</span>`
                    }

                    ${
                        word.is_premium
                            ? `<span>Premium</span>`
                            : `<span>Free</span>`
                    }

                </div>


                <div class="media-actions">

                    ${
                        hasAudio
                            ? `
                                <button
                                    type="button"
                                    class="media-play-btn"
                                    data-action="play"
                                    data-word-id="${word.id}"
                                >
                                    ▶ Play
                                </button>

                                <button
                                    type="button"
                                    class="media-delete-btn"
                                    data-action="delete"
                                    data-word-id="${word.id}"
                                >
                                    Delete
                                </button>
                              `
                            : ""
                    }


                    <input
                        type="file"
                        class="media-file-input"
                        id="audio-${word.id}"
                        data-word-id="${word.id}"
                        accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm"
                    >

                    <label
                        for="audio-${word.id}"
                        class="media-upload-label"
                    >
                        ${hasAudio ? "Replace" : "Upload Audio"}
                    </label>

                </div>

            </article>
        `;

    }).join("");
}


/* =========================================
   FILE UPLOAD
========================================= */

async function uploadAudio(wordId, file) {

    if (!file) {
        return;
    }


    if (!file.type.startsWith("audio/")) {

        showMessage(
            "Please select a valid audio file.",
            "error"
        );

        return;
    }


    const word = words.find(item => item.id === wordId);

    if (!word) {
        return;
    }


    const card = document.querySelector(
        `.media-card[data-word-id="${wordId}"]`
    );

    if (card) {
        card.classList.add("media-uploading");
    }


    try {

        showMessage(`Uploading audio for "${word.word}"...`);


        /*
         * Remove the previous file first when replacing.
         */

        if (word.word_audio_path) {

            const { error: removeError } =
                await supabaseClient.storage
                    .from("audio")
                    .remove([word.word_audio_path]);

            if (removeError) {
                console.warn(
                    "Previous audio could not be removed:",
                    removeError
                );
            }
        }


        /*
         * Keep audio organized by word ID.
         */

        const extension =
            getFileExtension(file.name) || "mp3";

        const storagePath =
            `words/${wordId}.${extension}`;


        const { error: uploadError } =
            await supabaseClient.storage
                .from("audio")
                .upload(
                    storagePath,
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
         * Save the storage path in the database.
         */

        const { error: updateError } =
            await supabaseClient
                .from("words")
                .update({
                    word_audio_path: storagePath
                })
                .eq("id", wordId);


        if (updateError) {
            throw updateError;
        }


        showMessage(
            `Audio uploaded for "${word.word}".`
        );


        await loadWords();

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "Unable to upload audio.",
            "error"
        );

    } finally {

        if (card) {
            card.classList.remove("media-uploading");
        }

    }
}


/* =========================================
   PLAY AUDIO
========================================= */

async function playAudio(wordId) {

    const word = words.find(item => item.id === wordId);

    if (!word || !word.word_audio_path) {
        return;
    }


    try {

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }


        const { data, error } =
            await supabaseClient.storage
                .from("audio")
                .createSignedUrl(
                    word.word_audio_path,
                    300
                );


        if (error) {
            throw error;
        }


        currentAudio = new Audio(data.signedUrl);

        currentAudio.addEventListener(
            "ended",
            () => {
                currentAudio = null;
            }
        );

        await currentAudio.play();

    } catch (error) {

        console.error(error);

        showMessage(
            "Unable to play this audio file.",
            "error"
        );

    }
}


/* =========================================
   DELETE AUDIO
========================================= */

async function deleteAudio(wordId) {

    const word = words.find(item => item.id === wordId);

    if (!word || !word.word_audio_path) {
        return;
    }


    const confirmed = confirm(
        `Delete the pronunciation audio for "${word.word}"?`
    );

    if (!confirmed) {
        return;
    }


    try {

        showMessage(`Deleting audio for "${word.word}"...`);


        const { error: storageError } =
            await supabaseClient.storage
                .from("audio")
                .remove([
                    word.word_audio_path
                ]);


        if (storageError) {
            throw storageError;
        }


        const { error: updateError } =
            await supabaseClient
                .from("words")
                .update({
                    word_audio_path: null
                })
                .eq("id", wordId);


        if (updateError) {
            throw updateError;
        }


        showMessage(
            `Audio deleted for "${word.word}".`
        );


        await loadWords();

    } catch (error) {

        console.error(error);

        showMessage(
            error.message || "Unable to delete audio.",
            "error"
        );

    }
}


/* =========================================
   EVENTS
========================================= */

wordSearch.addEventListener(
    "input",
    renderWords
);


wordList.addEventListener(
    "change",
    async function (event) {

        const input = event.target;

        if (
            !input.classList.contains(
                "media-file-input"
            )
        ) {
            return;
        }

        const wordId = input.dataset.wordId;
        const file = input.files[0];

        await uploadAudio(
            wordId,
            file
        );

        input.value = "";
    }
);


wordList.addEventListener(
    "click",
    async function (event) {

        const button =
            event.target.closest(
                "[data-action]"
            );

        if (!button) {
            return;
        }


        const action =
            button.dataset.action;

        const wordId =
            button.dataset.wordId;


        if (action === "play") {

            await playAudio(wordId);

        }


        if (action === "delete") {

            await deleteAudio(wordId);

        }

    }
);


/* =========================================
   HELPERS
========================================= */

function getFileExtension(filename) {

    const parts = filename.split(".");

    if (parts.length < 2) {
        return "";
    }

    return parts
        .pop()
        .toLowerCase();
}


function escapeHtml(value) {

    if (!value) {
        return "";
    }

    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================
   START
========================================= */

async function initialize() {

    const user = await checkAdmin();

    if (!user) {
        return;
    }

    await loadWords();
}


initialize();
