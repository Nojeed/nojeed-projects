-- Project Management App Database Schema
-- Run this in Supabase SQL Editor

-- Drop existing tables if recreating
DROP TABLE IF EXISTS client_projects CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'project_manager', 'employee', 'client')) DEFAULT 'employee',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')) DEFAULT 'active',
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members (junction table)
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_role TEXT NOT NULL CHECK (project_role IN ('admin', 'project_manager', 'member')) DEFAULT 'member',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'in_review', 'done')) DEFAULT 'todo',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets table (for client requests)
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('change_request', 'maintenance', 'bug', 'support')),
  status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  requested_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client projects (which projects a client can access)
CREATE TABLE client_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, project_id)
);

-- Row Level Security Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Projects policies
CREATE POLICY "Anyone can view projects they're members of" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM client_projects WHERE project_id = projects.id AND client_id = auth.uid())
);
CREATE POLICY "Admins can manage projects" ON projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Project members policies
CREATE POLICY "Anyone can view project membership" ON project_members FOR SELECT USING (true);
CREATE POLICY "PMs and admins can manage project members" ON project_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN profiles p ON pm.user_id = p.id
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND (pm.project_role IN ('admin', 'project_manager') OR p.role = 'admin')
  )
);

-- Tasks policies
CREATE POLICY "Project members can view tasks" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Project members can create tasks" ON tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Assignees and PMs can update tasks" ON tasks FOR UPDATE USING (
  assigned_to = auth.uid() OR
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = tasks.project_id
    AND pm.user_id = auth.uid()
    AND pm.project_role IN ('admin', 'project_manager')
  )
);

-- Tickets policies
CREATE POLICY "Project members can view tickets" ON tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
  OR requested_by = auth.uid()
);
CREATE POLICY "Project members can create tickets" ON tickets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
  OR requested_by = auth.uid()
);
CREATE POLICY "PMs and admins can update tickets" ON tickets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = tickets.project_id
    AND pm.user_id = auth.uid()
    AND pm.project_role IN ('admin', 'project_manager')
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Client projects policies
CREATE POLICY "Anyone can view client projects" ON client_projects FOR SELECT USING (true);
CREATE POLICY "Admins can manage client projects" ON client_projects FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Functions

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin function to create user (no email verification)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_username TEXT,
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_project_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Check if caller is admin (skip for now, will add auth check later)
  
  -- Check username uniqueness
  IF EXISTS (SELECT 1 FROM profiles WHERE username = p_username) THEN
    RAISE EXCEPTION 'Username already exists';
  END IF;

  -- Create auth user with auto-confirm
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('username', p_username, 'full_name', p_full_name, 'role', p_role)
  )
  RETURNING id INTO new_user_id;

  -- If client and project provided, assign to project
  IF p_role = 'client' AND p_project_id IS NOT NULL THEN
    INSERT INTO client_projects (client_id, project_id)
    VALUES (new_user_id, p_project_id);
  END IF;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
