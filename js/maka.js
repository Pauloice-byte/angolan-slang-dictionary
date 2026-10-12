/* =========================================================
   MAKA
   Secure dictionary-based learning game
   Questions, answer validation, score and Paus are handled
   by Supabase RPC functions.
========================================================= */

const MAKA_MIN_OPTIONS = 4;

const QUESTION_TYPES = {
    MEANING: "meaning",
    CONTEXT: "context",
    REVERSE: "reverse"
};

let roundQuestions = [];
let currentQuestion = null;

let score = 0;
let questionNumber = 0;
let questionIndex = 0;

let gameSessionId = null;

let answered = false;
let roundStarting = false;
let answerSubmitting = false;
let roundFinishing = false;
let eventsBound = false;


/* =========================================================
   DOM
========================================================= */

let startScreen;
let gameScreen;
let resultScreen;

let loadingState;
let errorState;

let loadingMessage;
let errorMessage;

let startButton;
let playAgainButton;
let retryButton;

let questionCounter;
let questionNumberElement;
let questionType;
let questionContext;
let questionText;

let answerGrid;
let answerFeedback;
let feedbackTitle;
let feedbackText;

let nextButton;

let scoreDisplay;
let progressBar;

let playedCount;
let remainingCount;
let availableWordCount;

let finalScore;
let resultTitle;
let resultMessage;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeMaka
);


async function initializeMaka() {
    cacheDom();

    if (
        !startButton ||
        !gameScreen ||
        !answerGrid
    ) {
        console.error(
            "MAKA: Required HTML elements are missing."
        );

        return;
    }

    if (!eventsBound) {
        bindEvents();
        eventsBound = true;
    }

    hideError();

    showLoading(
        "Preparing your Maka..."
    );

    try {
        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            throw new Error(
                "Supabase is not configured on this page."
            );
        }

        const {
            data,
            error
        } = await supabaseClient.auth.getUser();

        if (
            error ||
            !data?.user
        ) {
            throw new Error(
                "Please sign in before playing Maka."
            );
        }

        if (availableWordCount) {
            availableWordCount.textContent = "—";
        }

        hideLoading();

        startScreen?.classList.remove(
            "hidden"
        );

        console.log(
            "MAKA: Ready. Questions will be generated securely by Supabase."
        );

    } catch (error) {
        console.error(
            "MAKA initialization error:",
            error
        );

        showError(
            getErrorMessage(error)
        );
    }
}


/* =========================================================
   CACHE DOM
========================================================= */

function cacheDom() {
    startScreen =
        document.getElementById("start-screen");

    gameScreen =
        document.getElementById("game-screen");

    resultScreen =
        document.getElementById("result-screen");

    loadingState =
        document.getElementById("loading-state");

    errorState =
        document.getElementById("error-state");

    loadingMessage =
        document.getElementById("loading-message");

    errorMessage =
        document.getElementById("error-message");

    startButton =
        document.getElementById("start-button");

    playAgainButton =
        document.getElementById("play-again-button");

    retryButton =
        document.getElementById("retry-button");

    questionCounter =
        document.getElementById("question-counter");

    questionNumberElement =
        document.getElementById("question-number");

    questionType =
        document.getElementById("question-type");

    questionContext =
        document.getElementById("question-context");

    questionText =
        document.getElementById("question-text");

    answerGrid =
        document.getElementById("answer-grid");

    answerFeedback =
        document.getElementById("answer-feedback");

    feedbackTitle =
        document.getElementById("feedback-title");

    feedbackText =
        document.getElementById("feedback-text");

    nextButton =
        document.getElementById("next-button");

    scoreDisplay =
        document.getElementById("score-display");

    progressBar =
        document.getElementById("progress-bar");

    playedCount =
        document.getElementById("played-count");

    remainingCount =
        document.getElementById("remaining-count");

    availableWordCount =
        document.getElementById("available-word-count");

    finalScore =
        document.getElementById("final-score");

    resultTitle =
        document.getElementById("result-title");

    resultMessage =
        document.getElementById("result-message");
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
    startButton?.addEventListener(
        "click",
        startGame
    );

    playAgainButton?.addEventListener(
        "click",
        startGame
    );

    retryButton?.addEventListener(
        "click",
        initializeMaka
    );

    nextButton?.addEventListener(
        "click",
        goToNextQuestion
    );
}


