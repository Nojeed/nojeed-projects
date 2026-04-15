import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Server misconfigured: missing service role key" }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create users" }, { status: 403 });
    }

    const body = await request.json();
    const { username, email, password, full_name, role, project_id } = body;

    if (!username || !email || !password || !full_name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name,
          role,
        },
      }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      return NextResponse.json({ error: authData.msg || authData.message || "Failed to create user" }, { status: 400 });
    }

    if (role === "client" && project_id) {
      await supabase
        .from("client_projects")
        .insert({
          client_id: authData.id,
          project_id,
        });
    }

    return NextResponse.json({ success: true, userId: authData.id });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
