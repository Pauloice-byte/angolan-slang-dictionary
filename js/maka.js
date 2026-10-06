/* =========================================================
   MAKA
   Continuous dictionary-based learning game
========================================================= */

const MAKA_MIN_OPTIONS = 4;

const QUESTION_TYPES = {
    MEANING: "meaning",
    CONTEXT: "context",
    REVERSE: "reverse"
};

let availableWords = [];
let remainingWords = [];

let currentQuestion = null;

let score = 0;
let questionNumber = 0;

let gameSessionId = null;
let gameStartedAt = null;

let answered = false;


/* =========================================================
   DOM
========================================================= */

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

const loadingMessage =
    document.getElementById("loading-message");

const errorMessage =
    document.getElementById("error-message");

const startButton =
    document.getElementById("start-button");

const playAgainButton =
    document.getElementById("play-again-button");

const retryButton =
    document.getElementById("retry-button");

const questionCounter =
    document.getElementById("question-counter");

const questionNumberElement =
    document.getElementById("question-number");

const questionType =
    document.getElementById("question-type");

const questionContext =
    document.getElementById("question-context");

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

const scoreDisplay =
    document.getElementById("score-display");

const progressBar =
    document.getElementById("progress-bar");

const playedCount =
    document.getElementById("played-count");

const remainingCount =
    document.getElementById("remaining-count");

const availableWordCount =
    document.getElementById("available-word-count");

const finalScore =
    document.getElementById("final-score");

const resultTitle =
    document.getElementById("result-title");

const resultMessage =
    document.getElementById("result-message");


/* =========================================================
   INIT
========================================================= */

document.addEventListener("DOMContentLoaded", initializeMaka);


async function initializeMaka() {

    bindEvents();

    showLoading("Loading the available words...");

    try {

        await loadAvailableWords();

        if (availableWords.length < MAKA_MIN_OPTIONS) {
            throw new Error(
                "Maka needs at least four published words with meanings."
            );
        }

        availableWordCount.textContent =
            availableWords.length;

        hideLoading();

    } catch (error) {

        console.error("Maka initialization error:", error);

        showError(
            error.message ||
            "We couldn't load the available dictionary words."
        );
    }
}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

    startButton.addEventListener(
        "click",
        startGame
    );

    playAgainButton.addEventListener(
        "click",
        startGame
    );

    retryButton.addEventListener(
        "click",
        initializeMaka
    );

    nextButton.addEventListener(
        "click",
        goToNextQuestion
    );
}


/* =========================================================
   LOAD WORDS
========================================================= */

async function loadAvailableWords() {

    /*
        Only published dictionary words are available
        to Maka.

        Each word needs at least one meaning.
        Examples are optional.
    */

    const { data, error } =
        await supabaseClient
            .from("words")
            .select(`
                id,
                word,
                pronunciation,
                word_type,
                short_meaning,
                context_notes,
                meanings (
                    id,
                    meaning,
                    display_order,
                    examples (
                        id,
                        example_text,
                        translation,
                        usage_label,
                        display_order
                    )
                )
            `)
            .eq("is_published", true);

    if (error) {
        throw error;
    }

    if (!data || !data.length) {
        throw new Error(
            "There are no published dictionary words available for Maka yet."
        );
    }


    /*
        Clean the dictionary data.

        A word is usable when it has at least
        one actual meaning.
    */

    availableWords = data
        .map(normalizeWord)
        .filter(word => word.meanings.length > 0);


    if (availableWords.length < MAKA_MIN_OPTIONS) {
        throw new Error(
            "Maka needs at least four published words with meanings."
        );
    }
}


/* =========================================================
   NORMALIZE WORD
========================================================= */

function normalizeWord(word) {

    const meanings =
        Array.isArray(word.meanings)
            ? word.meanings
                .filter(item =>
                    item &&
                    typeof item.meaning === "string" &&
                    item.meaning.trim()
                )
                .sort(
                    (a, b) =>
                        (a.display_order || 0) -
                        (b.display_order || 0)
                )
                .map(meaning => ({
                    id: meaning.id,
                    meaning: meaning.meaning.trim(),
                    examples:
                        Array.isArray(meaning.examples)
                            ? meaning.examples
                                .filter(example =>
                                    example &&
                                    typeof example.example_text === "string" &&
                                    example.example_text.trim()
                                )
                                .sort(
                                    (a, b) =>
                                        (a.display_order || 0) -
                                        (b.display_order || 0)
                                )
                            : []
                }))
            : [];


    return {
        id: word.id,
        word: word.word?.trim() || "",
        pronunciation: word.pronunciation || "",
        word_type: word.word_type || "",
        short_meaning: word.short_meaning || "",
        context_notes: word.context_notes || "",
        meanings
    };
}