/* =========================================================
   START GAME
========================================================= */

async function startGame() {
    if (
        roundStarting ||
        answerSubmitting ||
        roundFinishing
    ) {
        return;
    }

    roundStarting = true;

    setStartButtonsDisabled(true);

    hideError();

    score = 0;
    questionNumber = 0;
    questionIndex = 0;

    gameSessionId = null;
    currentQuestion = null;
    roundQuestions = [];

    answered = false;

    updateScore();
    updateProgress();

    showLoading(
        "Starting Maka..."
    );

    try {
        const {
            data,
            error
        } = await supabaseClient.rpc(
            "start_maka_round"
        );

        if (error) {
            throw error;
        }

        if (
            !data ||
            !data.session_id ||
            !Array.isArray(data.questions)
        ) {
            throw new Error(
                "Supabase returned an invalid Maka round."
            );
        }

        if (!data.questions.length) {
            throw new Error(
                "No playable questions are available. Please try again later."
            );
        }

        /*
         * Keep only the fields returned by the server.
         * The correct answer is intentionally not supplied
         * to the browser before the answer is submitted.
         */

        roundQuestions =
            data.questions.map(
                question => {
                    const options = [
                        question.option_a,
                        question.option_b,
                        question.option_c,
                        question.option_d
                    ];

                    if (
                        options.some(
                            option =>
                                typeof option !== "string" ||
                                !option.trim()
                        )
                    ) {
                        throw new Error(
                            "A question contains incomplete answer options."
                        );
                    }

                    return {
                        id: question.id,

                        sequenceNo:
                            question.sequence_no,

                        wordId:
                            question.word_id,

                        type:
                            question.question_type,

                        typeLabel:
                            getQuestionTypeLabel(
                                question.question_type
                            ),

                        prompt:
                            question.question_text || "",

                        context:
                            question.context_text || "",

                        options,

                        explanation:
                            question.explanation || "",

                        correctAnswer: null
                    };
                }
            );

        gameSessionId = data.session_id;

        if (availableWordCount) {
            availableWordCount.textContent =
                String(roundQuestions.length);
        }

        score = 0;
        questionIndex = 0;
        questionNumber = 0;

        updateScore();
        updateProgress();

        hideLoading();

        startScreen?.classList.add("hidden");
        resultScreen?.classList.add("hidden");
        gameScreen?.classList.remove("hidden");

        loadNextQuestion();

        console.log(
            `MAKA: Round ${gameSessionId} started with ${roundQuestions.length} questions.`
        );

    } catch (error) {
        console.error(
            "MAKA round could not start:",
            error
        );

        showError(
            getErrorMessage(error)
        );

    } finally {
        roundStarting = false;
        setStartButtonsDisabled(false);
    }
}


/* =========================================================
   QUESTION TYPE LABELS
========================================================= */

function getQuestionTypeLabel(type) {
    switch (type) {
        case QUESTION_TYPES.CONTEXT:
            return "IN CONTEXT";

        case QUESTION_TYPES.REVERSE:
            return "FIND THE WORD";

        case QUESTION_TYPES.MEANING:
        default:
            return "WORD MEANING";
    }
}


/* =========================================================
   LOAD NEXT QUESTION
========================================================= */

function loadNextQuestion() {
    if (
        questionIndex >= roundQuestions.length
    ) {
        finishGame();
        return;
    }

    answered = false;

    currentQuestion =
        roundQuestions[questionIndex];

    questionNumber =
        questionIndex + 1;

    resetQuestionUI();

    renderQuestion(
        currentQuestion
    );

    updateScore();
    updateProgress();
}


