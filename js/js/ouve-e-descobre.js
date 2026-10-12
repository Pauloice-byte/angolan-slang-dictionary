
(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);

    const elements = {
        welcome: $("#welcome-screen"),
        playing: $("#playing-screen"),
        results: $("#results-screen"),

        startButton: $("#start-button"),
        playButton: $("#play-audio-button"),
        playButtonLabel: $("#play-button-label"),
        playIcon: $("#play-icon"),
        nextButton: $("#next-button"),
        playAgainButton: $("#play-again-button"),

        balance: $("#paus-balance"),
        questionCounter: $("#question-counter"),
        currentScore: $("#current-score"),
        progressTrack: $("#progress-track"),
        progressFill: $("#progress-fill"),

        audio: $("#word-audio"),
        audioArt: $(".audio-art"),
        audioInstruction: $("#audio-instruction"),

        answerOptions: [...document.querySelectorAll(".answer-option")],
        answerFeedback: $("#answer-feedback"),
        feedbackTitle: $("#feedback-title"),
        feedbackDescription: $("#feedback-description"),

        welcomeMessage: $("#welcome-message"),
        playingMessage: $("#playing-message"),
        resultsMessage: $("#results-message"),

        resultHeading: $("#result-heading"),
        resultDescription: $("#result-description"),
        finalScore: $("#final-score"),
        finalTotal: $("#final-total"),
        resultProgressFill: $("#result-progress-fill"),
        accuracyLabel: $("#accuracy-label"),
        answerRewards: $("#answer-rewards"),
        completionBonus: $("#completion-bonus"),
        bonusRow: $(".bonus-row")
    };

    const state = {
        user: null,
        round: null,
        questions: [],
        questionIndex: 0,
        score: 0,
        answerRewards: 0,
        selected: false,
        finishing: false,
        finished: false
    };

    const optionLetters = ["A", "B", "C", "D"];

    function showScreen(screen) {
        elements.welcome.hidden = screen !== "welcome";
        elements.playing.hidden = screen !== "playing";
        elements.results.hidden = screen !== "results";
    }

    function setMessage(element, message) {
        element.textContent = message || "";
    }

    function setButtonLoading(button, loading, loadingText, originalText) {
        button.disabled = loading;

        if (loading) {
            button.dataset.originalText = button.innerHTML;
            button.textContent = loadingText;
        } else if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
            delete button.dataset.originalText;
        } else if (originalText) {
            button.textContent = originalText;
        }
    }

    function formatPaus(value) {
        const number = Number(value);

        return Number.isFinite(number)
            ? number.toLocaleString("pt-PT")
            : "0";
    }

    async function refreshPausBalance() {
        const { data, error } = await supabaseClient.rpc(
            "get_my_paus_balance"
        );

        if (error) {
            console.error("Could not load Paus balance:", error);
            return;
        }

        elements.balance.textContent = formatPaus(data);
    }

    async function initialize() {
        if (typeof supabaseClient === "undefined") {
            showScreen("welcome");
            elements.startButton.disabled = true;

            setMessage(
                elements.welcomeMessage,
                "Não foi possível carregar o Supabase. Verifica a ligação dos scripts."
            );

            return;
        }

        try {
            const { data, error } =
                await supabaseClient.auth.getSession();

            if (error) throw error;

            state.user = data.session?.user || null;

            if (!state.user) {
                elements.startButton.disabled = true;

                setMessage(
                    elements.welcomeMessage,
                    "Inicia sessão na tua conta através do dicionário para jogar."
                );

                return;
            }

            await refreshPausBalance();
        } catch (error) {
            console.error("Initialization error:", error);

            elements.startButton.disabled = true;

            setMessage(
                elements.welcomeMessage,
                "Não foi possível verificar a sessão. Atualiza a página e tenta novamente."
            );
        }
    }

    async function startGame() {
        if (elements.startButton.disabled) return;

        setMessage(elements.welcomeMessage, "");
        setButtonLoading(
            elements.startButton,
            true,
            "A preparar o jogo..."
        );

        try {
            const { data: sessionData, error: sessionError } =
                await supabaseClient.auth.getSession();

            if (sessionError) throw sessionError;

            state.user = sessionData.session?.user || null;

            if (!state.user) {
                throw new Error(
                    "A tua sessão expirou. Inicia sessão novamente."
                );
            }

            const { data, error } = await supabaseClient.rpc(
                "start_ouve_round"
            );

            if (error) throw error;

            if (
                !data ||
                !data.round_id ||
                !Array.isArray(data.questions) ||
                data.questions.length === 0
            ) {
                throw new Error(
                    "Não foi possível criar perguntas para esta ronda."
                );
            }

            state.round = data;
            state.questions = data.questions;
            state.questionIndex = 0;
            state.score = 0;
            state.answerRewards = 0;
            state.selected = false;
            state.finishing = false;
            state.finished = false;

            showScreen("playing");
            renderQuestion();

        } catch (error) {
            console.error("Could not start game:", error);

            setMessage(
                elements.welcomeMessage,
                error.message || "Não foi possível iniciar o jogo."
            );
        } finally {
            setButtonLoading(elements.startButton, false);
        }
    }

    function currentQuestion() {
        return state.questions[state.questionIndex];
    }

    function renderQuestion() {
        const question = currentQuestion();

        if (!question) {
            setMessage(
                elements.playingMessage,
                "Não foi possível carregar esta pergunta."
            );
            return;
        }

        state.selected = false;

        elements.questionCounter.textContent =
            `PERGUNTA ${state.questionIndex + 1} DE ${state.questions.length}`;

        elements.currentScore.textContent = String(state.score);

        const progress = (
            state.questionIndex / state.questions.length
        ) * 100;

        elements.progressFill.style.width = `${progress}%`;

        elements.progressTrack.setAttribute(
            "aria-valuemax",
            String(state.questions.length)
        );

        elements.progressTrack.setAttribute(
            "aria-valuenow",
            String(state.questionIndex)
        );

        elements.answerOptions.forEach((button, index) => {
            const option = question.options[index];

            button.disabled = false;
            button.classList.remove("is-correct", "is-incorrect");

            button.querySelector(".option-letter").textContent =
                optionLetters[index];

            button.querySelector(".option-label").textContent =
                option ? option.label : "Opção indisponível";

            button.dataset.optionId = option ? String(option.id) : "";
            button.disabled = !option;
        });

        elements.answerFeedback.hidden = true;
        elements.answerFeedback.classList.remove("is-incorrect");
        elements.nextButton.hidden = true;

        elements.playButton.disabled = false;
        elements.playButtonLabel.textContent = "Ouvir palavra";
        elements.playIcon.textContent = "▶";

        elements.audioArt.classList.remove("is-playing");
        elements.audioInstruction.textContent =
            "Ouve com atenção e escolhe a palavra.";

        elements.audio.pause();
        elements.audio.removeAttribute("src");
        elements.audio.load();

        setMessage(elements.playingMessage, "");
    }

    async function playAudio() {
        const question = currentQuestion();

        if (!question || state.selected) return;

        elements.playButton.disabled = true;
        setMessage(elements.playingMessage, "");

        try {
            // Generate a fresh URL because the bucket is private.
            const { data, error } = await supabaseClient
                .storage
                .from("audio")
                .createSignedUrl(question.audio_path, 300);

            if (error) throw error;

            if (!data?.signedUrl) {
                throw new Error("Não foi possível obter o áudio.");
            }

            elements.audio.pause();
            elements.audio.src = data.signedUrl;
            elements.audio.load();

            await elements.audio.play();

            elements.playIcon.textContent = "Ⅱ";
            elements.playButtonLabel.textContent = "A ouvir...";
            elements.audioArt.classList.add("is-playing");

            elements.audioInstruction.textContent =
                "Ouve a palavra e escolhe a resposta.";

        } catch (error) {
            console.error("Audio playback error:", error);

            setMessage(
                elements.playingMessage,
                "Não foi possível reproduzir o áudio. Tenta novamente."
            );
        } finally {
            elements.playButton.disabled = false;
        }
    }

    async function submitAnswer(button) {
        if (state.selected || state.finishing || state.finished) return;

        const question = currentQuestion();
        const optionId = button.dataset.optionId;

        if (!question || !optionId) return;

        state.selected = true;

        elements.answerOptions.forEach((option) => {
            option.disabled = true;
        });

        elements.playButton.disabled = true;
        elements.audio.pause();
        elements.audioArt.classList.remove("is-playing");

        try {
            const { data, error } = await supabaseClient.rpc(
                "submit_ouve_answer",
                {
                    p_round_id: state.round.round_id,
                    p_question_id: question.question_id,
                    p_option_id: Number(optionId)
                }
            );

            if (error) throw error;

            if (!data) {
                throw new Error("O servidor não devolveu o resultado.");
            }

            state.score = Number(data.score) || 0;
            state.answerRewards += Number(data.paus_awarded) || 0;

            elements.currentScore.textContent = String(state.score);

            const selectedId = String(optionId);
            const correctOption = question.options.find(
                (option) =>
                    String(option.id) ===
                    String(question.options.find(
                        (item) => item.label === data.correct_answer
                    )?.id)
            );

            // The correct answer is revealed only after submission.
            elements.answerOptions.forEach((optionButton) => {
                const isCorrect =
                    optionButton.querySelector(".option-label").textContent ===
                    data.correct_answer;

                if (isCorrect) {
                    optionButton.classList.add("is-correct");
                } else if (
                    optionButton.dataset.optionId === selectedId &&
                    !data.is_correct
                ) {
                    optionButton.classList.add("is-incorrect");
                }
            });

            elements.answerFeedback.hidden = false;
            elements.answerFeedback.classList.toggle(
                "is-incorrect",
                !data.is_correct
            );

            if (data.is_correct) {
                elements.feedbackTitle.textContent = "Resposta certa! +10 Paus";
                elements.feedbackDescription.textContent =
                    "Boa! Reconheceste a palavra.";
            } else {
                elements.feedbackTitle.textContent = "Não foi desta vez.";
                elements.feedbackDescription.textContent =
                    `A resposta certa era: ${data.correct_answer}.`;
            }

            // Avoid exposing any answer information before submission.
            void correctOption;

            await refreshPausBalance();

            const isLastQuestion =
                state.questionIndex === state.questions.length - 1;

            elements.nextButton.innerHTML = isLastQuestion
                ? 'Ver resultados <span aria-hidden="true">→</span>'
                : 'Próxima pergunta <span aria-hidden="true">→</span>';

            elements.nextButton.hidden = false;

        } catch (error) {
            console.error("Answer submission error:", error);

            state.selected = false;

            elements.answerOptions.forEach((option) => {
                option.disabled = false;
            });

            elements.playButton.disabled = false;

            setMessage(
                elements.playingMessage,
                error.message ||
                    "Não foi possível registar a resposta. Tenta novamente."
            );
        }
    }

    async function advanceQuestion() {
        if (!state.selected || state.finishing || state.finished) return;

        if (state.questionIndex < state.questions.length - 1) {
            state.questionIndex += 1;
            renderQuestion();
            return;
        }

        await finishGame();
    }

    async function finishGame() {
        if (state.finishing || state.finished) return;

        state.finishing = true;
        elements.nextButton.disabled = true;

        setButtonLoading(
            elements.nextButton,
            true,
            "A calcular resultados..."
        );

        try {
            const { data, error } = await supabaseClient.rpc(
                "finish_ouve_round",
                {
                    p_round_id: state.round.round_id
                }
            );

            if (error) throw error;

            state.finished = true;

            const total = Number(data.total_questions) ||
                state.questions.length;

            const score = Number(data.score) || 0;
            const bonus = Number(data.bonus_awarded) || 0;
            const accuracy = total > 0
                ? Math.round((score / total) * 100)
                : 0;

            elements.finalScore.textContent = String(score);
            elements.finalTotal.textContent = String(total);
            elements.resultProgressFill.style.width = `${accuracy}%`;

            elements.accuracyLabel.textContent =
                `${accuracy}% de respostas certas`;

            elements.answerRewards.textContent =
                `+${formatPaus(state.answerRewards)}`;

            elements.completionBonus.textContent =
                `+${formatPaus(bonus)}`;

            elements.bonusRow.hidden = bonus <= 0;

            if (score === total) {
                elements.resultHeading.textContent = "Impecável!";
                elements.resultDescription.textContent =
                    "Conheces mesmo o calão angolano.";
            } else if (accuracy >= 70) {
                elements.resultHeading.textContent = "Muito bem!";
                elements.resultDescription.textContent =
                    "Tens um bom ouvido para as nossas palavras.";
            } else if (accuracy >= 40) {
                elements.resultHeading.textContent = "Bom esforço!";
                elements.resultDescription.textContent =
                    "Continua a jogar para conheceres mais expressões.";
            } else {
                elements.resultHeading.textContent = "Continua a praticar!";
                elements.resultDescription.textContent =
                    "Cada ronda é uma oportunidade para aprender.";
            }

            await refreshPausBalance();
            showScreen("results");

        } catch (error) {
            console.error("Could not finish game:", error);

            setMessage(
                elements.playingMessage,
                error.message ||
                    "Não foi possível concluir a ronda. Tenta novamente."
            );

        } finally {
            state.finishing = false;
            elements.nextButton.disabled = false;
            setButtonLoading(elements.nextButton, false);
        }
    }

    function resetToWelcome() {
        elements.audio.pause();
        elements.audio.removeAttribute("src");
        elements.audio.load();

        state.round = null;
        state.questions = [];
        state.questionIndex = 0;
        state.score = 0;
        state.answerRewards = 0;
        state.selected = false;
        state.finishing = false;
        state.finished = false;

        setMessage(elements.welcomeMessage, "");
        setMessage(elements.playingMessage, "");
        setMessage(elements.resultsMessage, "");

        elements.startButton.disabled = false;

        showScreen("welcome");
        refreshPausBalance();
    }

    elements.startButton.addEventListener("click", startGame);
    elements.playButton.addEventListener("click", playAudio);
    elements.nextButton.addEventListener("click", advanceQuestion);
    elements.playAgainButton.addEventListener("click", resetToWelcome);

    elements.answerOptions.forEach((button) => {
        button.addEventListener("click", () => submitAnswer(button));
    });

    elements.audio.addEventListener("ended", () => {
        elements.playIcon.textContent = "▶";
        elements.playButtonLabel.textContent = "Ouvir novamente";
        elements.audioArt.classList.remove("is-playing");
        elements.audioInstruction.textContent =
            "Podes ouvir novamente antes de responder.";
    });

    elements.audio.addEventListener("error", () => {
        elements.audioArt.classList.remove("is-playing");
        elements.playIcon.textContent = "▶";
        elements.playButtonLabel.textContent = "Tentar novamente";
    });

    initialize();
})();
