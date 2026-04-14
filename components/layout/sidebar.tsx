"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { UserRole, Profile } from "@/types";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "project_manager", "employee", "client"] },
  { title: "Projects", href: "/dashboard/projects", icon: FolderKanban, roles: ["admin", "project_manager"] },
  { title: "My Tasks", href: "/dashboard/tasks", icon: CheckSquare, roles: ["admin", "project_manager", "employee"] },
  { title: "My Projects", href: "/dashboard/my-projects", icon: FolderKanban, roles: ["client"] },
  { title: "Requests", href: "/dashboard/requests", icon: MessageSquare, roles: ["client"] },
  { title: "Team", href: "/dashboard/team", icon: Users, roles: ["admin"] },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["admin", "project_manager", "employee", "client"] },
];

interface SidebarProps {
  profile: Profile | null;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  const filteredNavItems = navItems.filter(
    (item) => profile && item.roles.includes(profile.role)
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FolderKanban className="h-4 w-4" />
        </div>
        <span className="font-semibold">Nojeed PM</span>
      </div>
      <Separator />
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <Separator />
      <div className="p-4">
        {profile && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback>
                {profile.full_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <SidebarContent />
      </aside>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="font-semibold">Nojeed PM</span>
      </header>
    </>
  );
}
