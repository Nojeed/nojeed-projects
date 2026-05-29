import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Github, Linkedin, Globe, MapPin, Mail, Briefcase, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/auth/login");
    }

    // Fetch profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) {
        return <div className="p-6">Profile not found.</div>;
    }

    // Fetch junction tables details if they have role employee
    let jobTitles: { id: string, title: string }[] = [];
    let skills: { id: string, name: string }[] = [];

    if (profile.role === "employee" || profile.role === "project_manager") {
        const [{ data: pjt }, { data: pskills }] = await Promise.all([
            supabase.from("profile_job_titles").select("job_title:job_titles(id, title)").eq("profile_id", user.id),
            supabase.from("profile_skills").select("skill:skills(id, name)").eq("profile_id", user.id)
        ]);

        if (pjt) jobTitles = pjt.map((item: any) => {
            const jt = Array.isArray(item.job_title) ? item.job_title[0] : item.job_title;
            return { id: jt?.id, title: jt?.title };
        }).filter((x) => x.title);

        if (pskills) skills = pskills.map((item: any) => {
            const sk = Array.isArray(item.skill) ? item.skill[0] : item.skill;
            return { id: sk?.id, name: sk?.name };
        }).filter((x) => x.name);
    }

    const socialLinks = profile.social_links as { linkedin?: string; github?: string } | null;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
                <Link href="/dashboard/profile/edit" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full sm:w-auto gap-2">
                        <Edit className="h-4 w-4" />
                        Edit Profile
                    </Button>
                </Link>
            </div>

            <Card className="overflow-hidden border-none shadow-md">
                <div className="h-32 bg-primary/10"></div>
                <CardContent className="relative pt-0 sm:pt-0">
                    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                        <Avatar className="h-24 w-24 border-4 border-background -mt-12">
                            <AvatarImage src={profile.avatar_url || ""} />
                            <AvatarFallback className="text-3xl">
                                {profile.full_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-center sm:text-left mt-4 sm:mt-2">
                            <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                            <p className="text-muted-foreground capitalize flex items-center justify-center sm:justify-start gap-1">
                                <Briefcase className="h-4 w-4" />
                                {profile.role.replace('_', ' ')}
                            </p>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4 w-full">
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-full">
                                    <Mail className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{profile.email}</span>
                                </div>
                                {profile.portfolio_url && (
                                    <Link href={profile.portfolio_url} target="_blank" className="flex items-center gap-1.5 text-sm text-primary hover:underline max-w-full">
                                        <Globe className="h-4 w-4 shrink-0" />
                                        <span className="truncate">Portfolio</span>
                                    </Link>
                                )}
                                {socialLinks?.linkedin && (
                                    <Link href={socialLinks.linkedin} target="_blank" className="flex items-center gap-1.5 text-sm text-primary hover:underline max-w-full">
                                        <Linkedin className="h-4 w-4 shrink-0" />
                                        <span className="truncate">LinkedIn</span>
                                    </Link>
                                )}
                                {socialLinks?.github && (
                                    <Link href={socialLinks.github} target="_blank" className="flex items-center gap-1.5 text-sm text-primary hover:underline max-w-full">
                                        <Github className="h-4 w-4 shrink-0" />
                                        <span className="truncate">GitHub</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>About</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {profile.bio ? (
                                <p className="whitespace-pre-wrap text-muted-foreground">{profile.bio}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">No bio provided.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Job Titles</CardTitle>
                            <CardDescription>Professional roles and designations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {jobTitles.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {jobTitles.map((jt, idx) => (
                                        <Badge key={idx} variant="secondary" className="px-3 py-1">
                                            {jt.title}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No job titles associated.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Skills</CardTitle>
                            <CardDescription>Professional skills</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((sk, idx) => (
                                        <Badge key={idx} variant="outline" className="px-3 py-1">
                                            {sk.name}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No skills listed.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
