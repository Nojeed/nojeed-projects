import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderKanban, CheckSquare, MessageSquare, Users, ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isClient = profile?.role === "client";
  const isAdmin = profile?.role === "admin";
  const isDevOrPM = profile?.role === "employee" || profile?.role === "project_manager";

  // Fetch projects based on role
  let projectsList: any[] = [];
  if (isClient) {
    const { data } = await supabase
      .from("client_projects")
      .select("projects(id, name, status)")
      .eq("client_id", user.id);
    projectsList = (data || []).map((cp: any) => cp.projects).filter(Boolean);
  } else {
    const { data } = await supabase
      .from("project_members")
      .select("projects(id, name, status)")
      .eq("user_id", user.id);
    projectsList = (data || []).map((pm: any) => pm.projects).filter(Boolean);
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .neq("status", "done");

  // Fetch open requests scoped by role
  let openTickets: any[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("tickets")
      .select("*, project:projects(name), requester:profiles!tickets_requested_by_fkey(full_name)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(5);
    openTickets = data || [];
  } else if (isDevOrPM) {
    const memberProjectIds = projectsList.map((p: any) => p.id);
    if (memberProjectIds.length > 0) {
      const { data } = await supabase
        .from("tickets")
        .select("*, project:projects(name), requester:profiles!tickets_requested_by_fkey(full_name)")
        .in("project_id", memberProjectIds)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);
      openTickets = data || [];
    }
  } else if (isClient) {
    const { data } = await supabase
      .from("tickets")
      .select("*, project:projects(name)")
      .eq("requested_by", user.id)
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(5);
    openTickets = data || [];
  }

  const stats = {
    projects: projectsList.length,
    tasks: tasks?.length || 0,
    openRequests: openTickets.length,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const statusColors: Record<string, string> = {
    open: "bg-yellow-500",
    in_progress: "bg-blue-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, {profile?.full_name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your projects.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>

        {!isClient && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasks}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {isClient ? "My Open Requests" : "Open Requests"}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openRequests}</div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Your active projects</CardDescription>
          </CardHeader>
          <CardContent>
            {projectsList.length > 0 ? (
              <ul className="space-y-3">
                {projectsList.slice(0, 5).map((project: any) => (
                  <li key={project.id} className="flex items-center justify-between">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-sm text-muted-foreground capitalize">
                      {project.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No projects yet</p>
            )}
            {!isClient && (
              <Link href="/dashboard/projects" className="mt-4 block">
                <Button variant="ghost" className="w-full">
                  View all projects <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            {isClient && (
              <Link href="/dashboard/my-projects" className="mt-4 block">
                <Button variant="ghost" className="w-full">
                  View all projects <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {!isClient && openTickets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Open Client Requests
              </CardTitle>
              <CardDescription>Requests requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {openTickets.map((ticket: any) => (
                  <div key={ticket.id} className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ticket.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.project?.name} · by {ticket.requester?.full_name || "Client"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${statusColors[ticket.status] || "bg-gray-400"}`} />
                      <Badge variant="outline" className="text-xs capitalize">
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {isAdmin && (
                <Link href="/dashboard/projects" className="mt-4 block">
                  <Button variant="ghost" className="w-full">
                    Manage projects <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {!isClient && openTickets.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>Tasks assigned to you</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <ul className="space-y-3">
                  {tasks.slice(0, 5).map((task: any) => (
                    <li key={task.id} className="flex items-center justify-between">
                      <span className="font-medium truncate max-w-[200px]">{task.title}</span>
                      <span className="text-sm text-muted-foreground capitalize">
                        {task.status.replace("_", " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No pending tasks</p>
              )}
              <Link href="/dashboard/tasks" className="mt-4 block">
                <Button variant="ghost" className="w-full">
                  View all tasks <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {isClient && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/requests">
                <Button className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Submit a Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
