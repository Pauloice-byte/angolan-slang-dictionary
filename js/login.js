const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");


/* ============================================================
   PASSWORD INPUT
============================================================ */

const passwordInput =
    document.getElementById("password");

const passwordToggle =
    document.getElementById("passwordToggle");

if (passwordToggle) {

    passwordToggle.addEventListener(
        "click",
        function () {

            const isVisible =
                passwordInput.type === "text";

            passwordInput.type =
                isVisible
                    ? "password"
                    : "text";

            passwordToggle.classList.toggle(
                "is-visible",
                !isVisible
            );

            passwordToggle.setAttribute(
                "aria-label",
                isVisible
                    ? "Mostrar palavra-passe"
                    : "Ocultar palavra-passe"
            );

            passwordToggle.setAttribute(
                "aria-pressed",
                String(!isVisible)
            );

        }
    );

}


/* ============================================================
   PASSWORD RECOVERY ELEMENTS
============================================================ */

const forgotPasswordButton =
    document.getElementById("forgotPasswordButton");

const recoveryOverlay =
    document.getElementById("passwordRecoveryOverlay");

const recoveryClose =
    document.getElementById("passwordRecoveryClose");

const recoveryRequestStep =
    document.getElementById("recoveryRequestStep");

const recoveryPasswordStep =
    document.getElementById("recoveryPasswordStep");

const passwordRecoveryForm =
    document.getElementById("passwordRecoveryForm");

const recoveryEmail =
    document.getElementById("recoveryEmail");

const recoveryMessage =
    document.getElementById("recoveryMessage");

const newPasswordForm =
    document.getElementById("newPasswordForm");

const newPassword =
    document.getElementById("newPassword");

const confirmNewPassword =
    document.getElementById("confirmNewPassword");

const newPasswordMessage =
    document.getElementById("newPasswordMessage");


/* ============================================================
   OPEN / CLOSE RECOVERY MODAL
============================================================ */

function openRecoveryModal() {

    recoveryOverlay.classList.add("is-open");

    recoveryOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow = "hidden";
}


function closeRecoveryModal() {

    recoveryOverlay.classList.remove("is-open");

    recoveryOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow = "";
}


forgotPasswordButton.addEventListener(
    "click",
    function () {

        recoveryRequestStep.hidden = false;
        recoveryPasswordStep.hidden = true;

        recoveryMessage.textContent = "";

        recoveryEmail.value = "";

        openRecoveryModal();

        setTimeout(function () {
            recoveryEmail.focus();
        }, 250);

    }
);


recoveryClose.addEventListener(
    "click",
    closeRecoveryModal
);


recoveryOverlay.addEventListener(
    "click",
    function (event) {

        if (
            event.target === recoveryOverlay &&
            !recoveryPasswordStep.hidden
        ) {
            return;
        }

        if (event.target === recoveryOverlay) {
            closeRecoveryModal();
        }

    }
);


/* ============================================================
   SEND PASSWORD RENEWAL EMAIL
============================================================ */

passwordRecoveryForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const email =
            recoveryEmail.value.trim();

        if (!email) {
            return;
        }

        recoveryMessage.textContent =
            "A enviar o link...";

        try {

            const { error } =
                await supabaseClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                "https://angolan-slang-dictionary.vercel.app/login.html"
                        }
                    );

            if (error) {
                throw error;
            }

            recoveryMessage.textContent =
                "Enviámos um link para renovar a tua palavra-passe. Verifica o teu email.";

            passwordRecoveryForm.reset();

        } catch (error) {

            console.error(error);

            recoveryMessage.textContent =
                error.message ||
                "Não foi possível enviar o link.";
        }

    }
);


/* ============================================================
   PASSWORD RECOVERY SESSION
============================================================ */

async function checkPasswordRecovery() {

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    if (session) {

        /*
         * Supabase creates a recovery session after
         * the user clicks the password renewal link.
         *
         * We only show the new-password step when
         * the URL/session indicates password recovery.
         */

        const hash =
            window.location.hash;

        const search =
            window.location.search;

        const isRecovery =
            hash.includes("type=recovery") ||
            search.includes("type=recovery");

        if (isRecovery) {

            showNewPasswordStep();

        }

    }

}


