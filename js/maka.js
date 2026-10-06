/* ============================================================
   MAKA
   ============================================================ */

const state = {

    words: [],

    questions: [],

    currentQuestion: 0,

    score: 0,

    answered: false,

    loading: false

};


/* ============================================================
   ELEMENTS
   ============================================================ */

const startScreen =
    document.getElementById(
        "maka-start"
    );

const gameScreen =
    document.getElementById(
        "maka-game"
    );

const resultScreen =
    document.getElementById(
        "maka-result"
    );

const startButton =
    document.getElementById(
        "start-button"
    );

const backButton =
    document.getElementById(
        "back-button"
    );

const nextButton =
    document.getElementById(
        "next-button"
    );

const playAgainButton =
    document.getElementById(
        "play-again-button"
    );

const dictionaryButton =
    document.getElementById(
        "dictionary-button"
    );

const startMessage =
    document.getElementById(
        "start-message"
    );


/* ============================================================
   HELPERS
   ============================================================ */

function escapeHtml(value) {

    return String(value ?? "")
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


function shuffle(array) {

    const result =
        [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];

    }

    return result;

}


/* ============================================================
   SUPABASE
   ============================================================ */

async function loadWords() {

    if (
        typeof supabaseClient ===
        "undefined" ||
        !supabaseClient
    ) {

        throw new Error(
            "Supabase client is unavailable."
        );

    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from("words")
            .select(`
                id,
                word,
                short_meaning,
                meanings (
                    meaning,
                    is_primary
                )
            `)
            .eq(
                "is_published",
                true
            );

    if (error) {
        throw error;
    }

    const words =
        Array.isArray(data)
            ? data
            : [];

    state.words =
        words
            .map(
                word => {

                    const meanings =
                        Array.isArray(
                            word.meanings
                        )
                            ? word.meanings
                            : [];

                    const primaryMeaning =
                        meanings.find(
                            meaning =>
                                meaning.is_primary
                        ) ||
                        meanings[0];

                    return {

                        id:
                            word.id,

                        word:
                            word.word,

                        shortMeaning:
                            word.short_meaning ||
                            "",

                        meaning:
                            primaryMeaning?.meaning ||
                            ""

                    };

                }
            )
            .filter(
                word =>
                    word.word &&
                    word.meaning
            );

}


/* ============================================================
   QUESTION CREATION
   ============================================================ */

function createQuestions() {

    const availableWords =
        state.words.filter(
            word =>
                word.word &&
                word.meaning
        );

    if (
        availableWords.length < 5
    ) {
        return [];
    }

    const selected =
        shuffle(
            availableWords
        ).slice(
            0,
            5
        );

    return selected.map(
        correctWord => {

            const incorrect =
                shuffle(
                    availableWords.filter(
                        word =>
                            word.id !==
                            correctWord.id
                    )
                ).slice(
                    0,
                    3
                );

            return {

                word:
                    correctWord.word,

                correctId:
                    correctWord.id,

                correctMeaning:
                    correctWord.meaning,

                options:
                    shuffle([
                        correctWord,
                        ...incorrect
                    ])

            };

        }
    );

}


/* ============================================================
   START GAME
   ============================================================ */

async function startMaka() {

    if (state.loading) {
        return;
    }

    state.loading = true;

    startButton.disabled = true;

    startMessage.textContent =
        "Loading Maka...";

    try {

        if (
            state.words.length === 0
        ) {

            await loadWords();

        }

        state.questions =
            createQuestions();

        if (
            state.questions.length < 5
        ) {

            throw new Error(
                "Not enough dictionary words."
            );

        }

        state.currentQuestion = 0;

        state.score = 0;

        state.answered = false;

        startMessage.textContent = "";

        showGame();

        renderQuestion();

    }

    catch (error) {

        console.error(
            "Maka loading error:",
            error
        );

        startMessage.textContent =
            "Maka could not be loaded. Please try again.";

    }

    finally {

        state.loading = false;

        startButton.disabled = false;

    }

}


/* ============================================================
   SCREENS
   ============================================================ */

function showStart() {

    startScreen.hidden = false;

    gameScreen.hidden = true;

    resultScreen.hidden = true;

}


function showGame() {

    startScreen.hidden = true;

    gameScreen.hidden = false;

    resultScreen.hidden = true;

}


function showResult() {

    startScreen.hidden = true;

    gameScreen.hidden = true;

    resultScreen.hidden = false;

}


/* ============================================================
   RENDER QUESTION
   ============================================================ */

function renderQuestion() {

    const question =
        state.questions[
            state.currentQuestion
        ];

    if (!question) {

        finishGame();

        return;

    }

    state.answered = false;

    const questionNumber =
        state.currentQuestion + 1;

    const total =
        state.questions.length;

    document.getElementById(
        "question-counter"
    ).textContent =
        `Question ${questionNumber} of ${total}`;

    document.getElementById(
        "score"
    ).textContent =
        state.score;

    document.getElementById(
        "progress-bar"
    ).style.width =
        `${(questionNumber / total) * 100}%`;

    document.getElementById(
        "question-word"
    ).textContent =
        question.word;

    const optionsContainer =
        document.getElementById(
            "answer-options"
        );

    optionsContainer.innerHTML =
        question.options
            .map(
                option => `

                    <button
                        class="answer-button"
                        type="button"
                        data-id="${option.id}"
                    >
                        ${escapeHtml(
                            option.shortMeaning ||
                            option.meaning
                        )}
                    </button>

                `
            )
            .join("");

    optionsContainer
        .querySelectorAll(
            ".answer-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        answerQuestion(
                            Number(
                                button.dataset.id
                            )
                        );

                    }
                );

            }
        );

    const feedback =
        document.getElementById(
            "feedback"
        );

    feedback.className =
        "feedback";

    feedback.innerHTML =
        "";

    nextButton.hidden =
        true;

}


