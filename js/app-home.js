async function loadHome() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();

    if (error || !user) {

        window.location.href = "login.html";
        return;
    }

    const welcomeMessage =
        document.getElementById("welcomeMessage");

    const name =
        user.user_metadata?.full_name || "there";

    welcomeMessage.textContent =
        `Welcome, ${name}! Your dictionary is ready.`;
}


loadHome();
