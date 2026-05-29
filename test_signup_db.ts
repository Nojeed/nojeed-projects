import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const db = createClient(SUPABASE_URL, SERVICE_KEY);

async function diagnose() {
    // Get actual job title/skill IDs
    const { data: jts } = await db.from("job_titles").select("id, title");
    console.log("Job titles in DB:", jts);

    const { data: sks } = await db.from("skills").select("id, name");
    console.log("Skills in DB:", sks);

    const jtId = jts?.[0]?.id;
    if (!jtId) { console.log("No job titles found!"); return; }

    // Use raw fetch to get the FULL error response from Supabase Auth
    const ts = Date.now();
    console.log("\n=== Raw API test with job_titles ===");
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
        },
        body: JSON.stringify({
            email: `rawtest_${ts}@gmail.com`,
            password: "Password123!",
            email_confirm: true,
            user_metadata: {
                full_name: "Raw Test",
                username: `rawtest_${ts}`,
                role: "employee",
                job_titles: [jtId],
                skills: []
            }
        })
    });

    const body = await response.text();
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    console.log("Body:", body);

    // If user was created, clean up
    try {
        const parsed = JSON.parse(body);
        if (parsed.id) {
            await db.auth.admin.deleteUser(parsed.id);
            console.log("Cleaned up:", parsed.id);
        }
    } catch { }

    // Also test: what if we check the Supabase logs endpoint?
    console.log("\n=== Checking Supabase Postgres logs ===");
    const logsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_pg_stat_activity`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
        },
        body: '{}'
    });
    console.log("Logs endpoint:", logsResponse.status);
}

diagnose();
