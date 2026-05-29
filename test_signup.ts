import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignup() {
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    const username = `testuser${timestamp}`;

    console.log("Attempting to sign up with email:", email);

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "Password123!",
        email_confirm: true,
        user_metadata: {
            full_name: "Test User",
            username: username,
            role: "employee",
            bio: "This is a test bio",
            portfolio_url: "https://example.com",
            social_links: {
                linkedin: "https://linkedin.com",
                github: "https://github.com"
            },
            job_titles: [],
            skills: []
        }
    });

    if (error) {
        console.error("Signup failed:", error);
    } else {
        console.log("Signup success! User ID:", data.user.id);

        // Check if profile was created
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

        if (profileError) {
            console.error("Profile fetch failed:", profileError);
        } else {
            console.log("Profile created successfully:", profile);
        }

        // Cleanup
        await supabase.auth.admin.deleteUser(data.user.id);
        console.log("Test user deleted");
    }
}

testSignup();
