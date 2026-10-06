/* =========================================
   MAKA
========================================= */

"use strict";


/* =========================================
   STATE
========================================= */

const MAKA_TOTAL_QUESTIONS = 5;

const makaState = {
    user: null,
    questions: [],
    currentQuestion: 0,
    score: 0,
    sessionId: null,
    answered: false
};


/* =========================================
   DOM
========================================= */

const startScreen =
    document.getElementById("start-screen");

const gameScreen =
    document.getElementById("game-screen");

const resultScreen =
    document.getElementById("result-screen");

const loadingState =
    document.getElementById("loading-state");

const errorState =
    document.getElementById("error-state");

const errorMessage =
    document.getElementById("error-message");

const startButton =
    document.getElementById("start-button");

const retryButton =
    document.getElementById("retry-button");

const playAgainButton =
    document.getElementById("play-again-button");

const questionCounter =
    document.getElementById("question-counter");

const questionNumber =
    document.getElementById("question-number");

const questionType =
    document.getElementById("question-type");

const questionText =
    document.getElementById("question-text");

const answerGrid =
    document.getElementById("answer-grid");

const answerFeedback =
    document.getElementById("answer-feedback");

const feedbackTitle =
    document.getElementById("feedback-title");

const feedbackText =
    document.getElementById("feedback-text");

const nextButton =
    document.getElementById("next-button");

const progressBar =
    document.getElementById("progress-bar");

const scoreDisplay =
    document.getElementById("score-display");

const finalScore =
    document.getElementById("final-score");

const resultTitle =
    document.getElementById("result-title");

const resultMessage =
    document.getElementById("result-message");


/* =========================================
   HELPERS
========================================= */

function showElement(element) {

    if (element) {
        element.classList.remove("hidden");
    }

}


function hideElement(element) {

    if (element) {
        element.classList.add("hidden");
    }

}


