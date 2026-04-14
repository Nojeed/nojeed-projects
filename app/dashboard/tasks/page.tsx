"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CheckSquare, FolderKanban, Filter } from "lucide-react";
import Link from "next/link";
import type { Task, TaskStatus, TaskPriority } from "@/types";

const priorityColors: Record<TaskPriority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-400",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

const statusColors: Record<TaskStatus, string> = {
  todo: "bg-gray-500",
  in_progress: "bg-blue-500",
  in_review: "bg-yellow-500",
  done: "bg-green-500",
};

export default function TasksPage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("tasks")
      .select(`
        *,
        project:projects(name),
        assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)
      `)
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("project_members")
      .select("project_id, projects(id, name)")
      .eq("user_id", user.id);
    
    setProjects(data?.map(d => d.projects) || []);
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await supabase
      .from("tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", taskId);
    
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesProject = projectFilter === "all" || task.project_id === projectFilter;
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesProject && matchesSearch;
  });

  const groupedTasks = {
    todo: filteredTasks.filter(t => t.status === "todo"),
    in_progress: filteredTasks.filter(t => t.status === "in_progress"),
    in_review: filteredTasks.filter(t => t.status === "in_review"),
    done: filteredTasks.filter(t => t.status === "done"),
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground">Tasks assigned to you across all projects</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-[300px]"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-[200px]">
            <FolderKanban className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(["todo", "in_progress", "in_review", "done"] as TaskStatus[]).map((status) => (
              <div key={status} className="bg-muted/50 rounded-lg p-3 min-h-[300px]">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                  <h3 className="font-semibold text-sm capitalize">{status.replace('_', ' ')}</h3>
                  <Badge variant="secondary" className="ml-auto">{groupedTasks[status].length}</Badge>
                </div>
                <div className="space-y-2">
                  {groupedTasks[status].map((task) => (
                    <Card key={task.id}>
                      <CardContent className="p-3">
                        <Link href={`/dashboard/projects/${task.project_id}`}>
                          <p className="font-medium text-sm hover:underline">{task.title}</p>
                        </Link>
                        {task.project && (
                          <p className="text-xs text-muted-foreground mt-1">{task.project.name}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority]}`} />
                          <Select
                            value={task.status}
                            onValueChange={(v) => updateTaskStatus(task.id, v as TaskStatus)}
                          >
                            <SelectTrigger className="h-6 text-xs w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="in_review">In Review</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Task List</CardTitle>
              <CardDescription>All your tasks in a list view</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${statusColors[task.status]}`} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.project && (
                          <p className="text-sm text-muted-foreground">{task.project.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`px-2 py-1 rounded text-xs text-white ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </div>
                      <Select
                        value={task.status}
                        onValueChange={(v) => updateTaskStatus(task.id, v as TaskStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tasks assigned to you yet</p>
        </div>
      )}
    </div>
  );
}
