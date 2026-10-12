"use strict";

const scenarios = [
    {
        emoji: "👋",
        title: "Encontraste um amigo",
        text: "Encontras um amigo na rua depois de muito tempo sem o veres. Ele olha para ti e diz: «Ya, kota, há bué de tempo!»",
        options: [
            "«Bué mesmo! Como é que tens passado?»",
            "«Não compreendi a duração temporal da tua afirmação.»",
            "«Não fales comigo.»"
        ],
        correct: 0,
        explanation: "«Bué» é uma expressão muito usada em Angola para dizer «muito». Uma resposta descontraída combina com o tom informal do encontro."
    },
    {
        emoji: "😮",
        title: "Uma grande surpresa",
        text: "Um amigo conta-te que conseguiu um emprego novo e está todo contente. Queres mostrar que ficaste impressionado.",
        options: [
            "«Isso não interessa.»",
            "«A sério? Grande cena! Parabéns!»",
            "«Não tenho nada para dizer.»"
        ],
        correct: 1,
        explanation: "«Grande cena!» pode ser usada informalmente para reagir a algo impressionante ou positivo. O contexto e o tom ajudam a transmitir entusiasmo."
    },
    {
        emoji: "🛍️",
        title: "O preço está alto",
        text: "Estás numa loja e achas que o preço de um artigo está muito alto. Queres dizer isso de maneira informal.",
        options: [
            "«Este preço está bué puxado!»",
            "«Este objecto custa uma quantidade monetária excessiva, senhor.»",
            "«Vou comprar cinco.»"
        ],
        correct: 0,
        explanation: "«Bué puxado» é uma forma informal de dizer que algo está muito caro ou difícil de suportar. O significado depende do contexto."
    },
    {
        emoji: "🤝",
        title: "Um favor entre amigos",
        text: "Um amigo ajuda-te a resolver um problema e queres agradecer-lhe de forma natural e descontraída.",
        options: [
            "«Não devias ter feito isso.»",
            "«Obrigado, meu! Salv aste-me mesmo.»".replace("Salv aste", "Salvaste"),
            "«Regista formalmente a minha gratidão.»"
        ],
        correct: 1,
        explanation: "Entre amigos, uma expressão espontânea de agradecimento pode soar mais natural do que uma frase excessivamente formal. A melhor escolha depende da vossa relação."
    },
    {
        emoji: "⏰",
        title: "Alguém está atrasado",
        text: "Estás à espera de um amigo há bastante tempo. Quando ele chega, pede desculpa pelo atraso. Queres responder sem criar conflito.",
        options: [
            "«Não apareças nunca mais.»",
            "«Tranquilo, mas para a próxima tenta chegar a horas.»",
            "«O nosso encontro foi oficialmente cancelado.»"
        ],
        correct: 1,
        explanation: "Esta resposta mantém um tom calmo, aceita o pedido de desculpa e deixa claro que valorizas a pontualidade."
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
    emoji: document.getElementById("scenario-emoji"),
    title: document.getElementById("scenario-title"),
    text: document.getElementById("scenario-text"),
    options: document.getElementById("answer-options"),
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
let sessionScenarios = [];

document.getElementById("total-questions").textContent = scenarios.length;
document.getElementById("possible-points").textContent =
    scenarios.length * POINTS_PER_CORRECT;

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
    sessionScenarios = shuffle(scenarios);
    elements.scoreCounter.textContent = "0 pontos";
    showScreen(elements.question);
    renderQuestion();
}

function renderQuestion() {
    answered = false;

    const scenario = sessionScenarios[currentQuestion];
    const questionNumber = currentQuestion + 1;

    elements.questionCounter.textContent =
        `Situação ${questionNumber} de ${sessionScenarios.length}`;

    elements.scoreCounter.textContent = `${score} pontos`;
    elements.progress.style.width =
        `${(questionNumber / sessionScenarios.length) * 100}%`;

    elements.emoji.textContent = scenario.emoji;
    elements.title.textContent = scenario.title;
    elements.text.textContent = scenario.text;
    elements.options.replaceChildren();

    elements.feedback.hidden = true;
    elements.feedback.classList.remove("incorrect-feedback");
    elements.next.hidden = true;

    scenario.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";

        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = String.fromCharCode(65 + index);

        const label = document.createElement("span");
        label.className = "option-text";
        label.textContent = option;

        button.append(letter, label);
        button.addEventListener("click", () => selectAnswer(index));
        elements.options.appendChild(button);
    });
}

function selectAnswer(selectedIndex) {
    if (answered) return;
    answered = true;

    const scenario = sessionScenarios[currentQuestion];
    const buttons = [...elements.options.querySelectorAll(".answer-option")];
    const isCorrect = selectedIndex === scenario.correct;

    buttons.forEach((button, index) => {
        button.disabled = true;

        if (index === scenario.correct) {
            button.classList.add("correct");
            button.querySelector(".option-letter").textContent = "✓";
        } else if (index === selectedIndex) {
            button.classList.add("incorrect");
            button.querySelector(".option-letter").textContent = "×";
        }
    });

    if (isCorrect) {
        score += POINTS_PER_CORRECT;
        elements.feedbackTitle.textContent = "Boa resposta! +10 pontos";
        elements.feedback.classList.remove("incorrect-feedback");
    } else {
        elements.feedbackTitle.textContent = "Não foi essa a melhor resposta.";
        elements.feedback.classList.add("incorrect-feedback");
    }

    elements.scoreCounter.textContent = `${score} pontos`;
    elements.feedbackText.textContent = scenario.explanation;
    elements.feedback.hidden = false;

    elements.next.textContent =
        currentQuestion === sessionScenarios.length - 1
            ? "Ver resultados →"
            : "Próxima situação →";

    elements.next.hidden = false;
}

function nextQuestion() {
    if (!answered) return;

    currentQuestion += 1;

    if (currentQuestion < sessionScenarios.length) {
        renderQuestion();
    } else {
        finishGame();
    }
}

function finishGame() {
    earnedPaus = score;
    elements.pausEarned.textContent = earnedPaus;
    elements.finalScore.textContent =
        `${score / POINTS_PER_CORRECT}/${sessionScenarios.length}`;
    elements.finalPoints.textContent = score;
    elements.finalPaus.textContent = earnedPaus;

    const correctAnswers = score / POINTS_PER_CORRECT;
    const percentage = correctAnswers / sessionScenarios.length;

    if (percentage === 1) {
        elements.resultIcon.textContent = "🏆";
        elements.resultTitle.textContent = "Foste mesmo forte!";
        elements.resultDescription.textContent =
            "Acertaste em todas as situações. Continua a explorar o calão e as expressões populares angolanas.";
    } else if (percentage >= 0.6) {
        elements.resultIcon.textContent = "🎉";
        elements.resultTitle.textContent = "Boa, estás no caminho!";
        elements.resultDescription.textContent =
            "Tiveste um bom resultado. Revê as explicações e continua a praticar.";
    } else {
        elements.resultIcon.textContent = "💪";
        elements.resultTitle.textContent = "Mais uma tentativa?";
        elements.resultDescription.textContent =
            "Cada situação é uma oportunidade para aprender. Joga outra vez e descobre novas formas de responder.";
    }

    showScreen(elements.results);
}

elements.start.addEventListener("click", startGame);
elements.next.addEventListener("click", nextQuestion);
elements.playAgain.addEventListener("click", startGame);
