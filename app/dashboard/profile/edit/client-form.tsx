"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { JobTitle, Skill } from "@/types";
import { Loader2 } from "lucide-react";

export function EditProfileForm({
    profile,
    userJobTitles,
    userSkills,
    allJobTitles,
    allSkills
}: {
    profile: any;
    userJobTitles: string[];
    userSkills: string[];
    allJobTitles: JobTitle[];
    allSkills: Skill[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);

    const [formData, setFormData] = useState({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        portfolio_url: profile.portfolio_url || "",
        linkedin: profile.social_links?.linkedin || "",
        github: profile.social_links?.github || "",
        selected_job_titles: userJobTitles,
        selected_skills: userSkills,
    });

    const isEmployeeOrPM = profile.role === "employee" || profile.role === "project_manager";

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const supabase = createClient();

        let avatar_url = profile.avatar_url;

        // Upload new avatar if selected
        if (avatarFile) {
            const fileExt = avatarFile.name.split('.').pop();
            const filePath = `${profile.id}/avatar-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, avatarFile, { upsert: true });

            if (!uploadError) {
                const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
                avatar_url = publicUrlData?.publicUrl || avatar_url;
            } else {
                setErrorMsg("Warning: Failed to upload avatar. " + uploadError.message);
            }
        }

        // 1. Update Profile table
        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                avatar_url,
                full_name: formData.full_name,
                bio: formData.bio,
                portfolio_url: formData.portfolio_url,
                social_links: {
                    linkedin: formData.linkedin,
                    github: formData.github
                }
            })
            .eq("id", profile.id);

        if (profileError) {
            setErrorMsg("Error updating profile: " + profileError.message);
            setLoading(false);
            return;
        }

        // 2. Update Junction Tables (if applicable)
        if (isEmployeeOrPM) {
            // Job Titles
            await supabase.from("profile_job_titles").delete().eq("profile_id", profile.id);
            if (formData.selected_job_titles.length > 0) {
                const jtInserts = formData.selected_job_titles.map(jt => ({ profile_id: profile.id, job_title_id: jt }));
                await supabase.from("profile_job_titles").insert(jtInserts);
            }

            // Skills
            await supabase.from("profile_skills").delete().eq("profile_id", profile.id);
            if (formData.selected_skills.length > 0) {
                const skInserts = formData.selected_skills.map(sk => ({ profile_id: profile.id, skill_id: sk }));
                await supabase.from("profile_skills").insert(skInserts);
            }
        }

        router.push("/dashboard/profile");
        router.refresh();
    };

    const jobTitleOptions = allJobTitles.map(jt => ({ id: jt.id, name: jt.title }));
    const skillOptions = allSkills.map(sk => ({ id: sk.id, name: sk.name }));

    return (
        <Card className="w-full">
            <form onSubmit={handleUpdate}>
                <CardContent className="space-y-6 pt-6">
                    {errorMsg && (
                        <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md shadow-sm">
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-4 pb-4">
                        <div className="h-24 w-24 rounded-full border-2 overflow-hidden bg-muted flex items-center justify-center relative">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar Preview" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-muted-foreground text-xs text-center p-2">Upload Photo</span>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        <Label className="text-xs text-muted-foreground">Profile Picture</Label>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Full Name</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea
                                id="bio"
                                placeholder="Tell us a little about yourself"
                                className="min-h-[100px]"
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                                <Input
                                    id="portfolio_url"
                                    type="url"
                                    placeholder="https://myportfolio.com"
                                    value={formData.portfolio_url}
                                    onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                                <Input
                                    id="linkedin"
                                    type="url"
                                    placeholder="https://linkedin.com/in/johndoe"
                                    value={formData.linkedin}
                                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="github">GitHub Profile</Label>
                                <Input
                                    id="github"
                                    type="url"
                                    placeholder="https://github.com/johndoe"
                                    value={formData.github}
                                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                                />
                            </div>
                        </div>

                        {isEmployeeOrPM && (
                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <Label className="mb-2 block">Job Titles</Label>
                                    <MultiSelectSearch
                                        options={jobTitleOptions}
                                        selected={formData.selected_job_titles}
                                        onChange={(selected) => setFormData({ ...formData, selected_job_titles: selected })}
                                        placeholder="Search and select job titles..."
                                        emptyMessage="No matching job titles found."
                                    />
                                </div>

                                <div>
                                    <Label className="mb-2 block">Skills</Label>
                                    <MultiSelectSearch
                                        options={skillOptions}
                                        selected={formData.selected_skills}
                                        onChange={(selected) => setFormData({ ...formData, selected_skills: selected })}
                                        placeholder="Search and select skills..."
                                        emptyMessage="No matching skills found."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/dashboard/profile")}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