/* ============================================================
   SHOW NEW PASSWORD STEP
============================================================ */

function showNewPasswordStep() {

    recoveryRequestStep.hidden = true;
    recoveryPasswordStep.hidden = false;

    recoveryMessage.textContent = "";
    newPasswordMessage.textContent = "";

    openRecoveryModal();

    setTimeout(function () {
        newPassword.focus();
    }, 250);

}


/* ============================================================
   NEW PASSWORD VISIBILITY
============================================================ */

function setupPasswordToggle(
    input,
    button
) {

    if (!input || !button) {
        return;
    }

    button.addEventListener(
        "click",
        function () {

            const isVisible =
                input.type === "text";

            input.type =
                isVisible
                    ? "password"
                    : "text";

            button.classList.toggle(
                "is-visible",
                !isVisible
            );

            button.setAttribute(
                "aria-label",
                isVisible
                    ? "Mostrar palavra-passe"
                    : "Ocultar palavra-passe"
            );

            button.setAttribute(
                "aria-pressed",
                String(!isVisible)
            );

        }
    );

}


setupPasswordToggle(
    newPassword,
    document.getElementById(
        "newPasswordToggle"
    )
);


setupPasswordToggle(
    confirmNewPassword,
    document.getElementById(
        "confirmNewPasswordToggle"
    )
);


/* ============================================================
   SAVE NEW PASSWORD
============================================================ */

newPasswordForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const password =
            newPassword.value;

        const confirmation =
            confirmNewPassword.value;

        newPasswordMessage.textContent = "";


        if (password.length < 6) {

            newPasswordMessage.textContent =
                "A palavra-passe deve ter pelo menos 6 caracteres.";

            return;
        }


        if (password !== confirmation) {

            newPasswordMessage.textContent =
                "As palavras-passe não coincidem.";

            return;
        }


        try {

            newPasswordMessage.textContent =
                "A atualizar a palavra-passe...";


            const { error } =
                await supabaseClient.auth
                    .updateUser({
                        password: password
                    });


            if (error) {
                throw error;
            }


            newPasswordMessage.textContent =
                "Palavra-passe renovada com sucesso. Já podes entrar na tua conta.";


            newPasswordForm.reset();


            setTimeout(
                async function () {

                    await supabaseClient.auth.signOut();

                    closeRecoveryModal();

                    loginMessage.textContent =
                        "Palavra-passe renovada. Entra com a tua nova palavra-passe.";

                },
                1800
            );


        } catch (error) {

            console.error(error);

            newPasswordMessage.textContent =
                error.message ||
                "Não foi possível atualizar a palavra-passe.";
        }

    }
);


/* ============================================================
   LOGIN
============================================================ */

loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;

        loginMessage.textContent =
            "Logging in...";


        try {

            const {
                data,
                error
            } =
                await supabaseClient.auth
                    .signInWithPassword({
                        email: email,
                        password: password
                    });


            if (error) {
                throw error;
            }


            const user =
                data.user;


            if (!user) {
                throw new Error(
                    "Unable to identify your account."
                );
            }


            /*
             * Get the user's profile.
             */
            const {
                data: profile,
                error: profileError
            } =
                await supabaseClient
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();


            if (profileError) {
                throw profileError;
            }


            /*
             * Admins go directly to the admin area.
             */
            if (profile.role === "admin") {

                window.location.href =
                    "admin.html";

                return;
            }


            /*
             * Normal users who haven't completed
             * onboarding must complete it first.
             */
            if (!profile.onboarding_completed) {

                window.location.href =
                    "onboarding.html";

                return;
            }


            /*
             * Returning users go directly to the app.
             */
            window.location.href =
                "app.html";

        } catch (error) {

            console.error(error);

            loginMessage.textContent =
                error.message ||
                "Unable to log in.";

        }

    }
);


/* ============================================================
   CHECK FOR PASSWORD RECOVERY
============================================================ */

checkPasswordRecovery();
