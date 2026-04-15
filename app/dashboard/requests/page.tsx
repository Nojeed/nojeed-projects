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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MessageSquare, CheckCircle, XCircle, MoreHorizontal, Filter } from "lucide-react";
import type { Ticket, TicketType, TaskPriority, TicketStatus, UserRole } from "@/types";

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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestOpen, setRequestOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    type: "change_request" as TicketType,
    priority: "medium" as TaskPriority,
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role as UserRole;
    setUserRole(role);

    await fetchProjects(user.id, role);
    await fetchTickets(user.id, role);
  };

  const fetchProjects = async (userId: string, role: UserRole) => {
    if (role === "client") {
      const { data } = await supabase
        .from("client_projects")
        .select("project_id, projects(id, name)")
        .eq("client_id", userId);
      setProjects((data || []).map((cp: any) => cp.projects).filter(Boolean));
    } else {
      const { data } = await supabase
        .from("project_members")
        .select("project_id, projects(id, name)")
        .eq("user_id", userId);
      setProjects((data || []).map((pm: any) => pm.projects).filter(Boolean));
    }
  };

  const fetchTickets = async (userId: string, role: UserRole) => {
    let query = supabase
      .from("tickets")
      .select(`
        *,
        project:projects(name),
        requester:profiles!tickets_requested_by_fkey(full_name, username),
        assignee:profiles!tickets_assigned_to_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (role === "client") {
      query = query.eq("requested_by", userId);
    } else if (role === "admin") {
      // admins see all (RLS allows this)
    } else {
      // PM / employee — filter by projects they're members of
      const { data: memberships } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", userId);
      const projectIds = (memberships || []).map((m: any) => m.project_id);
      if (projectIds.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }
      query = query.in("project_id", projectIds);
    }

    const { data } = await query;
    setTickets(data || []);
    setLoading(false);
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

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus, notes?: string) => {
    await supabase
      .from("tickets")
      .update({ status, resolution_notes: notes || null, updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    setTickets(prev =>
      prev.map(t => t.id === ticketId ? { ...t, status, resolution_notes: notes || t.resolution_notes } : t)
    );
    setResolutionOpen(false);
    setSelectedTicket(null);
    setResolutionNote("");
  };

  const isStaff = userRole === "admin" || userRole === "project_manager" || userRole === "employee";

  const filteredTickets = tickets.filter(t =>
    statusFilter === "all" || t.status === statusFilter
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isStaff ? "Client Requests" : "My Requests"}
          </h1>
          <p className="text-muted-foreground">
            {isStaff
              ? "Manage and respond to client requests across your projects"
              : "Track your change requests and support tickets"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {userRole === "client" && (
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
                      <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
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
                    <Label htmlFor="req-title">Title</Label>
                    <Input
                      id="req-title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Brief summary of your request"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="req-desc">Description</Label>
                    <Textarea
                      id="req-desc"
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
                  <Button
                    onClick={handleCreateRequest}
                    disabled={!formData.title || !formData.description || !formData.project_id}
                  >
                    Submit Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats row for staff */}
      {isStaff && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["open", "in_progress", "resolved", "closed"] as TicketStatus[]).map((s) => (
            <Card
              key={s}
              className={`cursor-pointer transition-all ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${statusColors[s]}`} />
                <div>
                  <p className="text-2xl font-bold">{tickets.filter(t => t.status === s).length}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.replace("_", " ")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {filteredTickets.length > 0
              ? `${filteredTickets.length} Request${filteredTickets.length !== 1 ? "s" : ""}${statusFilter !== "all" ? ` — ${statusFilter.replace("_", " ")}` : ""}`
              : "Requests"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTickets.length > 0 ? (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium">{ticket.title}</h4>
                        <Badge variant="secondary">{ticketTypeLabels[ticket.type]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{ticket.description}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {(ticket as any).project && (
                          <span className="text-xs text-muted-foreground font-medium">
                            📁 {(ticket as any).project.name}
                          </span>
                        )}
                        {isStaff && (ticket as any).requester && (
                          <span className="text-xs text-muted-foreground">
                            by {(ticket as any).requester.full_name}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {ticket.resolution_notes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Resolution:</p>
                          <p className="text-sm text-muted-foreground">{ticket.resolution_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[ticket.status]}`} />
                        <span className="text-sm capitalize">{ticket.status.replace("_", " ")}</span>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs text-white ${priorityColors[ticket.priority]}`}>
                        {ticket.priority}
                      </div>
                      {/* Staff actions */}
                      {isStaff && ticket.status !== "closed" && ticket.status !== "resolved" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <MoreHorizontal className="h-3 w-3 mr-1" />
                              Update
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ticket.status === "open" && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, "in_progress")}>
                                Mark In Progress
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => {
                              setSelectedTicket(ticket);
                              setResolutionOpen(true);
                            }}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              Resolve
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(ticket.id, "closed")}>
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
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>{statusFilter !== "all" ? `No ${statusFilter.replace("_", " ")} requests` : "No requests yet"}</p>
              {userRole === "client" && statusFilter === "all" && (
                <p className="text-sm mt-1">Submit a request to get started</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolution dialog */}
      <Dialog open={resolutionOpen} onOpenChange={setResolutionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{selectedTicket?.title}</p>
            <div className="space-y-2">
              <Label htmlFor="resolution-notes">Resolution Notes</Label>
              <Textarea
                id="resolution-notes"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Describe what was done to resolve this request..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolutionOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedTicket && handleUpdateStatus(selectedTicket.id, "resolved", resolutionNote)}
              disabled={!resolutionNote}
            >
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
