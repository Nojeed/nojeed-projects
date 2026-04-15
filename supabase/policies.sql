-- Complete RLS Policies for Nojeed PM
-- Run this in Supabase SQL Editor

-- ============================================
-- PROFILES
-- ============================================

-- Everyone can read profiles (needed for user lookup)
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Admins can manage all profiles (insert/delete handled via admin functions)
DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================
-- PROJECTS
-- ============================================

-- Anyone logged in can view projects they're a member of OR assigned as client
DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM client_projects WHERE project_id = projects.id AND client_id = auth.uid())
);

-- Only admins can create/update/delete projects
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================
-- PROJECT MEMBERS
-- ============================================

-- Everyone can view project membership
DROP POLICY IF EXISTS "project_members_select" ON projects;
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (true);

-- Admins can add/remove any member
DROP POLICY IF EXISTS "project_members_insert_admin" ON project_members;
CREATE POLICY "project_members_insert_admin" ON project_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "project_members_delete_admin" ON project_members;
CREATE POLICY "project_members_delete_admin" ON project_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Project managers can add/remove members within their projects
DROP POLICY IF EXISTS "project_members_insert_pm" ON project_members;
CREATE POLICY "project_members_insert_pm" ON project_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_members.project_id 
    AND user_id = auth.uid() 
    AND project_role IN ('admin', 'project_manager')
  )
);

DROP POLICY IF EXISTS "project_members_update_pm" ON project_members;
CREATE POLICY "project_members_update_pm" ON project_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_members.project_id 
    AND user_id = auth.uid() 
    AND project_role IN ('admin', 'project_manager')
  )
);

DROP POLICY IF EXISTS "project_members_delete_pm" ON project_members;
CREATE POLICY "project_members_delete_pm" ON project_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = project_members.project_id 
    AND user_id = auth.uid() 
    AND project_role IN ('admin', 'project_manager')
  )
);


-- ============================================
-- CLIENT PROJECTS
-- ============================================

-- Everyone can view which clients have access to which projects
DROP POLICY IF EXISTS "client_projects_select" ON client_projects;
CREATE POLICY "client_projects_select" ON client_projects FOR SELECT USING (true);

-- Only admins can assign clients to projects
DROP POLICY IF EXISTS "client_projects_insert" ON client_projects;
CREATE POLICY "client_projects_insert" ON client_projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "client_projects_delete" ON client_projects;
CREATE POLICY "client_projects_delete" ON client_projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ============================================
-- TASKS
-- ============================================

-- Project members can view tasks in their projects
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);

-- Project members can create tasks
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);

-- Assignees can update their own tasks, PMs can update any task in their projects
DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = tasks.project_id 
    AND user_id = auth.uid() 
    AND project_role IN ('admin', 'project_manager')
  )
);

-- Only PMs can delete tasks
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = tasks.project_id 
    AND user_id = auth.uid() 
    AND project_role IN ('admin', 'project_manager')
  )
);


-- ============================================
-- TICKETS (Client Requests)
-- ============================================

-- Project members can view tickets, clients can view their own requests
DROP POLICY IF EXISTS "tickets_select" ON tickets;
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
  OR requested_by = auth.uid()
);

-- Clients can create tickets for projects they're assigned to
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
CREATE POLICY "tickets_insert" ON tickets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM client_projects WHERE project_id = tickets.project_id AND client_id = auth.uid())
  OR EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
);

-- PMs can update tickets, clients can update their own (cancel/clarify)
DROP POLICY IF EXISTS "tickets_update" ON tickets;
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = tickets.project_id 
    AND user_id = auth.uid() 
    AND project_role IN ('admin', 'project_manager')
  )
  OR requested_by = auth.uid()
);
