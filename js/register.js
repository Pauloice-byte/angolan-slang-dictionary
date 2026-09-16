const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

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
                }
            }
        });

        if (error) {
            throw error;
        }

        /*
         * Supabase's database trigger automatically creates
         * the user's profile when the Auth account is created.
         */

        if (data.user) {

            registerMessage.textContent =
                "Account created successfully.";

            /*
             * If email confirmation is enabled,
             * there may not be an active session yet.
             */

            if (!data.session) {

                registerMessage.textContent =
                    "Account created. Please check your email to confirm your account.";

                return;
            }

            window.location.href = "onboarding.html";
        }

    } catch (error) {

        console.error(error);

        registerMessage.textContent =
            error.message || "Unable to create account.";
    }

});
