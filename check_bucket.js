// Script to check if avatars bucket is public
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data: bucket, error } = await db.storage.getBucket('avatars');
    if (error) {
        console.error("Error fetching bucket:", error.message);
    } else {
        console.log("Bucket details:", bucket);
    }
})();
