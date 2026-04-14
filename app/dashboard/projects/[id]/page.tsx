"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, MoreHorizontal, UserPlus, Users, Shield, UserCog, UserMinus, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import type { Task, Profile, TaskStatus, TaskPriority, ProjectRole } from "@/types";

const statusColumns: { id: TaskStatus; title: string; color: string }[] = [
  { id: "todo", title: "To Do", color: "bg-gray-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "in_review", title: "In Review", color: "bg-yellow-500" },
  { id: "done", title: "Done", color: "bg-green-500" },
];

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const projectRoleColors: Record<ProjectRole, string> = {
  admin: "bg-purple-500",
  project_manager: "bg-blue-500",
  member: "bg-green-500",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();
  
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assigned_to: "",
    due_date: "",
  });
  const [newMember, setNewMember] = useState({ user_id: "", project_role: "member" as ProjectRole });

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchUsers();
    fetchMembers();
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    setProject(data);
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select(`
        *,
        assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url),
        creator:profiles!tasks_created_by_fkey(full_name)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("role", ["admin", "project_manager", "employee"])
      .order("full_name");
    setUsers(data || []);
  };

  const fetchMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: membersData } = await supabase
      .from("project_members")
      .select(`
        *,
        profile:profiles(id, full_name, username, email, avatar_url, role)
      `)
      .eq("project_id", projectId);

    if (user && membersData) {
      const currentMember = membersData.find(m => m.user_id === user.id);
      setCurrentUserRole(currentMember?.project_role || null);
    }
    
    setMembers(membersData || []);
  };

  const canManageMembers = currentUserRole === 'admin' || currentUserRole === 'project_manager';

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.status === status) {
      setDraggedTask(null);
      return;
    }

    await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", draggedTask.id);

    setTasks(tasks.map(t => 
      t.id === draggedTask.id ? { ...t, status } : t
    ));
    setDraggedTask(null);
  };

  const handleCreateTask = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !taskForm.title) return;

    const { data } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null,
        created_by: user.id,
        status: "todo",
      })
      .select()
      .single();

    if (data) {
      const assignee = users.find(u => u.id === taskForm.assigned_to);
      setTasks([{ ...data, assignee }, ...tasks]);
    }
    setTaskDialogOpen(false);
    setTaskForm({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });
  };

  const handleAddMember = async () => {
    if (!newMember.user_id) return;

    const { error } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: newMember.user_id,
        project_role: newMember.project_role,
      });

    if (!error) {
      fetchMembers();
    }
    setMemberDialogOpen(false);
    setNewMember({ user_id: "", project_role: "member" });
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: ProjectRole) => {
    await supabase
      .from("project_members")
      .update({ project_role: newRole })
      .eq("id", memberId);
    fetchMembers();
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member from the project?")) return;
    
    await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);
    fetchMembers();
  };

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(t => t.status === status);

  if (loading || !project) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Main Content - Kanban Board */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-muted-foreground">{project.description || "No description"}</p>
          </div>
          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Task description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={taskForm.priority}
                      onValueChange={(v) => setTaskForm({ ...taskForm, priority: v as TaskPriority })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select
                      value={taskForm.assigned_to}
                      onValueChange={(v) => setTaskForm({ ...taskForm, assigned_to: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateTask} disabled={!taskForm.title}>Create Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="kanban" className="h-full flex flex-col">
            <TabsList>
              <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
              <TabsTrigger value="list">List View</TabsTrigger>
            </TabsList>

            <TabsContent value="kanban" className="flex-1 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
                {statusColumns.map((column) => (
                  <div
                    key={column.id}
                    className="bg-muted/50 rounded-lg p-2 min-h-[400px]"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, column.id)}
                  >
                    <div className="flex items-center gap-2 mb-3 px-2">
                      <div className={`w-2 h-2 rounded-full ${column.color}`} />
                      <h3 className="font-semibold text-sm">{column.title}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {getTasksByStatus(column.id).length}
                      </Badge>
                    </div>
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2">
                        {getTasksByStatus(column.id).map((task) => (
                          <Card
                            key={task.id}
                            className="cursor-grab hover:shadow-md transition-shadow"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{task.title}</p>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                                  <span className="text-xs capitalize">{task.priority}</span>
                                </div>
                                {task.assignee && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {task.assignee.full_name?.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="flex-1 mt-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${statusColumns.find(c => c.id === task.status)?.color}`} />
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded text-xs text-white ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sidebar - Team Members */}
      <div className="w-80 border-l bg-card rounded-lg p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team ({members.length})
          </h2>
          {canManageMembers && (
            <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Developer</Label>
                    <Select
                      value={newMember.user_id}
                      onValueChange={(v) => setNewMember({ ...newMember, user_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select developer" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter(u => !members.some(m => m.user_id === u.id))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.role})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project Role</Label>
                    <Select
                      value={newMember.project_role}
                      onValueChange={(v) => setNewMember({ ...newMember, project_role: v as ProjectRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddMember} disabled={!newMember.user_id}>Add Member</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="p-3 rounded-lg border bg-background">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {member.profile?.full_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{member.profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{member.profile?.username}</p>
                    </div>
                  </div>
                  {canManageMembers && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.project_role === 'member' && (
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'project_manager')}>
                            <Shield className="mr-2 h-4 w-4" />
                            Promote to PM
                          </DropdownMenuItem>
                        )}
                        {member.project_role === 'project_manager' && (
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'member')}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Downgrade to Member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove from Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-2">
                  <Badge 
                    className={`${projectRoleColors[member.project_role as ProjectRole]} text-white text-xs`}
                  >
                    {member.project_role === 'project_manager' ? 'Project Manager' : 'Member'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
