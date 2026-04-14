"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, Users, AlertCircle, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { Profile, UserRole } from "@/types";

export default function TeamPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [addDeveloperOpen, setAddDeveloperOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [developerForm, setDeveloperForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "employee" as UserRole,
  });

  const [clientForm, setClientForm] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    project_id: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchProjects();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");
    setUsers(data || []);
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, status")
      .order("name");
    setProjects(data || []);
  };

  const handleAddDeveloper = async () => {
    setSubmitting(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Call admin function to create user
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_username: developerForm.username,
      p_email: developerForm.email,
      p_password: developerForm.password,
      p_full_name: developerForm.full_name,
      p_role: developerForm.role,
      p_project_id: null
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Developer added successfully!' });
      setAddDeveloperOpen(false);
      setDeveloperForm({ username: "", email: "", password: "", full_name: "", role: "employee" });
      fetchUsers();
    }
    setSubmitting(false);
  };

  const handleAddClient = async () => {
    setSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('admin_create_user', {
      p_username: clientForm.username,
      p_email: clientForm.email,
      p_password: clientForm.password,
      p_full_name: clientForm.full_name,
      p_role: 'client',
      p_project_id: clientForm.project_id || null
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Client added successfully!' });
      setAddClientOpen(false);
      setClientForm({ username: "", email: "", password: "", full_name: "", project_id: "" });
      fetchUsers();
    }
    setSubmitting(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    // Delete from profiles (cascades to auth.users via trigger if set up)
    await supabase.from("profiles").delete().eq("id", userId);
    fetchUsers();
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(search.toLowerCase()) ||
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const developers = filteredUsers.filter(u => u.role !== 'client');
  const clients = filteredUsers.filter(u => u.role === 'client');

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "admin": return "bg-purple-500";
      case "project_manager": return "bg-blue-500";
      case "employee": return "bg-green-500";
      case "client": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">Manage team members and clients</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={addDeveloperOpen} onOpenChange={setAddDeveloperOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Developer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Developer</DialogTitle>
                <DialogDescription>Create a new developer or project manager account</DialogDescription>
              </DialogHeader>
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                  {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  {message.text}
                </div>
              )}
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dev_username">Username</Label>
                    <Input
                      id="dev_username"
                      value={developerForm.username}
                      onChange={(e) => setDeveloperForm({ ...developerForm, username: e.target.value })}
                      placeholder="johndoe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dev_full_name">Full Name</Label>
                    <Input
                      id="dev_full_name"
                      value={developerForm.full_name}
                      onChange={(e) => setDeveloperForm({ ...developerForm, full_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dev_email">Email</Label>
                  <Input
                    id="dev_email"
                    type="email"
                    value={developerForm.email}
                    onChange={(e) => setDeveloperForm({ ...developerForm, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dev_password">Password</Label>
                    <Input
                      id="dev_password"
                      type="password"
                      value={developerForm.password}
                      onChange={(e) => setDeveloperForm({ ...developerForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={developerForm.role}
                      onValueChange={(v) => setDeveloperForm({ ...developerForm, role: v as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Developer</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDeveloperOpen(false)}>Cancel</Button>
                <Button onClick={handleAddDeveloper} disabled={submitting || !developerForm.username || !developerForm.email || !developerForm.password}>
                  {submitting ? "Creating..." : "Create Developer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>Create a client account and optionally assign to a project</DialogDescription>
              </DialogHeader>
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
                  {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  {message.text}
                </div>
              )}
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_username">Username</Label>
                    <Input
                      id="client_username"
                      value={clientForm.username}
                      onChange={(e) => setClientForm({ ...clientForm, username: e.target.value })}
                      placeholder="clientname"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_full_name">Full Name</Label>
                    <Input
                      id="client_full_name"
                      value={clientForm.full_name}
                      onChange={(e) => setClientForm({ ...clientForm, full_name: e.target.value })}
                      placeholder="Client Name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="client@company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_password">Password</Label>
                    <Input
                      id="client_password"
                      type="password"
                      value={clientForm.password}
                      onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign to Project</Label>
                    <Select
                      value={clientForm.project_id}
                      onValueChange={(v) => setClientForm({ ...clientForm, project_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No project (can be assigned later)</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddClientOpen(false)}>Cancel</Button>
                <Button onClick={handleAddClient} disabled={submitting || !clientForm.username || !clientForm.email || !clientForm.password}>
                  {submitting ? "Creating..." : "Create Client"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'}`}>
          {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="project_manager">Project Manager</SelectItem>
            <SelectItem value="employee">Developer</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="developers">
        <TabsList>
          <TabsTrigger value="developers">
            Developers ({developers.length})
          </TabsTrigger>
          <TabsTrigger value="clients">
            Clients ({clients.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="developers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {developers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-lg">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{user.full_name}</CardTitle>
                        <CardDescription className="text-sm">@{user.username}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const newRole = user.role === 'project_manager' ? 'employee' : 'project_manager';
                          supabase.from('profiles').update({ role: newRole }).eq('id', user.id).then(() => fetchUsers());
                        }}>
                          {user.role === 'project_manager' ? 'Downgrade to Developer' : 'Promote to Project Manager'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                      {user.role === 'project_manager' ? 'Project Manager' : user.role === 'employee' ? 'Developer' : user.role}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {developers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No developers found</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-lg">
                          {user.full_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{user.full_name}</CardTitle>
                        <CardDescription className="text-sm">@{user.username}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge className="bg-orange-500 text-white">Client</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {clients.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No clients found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
