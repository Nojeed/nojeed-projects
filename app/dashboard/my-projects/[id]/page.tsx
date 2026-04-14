"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, MessageSquare, CheckSquare } from "lucide-react";
import Link from "next/link";
import type { Ticket, Task, TicketType, TaskPriority } from "@/types";

const ticketTypeLabels: Record<TicketType, string> = {
  change_request: "Change Request",
  maintenance: "Maintenance",
  bug: "Bug Report",
  support: "Support",
};

const statusColors: Record<string, string> = {
  open: "bg-yellow-500",
  in_progress: "bg-blue-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function ClientProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "change_request" as TicketType,
    priority: "medium" as TaskPriority,
  });

  useEffect(() => {
    fetchProject();
    fetchTickets();
    fetchTasks();
  }, [projectId]);

  const fetchProject = async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    setProject(data);
  };

  const fetchTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tickets")
      .select(`
        *,
        assignee:profiles!tickets_assigned_to_fkey(full_name)
      `)
      .eq("project_id", projectId)
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
  };

  const handleCreateRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !formData.title || !formData.description) return;

    const { data } = await supabase
      .from("tickets")
      .insert({
        project_id: projectId,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        requested_by: user.id,
        status: "open",
      })
      .select()
      .single();

    if (data) {
      setTickets([data, ...tickets]);
    }
    setRequestOpen(false);
    setFormData({ title: "", description: "", type: "change_request", priority: "medium" });
  };

  if (loading || !project) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/my-projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-muted-foreground">{project.description || "No description"}</p>
        </div>
        <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit a Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief summary of your request"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed description of your request..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as TicketType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="change_request">Change Request</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRequest} disabled={!formData.title || !formData.description}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">My Requests</TabsTrigger>
          <TabsTrigger value="progress">Project Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Your Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{ticket.title}</h4>
                            <Badge variant="secondary">{ticketTypeLabels[ticket.type]}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{ticket.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted on {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${statusColors[ticket.status]}`} />
                            <span className="text-sm capitalize">{ticket.status.replace('_', ' ')}</span>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs text-white ${priorityColors[ticket.priority]}`}>
                            {ticket.priority}
                          </div>
                        </div>
                      </div>
                      {ticket.resolution_notes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Resolution:</p>
                          <p className="text-sm text-muted-foreground">{ticket.resolution_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No requests submitted yet</p>
                  <p className="text-sm">Submit a request to make changes to your project</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Task Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{tasks.length}</p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status === "done").length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status === "in_progress").length}</p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-2xl font-bold">{tasks.filter(t => t.status === "todo").length}</p>
                  <p className="text-sm text-muted-foreground">To Do</p>
                </div>
              </div>

              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusColors[task.status]}`} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm capitalize text-muted-foreground">
                      {task.status.replace('_', ' ')}
                    </span>
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
