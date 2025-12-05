import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils/id";

const CURRENT_WORKFLOW_NAME = "~~__CURRENT__~~";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentWorkflow, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("name", CURRENT_WORKFLOW_NAME)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!currentWorkflow) {
      // Return empty workflow if no current state exists
      return NextResponse.json({
        nodes: [],
        edges: [],
      });
    }

    return NextResponse.json({
      id: currentWorkflow.id,
      nodes: currentWorkflow.nodes,
      edges: currentWorkflow.edges,
    });
  } catch (error) {
    console.error("Failed to get current workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get current workflow",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { nodes, edges } = body;

    if (!(nodes && edges)) {
      return NextResponse.json(
        { error: "Nodes and edges are required" },
        { status: 400 }
      );
    }

    // Check if current workflow exists
    const { data: existingWorkflow } = await supabase
      .from("workflows")
      .select("id")
      .eq("name", CURRENT_WORKFLOW_NAME)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (existingWorkflow) {
      // Update existing current workflow
      const { data: updatedWorkflow, error } = await supabase
        .from("workflows")
        .update({
          nodes,
          edges,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingWorkflow.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        id: updatedWorkflow.id,
        nodes: updatedWorkflow.nodes,
        edges: updatedWorkflow.edges,
      });
    }

    // Create new current workflow
    const workflowId = generateId();

    const { data: savedWorkflow, error } = await supabase
      .from("workflows")
      .insert({
        id: workflowId,
        name: CURRENT_WORKFLOW_NAME,
        description: "Auto-saved current workflow",
        nodes,
        edges,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      id: savedWorkflow.id,
      nodes: savedWorkflow.nodes,
      edges: savedWorkflow.edges,
    });
  } catch (error) {
    console.error("Failed to save current workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save current workflow",
      },
      { status: 500 }
    );
  }
}
