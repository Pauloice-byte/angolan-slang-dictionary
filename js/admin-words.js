const wordsList = document.getElementById("wordsList");
const wordsLoading = document.getElementById("wordsLoading");
const wordsEmpty = document.getElementById("wordsEmpty");

const wordSearch = document.getElementById("wordSearch");
const statusFilter = document.getElementById("statusFilter");
const premiumFilter = document.getElementById("premiumFilter");


let allWords = [];


async function checkAdminAccess() {

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


    if (profileError || !profile) {
        window.location.href = "login.html";
        return false;
    }


    if (profile.role !== "admin") {
        window.location.href = "app.html";
        return false;
    }


    return true;
}


async function loadWords() {

    wordsLoading.hidden = false;
    wordsEmpty.hidden = true;

    const {
        data,
        error
    } = await supabaseClient
        .from("words")
        .select(`
            id,
            word,
            pronunciation,
            word_type,
            short_meaning,
            is_premium,
            is_published,
            created_at,
            categories (
                name
            ),
            packs (
                name
            )
        `)
        .order("word", {
            ascending: true
        });


    if (error) {

        console.error(error);

        wordsLoading.textContent =
            "Unable to load dictionary words.";

        return;
    }


    allWords = data || [];

    wordsLoading.hidden = true;

    renderWords();
}


function renderWords() {

    const search =
        wordSearch.value
            .trim()
            .toLowerCase();

    const status =
        statusFilter.value;

    const premium =
        premiumFilter.value;


    const filteredWords =
        allWords.filter(word => {

            const matchesSearch =
                !search ||
                word.word.toLowerCase().includes(search) ||
                (word.short_meaning || "")
                    .toLowerCase()
                    .includes(search);


            const matchesStatus =
                status === "all" ||
                (status === "published" && word.is_published) ||
                (status === "draft" && !word.is_published);


            const matchesPremium =
                premium === "all" ||
                (premium === "free" && !word.is_premium) ||
                (premium === "premium" && word.is_premium);


            return (
                matchesSearch &&
                matchesStatus &&
                matchesPremium
            );
        });


    wordsList.innerHTML = "";


    if (filteredWords.length === 0) {

        wordsEmpty.hidden = false;

        return;
    }


    wordsEmpty.hidden = true;


    filteredWords.forEach(word => {

        const card =
            document.createElement("div");

        card.className = "admin-word-card";


        const category =
            word.categories?.name || "No category";


        const pack =
            word.packs?.name || "No pack";


        const statusText =
            word.is_published
                ? "Published"
                : "Draft";


        const accessText =
            word.is_premium
                ? "Premium"
                : "Free";


        card.innerHTML = `
            <div class="admin-word-main">

                <h3>${escapeHtml(word.word)}</h3>

                <p>
                    ${escapeHtml(
                        word.short_meaning ||
                        "No meaning added yet."
                    )}
                </p>

            </div>

            <div class="admin-word-meta">

                <span>
                    ${escapeHtml(category)}
                </span>

                <span>
                    ${escapeHtml(pack)}
                </span>

                <span>
                    ${statusText}
                </span>

                <span>
                    ${accessText}
                </span>

            </div>

            <div class="admin-word-actions">

                <button
                    class="btn secondary"
                    onclick="editWord('${word.id}')"
                >
                    Edit
                </button>

                <button
                    class="btn secondary"
                    onclick="togglePublished(
                        '${word.id}',
                        ${word.is_published}
                    )"
                >
                    ${word.is_published
                        ? "Unpublish"
                        : "Publish"}
                </button>

            </div>
        `;


        wordsList.appendChild(card);
    });
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function editWord(id) {

    window.location.href =
        `admin-word-edit.html?id=${encodeURIComponent(id)}`;
}


async function togglePublished(id, currentStatus) {

    const newStatus = !currentStatus;


    const confirmed =
        confirm(
            newStatus
                ? "Publish this word?"
                : "Unpublish this word?"
        );


    if (!confirmed) {
        return;
    }


    const { error } =
        await supabaseClient
            .from("words")
            .update({
                is_published: newStatus
            })
            .eq("id", id);


    if (error) {

        console.error(error);

        alert(
            "Unable to update the word."
        );

        return;
    }


    await loadWords();
}


wordSearch.addEventListener(
    "input",
    renderWords
);

statusFilter.addEventListener(
    "change",
    renderWords
);

premiumFilter.addEventListener(
    "change",
    renderWords
);


async function initialize() {

    const authorized =
        await checkAdminAccess();

    if (!authorized) {
        return;
    }

    await loadWords();
}


initialize();