/* ============================================================
   ANSWER
   ============================================================ */

function answerQuestion(
    selectedId
) {

    if (
        state.answered
    ) {
        return;
    }

    const question =
        state.questions[
            state.currentQuestion
        ];

    if (!question) {
        return;
    }

    state.answered =
        true;

    const correct =
        Number(selectedId) ===
        Number(question.correctId);

    if (correct) {
        state.score++;
    }

    document
        .querySelectorAll(
            ".answer-button"
        )
        .forEach(
            button => {

                const id =
                    Number(
                        button.dataset.id
                    );

                button.disabled =
                    true;

                if (
                    id ===
                    Number(
                        question.correctId
                    )
                ) {

                    button.classList.add(
                        "correct"
                    );

                }

                else if (
                    id ===
                    Number(selectedId)
                ) {

                    button.classList.add(
                        "wrong"
                    );

                }

            }
        );

    const feedback =
        document.getElementById(
            "feedback"
        );

    feedback.className =
        correct
            ? "feedback correct"
            : "feedback wrong";

    feedback.innerHTML =
        correct
            ? `
                <strong>
                    Correct! 🎉
                </strong>

                <span>
                    ${escapeHtml(
                        question.correctMeaning
                    )}
                </span>
            `
            : `
                <strong>
                    Not quite.
                </strong>

                <span>
                    The correct meaning is:
                    ${escapeHtml(
                        question.correctMeaning
                    )}
                </span>
            `;

    document.getElementById(
        "score"
    ).textContent =
        state.score;

    nextButton.textContent =
        state.currentQuestion ===
        state.questions.length - 1
            ? "See Result →"
            : "Next →";

    nextButton.hidden =
        false;

}


/* ============================================================
   NEXT QUESTION
   ============================================================ */

function nextQuestion() {

    if (
        !state.answered
    ) {
        return;
    }

    state.currentQuestion++;

    if (
        state.currentQuestion >=
        state.questions.length
    ) {

        finishGame();

        return;

    }

    renderQuestion();

}


/* ============================================================
   RESULT
   ============================================================ */

function finishGame() {

    const score =
        state.score;

    const total =
        state.questions.length;

    document.getElementById(
        "final-score"
    ).textContent =
        score;

    let title;
    let message;

    if (
        score === total
    ) {

        title =
            "Perfeito!";

        message =
            "You really know your Angolan slang.";

    }

    else if (
        score === 4
    ) {

        title =
            "Muito bem!";

        message =
            "Your Maka game is strong.";

    }

    else if (
        score === 3
    ) {

        title =
            "Boa!";

        message =
            "You know your way around Angolan slang.";

    }

    else if (
        score >= 1
    ) {

        title =
            "Keep going.";

        message =
            "Every new word brings you closer.";

    }

    else {

        title =
            "Time to explore.";

        message =
            "The dictionary is waiting for you.";

    }

    document.getElementById(
        "result-title"
    ).textContent =
        title;

    document.getElementById(
        "result-message"
    ).textContent =
        message;

    showResult();

}


/* ============================================================
   EVENTS
   ============================================================ */

startButton.addEventListener(
    "click",
    startMaka
);

nextButton.addEventListener(
    "click",
    nextQuestion
);

playAgainButton.addEventListener(
    "click",
    startMaka
);

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "app.html";

    }
);

dictionaryButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "app.html";

    }
);


/* ============================================================
   INITIAL STATE
   ============================================================ */

showStart();
