import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateId } from "@/lib/utils/id";

// Node type for type-safe node manipulation
type WorkflowNodeLike = {
  id: string;
  data?: {
    config?: {
      integrationId?: string;
      [key: string]: unknown;
    };
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

// Helper to strip integration IDs from nodes when duplicating
function stripIntegrationIds(nodes: WorkflowNodeLike[]): WorkflowNodeLike[] {
  return nodes.map((node) => {
    const newNode: WorkflowNodeLike = { ...node, id: nanoid() };
    if (newNode.data) {
      const data = { ...newNode.data };
      if (data.config) {
        const { integrationId: _, ...configWithoutIntegration } = data.config;
        data.config = configWithoutIntegration;
      }
      // Reset status to idle
      data.status = "idle";
      newNode.data = data;
    }
    return newNode;
  });
}

// Edge type for type-safe edge manipulation
type WorkflowEdgeLike = {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
};

// Helper to update edge references to new node IDs
function updateEdgeReferences(
  edges: WorkflowEdgeLike[],
  oldNodes: WorkflowNodeLike[],
  newNodes: WorkflowNodeLike[]
): WorkflowEdgeLike[] {
  // Create mapping from old node IDs to new node IDs
  const idMap = new Map<string, string>();
  oldNodes.forEach((oldNode, index) => {
    idMap.set(oldNode.id, newNodes[index].id);
  });

  return edges.map((edge) => ({
    ...edge,
    id: nanoid(),
    source: idMap.get(edge.source) || edge.source,
    target: idMap.get(edge.target) || edge.target,
  }));
}

export async function POST(
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

    // Find the workflow to duplicate
    const { data: sourceWorkflow, error: sourceError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (sourceError || !sourceWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const isOwner = user.id === sourceWorkflow.user_id;

    // If not owner, check if workflow is public
    if (!isOwner && sourceWorkflow.visibility !== "public") {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Generate new IDs for nodes
    const oldNodes = sourceWorkflow.nodes as WorkflowNodeLike[];
    const newNodes = stripIntegrationIds(oldNodes);
    const newEdges = updateEdgeReferences(
      sourceWorkflow.edges as WorkflowEdgeLike[],
      oldNodes,
      newNodes
    );

    // Count user's workflows to generate unique name
    const { data: userWorkflows, error: userWorkflowsError } = await supabase
      .from("workflows")
      .select("name")
      .eq("user_id", user.id);

    if (userWorkflowsError) {
      throw userWorkflowsError;
    }

    // Generate a unique name
    const baseName = `${sourceWorkflow.name} (Copy)`;
    let workflowName = baseName;
    const existingNames = new Set((userWorkflows || []).map((w) => w.name));

    if (existingNames.has(workflowName)) {
      let counter = 2;
      while (existingNames.has(`${baseName} ${counter}`)) {
        counter += 1;
      }
      workflowName = `${baseName} ${counter}`;
    }

    // Create the duplicated workflow
    const newWorkflowId = generateId();
    const { data: newWorkflow, error: insertError } = await supabase
      .from("workflows")
      .insert({
        id: newWorkflowId,
        name: workflowName,
        description: sourceWorkflow.description,
        nodes: newNodes,
        edges: newEdges,
        user_id: user.id,
        visibility: "private", // Duplicated workflows are always private
      })
      .select()
      .single();

    if (insertError || !newWorkflow) {
      throw insertError || new Error("Failed to create workflow");
    }

    return NextResponse.json({
      ...newWorkflow,
      createdAt: newWorkflow.created_at,
      updatedAt: newWorkflow.updated_at,
      isOwner: true,
    });
  } catch (error) {
    console.error("Failed to duplicate workflow:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to duplicate workflow",
      },
      { status: 500 }
    );
  }
}
