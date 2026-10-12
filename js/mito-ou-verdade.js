"use strict";

/*
 * Frontend prototype.
 * The questions below are sample content, not a verified dictionary database.
 * Replace or expand them with reviewed entries before publishing the game.
 */

const questions = [
    {
        statement: "A palavra «bué» pode ser usada para dizer «muito».",
        answer: true,
        explanation: "Verdade. «Bué» é uma expressão informal usada em Angola e noutros contextos de língua portuguesa para indicar uma grande quantidade ou intensidade."
    },
    {
        statement: "A expressão «kota» é usada exclusivamente para falar de crianças pequenas.",
        answer: false,
        explanation: "Mito. «Kota» é frequentemente usada para se referir a uma pessoa mais velha ou experiente. O sentido exacto pode variar conforme o contexto."
    },
    {
        statement: "O contexto pode mudar o sentido de uma expressão de calão.",
        answer: true,
        explanation: "Verdade. A mesma expressão pode transmitir humor, amizade, surpresa ou crítica, dependendo da situação, do tom e da relação entre as pessoas."
    },
    {
        statement: "Todas as expressões populares são usadas exactamente da mesma forma em todas as regiões de Angola.",
        answer: false,
        explanation: "Mito. O uso de palavras e expressões pode variar conforme a região, a comunidade, a idade e o contexto social."
    },
    {
        statement: "Uma expressão informal pode ser adequada entre amigos, mas pouco adequada numa comunicação formal.",
        answer: true,
        explanation: "Verdade. Saber quando e com quem usar uma expressão é uma parte importante da comunicação. O registo deve adequar-se à situação."
    }
];

const POINTS_PER_CORRECT = 10;

const elements = {
    pausEarned: document.getElementById("paus-earned"),
    welcome: document.getElementById("welcome-screen"),
    question: document.getElementById("question-screen"),
    results: document.getElementById("results-screen"),
    start: document.getElementById("start-button"),
    questionCounter: document.getElementById("question-counter"),
    scoreCounter: document.getElementById("score-counter"),
    progress: document.getElementById("progress-bar"),
    statement: document.getElementById("statement-text"),
    trueButton: document.getElementById("true-button"),
    falseButton: document.getElementById("false-button"),
    feedback: document.getElementById("answer-feedback"),
    feedbackTitle: document.getElementById("feedback-title"),
    feedbackText: document.getElementById("feedback-text"),
    next: document.getElementById("next-button"),
    resultIcon: document.getElementById("result-icon"),
    resultTitle: document.getElementById("result-title"),
    resultDescription: document.getElementById("result-description"),
    finalScore: document.getElementById("final-score"),
    finalPoints: document.getElementById("final-points"),
    finalPaus: document.getElementById("final-paus"),
    playAgain: document.getElementById("play-again-button")
};

let currentQuestion = 0;
let score = 0;
let answered = false;
let earnedPaus = 0;
let sessionQuestions = [];

document.getElementById("total-questions").textContent = questions.length;
document.getElementById("possible-points").textContent =
    questions.length * POINTS_PER_CORRECT;

function shuffle(items) {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function showScreen(screenToShow) {
    [elements.welcome, elements.question, elements.results].forEach(screen => {
        screen.hidden = screen !== screenToShow;
    });
}

function startGame() {
    currentQuestion = 0;
    score = 0;
    answered = false;
    sessionQuestions = shuffle(questions);

    elements.scoreCounter.textContent = "0 pontos";

    showScreen(elements.question);
    renderQuestion();
}

function renderQuestion() {
    answered = false;

    const question = sessionQuestions[currentQuestion];
    const questionNumber = currentQuestion + 1;

    elements.questionCounter.textContent =
        `Pergunta ${questionNumber} de ${sessionQuestions.length}`;

    elements.scoreCounter.textContent = `${score} pontos`;
    elements.progress.style.width =
        `${(questionNumber / sessionQuestions.length) * 100}%`;

    elements.statement.textContent = question.statement;

    elements.feedback.hidden = true;
    elements.feedback.classList.remove("incorrect-feedback");
    elements.next.hidden = true;

    [elements.trueButton, elements.falseButton].forEach(button => {
        button.disabled = false;
        button.classList.remove("correct", "incorrect");
    });

    elements.trueButton.querySelector(".answer-symbol").textContent = "✓";
    elements.falseButton.querySelector(".answer-symbol").textContent = "×";
}

function selectAnswer(selectedAnswer) {
    if (answered) return;
    answered = true;

    const question = sessionQuestions[currentQuestion];
    const isCorrect = selectedAnswer === question.answer;

    const selectedButton = selectedAnswer
        ? elements.trueButton
        : elements.falseButton;

    const correctButton = question.answer
        ? elements.trueButton
        : elements.falseButton;

    elements.trueButton.disabled = true;
    elements.falseButton.disabled = true;

    correctButton.classList.add("correct");
    correctButton.querySelector(".answer-symbol").textContent = "✓";

    if (!isCorrect) {
        selectedButton.classList.add("incorrect");
        selectedButton.querySelector(".answer-symbol").textContent = "×";
    }

    if (isCorrect) {
        score += POINTS_PER_CORRECT;
        elements.feedbackTitle.textContent = "Correcto! +10 pontos";
        elements.feedback.classList.remove("incorrect-feedback");
    } else {
        elements.feedbackTitle.textContent =
            `Não foi desta vez. A resposta certa é ${question.answer ? "Verdade" : "Mito"}.`;

        elements.feedback.classList.add("incorrect-feedback");
    }

    elements.scoreCounter.textContent = `${score} pontos`;
    elements.feedbackText.textContent = question.explanation;
    elements.feedback.hidden = false;

    elements.next.textContent =
        currentQuestion === sessionQuestions.length - 1
            ? "Ver resultados →"
            : "Próxima pergunta →";

    elements.next.hidden = false;
}

function nextQuestion() {
    if (!answered) return;

    currentQuestion += 1;

    if (currentQuestion < sessionQuestions.length) {
        renderQuestion();
    } else {
        finishGame();
    }
}

function finishGame() {
    earnedPaus = score;

    elements.pausEarned.textContent = earnedPaus;
    elements.finalScore.textContent =
        `${score / POINTS_PER_CORRECT}/${sessionQuestions.length}`;
    elements.finalPoints.textContent = score;
    elements.finalPaus.textContent = earnedPaus;

    const correctAnswers = score / POINTS_PER_CORRECT;
    const percentage = correctAnswers / sessionQuestions.length;

    if (percentage === 1) {
        elements.resultIcon.textContent = "🏆";
        elements.resultTitle.textContent = "Impecável!";
        elements.resultDescription.textContent =
            "Acertaste em todas as perguntas. Tens um excelente domínio destas curiosidades.";
    } else if (percentage >= 0.6) {
        elements.resultIcon.textContent = "🎉";
        elements.resultTitle.textContent = "Boa prestação!";
        elements.resultDescription.textContent =
            "Acertaste na maioria. Lê as explicações e continua a descobrir mais sobre as expressões angolanas.";
    } else {
        elements.resultIcon.textContent = "🔎";
        elements.resultTitle.textContent = "Há mais para descobrir!";
        elements.resultDescription.textContent =
            "Volta a jogar e aprende com cada explicação. O importante é questionar e descobrir.";
    }

    showScreen(elements.results);
}

elements.start.addEventListener("click", startGame);
elements.trueButton.addEventListener("click", () => selectAnswer(true));
elements.falseButton.addEventListener("click", () => selectAnswer(false));
elements.next.addEventListener("click", nextQuestion);
elements.playAgain.addEventListener("click", startGame);
