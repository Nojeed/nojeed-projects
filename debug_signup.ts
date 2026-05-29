import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSignup(metadata: any, description: string) {
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const email = `testuser${timestamp}@example.com`;

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: "Password123!",
        email_confirm: true,
        user_metadata: metadata
    });

    if (error) {
        console.error(`[FAIL] ${description} | Error:`, error.message);
        return false;
    } else {
        console.log(`[OK]   ${description}`);
        await supabase.auth.admin.deleteUser(data.user.id);
        return true;
    }
}

async function runTests() {
    // Test 1: Minimal profile
    await testSignup({
        full_name: "Test",
        username: "t1_" + Date.now(),
        role: "employee"
    }, "Minimal profile");

    // Test 2: Add bio
    await testSignup({
        full_name: "Test",
        username: "t2_" + Date.now(),
        role: "employee",
        bio: "Test bio"
    }, "Add bio");

    // Test 3: Add social links (JSON object)
    await testSignup({
        full_name: "Test",
        username: "t3_" + Date.now(),
        role: "employee",
        social_links: { linkedin: "a", github: "b" }
    }, "Add social links");

    // Test 4: Add empty arrays
    await testSignup({
        full_name: "Test",
        username: "t4_" + Date.now(),
        role: "employee",
        job_titles: [],
        skills: []
    }, "Add empty arrays");
}

runTests();
