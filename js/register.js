const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

/* =========================================================
   NORMAL REGISTRATION
   ========================================================= */

registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    registerMessage.textContent = "";

    if (password !== confirmPassword) {
        registerMessage.textContent = "Passwords do not match.";
        return;
    }

    try {
        registerMessage.textContent = "Creating account...";

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName
                },
                emailRedirectTo: "https://angolan-slang-dictionary.vercel.app/login.html"
            }
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            registerMessage.textContent =
                "Account created successfully. Please check your email to confirm your account.";

            registerForm.reset();
            return;
        }

    } catch (error) {
        console.error(error);
        registerMessage.textContent =
            error.message || "Unable to create account.";
    }
});


/* =========================================================
   PASSWORD RESET POPUP
   ========================================================= */

const passwordResetOverlay =
    document.getElementById("passwordResetOverlay");

const passwordResetForm =
    document.getElementById("passwordResetForm");

const resetPassword =
    document.getElementById("resetPassword");

const resetPasswordConfirm =
    document.getElementById("resetPasswordConfirm");

const passwordResetMessage =
    document.getElementById("passwordResetMessage");


function openPasswordResetPopup() {
    if (!passwordResetOverlay) {
        return;
    }

    passwordResetOverlay.classList.add("is-open");
    passwordResetOverlay.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    setTimeout(function () {
        if (resetPassword) {
            resetPassword.focus();
        }
    }, 250);
}


function setupPasswordToggle(input, button) {

    if (!input || !button) {
        return;
    }

    button.addEventListener("click", function () {

        const isVisible = input.type === "text";

        input.type = isVisible ? "password" : "text";

        button.classList.toggle("is-visible", !isVisible);

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
    });
}


setupPasswordToggle(
    resetPassword,
    document.getElementById("resetPasswordToggle")
);

setupPasswordToggle(
    resetPasswordConfirm,
    document.getElementById("resetPasswordConfirmToggle")
);


/* =========================================================
   SHOW RESET POPUP AFTER SUPABASE RECOVERY LINK
   ========================================================= */

function showResetPopup() {

    if (!passwordResetOverlay) {
        return;
    }

    openPasswordResetPopup();
}


/*
 * Supabase fires PASSWORD_RECOVERY when the user
 * arrives through the password-reset email link.
 *
 * This is more reliable than checking the URL hash
 * manually because Supabase processes the auth token.
 */
supabaseClient.auth.onAuthStateChange(function (event, session) {

    console.log("Supabase auth event:", event);

    if (event === "PASSWORD_RECOVERY" && session) {
        showResetPopup();
    }

});


/*
 * Fallback check for recovery links.
 * This handles cases where the recovery event has already
 * been processed before this script starts listening.
 */
async function checkForPasswordRecovery() {

    const hash = window.location.hash || "";
    const search = window.location.search || "";

    const isRecovery =
        hash.includes("type=recovery") ||
        search.includes("type=recovery");

    if (!isRecovery) {
        return;
    }

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    if (session) {
        showResetPopup();
    }
}


checkForPasswordRecovery();


/* =========================================================
   SAVE NEW PASSWORD
   ========================================================= */

passwordResetForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const password = resetPassword.value;
    const confirmation = resetPasswordConfirm.value;

    passwordResetMessage.textContent = "";

    if (password.length < 6) {

        passwordResetMessage.textContent =
            "A palavra-passe deve ter pelo menos 6 caracteres.";

        return;
    }

    if (password !== confirmation) {

        passwordResetMessage.textContent =
            "As palavras-passe não coincidem.";

        return;
    }

    try {

        passwordResetMessage.textContent =
            "A atualizar a palavra-passe...";

        const {
            error
        } = await supabaseClient.auth.updateUser({
            password: password
        });

        if (error) {
            throw error;
        }

        passwordResetMessage.textContent =
            "Palavra-passe alterada com sucesso. A redirecionar...";

        passwordResetForm.reset();

        /*
         * Give the user a moment to see the success message,
         * then destroy the recovery session and send them
         * to the normal login page.
         */
        setTimeout(async function () {

            try {
                await supabaseClient.auth.signOut();
            } catch (error) {
                console.error("Sign out after password reset:", error);
            }

            window.location.href = "login.html";

        }, 1800);

    } catch (error) {

        console.error(error);

        passwordResetMessage.textContent =
            error.message ||
            "Não foi possível alterar a palavra-passe.";
    }
});
