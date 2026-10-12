
"use strict";

const truthQuestions = [
    {
        statement: "«Bué» é uma palavra usada para expressar grande quantidade ou intensidade.",
        correct: true,
        explanation: "Verdade. «Bué» é uma expressão informal muito conhecida em Angola e noutros contextos lusófonos, usada com o sentido de «muito» ou «muita quantidade»."
    },
    {
        statement: "O significado de uma expressão de calão nunca muda consoante o contexto.",
        correct: false,
        explanation: "Mito. O contexto, o tom e a relação entre as pessoas podem mudar a interpretação de uma expressão."
    },
    {
        statement: "Duas pessoas podem usar a mesma expressão com intenções diferentes.",
        correct: true,
        explanation: "Verdade. Uma expressão pode transmitir humor, carinho, ironia ou crítica, dependendo de como e quando é usada."
    },
    {
        statement: "Todas as expressões de calão são apropriadas em qualquer situação formal.",
        correct: false,
        explanation: "Mito. O calão é informal. Numa entrevista de emprego, num documento oficial ou numa comunicação profissional, convém escolher a linguagem adequada."
    },
    {
        statement: "O calão e as expressões populares fazem parte da forma como as comunidades criam e transmitem cultura.",
        correct: true,
        explanation: "Verdade. A linguagem popular reflete experiências, criatividade, identidade e hábitos de uma comunidade."
    }
];

const $ = (id) => document.getElementById(id);

let questionOrder = [];
let currentQuestion = 0;
let score = 0;
let answered = false;
let sessionPaus = 0;

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function startGame() {
    questionOrder = shuffle(truthQuestions);
    currentQuestion = 0;
    score = 0;
    sessionPaus = 0;

    $("paus-earned").textContent = "0";
    $("welcome-screen").hidden = true;
    $("results-screen").hidden = true;
    $("question-screen").hidden = false;

    renderQuestion();
}

function renderQuestion() {
    answered = false;
    const q = questionOrder[currentQuestion];

    $("question-counter").textContent =
        `Afirmação ${currentQuestion + 1} de ${questionOrder.length}`;
    $("score-counter").textContent = `${score} pontos`;
    $("progress-bar").style.width =
        `${(currentQuestion / questionOrder.length) * 100}%`;
    $("statement-text").textContent = q.statement;
    $("answer-feedback").hidden = true;
    $("answer-feedback").className = "answer-feedback";
    $("next-button").hidden = true;

    $("next-button").innerHTML =
        currentQuestion === questionOrder.length - 1
            ? 'Ver resultados <span>→</span>'
            : 'Próxima afirmação <span>→</span>';

    ["true-button", "false-button"].forEach((id) => {
        const button = $(id);
        button.disabled = false;
        button.classList.remove("selected-correct", "selected-wrong");
    });
}

function selectAnswer(selectedTruth) {
    if (answered) return;
    answered = true;

    const q = questionOrder[currentQuestion];
    const correct = selectedTruth === q.correct;
    const selectedButton = $(selectedTruth ? "true-button" : "false-button");
    const correctButton = $(q.correct ? "true-button" : "false-button");

    $("true-button").disabled = true;
    $("false-button").disabled = true;

    correctButton.classList.add("selected-correct");
    if (!correct) selectedButton.classList.add("selected-wrong");

    const feedback = $("answer-feedback");
    feedback.hidden = false;

    if (correct) {
        score += 10;
        sessionPaus += 10;
        $("paus-earned").textContent = String(sessionPaus);
        feedback.classList.add("good");
        feedback.textContent = `✓ Acertaste! +10 pontos e +10 Paus. ${q.explanation}`;
    } else {
        feedback.classList.add("bad");
        feedback.textContent = `Não foi desta vez. ${q.explanation}`;
    }

    $("score-counter").textContent = `${score} pontos`;
    $("progress-bar").style.width =
        `${((currentQuestion + 1) / questionOrder.length) * 100}%`;
    $("next-button").hidden = false;
}

function nextQuestion() {
    if (!answered) return;

    currentQuestion++;
    if (currentQuestion < questionOrder.length) {
        renderQuestion();
    } else {
        finishGame();
    }
}

function finishGame() {
    $("question-screen").hidden = true;
    $("results-screen").hidden = false;

    const total = questionOrder.length;
    const correctCount = score / 10;
    const percentage = Math.round((correctCount / total) * 100);

    $("final-score").textContent = `${correctCount}/${total}`;
    $("final-points").textContent = String(score);
    $("final-paus").textContent = `${sessionPaus} ✦`;
    $("result-icon").textContent =
        percentage === 100 ? "🏆" : percentage >= 60 ? "🎉" : "🧠";
    $("result-title").textContent =
        percentage === 100 ? "Conheces bem o tema!" :
        percentage >= 60 ? "Bom trabalho!" : "Há mais para descobrir!";
    $("result-description").textContent =
        percentage === 100
            ? "Acertaste em todas as afirmações. Excelente conhecimento!"
            : percentage >= 60
                ? "Estás no caminho certo. Continua a explorar o significado das expressões."
                : "Aprendeste algo novo em cada pergunta. Volta a jogar para consolidar o conhecimento.";
}

$("start-button").addEventListener("click", startGame);
$("true-button").addEventListener("click", () => selectAnswer(true));
$("false-button").addEventListener("click", () => selectAnswer(false));
$("next-button").addEventListener("click", nextQuestion);
$("play-again-button").addEventListener("click", startGame);