/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion(question) {
    if (!question) {
        showError(
            "The next question could not be loaded."
        );

        return;
    }

    if (questionNumberElement) {
        questionNumberElement.textContent =
            String(questionNumber).padStart(2, "0");
    }

    if (questionCounter) {
        questionCounter.textContent =
            `Question ${questionNumber} of ${roundQuestions.length}`;
    }

    if (questionType) {
        questionType.textContent =
            question.typeLabel;
    }

    if (questionText) {
        questionText.textContent =
            question.prompt;
    }

    if (questionContext) {
        if (question.context) {
            questionContext.textContent =
                `"${question.context}"`;

            questionContext.classList.remove(
                "hidden"
            );
        } else {
            questionContext.textContent = "";

            questionContext.classList.add(
                "hidden"
            );
        }
    }

    answerGrid.innerHTML = "";

    const letters = ["A", "B", "C", "D"];

    question.options.forEach(
        (option, index) => {
            const button =
                document.createElement("button");

            button.type = "button";
            button.className = "answer-button";
            button.dataset.answer = option;

            const letter =
                document.createElement("span");

            letter.className = "answer-letter";
            letter.textContent = letters[index];

            const answerTextElement =
                document.createElement("span");

            answerTextElement.className = "answer-text";
            answerTextElement.textContent = option;

            button.appendChild(letter);
            button.appendChild(answerTextElement);

            button.addEventListener(
                "click",
                () => handleAnswer(button, option)
            );

            answerGrid.appendChild(button);
        }
    );
}


/* =========================================================
   SUBMIT ANSWER
========================================================= */

async function handleAnswer(
    selectedButton,
    selectedAnswer
) {
    if (
        answered ||
        answerSubmitting ||
        !currentQuestion ||
        !gameSessionId
    ) {
        return;
    }

    /*
     * Lock the answer immediately to prevent duplicate clicks.
     * A failed request unlocks the question for another attempt.
     */

    answered = true;
    answerSubmitting = true;

    const buttons =
        answerGrid.querySelectorAll(
            ".answer-button"
        );

    buttons.forEach(
        button => {
            button.disabled = true;
        }
    );

    if (feedbackTitle) {
        feedbackTitle.textContent =
            "Checking your answer...";
    }

    if (feedbackText) {
        feedbackText.textContent =
            "Please wait.";
    }

    answerFeedback?.classList.remove("hidden");
    nextButton?.classList.add("hidden");

    try {
        const {
            data,
            error
        } = await supabaseClient.rpc(
            "submit_maka_answer",
            {
                p_session_id: gameSessionId,

                p_question_id:
                    currentQuestion.id,

                p_selected_answer:
                    selectedAnswer
            }
        );

        if (error) {
            throw error;
        }

        if (
            !data ||
            typeof data.is_correct !== "boolean"
        ) {
            throw new Error(
                "The server did not return a valid answer result."
            );
        }

        /*
         * The server is the authority for correctness and score.
         */

        currentQuestion.correctAnswer =
            data.correct_answer;

        currentQuestion.explanation =
            data.explanation ||
            currentQuestion.explanation;

        score =
            Number(data.score ?? score);

        const isCorrect =
            data.is_correct;

        const pausAwarded =
            Number(data.paus_awarded || 0);

        buttons.forEach(
            button => {
                const answer =
                    button.dataset.answer;

                if (
                    normalizeAnswer(answer) ===
                    normalizeAnswer(
                        currentQuestion.correctAnswer
                    )
                ) {
                    button.classList.add("correct");
                }
            }
        );

        if (isCorrect) {
            selectedButton.classList.add("correct");

            if (feedbackTitle) {
                feedbackTitle.textContent =
                    pausAwarded > 0
                        ? `Correct! +${pausAwarded} Paus`
                        : "Correct!";
            }

            if (feedbackText) {
                feedbackText.textContent =
                    currentQuestion.explanation ||
                    "Good job.";
            }

        } else {
            selectedButton.classList.add("incorrect");

            if (feedbackTitle) {
                feedbackTitle.textContent =
                    "Not quite.";
            }

            if (feedbackText) {
                const explanation =
                    currentQuestion.explanation
                        ? ` ${currentQuestion.explanation}`
                        : "";

                feedbackText.textContent =
                    `The correct answer is "${currentQuestion.correctAnswer}".${explanation}`;
            }
        }

        updateScore();
        updatePausBalance();

        nextButton?.classList.remove("hidden");

        if (
            questionIndex >=
            roundQuestions.length - 1
        ) {
            if (nextButton) {
                nextButton.innerHTML =
                    `See Results <span>→</span>`;
            }
        }

    } catch (error) {
        console.error(
            "MAKA answer submission failed:",
            error
        );

        /*
         * Do not mark the answer correct or award points
         * when the server has not confirmed the submission.
         */

        answered = false;

        buttons.forEach(
            button => {
                button.disabled = false;
                button.classList.remove(
                    "correct",
                    "incorrect"
                );
            }
        );

        if (feedbackTitle) {
            feedbackTitle.textContent =
                "Answer not saved";
        }

        if (feedbackText) {
            feedbackText.textContent =
                `${getErrorMessage(error)} Please select your answer again.`;
        }

        answerFeedback?.classList.remove("hidden");

    } finally {
        answerSubmitting = false;
    }
}


