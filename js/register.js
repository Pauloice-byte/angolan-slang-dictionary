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
                },

                emailRedirectTo:
                    "https://angolan-slang-dictionary.vercel.app/login.html"
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
