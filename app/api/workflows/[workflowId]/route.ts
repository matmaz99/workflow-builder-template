import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateWorkflowIntegrations } from "@/lib/integrations-supabase";

// Helper to strip sensitive data from nodes for public viewing
function sanitizeNodesForPublicView(
  nodes: Record<string, unknown>[]
): Record<string, unknown>[] {
  return nodes.map((node) => {
    const sanitizedNode = { ...node };
    if (
      sanitizedNode.data &&
      typeof sanitizedNode.data === "object" &&
      sanitizedNode.data !== null
    ) {
      const data = { ...(sanitizedNode.data as Record<string, unknown>) };
      // Remove integrationId from config to not expose which integrations are used
      if (
        data.config &&
        typeof data.config === "object" &&
        data.config !== null
      ) {
        const { integrationId: _, ...configWithoutIntegration } =
          data.config as Record<string, unknown>;
        data.config = configWithoutIntegration;
      }
      sanitizedNode.data = data;
    }
    return sanitizedNode;
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // First, try to find the workflow
    const { data: workflow, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const isOwner = user?.id === workflow.user_id;

    // If not owner, check if workflow is public
    if (!isOwner && workflow.visibility !== "public") {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // For public workflows viewed by non-owners, sanitize sensitive data
    const responseData = {
      ...workflow,
      nodes: isOwner
        ? workflow.nodes
        : sanitizeNodesForPublicView(
            workflow.nodes as Record<string, unknown>[]
          ),
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at,
      isOwner,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Failed to get workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get workflow",
      },
      { status: 500 }
    );
  }
}

// Helper to build update data from request body
function buildUpdateData(
  body: Record<string, unknown>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.name !== undefined) {
    updateData.name = body.name;
  }
  if (body.description !== undefined) {
    updateData.description = body.description;
  }
  if (body.nodes !== undefined) {
    updateData.nodes = body.nodes;
  }
  if (body.edges !== undefined) {
    updateData.edges = body.edges;
  }
  if (body.visibility !== undefined) {
    updateData.visibility = body.visibility;
  }

  return updateData;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate that all integrationIds in nodes belong to the current user
    if (Array.isArray(body.nodes)) {
      const validation = await validateWorkflowIntegrations(
        body.nodes,
        user.id
      );
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid integration references in workflow" },
          { status: 403 }
        );
      }
    }

    // Validate visibility value if provided
    if (
      body.visibility !== undefined &&
      body.visibility !== "private" &&
      body.visibility !== "public"
    ) {
      return NextResponse.json(
        { error: "Invalid visibility value. Must be 'private' or 'public'" },
        { status: 400 }
      );
    }

    const updateData = buildUpdateData(body);

    const { data: updatedWorkflow, error } = await supabase
      .from("workflows")
      .update(updateData)
      .eq("id", workflowId)
      .select()
      .single();

    if (error || !updatedWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...updatedWorkflow,
      createdAt: updatedWorkflow.created_at,
      updatedAt: updatedWorkflow.updated_at,
      isOwner: true,
    });
  } catch (error) {
    console.error("Failed to update workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update workflow",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: existingWorkflow, error: fetchError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", workflowId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete workflow",
      },
      { status: 500 }
    );
  }
}
