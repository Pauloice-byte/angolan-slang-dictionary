const adminWelcome = document.getElementById("adminWelcome");
const logoutButton = document.getElementById("logoutButton");


async function checkAdminAccess() {

    try {

        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {

            window.location.href = "login.html";
            return;
        }


        const {
            data: profile,
            error: profileError
        } = await supabaseClient
            .from("profiles")
            .select("full_name, email, role")
            .eq("id", user.id)
            .single();


        if (profileError) {
            throw profileError;
        }


        if (profile.role !== "admin") {

            alert("You do not have permission to access the admin area.");

            window.location.href = "app.html";
            return;
        }


        const name =
            profile.full_name ||
            user.user_metadata?.full_name ||
            profile.email ||
            user.email;


        adminWelcome.textContent =
            `Welcome, ${name}. You have administrator access.`;


    } catch (error) {

        console.error("Admin access error:", error);

        window.location.href = "login.html";
    }
}


logoutButton.addEventListener("click", async function () {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {

        console.error("Logout error:", error);

        return;
    }

    window.location.href = "login.html";
});


checkAdminAccess();
