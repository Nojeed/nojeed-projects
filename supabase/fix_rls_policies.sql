-- Run this in Supabase SQL Editor to fix the signup error
-- The issue: RLS was enabled on profile_job_titles and profile_skills
-- but NO policies existed, blocking ALL inserts (including from the trigger)

-- Policies for job_titles and skills (readable by everyone)
DROP POLICY IF EXISTS "Anyone can view job_titles" ON job_titles;
CREATE POLICY "Anyone can view job_titles" ON job_titles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view skills" ON skills;
CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true);

-- Policies for profile_job_titles
DROP POLICY IF EXISTS "Anyone can view profile_job_titles" ON profile_job_titles;
CREATE POLICY "Anyone can view profile_job_titles" ON profile_job_titles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile_job_titles" ON profile_job_titles;
CREATE POLICY "Users can manage own profile_job_titles" ON profile_job_titles FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Service role bypass profile_job_titles" ON profile_job_titles;
CREATE POLICY "Service role bypass profile_job_titles" ON profile_job_titles FOR ALL USING (true) WITH CHECK (true);

-- Policies for profile_skills
DROP POLICY IF EXISTS "Anyone can view profile_skills" ON profile_skills;
CREATE POLICY "Anyone can view profile_skills" ON profile_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile_skills" ON profile_skills;
CREATE POLICY "Users can manage own profile_skills" ON profile_skills FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Service role bypass profile_skills" ON profile_skills;
CREATE POLICY "Service role bypass profile_skills" ON profile_skills FOR ALL USING (true) WITH CHECK (true);
