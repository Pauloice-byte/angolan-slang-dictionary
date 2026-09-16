/* =========================================
   ADMIN MEDIA — WORD AUDIO
========================================= */

let allWords = [];
let selectedWord = null;


/* =========================================
   ELEMENTS
========================================= */

const wordsTableBody = document.getElementById("wordsTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const wordCount = document.getElementById("wordCount");

const audioModal = document.getElementById("audioModal");
const modalWord = document.getElementById("modalWord");
const closeModal = document.getElementById("closeModal");
const cancelButton = document.getElementById("cancelButton");

const audioFile = document.getElementById("audioFile");
const selectedFile = document.getElementById("selectedFile");

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

const logoutButton =
    document.getElementById("logoutButton");


/* =========================================
   AUTH CHECK
========================================= */

async function checkAdmin() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
        window.location.href = "login.html";
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

    if (profileError || !profile || profile.role !== "admin") {
        window.location.href = "app.html";
        return false;
    }

    return true;
}


/* =========================================
   LOAD WORDS
========================================= */

async function loadWords() {

    wordsTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="loading-cell">
                Loading words...
            </td>
        </tr>
    `;

    const {
        data,
        error
    } = await supabaseClient
        .from("words")
        .select(`
            id,
            word,
            word_audio_path,
            categories (
                name
            )
        `)
        .order("word", {
            ascending: true
        });

    if (error) {
        console.error(error);

        wordsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    Unable to load words.
                </td>
            </tr>
        `;

        mediaMessage.textContent =
            error.message || "Unable to load words.";

        return;
    }

    allWords = data || [];

    renderWords();
}


/* =========================================
   RENDER WORDS
========================================= */

