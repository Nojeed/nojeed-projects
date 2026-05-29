import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EditProfileForm } from "./client-form";
import type { JobTitle, Skill } from "@/types";

export default async function EditProfilePage() {
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

    // Fetch current junction tables info
    let userJobTitles: string[] = [];
    let userSkills: string[] = [];

    if (profile.role === "employee" || profile.role === "project_manager") {
        const [{ data: pjt }, { data: pskills }] = await Promise.all([
            supabase.from("profile_job_titles").select("job_title_id").eq("profile_id", user.id),
            supabase.from("profile_skills").select("skill_id").eq("profile_id", user.id)
        ]);

        if (pjt) userJobTitles = pjt.map(item => item.job_title_id);
        if (pskills) userSkills = pskills.map(item => item.skill_id);
    }

    // Fetch options for multiselect
    const [{ data: allJobTitles }, { data: allSkills }] = await Promise.all([
        supabase.from("job_titles").select("*"),
        supabase.from("skills").select("*")
    ]);

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold tracking-tight mb-8">Edit Profile</h1>
            <EditProfileForm
                profile={profile}
                userJobTitles={userJobTitles}
                userSkills={userSkills}
                allJobTitles={(allJobTitles || []) as JobTitle[]}
                allSkills={(allSkills || []) as Skill[]}
            />
        </div>
    );
}

