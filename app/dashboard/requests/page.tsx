"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare } from "lucide-react";
import type { Ticket, TicketType, TaskPriority } from "@/types";

const statusColors: Record<string, string> = {
  open: "bg-yellow-500",
  in_progress: "bg-blue-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const ticketTypeLabels: Record<TicketType, string> = {
  change_request: "Change Request",
  maintenance: "Maintenance",
  bug: "Bug Report",
  support: "Support",
};

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function RequestsPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    type: "change_request" as TicketType,
    priority: "medium" as TaskPriority,
  });

  useEffect(() => {
    fetchTickets();
    fetchProjects();
  }, []);

  const fetchTickets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tickets")
      .select(`
        *,
        project:projects(name)
      `)
      .eq("requested_by", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("client_id", user.id);
    setProjects(data || []);
  };

  const handleCreateRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !formData.title || !formData.description || !formData.project_id) return;

    const { data } = await supabase
      .from("tickets")
      .insert({
        project_id: formData.project_id,
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
      const project = projects.find(p => p.id === data.project_id);
      setTickets([{ ...data, project }, ...tickets]);
    }
    setRequestOpen(false);
    setFormData({ project_id: "", title: "", description: "", type: "change_request", priority: "medium" });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground">Track your change requests and support tickets</p>
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
                <Label>Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  placeholder="Detailed description..."
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button onClick={handleCreateRequest} disabled={!formData.title || !formData.description || !formData.project_id}>
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Requests
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
                      <div className="flex items-center gap-4 mt-2">
                        {ticket.project && (
                          <span className="text-xs text-muted-foreground">{ticket.project.name}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