function renderWords() {

    const searchTerm =
        searchInput.value.trim().toLowerCase();

    const filter =
        statusFilter.value;

    let filteredWords = allWords.filter(word => {

        const matchesSearch =
            !searchTerm ||
            word.word.toLowerCase().includes(searchTerm);

        const hasAudio =
            Boolean(word.word_audio_path);

        const matchesStatus =
            filter === "all" ||
            (filter === "with-audio" && hasAudio) ||
            (filter === "without-audio" && !hasAudio);

        return matchesSearch && matchesStatus;
    });


    wordCount.textContent =
        `${filteredWords.length} ${
            filteredWords.length === 1 ? "word" : "words"
        }`;


    if (filteredWords.length === 0) {

        wordsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    No words found.
                </td>
            </tr>
        `;

        return;
    }


    wordsTableBody.innerHTML =
        filteredWords.map(word => {

            const hasAudio =
                Boolean(word.word_audio_path);

            let audioHTML = "—";

            if (hasAudio) {

                const audioURL =
                    getAudioURL(word.word_audio_path);

                if (audioURL) {

                    audioHTML = `
                        <audio
                            class="audio-preview"
                            controls
                            src="${audioURL}"
                        ></audio>
                    `;
                }
            }


            return `
                <tr>

                    <td>
                        <span class="word-name">
                            ${escapeHTML(word.word)}
                        </span>
                    </td>

                    <td>
                        <span class="category-name">
                            ${
                                word.categories?.name
                                ? escapeHTML(word.categories.name)
                                : "—"
                            }
                        </span>
                    </td>

                    <td>

                        ${
                            hasAudio
                            ? `
                                <span class="status-badge has-audio">
                                    Audio uploaded
                                </span>
                            `
                            : `
                                <span class="status-badge no-audio">
                                    No audio
                                </span>
                            `
                        }

                    </td>

                    <td>
                        ${audioHTML}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="action-button"
                            data-word-id="${word.id}"
                        >
                            ${hasAudio ? "Manage" : "Upload"}
                        </button>

                    </td>

                </tr>
            `;

        }).join("");
}


/* =========================================
   AUDIO URL
========================================= */

function getAudioURL(path) {

    if (!path) {
        return null;
    }

    const {
        data
    } = supabaseClient
        .storage
        .from("audio")
        .getPublicUrl(path);

    return data?.publicUrl || null;
}


/* =========================================
   OPEN MODAL
========================================= */

function openAudioModal(word) {

    selectedWord = word;

    modalWord.textContent =
        word.word;

    modalMessage.textContent = "";

    audioFile.value = "";

    selectedFile.textContent = "";


    if (word.word_audio_path) {

        const audioURL =
            getAudioURL(word.word_audio_path);

        if (audioURL) {

            audioPlayer.src =
                audioURL;

            existingAudioSection.classList.remove(
                "hidden"
            );

            deleteAudioButton.classList.remove(
                "hidden"
            );

        } else {

            existingAudioSection.classList.add(
                "hidden"
            );

            deleteAudioButton.classList.add(
                "hidden"
            );
        }

    } else {

        audioPlayer.removeAttribute("src");

        existingAudioSection.classList.add(
            "hidden"
        );

        deleteAudioButton.classList.add(
            "hidden"
        );
    }


    audioModal.classList.remove(
        "hidden"
    );
}


/* =========================================
   CLOSE MODAL
========================================= */

function closeAudioModal() {

    selectedWord = null;

    audioPlayer.pause();

    audioPlayer.removeAttribute("src");

    audioModal.classList.add(
        "hidden"
    );
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


    if (file.size > 10 * 1024 * 1024) {

        modalMessage.textContent =
            "The audio file is too large. Please keep it under 10 MB.";

        return;
    }


    uploadAudioButton.disabled = true;

    deleteAudioButton.disabled = true;

    modalMessage.textContent =
        "Uploading audio...";


    try {

        /*
         * If the word already has audio,
         * remove the old file first.
         */

        if (selectedWord.word_audio_path) {

            await supabaseClient
                .storage
                .from("audio")
                .remove([
                    selectedWord.word_audio_path
                ]);
        }


        /*
         * Use a stable path based on the word ID.
         */

        const extension =
            getFileExtension(file.name);

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
         * Save the storage path
         * in the words table.
         */

        const {
            error: updateError
        } = await supabaseClient
            .from("words")
            .update({
                word_audio_path: filePath
            })
            .eq("id", selectedWord.id);


        if (updateError) {

            /*
             * If database update fails,
             * remove the uploaded file.
             */

            await supabaseClient
                .storage
                .from("audio")
                .remove([filePath]);

            throw updateError;
        }


        modalMessage.textContent =
            "Audio uploaded successfully.";

        mediaMessage.textContent =
            "Word audio updated successfully.";


        await loadWords();


        const updatedWord =
            allWords.find(
                word => word.id === selectedWord.id
            );

        if (updatedWord) {
            openAudioModal(updatedWord);
        }

    } catch (error) {

        console.error(error);

        modalMessage.textContent =
            error.message ||
            "Unable to upload audio.";

    } finally {

        uploadAudioButton.disabled = false;

        deleteAudioButton.disabled = false;
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


    deleteAudioButton.disabled = true;

    uploadAudioButton.disabled = true;

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
            .remove([path]);


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
            .eq("id", selectedWord.id);


        if (updateError) {
            throw updateError;
        }


        modalMessage.textContent =
            "Audio deleted successfully.";

        mediaMessage.textContent =
            "Word audio removed successfully.";


        await loadWords();


        const updatedWord =
            allWords.find(
                word => word.id === selectedWord.id
            );

        if (updatedWord) {
            openAudioModal(updatedWord);
        } else {
            closeAudioModal();
        }

    } catch (error) {

        console.error(error);

        modalMessage.textContent =
            error.message ||
            "Unable to delete audio.";

    } finally {

        deleteAudioButton.disabled = false;

        uploadAudioButton.disabled = false;
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


wordsTableBody.addEventListener(
    "click",
    function (event) {

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
                    item.id === button.dataset.wordId
            );

        if (word) {
            openAudioModal(word);
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

        if (event.target === audioModal) {
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
   HELPERS
========================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getFileExtension(filename) {

    const parts =
        filename.split(".");

    if (parts.length < 2) {
        return "mp3";
    }

    return parts
        .pop()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || "mp3";
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
