const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");


loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    loginMessage.textContent = "Logging in...";

    try {

        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        const user = data.user;

        if (!user) {
            throw new Error("Unable to identify your account.");
        }

        /*
         * Get the user's profile.
         */
        const { data: profile, error: profileError } =
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

            window.location.href = "admin.html";
            return;
        }

        /*
         * Normal users who haven't completed onboarding
         * must complete it first.
         */
        if (!profile.onboarding_completed) {

            window.location.href = "onboarding.html";
            return;
        }

        /*
         * Returning users go directly to the app.
         */
        window.location.href = "app.html";

    } catch (error) {

        console.error(error);

        loginMessage.textContent =
            error.message || "Unable to log in.";
    }

});
