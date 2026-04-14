export type UserRole = 'admin' | 'project_manager' | 'employee' | 'client';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketType = 'change_request' | 'maintenance' | 'bug' | 'support';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  client_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'project_manager' | 'member';
  assigned_at: string;
  profile?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  created_by: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  assignee?: Profile;
  creator?: Profile;
  project?: { id: string; name: string };
}

export interface Ticket {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: TaskPriority;
  requested_by: string;
  assigned_to?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  assignee?: Profile;
  project?: { id: string; name: string };
}

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}