/* =========================================================
   NEXT QUESTION
========================================================= */

function goToNextQuestion() {
    if (
        answerSubmitting ||
        roundStarting ||
        roundFinishing
    ) {
        return;
    }

    /*
     * If finalization previously failed, clicking the
     * button retries finishing the same round.
     */

    if (
        questionIndex >= roundQuestions.length
    ) {
        finishGame();
        return;
    }

    if (!answered) {
        return;
    }

    questionIndex++;

    if (
        questionIndex >= roundQuestions.length
    ) {
        if (nextButton) {
            nextButton.innerHTML =
                `Retry Results <span>→</span>`;
        }

        finishGame();
        return;
    }

    loadNextQuestion();
}


/* =========================================================
   FINISH ROUND
========================================================= */

async function finishGame() {
    if (
        roundFinishing ||
        !gameSessionId
    ) {
        return;
    }

    roundFinishing = true;

    if (nextButton) {
        nextButton.disabled = true;
        nextButton.classList.add("hidden");
    }

    if (feedbackTitle) {
        feedbackTitle.textContent =
            "Saving your results...";
    }

    if (feedbackText) {
        feedbackText.textContent =
            "Your score and rewards are being confirmed.";
    }

    answerFeedback?.classList.remove("hidden");

    try {
        const {
            data,
            error
        } = await supabaseClient.rpc(
            "finish_maka_round",
            {
                p_session_id: gameSessionId
            }
        );

        if (error) {
            throw error;
        }

        if (!data) {
            throw new Error(
                "The server did not return the round results."
            );
        }

        score =
            Number(data.score ?? score);

        const total =
            Number(
                data.total_questions ??
                data.total ??
                roundQuestions.length
            );

        const bonus =
            Number(data.bonus || 0);

        questionNumber = total;

        updateScore();
        updateProgress();

        if (finalScore) {
            finalScore.textContent =
                `${score} / ${total}`;
        }

        const percentage =
            total > 0
                ? (score / total) * 100
                : 0;

        if (percentage >= 90) {
            if (resultTitle) {
                resultTitle.textContent =
                    "Excellent!";
            }

            if (resultMessage) {
                resultMessage.textContent =
                    "You really know your Angolan slang. Your Maka game is strong.";
            }

        } else if (percentage >= 70) {
            if (resultTitle) {
                resultTitle.textContent =
                    "Very good!";
            }

            if (resultMessage) {
                resultMessage.textContent =
                    "You know your slang well. Keep playing to master even more words.";
            }

        } else if (percentage >= 50) {
            if (resultTitle) {
                resultTitle.textContent =
                    "Good effort!";
            }

            if (resultMessage) {
                resultMessage.textContent =
                    "You're getting there. Keep learning new Angolan expressions.";
            }

        } else {
            if (resultTitle) {
                resultTitle.textContent =
                    "Keep learning!";
            }

            if (resultMessage) {
                resultMessage.textContent =
                    "Every round is an opportunity to learn more Angolan slang.";
            }
        }

        if (
            bonus > 0 &&
            resultMessage
        ) {
            resultMessage.textContent +=
                ` You also earned ${bonus} bonus Paus!`;
        }

        gameScreen?.classList.add("hidden");
        startScreen?.classList.add("hidden");
        resultScreen?.classList.remove("hidden");

        updatePausBalance();

        console.log(
            "MAKA round completed:",
            {
                sessionId: gameSessionId,
                score,
                total,
                bonus
            }
        );

    } catch (error) {
        console.error(
            "MAKA round could not be finalized:",
            error
        );

        /*
         * Keep the game session available so the user
         * can retry finalization without starting a new round.
         */

        if (feedbackTitle) {
            feedbackTitle.textContent =
                "Results not saved yet";
        }

        if (feedbackText) {
            feedbackText.textContent =
                `${getErrorMessage(error)} Click below to retry.`;
        }

        if (nextButton) {
            nextButton.disabled = false;
            nextButton.innerHTML =
                `Retry Results <span>→</span>`;

            nextButton.classList.remove("hidden");
        }

        answerFeedback?.classList.remove("hidden");

    } finally {
        roundFinishing = false;
    }
}