/* =========================================================
   START GAME
========================================================= */

async function startGame() {

    hideError();

    score = 0;
    questionNumber = 0;

    gameSessionId = null;

    gameStartedAt =
        new Date().toISOString();

    answered = false;


    /*
        Make a fresh shuffled copy.

        This means a user can play through all
        available words without seeing the same
        word twice in one session.
    */

    remainingWords =
        shuffle([...availableWords]);


    updateScore();
    updateProgress();


    startScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");

    showLoading("Starting Maka...");


    /*
        Database history is useful, but gameplay
        does not depend on it.

        If RLS prevents the session insert,
        Maka still works.
    */

    await createGameSession();


    hideLoading();

    gameScreen.classList.remove("hidden");

    loadNextQuestion();
}


/* =========================================================
   CREATE SESSION
========================================================= */

async function createGameSession() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("game_sessions")
            .insert({
                user_id: await getCurrentUserId(),
                score: 0,
                total_questions: availableWords.length,
                started_at: gameStartedAt
            })
            .select("id")
            .single();


        if (error) {
            console.warn(
                "Maka session could not be saved:",
                error
            );

            return;
        }


        gameSessionId = data?.id || null;

    } catch (error) {

        console.warn(
            "Maka session creation skipped:",
            error
        );
    }
}


/* =========================================================
   CURRENT USER
========================================================= */

async function getCurrentUserId() {

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getUser();


        if (error || !data?.user) {
            return null;
        }


        return data.user.id;

    } catch (error) {

        console.warn(
            "Could not determine Maka user:",
            error
        );

        return null;
    }
}


/* =========================================================
   NEXT QUESTION
========================================================= */

function loadNextQuestion() {

    if (!remainingWords.length) {

        finishGame();

        return;
    }


    answered = false;

    resetQuestionUI();


    const word =
        remainingWords.shift();


    currentQuestion =
        generateQuestion(word);


    if (!currentQuestion) {

        loadNextQuestion();

        return;
    }


    questionNumber++;


    renderQuestion(
        currentQuestion
    );


    updateScore();
    updateProgress();
}


/* =========================================================
   GENERATE QUESTION
========================================================= */

function generateQuestion(word) {

    const possibleTypes = [
        QUESTION_TYPES.MEANING,
        QUESTION_TYPES.REVERSE
    ];


    /*
        Context questions only make sense when
        this particular word has an example.
    */

    const examples =
        getAllExamples(word);


    if (examples.length > 0) {
        possibleTypes.push(
            QUESTION_TYPES.CONTEXT
        );
    }


    const type =
        randomItem(possibleTypes);


    switch (type) {

        case QUESTION_TYPES.CONTEXT:
            return createContextQuestion(
                word,
                examples
            );

        case QUESTION_TYPES.REVERSE:
            return createReverseQuestion(
                word
            );

        default:
            return createMeaningQuestion(
                word
            );
    }
}


/* =========================================================
   TYPE 1
   WHAT DOES THIS WORD MEAN?
========================================================= */

function createMeaningQuestion(word) {

    const correctMeaning =
        getPrimaryMeaning(word);


    if (!correctMeaning) {
        return null;
    }


    const distractors =
        getMeaningDistractors(
            word.id,
            correctMeaning.meaning
        );


    if (distractors.length < 3) {
        return null;
    }


    const options =
        shuffle([
            correctMeaning.meaning,
            ...distractors.slice(0, 3)
        ]);


    return {
        type: QUESTION_TYPES.MEANING,

        typeLabel:
            "WORD MEANING",

        wordId:
            word.id,

        word:
            word.word,

        prompt:
            `What does "${word.word}" mean?`,

        context:
            null,

        options,

        correctAnswer:
            correctMeaning.meaning,

        explanation:
            word.short_meaning ||
            correctMeaning.meaning
    };
}


/* =========================================================
   TYPE 2
   WORD IN CONTEXT
========================================================= */

