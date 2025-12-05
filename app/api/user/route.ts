import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("id, name, email, image, is_anonymous")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the user's account to determine auth provider
    const { data: userAccount } = await supabase
      .from("accounts")
      .select("provider_id")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      ...userData,
      providerId: userAccount?.provider_id ?? null,
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

    // Check if user is an OAuth user (can't update profile)
    const { data: userAccount } = await supabase
      .from("accounts")
      .select("provider_id")
      .eq("user_id", user.id)
      .single();

    // Block updates for OAuth users (vercel, github, google, etc.)
    const oauthProviders = ["vercel", "github", "google"];
    if (userAccount && oauthProviders.includes(userAccount.provider_id)) {
      return NextResponse.json(
        { error: "Cannot update profile for OAuth users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: { name?: string; email?: string } = {};

    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.email !== undefined) {
      updates.email = body.email;
    }

    const { error } = await supabase
      .from("users")
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
