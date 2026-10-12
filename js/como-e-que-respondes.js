
"use strict";

const responseQuestions = [
    {
        context: "Um amigo conta-te que conseguiu um novo emprego. Queres mostrar que estás contente por ele.",
        question: "Qual é a resposta mais natural?",
        options: [
            "Parabéns, mano! Que seja o começo de coisas boas.",
            "Isso não me diz respeito.",
            "Já era tarde para isso.",
            "Não tenho nada para dizer."
        ],
        correct: 0,
        explanation: "Dar os parabéns e desejar coisas boas é uma forma natural de celebrar a conquista de alguém."
    },
    {
        context: "Um colega ajuda-te a resolver um problema complicado e queres agradecer.",
        question: "O que podes dizer?",
        options: [
            "Não fizeste nada.",
            "Obrigado pela força, ajudaste mesmo.",
            "Isso era tua obrigação.",
            "Não voltes a fazer isso."
        ],
        correct: 1,
        explanation: "A expressão «obrigado pela força» transmite agradecimento e reconhecimento pela ajuda."
    },
    {
        context: "Chegas a um encontro e alguém pergunta como estás.",
        question: "Qual destas respostas funciona melhor?",
        options: [
            "Não fales comigo.",
            "Isso é uma pergunta difícil.",
            "Estou bem, e tu? Tudo em ordem?",
            "Não sei quem és."
        ],
        correct: 2,
        explanation: "É uma resposta amigável que também devolve a pergunta e mantém a conversa."
    },
    {
        context: "Um amigo conta-te uma boa notícia e parece muito entusiasmado.",
        question: "Como podes reagir de forma positiva?",
        options: [
            "Estragaste o meu dia.",
            "Não acredito em ti.",
            "Muda de assunto.",
            "Grande cena! Fico mesmo contente por ti."
        ],
        correct: 3,
        explanation: "«Grande cena!» pode expressar entusiasmo ou aprovação, dependendo do contexto."
    },
    {
        context: "Alguém pede desculpa por ter chegado atrasado e explica o motivo.",
        question: "Qual é uma resposta compreensiva?",
        options: [
            "Está tranquilo, obrigado por avisares.",
            "Nunca mais apareças.",
            "Não tens direito a explicar.",
            "Não quero ouvir nada."
        ],
        correct: 0,
        explanation: "Esta resposta reconhece o pedido de desculpa e mantém a conversa respeitosa."
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
    questionOrder = shuffle(responseQuestions);
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
        `Pergunta ${currentQuestion + 1} de ${questionOrder.length}`;
    $("score-counter").textContent = `${score} pontos`;
    $("progress-bar").style.width =
        `${(currentQuestion / questionOrder.length) * 100}%`;
    $("question-context").textContent = q.context;
    $("question-title").textContent = q.question;
    $("answer-feedback").hidden = true;
    $("answer-feedback").className = "answer-feedback";
    $("next-button").hidden = true;
    $("next-button").innerHTML =
        currentQuestion === questionOrder.length - 1
            ? 'Ver resultados <span>→</span>'
            : 'Próxima pergunta <span>→</span>';

    const container = $("answer-options");
    container.replaceChildren();

    q.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";

        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = String.fromCharCode(65 + index);

        const label = document.createElement("span");
        label.textContent = option;

        button.append(letter, label);
        button.addEventListener("click", () => selectAnswer(index));
        container.appendChild(button);
    });
}

function selectAnswer(selectedIndex) {
    if (answered) return;
    answered = true;

    const q = questionOrder[currentQuestion];
    const buttons = [...$("answer-options").querySelectorAll("button")];
    const correct = selectedIndex === q.correct;

    buttons.forEach((button, index) => {
        button.disabled = true;
        if (index === q.correct) button.classList.add("correct");
        if (index === selectedIndex && !correct) {
            button.classList.add("incorrect");
        }
    });

    const feedback = $("answer-feedback");
    feedback.hidden = false;

    if (correct) {
        score += 10;
        sessionPaus += 10;
        $("paus-earned").textContent = String(sessionPaus);
        feedback.classList.add("good");
        feedback.textContent = `✓ Boa resposta! +10 pontos e +10 Paus. ${q.explanation}`;
    } else {
        feedback.classList.add("bad");
        feedback.textContent = `Ainda não! ${q.explanation}`;
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
    const percentage = Math.round((score / (total * 10)) * 100);

    $("final-score").textContent = `${score / 10}/${total}`;
    $("final-points").textContent = String(score);
    $("final-paus").textContent = `${sessionPaus} ✦`;
    $("result-icon").textContent =
        percentage === 100 ? "🏆" : percentage >= 60 ? "🎉" : "💪";
    $("result-title").textContent =
        percentage === 100 ? "Impecável!" :
        percentage >= 60 ? "Muito bem!" : "Continua a praticar!";
    $("result-description").textContent =
        percentage === 100
            ? "Acertaste em todas. Dominas estas situações!"
            : percentage >= 60
                ? "Estás a ganhar confiança. Continua a aprender as expressões no seu contexto."
                : "Cada situação é uma oportunidade para aprender. Tenta outra vez!";
}

$("start-button").addEventListener("click", startGame);
$("next-button").addEventListener("click", nextQuestion);
$("play-again-button").addEventListener("click", startGame);