function createContextQuestion(
    word,
    examples
) {

    const correctMeaning =
        getPrimaryMeaning(word);


    if (!correctMeaning) {
        return null;
    }


    const example =
        randomItem(examples);


    const distractors =
        getMeaningDistractors(
            word.id,
            correctMeaning.meaning
        );


    if (
        !example ||
        distractors.length < 3
    ) {
        return createMeaningQuestion(word);
    }


    const options =
        shuffle([
            correctMeaning.meaning,
            ...distractors.slice(0, 3)
        ]);


    return {
        type: QUESTION_TYPES.CONTEXT,

        typeLabel:
            "IN CONTEXT",

        wordId:
            word.id,

        word:
            word.word,

        prompt:
            `What does "${word.word}" mean in this phrase?`,

        context:
            example.example_text,

        options,

        correctAnswer:
            correctMeaning.meaning,

        explanation:
            example.translation
                ? `${correctMeaning.meaning} — ${example.translation}`
                : correctMeaning.meaning
    };
}


/* =========================================================
   TYPE 3
   REVERSE QUESTION
========================================================= */

function createReverseQuestion(word) {

    const correctMeaning =
        getPrimaryMeaning(word);


    if (!correctMeaning) {
        return null;
    }


    /*
        Here the player sees the meaning
        and must identify the word.
    */

    const distractorWords =
        shuffle(
            availableWords.filter(
                candidate =>
                    candidate.id !== word.id &&
                    getPrimaryMeaning(candidate)
            )
        )
        .slice(0, 3);


    if (distractorWords.length < 3) {
        return createMeaningQuestion(word);
    }


    const options =
        shuffle([
            word.word,
            ...distractorWords.map(
                candidate => candidate.word
            )
        ]);


    return {
        type: QUESTION_TYPES.REVERSE,

        typeLabel:
            "FIND THE WORD",

        wordId:
            word.id,

        word:
            word.word,

        prompt:
            `Which word matches this meaning?`,

        context:
            correctMeaning.meaning,

        options,

        correctAnswer:
            word.word,

        explanation:
            `"${word.word}" means ${correctMeaning.meaning}.`
    };
}


/* =========================================================
   PRIMARY MEANING
========================================================= */

function getPrimaryMeaning(word) {

    if (
        !word ||
        !Array.isArray(word.meanings) ||
        !word.meanings.length
    ) {
        return null;
    }


    return word.meanings[0];
}


/* =========================================================
   ALL EXAMPLES
========================================================= */

function getAllExamples(word) {

    if (!word?.meanings) {
        return [];
    }


    return word.meanings.flatMap(
        meaning =>
            Array.isArray(meaning.examples)
                ? meaning.examples
                : []
    );
}


/* =========================================================
   DISTRACTORS
========================================================= */

function getMeaningDistractors(
    currentWordId,
    correctMeaning
) {

    const uniqueMeanings =
        new Set();


    const candidates = [];


    for (const word of availableWords) {

        if (word.id === currentWordId) {
            continue;
        }


        const meaning =
            getPrimaryMeaning(word);


        if (!meaning) {
            continue;
        }


        const text =
            meaning.meaning.trim();


        if (!text) {
            continue;
        }


        const normalized =
            text.toLowerCase();


        if (
            normalized ===
            correctMeaning.trim().toLowerCase()
        ) {
            continue;
        }


        if (uniqueMeanings.has(normalized)) {
            continue;
        }


        uniqueMeanings.add(normalized);

        candidates.push(text);
    }


    return shuffle(candidates);
}


/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion(question) {

    questionNumberElement.textContent =
        String(questionNumber).padStart(2, "0");


    questionCounter.textContent =
        `Question ${questionNumber}`;


    questionType.textContent =
        question.typeLabel;


    questionText.textContent =
        question.prompt;


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


    answerGrid.innerHTML = "";


    const letters = [
        "A",
        "B",
        "C",
        "D"
    ];


    question.options.forEach(
        (option, index) => {

            const button =
                document.createElement("button");


            button.type = "button";

            button.className =
                "answer-button";


            button.dataset.answer =
                option;


            button.innerHTML = `
                <span class="answer-letter">
                    ${letters[index]}
                </span>

                <span class="answer-text">
                    ${escapeHtml(option)}
                </span>
            `;


            button.addEventListener(
                "click",
                () => handleAnswer(
                    button,
                    option
                )
            );


            answerGrid.appendChild(button);
        }
    );
}