/* =========================================================
   SCORE DISPLAY
========================================================= */

function updateScore() {
    if (!scoreDisplay) {
        return;
    }

    scoreDisplay.textContent =
        `${score} pts`;
}


/* =========================================================
   PROGRESS DISPLAY
========================================================= */

function updateProgress() {
    const total =
        roundQuestions.length;

    const played =
        Math.min(
            questionNumber,
            total
        );

    const remaining =
        Math.max(
            total - played,
            0
        );

    const percentage =
        total > 0
            ? (played / total) * 100
            : 0;

    if (progressBar) {
        progressBar.style.width =
            `${percentage}%`;
    }

    if (playedCount) {
        playedCount.textContent =
            `${played} played`;
    }

    if (remainingCount) {
        remainingCount.textContent =
            `${remaining} remaining`;
    }
}


/* =========================================================
   PAUS BALANCE
========================================================= */

async function updatePausBalance() {
    try {
        const {
            data,
            error
        } = await supabaseClient.rpc(
            "get_my_paus_balance"
        );

        if (error) {
            console.warn(
                "MAKA: Paus balance refresh failed.",
                error
            );

            return;
        }

        const balance =
            Number(data);

        if (!Number.isFinite(balance)) {
            return;
        }

        /*
         * Update any existing Paus balance elements.
         * No new HTML elements are required for this function.
         */

        const balanceElements =
            document.querySelectorAll(
                "[data-paus-balance], #paus-balance, #paus-display, #paus-count"
            );

        balanceElements.forEach(
            element => {
                element.textContent =
                    String(balance);
            }
        );

    } catch (error) {
        console.warn(
            "MAKA: Could not refresh Paus balance.",
            error
        );
    }
}


/* =========================================================
   RESET QUESTION UI
========================================================= */

function resetQuestionUI() {
    if (answerGrid) {
        answerGrid.innerHTML = "";
    }

    answerFeedback?.classList.add("hidden");

    if (nextButton) {
        nextButton.classList.add("hidden");
        nextButton.disabled = false;

        nextButton.innerHTML =
            `Next Question <span>→</span>`;
    }

    if (questionContext) {
        questionContext.classList.add("hidden");
        questionContext.textContent = "";
    }
}


/* =========================================================
   START BUTTONS
========================================================= */

function setStartButtonsDisabled(disabled) {
    if (startButton) {
        startButton.disabled = disabled;
    }

    if (playAgainButton) {
        playAgainButton.disabled = disabled;
    }
}


/* =========================================================
   LOADING
========================================================= */

function showLoading(message) {
    if (loadingMessage) {
        loadingMessage.textContent =
            message || "Preparing your Maka...";
    }

    loadingState?.classList.remove("hidden");

    startScreen?.classList.add("hidden");
    gameScreen?.classList.add("hidden");
    resultScreen?.classList.add("hidden");
    errorState?.classList.add("hidden");
}


function hideLoading() {
    loadingState?.classList.add("hidden");
}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function showError(message) {
    hideLoading();

    startScreen?.classList.add("hidden");
    gameScreen?.classList.add("hidden");
    resultScreen?.classList.add("hidden");

    if (errorMessage) {
        errorMessage.textContent =
            message || "Something went wrong.";
    }

    errorState?.classList.remove("hidden");
}


function hideError() {
    errorState?.classList.add("hidden");
}


/* =========================================================
   HELPERS
========================================================= */

function normalizeAnswer(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}


function getErrorMessage(error) {
    if (error?.message) {
        return error.message;
    }

    return "An unexpected error occurred. Please try again.";
}
