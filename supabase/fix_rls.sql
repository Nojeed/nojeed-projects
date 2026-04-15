-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view projects they're members of" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Anyone can view project membership" ON project_members;
DROP POLICY IF EXISTS "PMs and admins can manage project members" ON project_members;
DROP POLICY IF EXISTS "Project members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Assignees and PMs can update tasks" ON tasks;
DROP POLICY IF EXISTS "Project members can view tickets" ON tickets;
DROP POLICY IF EXISTS "Project members can create tickets" ON tickets;
DROP POLICY IF EXISTS "PMs and admins can update tickets" ON tickets;
DROP POLICY IF EXISTS "Anyone can view client projects" ON client_projects;
DROP POLICY IF EXISTS "Admins can manage client projects" ON client_projects;

-- Profiles policies - simpler version
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "projects_select" ON projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = projects.id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM client_projects WHERE project_id = projects.id AND client_id = auth.uid())
);
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Project members policies - without referencing profiles.role
CREATE POLICY "project_members_select" ON project_members FOR SELECT USING (true);
CREATE POLICY "project_members_insert" ON project_members FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT pm.user_id FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.project_role IN ('admin', 'project_manager')
    UNION
    SELECT p.id FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
CREATE POLICY "project_members_update" ON project_members FOR UPDATE USING (
  auth.uid() IN (
    SELECT pm.user_id FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.project_role IN ('admin', 'project_manager')
    UNION
    SELECT p.id FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);
CREATE POLICY "project_members_delete" ON project_members FOR DELETE USING (
  auth.uid() IN (
    SELECT pm.user_id FROM project_members pm WHERE pm.project_id = project_members.project_id AND pm.project_role IN ('admin', 'project_manager')
    UNION
    SELECT p.id FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- Tasks policies
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid())
);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  assigned_to = auth.uid() OR
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tasks.project_id AND user_id = auth.uid() AND project_role IN ('admin', 'project_manager'))
);

-- Tickets policies
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
  OR requested_by = auth.uid()
);
CREATE POLICY "tickets_insert" ON tickets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
  OR requested_by = auth.uid()
);
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid() AND project_role IN ('admin', 'project_manager'))
  OR requested_by = auth.uid()
);

-- Client projects policies
CREATE POLICY "client_projects_select" ON client_projects FOR SELECT USING (true);
CREATE POLICY "client_projects_insert" ON client_projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "client_projects_delete" ON client_projects FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