/* =========================================================
   HANDLE ANSWER
========================================================= */

async function handleAnswer(
    selectedButton,
    selectedAnswer
) {

    if (
        answered ||
        !currentQuestion
    ) {
        return;
    }


    answered = true;


    const isCorrect =
        normalizeAnswer(selectedAnswer) ===
        normalizeAnswer(
            currentQuestion.correctAnswer
        );


    const buttons =
        answerGrid.querySelectorAll(
            ".answer-button"
        );


    buttons.forEach(button => {

        button.disabled = true;


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
    });


    if (isCorrect) {

        score++;

        selectedButton.classList.add(
            "correct"
        );


        feedbackTitle.textContent =
            "Correct!";


        feedbackText.textContent =
            currentQuestion.explanation ||
            "Good job.";

    } else {

        selectedButton.classList.add(
            "incorrect"
        );


        feedbackTitle.textContent =
            "Not quite.";


        feedbackText.textContent =
            `The correct answer is "${currentQuestion.correctAnswer}". ` +
            `${currentQuestion.explanation || ""}`;
    }


    answerFeedback.classList.remove(
        "hidden"
    );


    nextButton.classList.remove(
        "hidden"
    );


    updateScore();


    /*
        Save the answer when possible.
        Gameplay does not stop if Supabase
        rejects the history write.
    */

    await saveAnswer(
        selectedAnswer,
        isCorrect
    );


    /*
        If this was the final word,
        change the button text.
    */

    if (!remainingWords.length) {

        nextButton.innerHTML =
            `See Results <span>→</span>`;
    }
}


/* =========================================================
   SAVE ANSWER
========================================================= */

async function saveAnswer(
    selectedAnswer,
    isCorrect
) {

    if (!gameSessionId) {
        return;
    }


    try {

        /*
            game_answers.question_id requires
            a game_questions row.

            We create/reuse a technical question
            record for the generated Maka question.
        */

        const questionId =
            await getOrCreateQuestionRecord();


        if (!questionId) {
            return;
        }


        const {
            error
        } = await supabaseClient
            .from("game_answers")
            .insert({
                session_id:
                    gameSessionId,

                question_id:
                    questionId,

                selected_option:
                    selectedAnswer,

                is_correct:
                    isCorrect,

                answered_at:
                    new Date().toISOString()
            });


        if (error) {
            console.warn(
                "Maka answer could not be saved:",
                error
            );
        }


        await updateGameSession();

    } catch (error) {

        console.warn(
            "Maka answer history skipped:",
            error
        );
    }
}


/* =========================================================
   QUESTION RECORD
========================================================= */

async function getOrCreateQuestionRecord() {

    if (!currentQuestion) {
        return null;
    }


    /*
        Try to reuse an existing active question
        belonging to this word first.
    */

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("game_questions")
            .select("id")
            .eq(
                "word_id",
                currentQuestion.wordId
            )
            .eq(
                "is_active",
                true
            )
            .limit(1)
            .maybeSingle();


        if (
            !error &&
            data?.id
        ) {
            return data.id;
        }

    } catch (error) {

        console.warn(
            "Existing Maka question lookup failed:",
            error
        );
    }


    /*
        No existing question.

        Create one dynamically so the existing
        game_answers relationship continues to work.
    */

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("game_questions")
            .insert({
                word_id:
                    currentQuestion.wordId,

                question_type:
                    currentQuestion.type,

                question_text:
                    currentQuestion.prompt,

                option_a:
                    currentQuestion.options[0],

                option_b:
                    currentQuestion.options[1],

                option_c:
                    currentQuestion.options[2],

                option_d:
                    currentQuestion.options[3],

                correct_option:
                    getCorrectOptionLetter(),

                explanation:
                    currentQuestion.explanation,

                is_active:
                    true
            })
            .select("id")
            .single();


        if (error) {

            console.warn(
                "Could not create Maka question record:",
                error
            );

            return null;
        }


        return data?.id || null;

    } catch (error) {

        console.warn(
            "Maka question creation skipped:",
            error
        );

        return null;
    }
}


/* =========================================================
   CORRECT OPTION
========================================================= */