function shuffleArray(array) {

    const result = [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
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


function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================
   AUTH
========================================= */

async function loadCurrentUser() {

    if (!supabaseClient) {
        throw new Error(
            "Supabase client is unavailable."
        );
    }

    const {
        data,
        error
    } = await supabaseClient.auth.getUser();

    if (error) {
        throw error;
    }

    if (!data || !data.user) {

        window.location.href =
            "login.html";

        return null;
    }

    makaState.user =
        data.user;

    return data.user;
}


/* =========================================
   LOAD QUESTIONS
========================================= */

async function loadQuestions() {

    const {
        data,
        error
    } = await supabaseClient
        .from("game_questions")
        .select(`
            id,
            word_id,
            question_type,
            question_text,
            audio_path,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            explanation,
            words (
                id,
                word,
                meanings (
                    meaning,
                    display_order
                )
            )
        `)
        .eq("is_active", true);

    if (error) {
        throw error;
    }

    if (!data || data.length < MAKA_TOTAL_QUESTIONS) {

        throw new Error(
            "There are not enough active Maka questions yet."
        );
    }

    makaState.questions =
        shuffleArray(data)
            .slice(0, MAKA_TOTAL_QUESTIONS);
}


/* =========================================
   CREATE SESSION
========================================= */

async function createGameSession() {

    const {
        data,
        error
    } = await supabaseClient
        .from("game_sessions")
        .insert({
            user_id:
                makaState.user.id,

            score: 0,

            total_questions:
                MAKA_TOTAL_QUESTIONS
        })
        .select("id")
        .single();

    if (error) {
        throw error;
    }

    makaState.sessionId =
        data.id;
}


/* =========================================
   SAVE ANSWER
========================================= */

async function saveAnswer(
    question,
    selectedOption,
    isCorrect
) {

    const {
        error
    } = await supabaseClient
        .from("game_answers")
        .insert({
            session_id:
                makaState.sessionId,

            question_id:
                question.id,

            selected_option:
                selectedOption,

            is_correct:
                isCorrect
        });

    if (error) {
        throw error;
    }
}


/* =========================================
   UPDATE SESSION
========================================= */

async function updateGameSession(
    completed = false
) {

    const payload = {
        score:
            makaState.score
    };

    if (completed) {

        payload.completed_at =
            new Date().toISOString();

    }

    const {
        error
    } = await supabaseClient
        .from("game_sessions")
        .update(payload)
        .eq(
            "id",
            makaState.sessionId
        );

    if (error) {
        throw error;
    }
}


/* =========================================
   START GAME
========================================= */

async function startGame() {

    hideElement(startScreen);
    hideElement(errorState);
    showElement(loadingState);

    try {

        await loadQuestions();

        await createGameSession();

        makaState.currentQuestion = 0;
        makaState.score = 0;
        makaState.answered = false;

        hideElement(loadingState);
        showElement(gameScreen);

        renderQuestion();

    }

    catch (error) {

        console.error(
            "Maka start error:",
            error
        );

        hideElement(loadingState);

        showError(
            error.message ||
            "Unable to start Maka."
        );

    }
}


/* =========================================
   RENDER QUESTION
========================================= */

function renderQuestion() {

    const question =
        makaState.questions[
            makaState.currentQuestion
        ];

    if (!question) {
        finishGame();
        return;
    }

    makaState.answered = false;

    const number =
        makaState.currentQuestion + 1;

    questionCounter.textContent =
        `Question ${number} of ${MAKA_TOTAL_QUESTIONS}`;

    questionNumber.textContent =
        String(number).padStart(2, "0");

    questionType.textContent =
        formatQuestionType(
            question.question_type
        );

    questionText.textContent =
        question.question_text;

    scoreDisplay.textContent =
        `${makaState.score} pts`;

    progressBar.style.width =
        `${(number / MAKA_TOTAL_QUESTIONS) * 100}%`;

    answerFeedback.classList.add("hidden");
    answerFeedback.classList.remove(
        "correct-feedback",
        "wrong-feedback"
    );

    nextButton.classList.add("hidden");

    renderAnswers(question);
}


function formatQuestionType(type) {

    if (!type) {
        return "QUESTION";
    }

    return String(type)
        .replaceAll("_", " ")
        .toUpperCase();
}


/* =========================================
   RENDER ANSWERS
========================================= */

function renderAnswers(question) {

    const options = [
        {
            key: "a",
            value: question.option_a
        },
        {
            key: "b",
            value: question.option_b
        },
        {
            key: "c",
            value: question.option_c
        },
        {
            key: "d",
            value: question.option_d
        }
    ];

    answerGrid.innerHTML =
        options
            .map(
                option => `
                    <button
                        class="answer-button"
                        type="button"
                        data-option="${option.key}"
                    >
                        <span class="answer-letter">
                            ${option.key.toUpperCase()}
                        </span>

                        <span class="answer-text">
                            ${escapeHtml(option.value)}
                        </span>
                    </button>
                `
            )
            .join("");

    answerGrid
        .querySelectorAll(".answer-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    handleAnswer(
                        button.dataset.option
                    );

                }
            );

        });
}


/* =========================================
   HANDLE ANSWER
========================================= */

async function handleAnswer(
    selectedOption
) {

    if (makaState.answered) {
        return;
    }

    makaState.answered = true;

    const question =
        makaState.questions[
            makaState.currentQuestion
        ];

    const buttons =
        answerGrid.querySelectorAll(
            ".answer-button"
        );

    buttons.forEach(button => {
        button.disabled = true;
    });

    const isCorrect =
        selectedOption.toLowerCase() ===
        String(
            question.correct_option
        ).toLowerCase();

    if (isCorrect) {
        makaState.score++;
    }

    buttons.forEach(button => {

        const option =
            button.dataset.option;

        if (
            option.toLowerCase() ===
            String(
                question.correct_option
            ).toLowerCase()
        ) {

            button.classList.add(
                "correct"
            );

        }

        if (
            option.toLowerCase() ===
            selectedOption.toLowerCase() &&
            !isCorrect
        ) {

            button.classList.add(
                "wrong"
            );

        }

    });

    scoreDisplay.textContent =
        `${makaState.score} pts`;

    showFeedback(
        question,
        isCorrect
    );

    try {

        await saveAnswer(
            question,
            selectedOption,
            isCorrect
        );

        await updateGameSession(false);

    }

    catch (error) {

        console.error(
            "Maka answer save error:",
            error
        );

    }

    nextButton.classList.remove(
        "hidden"
    );
}


