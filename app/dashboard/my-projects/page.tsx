"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { FolderKanban, ArrowRight, CheckSquare, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function MyProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select(`
        *,
        project_members(
          role,
          profiles(full_name)
        ),
        tasks(count),
        tickets(count)
      `)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    setProjects(data || []);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "on_hold":
        return "bg-yellow-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
        <p className="text-muted-foreground">View and track your projects</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || "No description"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                  <span className="text-sm capitalize">{project.status.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckSquare className="h-4 w-4" />
                  <span>{project.tasks?.[0]?.count || 0} tasks</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>{project.tickets?.[0]?.count || 0} requests</span>
                </div>
              </div>

              <Link href={`/dashboard/my-projects/${project.id}`}>
                <Button className="w-full">
                  View Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No projects assigned to you yet</p>
        </div>
      )}
    </div>
  );
}
