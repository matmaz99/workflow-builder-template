import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json([], { status: 200 });
    }

    const { data: userWorkflows, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    const mappedWorkflows = (userWorkflows || []).map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      edges: workflow.edges,
      visibility: workflow.visibility,
      userId: workflow.user_id,
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at,
    }));

    return NextResponse.json(mappedWorkflows);
  } catch (error) {
    console.error("Failed to get workflows:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflows",
      },
      { status: 500 }
    );
  }
}
