console.log("Angolan Slang Dictionary loaded.");

async function testSupabaseConnection() {
    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error("Supabase connection error:", error);
            return;
        }

        console.log("Supabase connected successfully.");
        console.log("Current session:", data.session);

    } catch (error) {
        console.error("Unexpected error:", error);
    }
}

testSupabaseConnection();
