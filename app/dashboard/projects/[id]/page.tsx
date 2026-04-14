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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, MoreHorizontal, UserPlus } from "lucide-react";
import Link from "next/link";
import type { Task, Profile, TaskStatus, TaskPriority } from "@/types";

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

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();
  
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [members, setMembers] = useState<any[]>([]);
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
  const [newMember, setNewMember] = useState({ user_id: "", role: "member" });

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchUsers();
    fetchMembers();
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        client:profiles!projects_client_id_fkey(full_name, email)
      `)
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
      .order("full_name");
    setUsers(data || []);
  };

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("project_members")
      .select(`
        *,
        profile:profiles(full_name, email, role, avatar_url)
      `)
      .eq("project_id", projectId);
    setMembers(data || []);
  };

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
        role: newMember.role,
      });

    if (!error) {
      fetchMembers();
    }
    setMemberDialogOpen(false);
    setNewMember({ user_id: "", role: "member" });
  };

  const getTasksByStatus = (status: TaskStatus) => 
    tasks.filter(t => t.status === status);

  if (loading || !project) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
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

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusColumns.map((column) => (
              <div
                key={column.id}
                className="bg-muted/50 rounded-lg p-2 min-h-[500px]"
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
                <ScrollArea className="h-[450px]">
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

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>User</Label>
                      <Select
                        value={newMember.user_id}
                        onValueChange={(v) => setNewMember({ ...newMember, user_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
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
                      <Label>Role</Label>
                      <Select
                        value={newMember.role}
                        onValueChange={(v) => setNewMember({ ...newMember, role: v })}
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
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{member.profile?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profile?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{member.profile?.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {member.role.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