function getCorrectOptionLetter() {

    const index =
        currentQuestion.options.findIndex(
            option =>
                normalizeAnswer(option) ===
                normalizeAnswer(
                    currentQuestion.correctAnswer
                )
        );


    return [
        "A",
        "B",
        "C",
        "D"
    ][index] || "A";
}


/* =========================================================
   UPDATE SESSION
========================================================= */

async function updateGameSession() {

    if (!gameSessionId) {
        return;
    }


    try {

        const {
            error
        } = await supabaseClient
            .from("game_sessions")
            .update({
                score,
                completed_at:
                    remainingWords.length === 0
                        ? new Date().toISOString()
                        : null
            })
            .eq(
                "id",
                gameSessionId
            );


        if (error) {
            console.warn(
                "Maka session update failed:",
                error
            );
        }

    } catch (error) {

        console.warn(
            "Maka session update skipped:",
            error
        );
    }
}


/* =========================================================
   NEXT
========================================================= */

function goToNextQuestion() {

    if (!answered) {
        return;
    }


    if (!remainingWords.length) {

        finishGame();

        return;
    }


    loadNextQuestion();
}


/* =========================================================
   FINISH
========================================================= */

async function finishGame() {

    await updateGameSession();


    gameScreen.classList.add(
        "hidden"
    );


    resultScreen.classList.remove(
        "hidden"
    );


    finalScore.textContent =
        `${score} / ${availableWords.length}`;


    const percentage =
        availableWords.length
            ? (score / availableWords.length) * 100
            : 0;


    if (percentage >= 90) {

        resultTitle.textContent =
            "Excellent!";


        resultMessage.textContent =
            "You really know your Angolan slang. " +
            "Your Maka game is strong.";

    } else if (percentage >= 70) {

        resultTitle.textContent =
            "Very good!";


        resultMessage.textContent =
            "You know your slang well. " +
            "Keep playing to master even more words.";

    } else if (percentage >= 50) {

        resultTitle.textContent =
            "Good effort!";


        resultMessage.textContent =
            "You're getting there. " +
            "The dictionary has plenty more to learn.";

    } else {

        resultTitle.textContent =
            "Keep learning!";


        resultMessage.textContent =
            "Every wrong answer is another word learned. " +
            "Play again and beat your score.";
    }
}


/* =========================================================
   SCORE
========================================================= */

function updateScore() {

    scoreDisplay.textContent =
        `${score} pts`;
}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress() {

    const total =
        availableWords.length;


    const played =
        total - remainingWords.length;


    const percentage =
        total
            ? (played / total) * 100
            : 0;


    progressBar.style.width =
        `${percentage}%`;


    playedCount.textContent =
        `${played} played`;


    remainingCount.textContent =
        `${remainingWords.length} remaining`;
}


/* =========================================================
   RESET QUESTION UI
========================================================= */

function resetQuestionUI() {

    answerGrid.innerHTML = "";

    answerFeedback.classList.add(
        "hidden"
    );

    nextButton.classList.add(
        "hidden"
    );

    nextButton.innerHTML =
        `Next Question <span>→</span>`;

    questionContext.classList.add(
        "hidden"
    );

    questionContext.textContent = "";
}


/* =========================================================
   LOADING
========================================================= */

function showLoading(message) {

    loadingMessage.textContent =
        message ||
        "Preparing your Maka...";


    loadingState.classList.remove(
        "hidden"
    );


    startScreen.classList.add(
        "hidden"
    );


    gameScreen.classList.add(
        "hidden"
    );


    resultScreen.classList.add(
        "hidden"
    );


    errorState.classList.add(
        "hidden"
    );
}


function hideLoading() {

    loadingState.classList.add(
        "hidden"
    );
}


/* =========================================================
   ERROR
========================================================= */

function showError(message) {

    hideLoading();


    startScreen.classList.add(
        "hidden"
    );


    gameScreen.classList.add(
        "hidden"
    );


    resultScreen.classList.add(
        "hidden"
    );


    errorMessage.textContent =
        message;


    errorState.classList.remove(
        "hidden"
    );
}


function hideError() {

    errorState.classList.add(
        "hidden"
    );
}


/* =========================================================
   HELPERS
========================================================= */

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


function randomItem(array) {

    if (!array.length) {
        return null;
    }


    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];
}


function normalizeAnswer(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}


function escapeHtml(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
