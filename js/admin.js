const adminWelcome = document.getElementById("adminWelcome");
const logoutButton = document.getElementById("logoutButton");

const totalWords = document.getElementById("totalWords");
const publishedWords = document.getElementById("publishedWords");
const draftWords = document.getElementById("draftWords");
const freeWords = document.getElementById("freeWords");
const premiumWords = document.getElementById("premiumWords");
const totalPacks = document.getElementById("totalPacks");
const totalUsers = document.getElementById("totalUsers");
const gamesPlayed = document.getElementById("gamesPlayed");

const databaseStatus = document.getElementById("databaseStatus");
const authStatus = document.getElementById("authStatus");


async function checkAdminAccess() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {

        window.location.href = "login.html";
        return null;
    }


    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", user.id)
        .single();


    if (profileError || !profile) {

        console.error(profileError);

        window.location.href = "login.html";
        return null;
    }


    if (profile.role !== "admin") {

        window.location.href = "app.html";
        return null;
    }


    const name =
        profile.full_name ||
        user.user_metadata?.full_name ||
        profile.email ||
        user.email;


    adminWelcome.textContent =
        `Welcome, ${name}.`;


    authStatus.textContent = "Connected";

    return user;
}


async function getCount(table, filter = null) {

    let query = supabaseClient
        .from(table)
        .select("*", {
            count: "exact",
            head: true
        });


    if (filter) {
        query = query.eq(filter.column, filter.value);
    }


    const { count, error } = await query;


    if (error) {
        throw error;
    }


    return count || 0;
}


async function loadDashboard() {

    try {

        /*
         * Words
         */

        const allWords =
            await getCount("words");

        const published =
            await getCount("words", {
                column: "is_published",
                value: true
            });

        const free =
            await getCount("words", {
                column: "is_premium",
                value: false
            });

        const premium =
            await getCount("words", {
                column: "is_premium",
                value: true
            });


        totalWords.textContent = allWords;
        publishedWords.textContent = published;
        draftWords.textContent = allWords - published;
        freeWords.textContent = free;
        premiumWords.textContent = premium;


        /*
         * Packs
         */

        totalPacks.textContent =
            await getCount("packs");


        /*
         * Users
         */

        totalUsers.textContent =
            await getCount("profiles");


        /*
         * Games
         */

        gamesPlayed.textContent =
            await getCount("game_sessions");


        databaseStatus.textContent =
            "Connected";


    } catch (error) {

        console.error("Dashboard error:", error);

        databaseStatus.textContent =
            "Error loading data";
    }
}


logoutButton.addEventListener("click", async function () {

    const { error } =
        await supabaseClient.auth.signOut();


    if (error) {

        console.error(error);

        return;
    }


    window.location.href = "login.html";
});


async function initializeDashboard() {

    const user = await checkAdminAccess();

    if (!user) {
        return;
    }

    await loadDashboard();
}


initializeDashboard();
