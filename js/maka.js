/* =========================================================
   MAKA
   Dictionary-based learning game
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
   INIT
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
        return;
    }

    bindEvents();

    showLoading(
        "Loading the dictionary..."
    );

    try {

        await loadAvailableWords();

        /*
            Maka needs at least four published words
            to create four answer options.
        */

        if (
            availableWords.length <
            MAKA_MIN_OPTIONS
        ) {

            throw new Error(
                `Maka needs at least ${MAKA_MIN_OPTIONS} published words. ` +
                `Only ${availableWords.length} were loaded.`
            );
        }


        if (availableWordCount) {

            availableWordCount.textContent =
                availableWords.length;
        }


        hideLoading();

        startScreen.classList.remove(
            "hidden"
        );


        console.log(
            `MAKA: ${availableWords.length} published words loaded.`
        );

    } catch (error) {

        console.error(
            "Maka initialization error:",
            error
        );

        showError(
            error.message ||
            "We couldn't load the dictionary."
        );
    }
}


/* =========================================================
   CACHE DOM
========================================================= */

function cacheDom() {

    startScreen =
        document.getElementById(
            "start-screen"
        );

    gameScreen =
        document.getElementById(
            "game-screen"
        );

    resultScreen =
        document.getElementById(
            "result-screen"
        );

    loadingState =
        document.getElementById(
            "loading-state"
        );

    errorState =
        document.getElementById(
            "error-state"
        );

    loadingMessage =
        document.getElementById(
            "loading-message"
        );

    errorMessage =
        document.getElementById(
            "error-message"
        );

    startButton =
        document.getElementById(
            "start-button"
        );

    playAgainButton =
        document.getElementById(
            "play-again-button"
        );

    retryButton =
        document.getElementById(
            "retry-button"
        );

    questionCounter =
        document.getElementById(
            "question-counter"
        );

    questionNumberElement =
        document.getElementById(
            "question-number"
        );

    questionType =
        document.getElementById(
            "question-type"
        );

    questionContext =
        document.getElementById(
            "question-context"
        );

    questionText =
        document.getElementById(
            "question-text"
        );

    answerGrid =
        document.getElementById(
            "answer-grid"
        );

    answerFeedback =
        document.getElementById(
            "answer-feedback"
        );

    feedbackTitle =
        document.getElementById(
            "feedback-title"
        );

    feedbackText =
        document.getElementById(
            "feedback-text"
        );

    nextButton =
        document.getElementById(
            "next-button"
        );

    scoreDisplay =
        document.getElementById(
            "score-display"
        );

    progressBar =
        document.getElementById(
            "progress-bar"
        );

    playedCount =
        document.getElementById(
            "played-count"
        );

    remainingCount =
        document.getElementById(
            "remaining-count"
        );

    availableWordCount =
        document.getElementById(
            "available-word-count"
        );

    finalScore =
        document.getElementById(
            "final-score"
        );

    resultTitle =
        document.getElementById(
            "result-title"
        );

    resultMessage =
        document.getElementById(
            "result-message"
        );
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
   LOAD AVAILABLE WORDS
========================================================= */

async function loadAvailableWords() {

    /*
        IMPORTANT:

        First load ALL published words.

        We do NOT filter them based on meanings.
        The published dictionary is the Maka word pool.
    */

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
            short_meaning,
            context_notes,
            word_audio_path
        `)
        .eq(
            "is_published",
            true
        )
        .order(
            "id",
            {
                ascending: true
            }
        );


    if (wordsError) {

        console.error(
            "MAKA words query failed:",
            wordsError
        );

        throw new Error(
            `Could not load published words: ${wordsError.message}`
        );
    }


    if (
        !words ||
        !words.length
    ) {

        throw new Error(
            "Supabase returned zero published words."
        );
    }


    console.log(
        "MAKA published words:",
        words.length
    );


    /*
        Load meanings separately.

        If this fails because of RLS,
        we DO NOT discard the words.
    */

    const wordIds =
        words.map(
            word => word.id
        );


    let meanings = [];


    const {
        data: meaningData,
        error: meaningsError
    } = await supabaseClient
        .from("meanings")
        .select(`
            id,
            word_id,
            meaning,
            display_order
        `)
        .in(
            "word_id",
            wordIds
        );


    if (meaningsError) {

        console.warn(
            "MAKA meanings query failed:",
            meaningsError
        );

    } else {

        meanings =
            meaningData || [];
    }


    /*
        Load examples separately.
    */

    let examples = [];


    const meaningIds =
        meanings.map(
            meaning => meaning.id
        );


    if (
        meaningIds.length
    ) {

        const {
            data: exampleData,
            error: examplesError
        } = await supabaseClient
            .from("examples")
            .select(`
                id,
                meaning_id,
                example_text,
                translation,
                usage_label,
                display_order
            `)
            .in(
                "meaning_id",
                meaningIds
            );


        if (examplesError) {

            console.warn(
                "MAKA examples query failed:",
                examplesError
            );

        } else {

            examples =
                exampleData || [];
        }
    }


    /*
        Build meaning lookup.
    */

    const meaningsByWord =
        new Map();


    for (
        const meaning of meanings
    ) {

        const text =
            String(
                meaning.meaning || ""
            ).trim();


        if (!text) {
            continue;
        }


        if (
            !meaningsByWord.has(
                meaning.word_id
            )
        ) {

            meaningsByWord.set(
                meaning.word_id,
                []
            );
        }


        meaningsByWord
            .get(meaning.word_id)
            .push({

                id:
                    meaning.id,

                meaning:
                    text,

                display_order:
                    meaning.display_order || 0,

                examples: []

            });
    }


    /*
        Attach examples.
    */

    const meaningsById =
        new Map();


    for (
        const wordMeanings of
        meaningsByWord.values()
    ) {

        for (
            const meaning of wordMeanings
        ) {

            meaningsById.set(
                meaning.id,
                meaning
            );
        }
    }


    for (
        const example of examples
    ) {

        const meaning =
            meaningsById.get(
                example.meaning_id
            );


        if (!meaning) {
            continue;
        }


        const exampleText =
            String(
                example.example_text || ""
            ).trim();


        if (!exampleText) {
            continue;
        }


        meaning.examples.push({

            id:
                example.id,

            example_text:
                exampleText,

            translation:
                example.translation ||
                "",

            usage_label:
                example.usage_label ||
                "",

            display_order:
                example.display_order ||
                0

        });
    }


    /*
        Assemble ALL published words.

        short_meaning becomes the fallback meaning
        when the word has no entry in meanings.
    */

    availableWords =
        words
            .map(
                word => {

                    const wordMeanings =
                        meaningsByWord.get(
                            word.id
                        ) || [];


                    wordMeanings.sort(
                        (
                            a,
                            b
                        ) =>
                            a.display_order -
                            b.display_order
                    );


                    wordMeanings.forEach(
                        meaning => {

                            meaning.examples.sort(
                                (
                                    a,
                                    b
                                ) =>
                                    a.display_order -
                                    b.display_order
                            );
                        }
                    );


                    /*
                        If meanings table has no row,
                        use words.short_meaning.
                    */

                    if (
                        !wordMeanings.length &&
                        word.short_meaning
                    ) {

                        wordMeanings.push({

                            id:
                                null,

                            meaning:
                                String(
                                    word.short_meaning
                                ).trim(),

                            display_order:
                                0,

                            examples: []

                        });
                    }


                    return {

                        id:
                            word.id,

                        word:
                            String(
                                word.word || ""
                            ).trim(),

                        pronunciation:
                            word.pronunciation ||
                            "",

                        word_type:
                            word.word_type ||
                            "",

                        category_id:
                            word.category_id,

                        pack_id:
                            word.pack_id,

                        is_premium:
                            Boolean(
                                word.is_premium
                            ),

                        short_meaning:
                            String(
                                word.short_meaning || ""
                            ).trim(),

                        context_notes:
                            String(
                                word.context_notes || ""
                            ).trim(),

                        word_audio_path:
                            word.word_audio_path ||
                            "",

                        meanings:
                            wordMeanings

                    };
                }
            )
            .filter(
                word =>
                    word.word
            );


    /*
        This is the important number.

        It should now be 45 if you have
        45 published words.
    */

    console.log(
        "MAKA final word pool:",
        availableWords.length
    );


    if (
        availableWordCount
    ) {

        availableWordCount.textContent =
            availableWords.length;
    }
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
        Every published word is played once.
    */

    remainingWords =
        shuffle(
            [...availableWords]
        );


    updateScore();

    updateProgress();


    startScreen.classList.add(
        "hidden"
    );

    resultScreen.classList.add(
        "hidden"
    );


    showLoading(
        "Starting Maka..."
    );


    await createGameSession();


    hideLoading();


    gameScreen.classList.remove(
        "hidden"
    );


    loadNextQuestion();
}


/* =========================================================
   CREATE SESSION
========================================================= */

async function createGameSession() {

    try {

        const userId =
            await getCurrentUserId();


        if (!userId) {

            console.warn(
                "MAKA: no authenticated user."
            );

            return;
        }


        const {
            data,
            error
        } = await supabaseClient
            .from("game_sessions")
            .insert({

                user_id:
                    userId,

                score:
                    0,

                total_questions:
                    availableWords.length,

                started_at:
                    gameStartedAt

            })
            .select("id")
            .single();


        if (error) {

            console.warn(
                "MAKA session could not be saved:",
                error
            );

            return;
        }


        gameSessionId =
            data?.id || null;

    } catch (error) {

        console.warn(
            "MAKA session creation skipped:",
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
        } = await supabaseClient
            .auth
            .getUser();


        if (
            error ||
            !data?.user
        ) {

            return null;
        }


        return data.user.id;

    } catch (error) {

        console.warn(
            "MAKA user lookup failed:",
            error
        );

        return null;
    }
}


/* =========================================================
   NEXT QUESTION
========================================================= */

function loadNextQuestion() {

    if (
        !remainingWords.length
    ) {

        finishGame();

        return;
    }


    answered = false;

    resetQuestionUI();


    const word =
        remainingWords.shift();


    currentQuestion =
        generateQuestion(
            word
        );


    /*
        If this particular word cannot
        produce a question, continue to
        the next word.
    */

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

function generateQuestion(
    word
) {

    const possibleTypes = [];


    const primaryMeaning =
        getPrimaryMeaning(
            word
        );


    /*
        Every usable word can have a
        normal meaning question.
    */

    if (primaryMeaning) {

        possibleTypes.push(
            QUESTION_TYPES.MEANING
        );
    }


    /*
        Reverse question needs at least
        4 words with meanings.
    */

    if (
        primaryMeaning &&
        availableWords.length >= 4
    ) {

        possibleTypes.push(
            QUESTION_TYPES.REVERSE
        );
    }


    /*
        Context question only exists when
        this word has an example.
    */

    const examples =
        getAllExamples(
            word
        );


    if (
        primaryMeaning &&
        examples.length
    ) {

        possibleTypes.push(
            QUESTION_TYPES.CONTEXT
        );
    }


    if (
        !possibleTypes.length
    ) {

        return null;
    }


    const type =
        randomItem(
            possibleTypes
        );


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
   MEANING QUESTION
========================================================= */

function createMeaningQuestion(
    word
) {

    const correctMeaning =
        getPrimaryMeaning(
            word
        );


    if (!correctMeaning) {
        return null;
    }


    const distractors =
        getMeaningDistractors(
            word.id,
            correctMeaning.meaning
        );


    /*
        We need three other meanings.
    */

    if (
        distractors.length < 3
    ) {

        return null;
    }


    const options =
        shuffle([

            correctMeaning.meaning,

            ...distractors.slice(
                0,
                3
            )

        ]);


    return {

        type:
            QUESTION_TYPES.MEANING,

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
   CONTEXT QUESTION
========================================================= */

function createContextQuestion(
    word,
    examples
) {

    const correctMeaning =
        getPrimaryMeaning(
            word
        );


    if (!correctMeaning) {
        return null;
    }


    const example =
        randomItem(
            examples
        );


    if (!example) {

        return createMeaningQuestion(
            word
        );
    }


    const distractors =
        getMeaningDistractors(
            word.id,
            correctMeaning.meaning
        );


    if (
        distractors.length < 3
    ) {

        return createMeaningQuestion(
            word
        );
    }


    const options =
        shuffle([

            correctMeaning.meaning,

            ...distractors.slice(
                0,
                3
            )

        ]);


    return {

        type:
            QUESTION_TYPES.CONTEXT,

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
   REVERSE QUESTION
========================================================= */

function createReverseQuestion(
    word
) {

    const correctMeaning =
        getPrimaryMeaning(
            word
        );


    if (!correctMeaning) {
        return null;
    }


    const distractorWords =
        shuffle(

            availableWords.filter(
                candidate =>
                    candidate.id !== word.id &&
                    getPrimaryMeaning(
                        candidate
                    )
            )

        ).slice(
            0,
            3
        );


    if (
        distractorWords.length < 3
    ) {

        return createMeaningQuestion(
            word
        );
    }


    const options =
        shuffle([

            word.word,

            ...distractorWords.map(
                candidate =>
                    candidate.word
            )

        ]);


    return {

        type:
            QUESTION_TYPES.REVERSE,

        typeLabel:
            "FIND THE WORD",

        wordId:
            word.id,

        word:
            word.word,

        prompt:
            "Which word matches this meaning?",

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

function getPrimaryMeaning(
    word
) {

    if (
        !word ||
        !Array.isArray(
            word.meanings
        ) ||
        !word.meanings.length
    ) {

        return null;
    }


    return word.meanings[0];
}


/* =========================================================
   EXAMPLES
========================================================= */

function getAllExamples(
    word
) {

    if (
        !word ||
        !Array.isArray(
            word.meanings
        )
    ) {

        return [];
    }


    return word.meanings.flatMap(
        meaning =>
            Array.isArray(
                meaning.examples
            )
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


    const candidates =
        [];


    for (
        const word of availableWords
    ) {

        if (
            word.id ===
            currentWordId
        ) {

            continue;
        }


        const meaning =
            getPrimaryMeaning(
                word
            );


        if (!meaning) {
            continue;
        }


        const text =
            String(
                meaning.meaning || ""
            ).trim();


        if (!text) {
            continue;
        }


        const normalized =
            text.toLowerCase();


        if (
            normalized ===
            String(
                correctMeaning
            )
                .trim()
                .toLowerCase()
        ) {

            continue;
        }


        if (
            uniqueMeanings.has(
                normalized
            )
        ) {

            continue;
        }


        uniqueMeanings.add(
            normalized
        );


        candidates.push(
            text
        );
    }


    return shuffle(
        candidates
    );
}


/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion(
    question
) {

    questionNumberElement.textContent =
        String(
            questionNumber
        ).padStart(
            2,
            "0"
        );


    questionCounter.textContent =
        `Question ${questionNumber}`;


    questionType.textContent =
        question.typeLabel;


    questionText.textContent =
        question.prompt;


    if (
        question.context
    ) {

        questionContext.textContent =
            `"${question.context}"`;


        questionContext.classList.remove(
            "hidden"
        );

    } else {

        questionContext.textContent =
            "";


        questionContext.classList.add(
            "hidden"
        );
    }


    answerGrid.innerHTML =
        "";


    const letters = [
        "A",
        "B",
        "C",
        "D"
    ];


    question.options.forEach(
        (
            option,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


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
                () =>
                    handleAnswer(
                        button,
                        option
                    )
            );


            answerGrid.appendChild(
                button
            );
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
        normalizeAnswer(
            selectedAnswer
        ) ===
        normalizeAnswer(
            currentQuestion.correctAnswer
        );


    const buttons =
        answerGrid.querySelectorAll(
            ".answer-button"
        );


    buttons.forEach(
        button => {

            button.disabled =
                true;


            const answer =
                button.dataset.answer;


            if (
                normalizeAnswer(
                    answer
                ) ===
                normalizeAnswer(
                    currentQuestion.correctAnswer
                )
            ) {

                button.classList.add(
                    "correct"
                );
            }
        }
    );


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


    await saveAnswer(
        selectedAnswer,
        isCorrect
    );


    if (
        !remainingWords.length
    ) {

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

    if (
        !gameSessionId
    ) {

        return;
    }


    try {

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
                "MAKA answer could not be saved:",
                error
            );
        }


        await updateGameSession();

    } catch (error) {

        console.warn(
            "MAKA answer history skipped:",
            error
        );
    }
}


/* =========================================================
   QUESTION RECORD
========================================================= */

async function getOrCreateQuestionRecord() {

    if (
        !currentQuestion
    ) {

        return null;
    }


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
                "MAKA question record failed:",
                error
            );

            return null;
        }


        return data?.id || null;

    } catch (error) {

        console.warn(
            "MAKA question creation skipped:",
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
                normalizeAnswer(
                    option
                ) ===
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

    if (
        !gameSessionId
    ) {

        return;
    }


    try {

        const {
            error
        } = await supabaseClient
            .from("game_sessions")
            .update({

                score:
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
                "MAKA session update failed:",
                error
            );
        }

    } catch (error) {

        console.warn(
            "MAKA session update skipped:",
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


    if (
        !remainingWords.length
    ) {

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
            ? (
                score /
                availableWords.length
            ) * 100
            : 0;


    if (
        percentage >= 90
    ) {

        resultTitle.textContent =
            "Excellent!";


        resultMessage.textContent =
            "You really know your Angolan slang. " +
            "Your Maka game is strong.";

    } else if (
        percentage >= 70
    ) {

        resultTitle.textContent =
            "Very good!";


        resultMessage.textContent =
            "You know your slang well. " +
            "Keep playing to master even more words.";

    } else if (
        percentage >= 50
    ) {

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

    if (!scoreDisplay) {
        return;
    }


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
        total -
        remainingWords.length;


    const percentage =
        total
            ? (
                played /
                total
            ) * 100
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
            `${remainingWords.length} remaining`;
    }
}


/* =========================================================
   RESET QUESTION UI
========================================================= */

function resetQuestionUI() {

    answerGrid.innerHTML =
        "";


    answerFeedback.classList.add(
        "hidden"
    );


    nextButton.classList.add(
        "hidden"
    );


    nextButton.innerHTML =
        `Next Question <span>→</span>`;


    if (questionContext) {

        questionContext.classList.add(
            "hidden"
        );

        questionContext.textContent =
            "";
    }
}


/* =========================================================
   LOADING
========================================================= */

function showLoading(
    message
) {

    if (loadingMessage) {

        loadingMessage.textContent =
            message ||
            "Preparing your Maka...";
    }


    if (loadingState) {

        loadingState.classList.remove(
            "hidden"
        );
    }


    startScreen?.classList.add(
        "hidden"
    );

    gameScreen?.classList.add(
        "hidden"
    );

    resultScreen?.classList.add(
        "hidden"
    );

    errorState?.classList.add(
        "hidden"
    );
}


function hideLoading() {

    loadingState?.classList.add(
        "hidden"
    );
}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    hideLoading();


    startScreen?.classList.add(
        "hidden"
    );

    gameScreen?.classList.add(
        "hidden"
    );

    resultScreen?.classList.add(
        "hidden"
    );


    if (errorMessage) {

        errorMessage.textContent =
            message;
    }


    errorState?.classList.remove(
        "hidden"
    );
}


function hideError() {

    errorState?.classList.add(
        "hidden"
    );
}


/* =========================================================
   HELPERS
========================================================= */

function shuffle(
    array
) {

    const result =
        [...array];


    for (
        let i =
            result.length - 1;

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


function randomItem(
    array
) {

    if (
        !array ||
        !array.length
    ) {

        return null;
    }


    return array[
        Math.floor(
            Math.random() *
            array.length
        )
    ];
}


function normalizeAnswer(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase();
}


function escapeHtml(
    value
) {

    return String(
        value || ""
    )
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