/* =========================================
   FEEDBACK
========================================= */

function showFeedback(
    question,
    isCorrect
) {

    answerFeedback.classList.remove(
        "hidden"
    );

    if (isCorrect) {

        answerFeedback.classList.add(
            "correct-feedback"
        );

        feedbackTitle.textContent =
            "Correct! ✦";

    } else {

        answerFeedback.classList.add(
            "wrong-feedback"
        );

        feedbackTitle.textContent =
            "Not quite.";

    }

    let explanation =
        question.explanation ||
        "";

    if (!explanation) {

        const word =
            question.words;

        const meanings =
            word &&
            Array.isArray(
                word.meanings
            )
                ? word.meanings
                : [];

        if (meanings.length) {

            const sortedMeanings =
                [...meanings]
                    .sort(
                        (a, b) =>
                            (
                                a.display_order || 0
                            ) -
                            (
                                b.display_order || 0
                            )
                    );

            explanation =
                sortedMeanings[0].meaning;

        }

    }

    feedbackText.textContent =
        explanation ||
        "Keep learning and try again.";
}


/* =========================================
   NEXT QUESTION
========================================= */

function nextQuestion() {

    makaState.currentQuestion++;

    if (
        makaState.currentQuestion >=
        MAKA_TOTAL_QUESTIONS
    ) {

        finishGame();

        return;
    }

    renderQuestion();
}


/* =========================================
   FINISH GAME
========================================= */

async function finishGame() {

    hideElement(gameScreen);
    showElement(loadingState);

    try {

        await updateGameSession(true);

    }

    catch (error) {

        console.error(
            "Maka completion error:",
            error
        );

    }

    hideElement(loadingState);
    showResult();
}


/* =========================================
   RESULT
========================================= */

function showResult() {

    const score =
        makaState.score;

    const total =
        MAKA_TOTAL_QUESTIONS;

    finalScore.textContent =
        `${score} / ${total}`;

    let title;
    let message;

    if (score === 5) {

        title =
            "Maka master!";

        message =
            "You know your Angolan slang. Perfect score.";

    } else if (score >= 4) {

        title =
            "Muito bem!";

        message =
            "Almost perfect. Your knowledge of Angolan slang is strong.";

    } else if (score >= 3) {

        title =
            "Not bad!";

        message =
            "You know your way around the language. Keep discovering.";

    } else if (score >= 1) {

        title =
            "Keep going!";

        message =
            "Every Maka is another chance to learn something new.";

    } else {

        title =
            "A fresh start!";

        message =
            "Don't worry. Explore the dictionary and come back for another Maka.";

    }

    resultTitle.textContent =
        title;

    resultMessage.textContent =
        message;

    showElement(resultScreen);
}


/* =========================================
   RESET
========================================= */

function resetGame() {

    makaState.questions = [];
    makaState.currentQuestion = 0;
    makaState.score = 0;
    makaState.sessionId = null;
    makaState.answered = false;

    hideElement(resultScreen);
    hideElement(gameScreen);
    hideElement(errorState);

    showElement(startScreen);

    scoreDisplay.textContent =
        "0 pts";

    progressBar.style.width =
        "20%";
}


/* =========================================
   ERROR
========================================= */

function showError(message) {

    hideElement(startScreen);
    hideElement(gameScreen);
    hideElement(resultScreen);
    hideElement(loadingState);

    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "Something went wrong.";

    }

    showElement(errorState);
}


/* =========================================
   EVENTS
========================================= */

if (startButton) {

    startButton.addEventListener(
        "click",
        startGame
    );

}

if (nextButton) {

    nextButton.addEventListener(
        "click",
        nextQuestion
    );

}

if (playAgainButton) {

    playAgainButton.addEventListener(
        "click",
        resetGame
    );

    playAgainButton.addEventListener(
        "click",
        startGame
    );

}

if (retryButton) {

    retryButton.addEventListener(
        "click",
        startGame
    );

}


/* =========================================
   INITIALIZE
========================================= */

async function initializeMaka() {

    try {

        await loadCurrentUser();

    }

    catch (error) {

        console.error(
            "Maka authentication error:",
            error
        );

        showError(
            "Please sign in before playing Maka."
        );

    }

}


initializeMaka();
