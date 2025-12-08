import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, image")
      .eq("id", user.id)
      .single();

    // Determine auth provider from app_metadata
    const provider = user.app_metadata?.provider || "email";

    return NextResponse.json({
      id: user.id,
      name: profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || null,
      email: user.email,
      image: profile?.image || user.user_metadata?.avatar_url || null,
      providerId: provider,
    });
  } catch (error) {
    console.error("Failed to get user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get user",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block updates for OAuth users
    const provider = user.app_metadata?.provider;
    const oauthProviders = ["github", "google"];
    if (provider && oauthProviders.includes(provider)) {
      return NextResponse.json(
        { error: "Cannot update profile for OAuth users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: { name?: string } = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }

    // Update profile table
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 }
    );
  }
}
