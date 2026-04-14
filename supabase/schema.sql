-- Project Management App Database Schema
-- Run this in Supabase SQL Editor

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
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
  client_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members (junction table)
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'project_manager', 'member')),
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

-- Row Level Security Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can insert profiles" ON profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Projects policies
CREATE POLICY "Everyone can view projects they are members of" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
);
CREATE POLICY "Admins can insert projects" ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update projects" ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete projects" ON projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Project members policies
CREATE POLICY "Members can view project membership" ON project_members FOR SELECT USING (true);
CREATE POLICY "Admins and PMs can manage project members" ON project_members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_members.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('admin', 'project_manager')
  )
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Tasks policies
CREATE POLICY "Project members can view tasks" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Project members can create tasks" ON tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "Task assignees and PMs can update tasks" ON tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "PMs and admins can delete tasks" ON tasks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = tasks.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('admin', 'project_manager')
  )
);

-- Tickets policies
CREATE POLICY "Project members can view tickets" ON tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
);
CREATE POLICY "Project members can create tickets" ON tickets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
);
CREATE POLICY "PMs and admins can update tickets" ON tickets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = tickets.project_id
    AND pm.user_id = auth.uid()
    AND pm.role IN ('admin', 'project_manager')
  )
  OR auth.uid() = requested_by
);

-- Functions

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get user's role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get user's projects
CREATE OR REPLACE FUNCTION get_user_projects(user_id UUID)
RETURNS TABLE (
  project_id UUID,
  project_name TEXT,
  project_status TEXT,
  member_role TEXT
) AS $$
  SELECT 
    p.id as project_id,
    p.name as project_name,
    p.status as project_status,
    pm.role as member_role
  FROM projects p
  JOIN project_members pm ON p.id = pm.project_id
  WHERE pm.user_id = $1;
$$ LANGUAGE sql SECURITY DEFINER;
