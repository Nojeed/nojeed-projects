const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
    const { data } = await db.from('profiles').select('id, full_name, avatar_url').not('avatar_url', 'is', null);
    console.log('Avatar URL data:', data);
    process.exit(0);
})();
