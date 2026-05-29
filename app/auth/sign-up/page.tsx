"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { CheckCircle2, XCircle, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { JobTitle, Skill } from "@/types";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [username, setUsername] = useState("");
  const [isUsernameChecking, setIsUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // Authenticated user ID (after step 1 completes)
  const [userId, setUserId] = useState<string | null>(null);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    phone: "",
    full_name: "",
    bio: "",
    portfolio_url: "",
    linkedin: "",
    github: "",
    selected_job_titles: [] as string[],
    selected_skills: [] as string[],
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [titlesResult, skillsResult] = await Promise.all([
        supabase.from("job_titles").select("*"),
        supabase.from("skills").select("*")
      ]);

      if (titlesResult.data) setJobTitles(titlesResult.data);
      if (skillsResult.data) setSkills(skillsResult.data);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (!username) {
      setUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setIsUsernameChecking(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (data) {
        setUsernameAvailable(false);
      } else {
        setUsernameAvailable(true);
      }
      setIsUsernameChecking(false);
    };

    const delayDebounceFn = setTimeout(() => {
      checkUsername();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  // Step 1: Sign up the user (create auth record + profile via DB trigger)
  const handleSignUpStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      phone: formData.phone || undefined, // Auth native phone if they configured it
      options: {
        data: {
          full_name: formData.full_name,
          username: username,
          phone: formData.phone, // In user_metadata just in case the trigger uses it
          role: "employee",
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setUserId(data.user.id);

      // Upload avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${data.user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
          if (publicUrlData.publicUrl) {
            await supabase.from('profiles').update({ avatar_url: publicUrlData.publicUrl }).eq('id', data.user.id);
          }
        }
      }

      setStep(2); // Proceed to next step
    } else {
      // In case they need strict email confirmation and auto-login is off
      router.push("/auth/sign-up-success");
    }

    setLoading(false);
  };

  // Step 2: Complete Profile (Bio, Socials, Job Titles, Skills)
  const handleCompleteStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setErrorMsg("");
    const supabase = createClient();

    // 1. Update Profile (Bio & Social Links)
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        bio: formData.bio,
        portfolio_url: formData.portfolio_url,
        social_links: {
          linkedin: formData.linkedin,
          github: formData.github,
        }
      })
      .eq("id", userId);

    if (profileErr) {
      setErrorMsg("Failed to update profile: " + profileErr.message);
      setLoading(false);
      return;
    }

    // 2. Insert Job Titles
    if (formData.selected_job_titles.length > 0) {
      const jtInserts = formData.selected_job_titles.map(jt => ({ profile_id: userId, job_title_id: jt }));
      await supabase.from("profile_job_titles").insert(jtInserts);
    }

    // 3. Insert Skills
    if (formData.selected_skills.length > 0) {
      const skInserts = formData.selected_skills.map(sk => ({ profile_id: userId, skill_id: sk }));
      await supabase.from("profile_skills").insert(skInserts);
    }

    // Finished! Redirect successfully
    router.push("/dashboard");
  };

  const jobTitleOptions = jobTitles.map(jt => ({ id: jt.id, name: jt.title }));
  const skillOptions = skills.map(sk => ({ id: sk.id, name: sk.name }));

  return (
    <div className="flex min-h-screen items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {step === 1 ? "Create an Account" : "Complete Your Profile"}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? "Sign up for Nojeed Project Management"
              : "Add your professional details to stand out"}
          </CardDescription>
        </CardHeader>

        {step === 1 ? (
          <form onSubmit={handleSignUpStep1}>
            <CardContent className="space-y-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      type="text"
                      placeholder="johndoe123"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isUsernameChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : usernameAvailable === true ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : usernameAvailable === false ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : null}
                    </div>
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-xs text-red-500">Username is already taken.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full gap-2" disabled={loading || usernameAvailable === false}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Next Step
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleCompleteStep2}>
            <CardContent className="space-y-6">
              {errorMsg && (
                <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md shadow-sm">
                  {errorMsg}
                </div>
              )}

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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us a little about yourself"
                    className="min-h-[100px]"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  />
                </div>
              </div>

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
            </CardContent>
            <CardFooter className="flex justify-between gap-4 border-t pt-6">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                Skip for now
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Complete Setup
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
