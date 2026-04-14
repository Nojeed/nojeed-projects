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

  const { data: projects } = await supabase
    .from("project_members")
    .select(`
      projects (
        id, name, status
      )
    `)
    .eq("user_id", user.id);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .neq("status", "done");

  const stats = {
    projects: projects?.length || 0,
    tasks: tasks?.length || 0,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
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

        {profile?.role !== "client" && (
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

        {profile?.role === "client" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        )}

        {profile?.role === "admin" && (
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
            {projects && projects.length > 0 ? (
              <ul className="space-y-3">
                {projects.slice(0, 5).map((member: any) => (
                  <li key={member.projects?.id} className="flex items-center justify-between">
                    <span className="font-medium">{member.projects?.name}</span>
                    <span className="text-sm text-muted-foreground capitalize">
                      {member.projects?.status}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No projects yet</p>
            )}
            {profile?.role !== "client" && (
              <Link href="/dashboard/projects" className="mt-4 block">
                <Button variant="ghost" className="w-full">
                  View all projects <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
            {profile?.role === "client" && (
              <Link href="/dashboard/my-projects" className="mt-4 block">
                <Button variant="ghost" className="w-full">
                  View all projects <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {profile?.role !== "client" && (
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
                        {task.status.replace('_', ' ')}
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

        {profile?.role === "client" && (
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/requests/new">
                <Button className="w-full justify-start">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Request Changes
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
