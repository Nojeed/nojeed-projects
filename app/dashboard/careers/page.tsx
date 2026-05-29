"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Code } from "lucide-react";
import type { JobTitle, Skill, Profile } from "@/types";

export default function CareersPage() {
    const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [newJobTitle, setNewJobTitle] = useState("");
    const [newSkill, setNewSkill] = useState("");
    const [loadingTitle, setLoadingTitle] = useState(false);
    const [loadingSkill, setLoadingSkill] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        async function checkAdminAndFetch() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (profile?.role === "admin") {
                setIsAdmin(true);
                fetchCareersData();
            }
        }
        checkAdminAndFetch();
    }, []);

    async function fetchCareersData() {
        const [titlesResult, skillsResult] = await Promise.all([
            supabase.from("job_titles").select("*").order("title"),
            supabase.from("skills").select("*").order("name")
        ]);

        if (titlesResult.data) setJobTitles(titlesResult.data);
        if (skillsResult.data) setSkills(skillsResult.data);
    }

    const handleAddJobTitle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newJobTitle.trim()) return;
        setLoadingTitle(true);

        const { error } = await supabase
            .from("job_titles")
            .insert([{ title: newJobTitle }]);

        if (error) {
            alert(error.message);
        } else {
            setNewJobTitle("");
            fetchCareersData();
        }
        setLoadingTitle(false);
    };

    const handleAddSkill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSkill.trim()) return;
        setLoadingSkill(true);

        const { error } = await supabase
            .from("skills")
            .insert([{ name: newSkill }]);

        if (error) {
            alert(error.message);
        } else {
            setNewSkill("");
            fetchCareersData();
        }
        setLoadingSkill(false);
    };

    if (!isAdmin) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Careers Configuration</h1>
                <p className="text-muted-foreground">
                    Manage job titles and skills available for employees during sign up.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Job Titles
                        </CardTitle>
                        <CardDescription>Manage available job titles</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleAddJobTitle} className="flex items-end gap-3">
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="jobTitle">New Job Title</Label>
                                <Input
                                    id="jobTitle"
                                    placeholder="e.g. Senior Frontend Developer"
                                    value={newJobTitle}
                                    onChange={(e) => setNewJobTitle(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={loadingTitle || !newJobTitle}>
                                Add
                            </Button>
                        </form>

                        <div className="mt-6 border rounded-lg overflow-hidden">
                            <ul className="divide-y max-h-80 overflow-y-auto">
                                {jobTitles.map((jt) => (
                                    <li key={jt.id} className="p-3 text-sm flex items-center justify-between hover:bg-muted/50">
                                        <span>{jt.title}</span>
                                    </li>
                                ))}
                                {jobTitles.length === 0 && (
                                    <li className="p-3 text-sm text-muted-foreground text-center">No job titles configured</li>
                                )}
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Code className="h-5 w-5" />
                            Skills
                        </CardTitle>
                        <CardDescription>Manage available professional skills</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleAddSkill} className="flex items-end gap-3">
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="skill">New Skill</Label>
                                <Input
                                    id="skill"
                                    placeholder="e.g. React.js"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                />
                            </div>
                            <Button type="submit" disabled={loadingSkill || !newSkill}>
                                Add
                            </Button>
                        </form>

                        <div className="mt-6 border rounded-lg overflow-hidden">
                            <ul className="divide-y max-h-80 overflow-y-auto">
                                {skills.map((sk) => (
                                    <li key={sk.id} className="p-3 text-sm flex items-center justify-between hover:bg-muted/50">
                                        <span>{sk.name}</span>
                                    </li>
                                ))}
                                {skills.length === 0 && (
                                    <li className="p-3 text-sm text-muted-foreground text-center">No skills configured</li>
                                )}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
