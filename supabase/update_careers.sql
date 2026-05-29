-- Update profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB;

-- Wait, creating tables if they do not exist
CREATE TABLE IF NOT EXISTS job_titles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_job_titles (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  job_title_id UUID REFERENCES job_titles(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, job_title_id)
);

CREATE TABLE IF NOT EXISTS profile_skills (
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, skill_id)
);

-- RLS
ALTER TABLE job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

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

-- Policies for profile_skills
DROP POLICY IF EXISTS "Anyone can view profile_skills" ON profile_skills;
CREATE POLICY "Anyone can view profile_skills" ON profile_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own profile_skills" ON profile_skills;
CREATE POLICY "Users can manage own profile_skills" ON profile_skills FOR ALL USING (profile_id = auth.uid());

-- Note: We assume policies are already created from previous runs, we can recreate safely
-- Auto-create profile on user signup update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  final_username TEXT;
BEGIN
  -- We parse username securely, defaulting to pseudo-random string
  final_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 6)
  );

  INSERT INTO public.profiles (id, username, email, full_name, role, bio, portfolio_url, social_links, phone)
  VALUES (
    NEW.id,
    final_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'portfolio_url',
    NEW.raw_user_meta_data->'social_links',
    NEW.raw_user_meta_data->>'phone'
  );

  -- Insert Job Titles (Checking that array length > 0 securely)
  IF jsonb_typeof(NEW.raw_user_meta_data->'job_titles') = 'array' AND jsonb_array_length(NEW.raw_user_meta_data->'job_titles') > 0 THEN
    INSERT INTO profile_job_titles (profile_id, job_title_id)
    SELECT NEW.id, t.val::uuid
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'job_titles') AS t(val)
    WHERE t.val != '';
  END IF;

  -- Insert Skills (Checking that array length > 0 securely)
  IF jsonb_typeof(NEW.raw_user_meta_data->'skills') = 'array' AND jsonb_array_length(NEW.raw_user_meta_data->'skills') > 0 THEN
    INSERT INTO profile_skills (profile_id, skill_id)
    SELECT NEW.id, t.val::uuid
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data->'skills') AS t(val)
    WHERE t.val != '';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
