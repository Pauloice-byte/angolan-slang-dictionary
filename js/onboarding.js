const onboardingForm = document.getElementById("onboardingForm");
const onboardingMessage = document.getElementById("onboardingMessage");


async function loadUser() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {

        window.location.href = "login.html";
        return null;
    }

    return user;
}


onboardingForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const reason = document.getElementById("reason").value;

    if (!reason) {
        onboardingMessage.textContent =
            "Please select an option.";
        return;
    }

    try {

        onboardingMessage.textContent = "Saving...";

        const user = await loadUser();

        if (!user) {
            return;
        }

        const { error } = await supabaseClient
            .from("profiles")
            .update({
                onboarding_completed: true,
                onboarding_reason: reason
            })
            .eq("id", user.id);

        if (error) {
            throw error;
        }

        window.location.href = "app.html";

    } catch (error) {

        console.error(error);

        onboardingMessage.textContent =
            error.message ||
            "Unable to save your preferences.";
    }

});
