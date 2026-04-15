-- Fix tickets RLS so admins can see ALL tickets (needed for admin dashboard)
-- and so clients can INSERT tickets for projects they're assigned to via client_projects.
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- TICKETS — drop current policies and recreate with admin bypass
-- ============================================================

DROP POLICY IF EXISTS "tickets_select" ON tickets;
DROP POLICY IF EXISTS "tickets_insert" ON tickets;
DROP POLICY IF EXISTS "tickets_update" ON tickets;
DROP POLICY IF EXISTS "tickets_delete" ON tickets;

-- Admins can see all tickets; project members can see tickets in their projects;
-- clients can see their own tickets.
CREATE POLICY "tickets_select" ON tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
  OR requested_by = auth.uid()
);

-- Clients can submit tickets for projects they are assigned to via client_projects;
-- project members can also create tickets.
CREATE POLICY "tickets_insert" ON tickets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM client_projects WHERE project_id = tickets.project_id AND client_id = auth.uid())
  OR EXISTS (SELECT 1 FROM project_members WHERE project_id = tickets.project_id AND user_id = auth.uid())
);

-- Admins and PMs can update any ticket in their projects; clients can update their own.
CREATE POLICY "tickets_update" ON tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = tickets.project_id
    AND user_id = auth.uid()
    AND project_role IN ('admin', 'project_manager')
  )
  OR requested_by = auth.uid()
);

-- Only admins and PMs can delete tickets.
CREATE POLICY "tickets_delete" ON tickets FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  OR EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = tickets.project_id
    AND user_id = auth.uid()
    AND project_role IN ('admin', 'project_manager')
  )
);
