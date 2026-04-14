import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FolderKanban, Users, CheckSquare, MessageSquare, ArrowRight } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
        <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
          <div className="flex gap-5 items-center font-semibold">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FolderKanban className="h-4 w-4" />
              </div>
              <span>Nojeed PM</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <section className="py-24 px-5 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Project Management for{" "}
              <span className="text-primary">Developers</span> &{" "}
              <span className="text-primary">Clients</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Collaborate seamlessly with your team, track progress with Kanban boards,
              and keep clients informed every step of the way.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/sign-up">
                <Button size="lg">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-5 bg-muted/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 bg-background rounded-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Project Management</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage projects with team members and clients
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Kanban Boards</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize tasks with drag-and-drop Kanban boards
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Assign tasks, manage roles, and track team progress
                </p>
              </div>
              <div className="p-6 bg-background rounded-lg">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Client Portal</h3>
                <p className="text-sm text-muted-foreground">
                  Clients can view progress and submit change requests
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-5 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8">
              Create your free account and start managing projects better today.
            </p>
            <Link href="/auth/sign-up">
              <Button size="lg">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="w-full flex items-center justify-center border-t py-8 text-sm text-muted-foreground">
        <p>Nojeed Project Management</p>
      </footer>
    </div>
  );
}
