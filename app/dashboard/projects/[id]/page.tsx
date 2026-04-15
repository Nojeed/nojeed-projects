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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, MoreHorizontal, UserPlus, Users, Shield, UserCog, UserMinus, CheckCircle, XCircle, MessageSquare, Pencil, Trash2, ChevronRight, Calendar, User, Flag } from "lucide-react";
import Link from "next/link";
import type { Task, Profile, TaskStatus, TaskPriority, ProjectRole, Ticket, TicketStatus } from "@/types";

const ticketStatusColors: Record<string, string> = {
  open: "bg-yellow-500",
  in_progress: "bg-blue-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const ticketTypeLabels: Record<string, string> = {
  change_request: "Change Request",
  maintenance: "Maintenance",
  bug: "Bug Report",
  support: "Support",
};

const priorityTicketColors: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
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
    fetchTickets();
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

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select(`
        *,
        requester:profiles!tickets_requested_by_fkey(full_name, username),
        assignee:profiles!tickets_assigned_to_fkey(full_name)
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTickets(data || []);
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: TicketStatus, notes?: string) => {
    await supabase
      .from("tickets")
      .update({ status, resolution_notes: notes || null, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    fetchTickets();
    setResolutionDialogOpen(false);
    setSelectedTicket(null);
    setResolutionNote("");
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

  const handleEditTask = async () => {
    if (!selectedTask || !taskForm.title) return;
    const { data } = await supabase
      .from("tasks")
      .update({
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTask.id)
      .select()
      .single();

    if (data) {
      const assignee = users.find(u => u.id === taskForm.assigned_to);
      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...data, assignee } : t));
      if (detailSheetOpen) setSelectedTask({ ...data, assignee });
    }
    setEditTaskOpen(false);
    setSelectedTask(null);
    setTaskForm({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    if (detailSheetOpen && selectedTask?.id === taskId) {
      setDetailSheetOpen(false);
      setSelectedTask(null);
    }
  };

  const handleChangeTaskStatus = async (taskId: string, status: TaskStatus) => {
    await supabase
      .from("tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", taskId);
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, status } : prev);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assigned_to: task.assigned_to || "",
      due_date: task.due_date || "",
    });
    setEditTaskOpen(true);
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
    <>
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
            <DialogContent aria-describedby={undefined}>
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
              <TabsTrigger value="requests" className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Requests
                {tickets.filter(t => t.status === 'open').length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                    {tickets.filter(t => t.status === 'open').length}
                  </span>
                )}
              </TabsTrigger>
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
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div
                                  className="flex-1 min-w-0"
                                  onClick={() => { setSelectedTask(task); setDetailSheetOpen(true); }}
                                >
                                  <p className="font-medium text-sm truncate">{task.title}</p>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => e.stopPropagation()}>
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => { setSelectedTask(task); setDetailSheetOpen(true); }}>
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                      <Pencil className="mr-2 h-3 w-3" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <ChevronRight className="mr-2 h-3 w-3" /> Change Status
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {statusColumns.map(col => (
                                          <DropdownMenuItem
                                            key={col.id}
                                            disabled={task.status === col.id}
                                            onClick={() => handleChangeTaskStatus(task.id, col.id)}
                                          >
                                            <div className={`w-2 h-2 rounded-full mr-2 ${col.color}`} />
                                            {col.title}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                                    </DropdownMenuItem>
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
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => { setSelectedTask(task); setDetailSheetOpen(true); }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${statusColumns.find(c => c.id === task.status)?.color}`} />
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs text-white ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); setSelectedTask(task); setDetailSheetOpen(true); }}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={e => { e.stopPropagation(); openEditDialog(task); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger onClick={e => e.stopPropagation()}>
                                  <ChevronRight className="mr-2 h-4 w-4" /> Change Status
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {statusColumns.map(col => (
                                    <DropdownMenuItem
                                      key={col.id}
                                      disabled={task.status === col.id}
                                      onClick={e => { e.stopPropagation(); handleChangeTaskStatus(task.id, col.id); }}
                                    >
                                      <div className={`w-2 h-2 rounded-full mr-2 ${col.color}`} />
                                      {col.title}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="requests" className="flex-1 mt-4 overflow-auto">
              {tickets.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No client requests yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{ticket.title}</h4>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">{ticketTypeLabels[ticket.type]}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{ticket.description}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              by {(ticket as any).requester?.full_name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {ticket.resolution_notes && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <span className="font-medium">Resolution: </span>{ticket.resolution_notes}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${ticketStatusColors[ticket.status]}`} />
                            <span className="text-sm capitalize">{ticket.status.replace('_', ' ')}</span>
                          </div>
                          <div className={`px-2 py-0.5 rounded text-xs text-white ${priorityTicketColors[ticket.priority]}`}>
                            {ticket.priority}
                          </div>
                          {canManageMembers && ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  Update Status
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ticket.status === 'open' && (
                                  <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'in_progress')}>
                                    Mark In Progress
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTicket(ticket);
                                  setResolutionDialogOpen(true);
                                }}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Resolve
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleUpdateTicketStatus(ticket.id, 'closed')}>
                                  <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                                  Close
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resolution Dialog */}
              <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resolve Request</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">{selectedTicket?.title}</p>
                    <div className="space-y-2">
                      <Label htmlFor="resolution">Resolution Notes</Label>
                      <Textarea
                        id="resolution"
                        value={resolutionNote}
                        onChange={(e) => setResolutionNote(e.target.value)}
                        placeholder="Describe what was done to resolve this request..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setResolutionDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => selectedTicket && handleUpdateTicketStatus(selectedTicket.id, 'resolved', resolutionNote)}
                      disabled={!resolutionNote}
                    >
                      Mark as Resolved
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

      {/* ── Task Detail Sheet ── */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen} modal={false}>
        <SheetContent aria-describedby={undefined} className="w-[420px] sm:w-[500px] overflow-y-auto sm:max-w-xl p-8">
          {selectedTask && (
            <div className="py-2">
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl leading-snug">{selectedTask.title}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5">
                {/* Status + Priority row */}
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusColumns.find(c => c.id === selectedTask.status)?.color}`} />
                      <span className="text-sm font-medium capitalize">{selectedTask.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div className="flex-1 rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">Priority</p>
                    <div className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${priorityColors[selectedTask.priority]}`}>
                      <Flag className="h-3 w-3 mr-1 mt-0.5" />
                      {selectedTask.priority}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                <Separator />

                {/* Assignee */}
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assignee</p>
                    <p className="text-sm font-medium">
                      {selectedTask.assignee ? (selectedTask.assignee as any).full_name : "Unassigned"}
                    </p>
                  </div>
                </div>

                {/* Due Date */}
                {selectedTask.due_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className="text-sm font-medium">{new Date(selectedTask.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Change Status Select */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Change Status</p>
                  <Select 
                    value={selectedTask.status} 
                    onValueChange={(v) => handleChangeTaskStatus(selectedTask.id, v as TaskStatus)}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusColumns.find(c => c.id === selectedTask.status)?.color}`} />
                        <span className="capitalize">{selectedTask.status.replace('_', ' ')}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {statusColumns.map(col => (
                        <SelectItem key={col.id} value={col.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.color}`} />
                            {col.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setDetailSheetOpen(false); openEditDialog(selectedTask); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Task
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div >
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit Task Dialog ── */}
      <Dialog open={editTaskOpen} onOpenChange={open => { setEditTaskOpen(open); if (!open) { setSelectedTask(null); setTaskForm({ title: "", description: "", priority: "medium", assigned_to: "", due_date: "" }); } }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Task description"
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskForm.priority} onValueChange={v => setTaskForm({ ...taskForm, priority: v as TaskPriority })}>
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
                <Select value={taskForm.assigned_to || "none"} onValueChange={v => setTaskForm({ ...taskForm, assigned_to: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-due">Due Date</Label>
              <Input
                id="edit-due"
                type="date"
                value={taskForm.due_date}
                onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTask} disabled={!taskForm.title}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
