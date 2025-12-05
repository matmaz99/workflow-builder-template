import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { createClient } from "@/lib/supabase/server";
import { validateWorkflowIntegrations } from "@/lib/integrations-supabase";
import { executeWorkflow } from "@/lib/workflow-executor.workflow";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";

// Validate API key and return the user ID if valid
async function validateApiKey(
  authHeader: string | null,
  workflowUserId: string
): Promise<{ valid: boolean; error?: string; statusCode?: number }> {
  if (!authHeader) {
    return {
      valid: false,
      error: "Missing Authorization header",
      statusCode: 401,
    };
  }

  // Support "Bearer <key>" format
  const key = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!key?.startsWith("wfb_")) {
    return { valid: false, error: "Invalid API key format", statusCode: 401 };
  }

  // Hash the key to compare with stored hash
  const keyHash = createHash("sha256").update(key).digest("hex");

  // Find the API key in the database
  const supabase = await createClient();
  const { data: apiKey, error: apiKeyError } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .single();

  if (apiKeyError || !apiKey) {
    return { valid: false, error: "Invalid API key", statusCode: 401 };
  }

  // Verify the API key belongs to the workflow owner
  if (apiKey.user_id !== workflowUserId) {
    return {
      valid: false,
      error: "You do not have permission to run this workflow",
      statusCode: 403,
    };
  }

  // Update last used timestamp (don't await, fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {})
    .catch(() => {
      // Fire and forget - ignore errors
    });

  return { valid: true };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// biome-ignore lint/nursery/useMaxParams: Background execution requires all workflow context
async function executeWorkflowBackground(
  executionId: string,
  workflowId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: Record<string, unknown>
) {
  try {
    console.log("[Webhook] Starting execution:", executionId);

    console.log("[Webhook] Calling executeWorkflow with:", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasExecutionId: !!executionId,
      workflowId,
    });

    start(executeWorkflow, [
      {
        nodes,
        edges,
        triggerInput: input,
        executionId,
        workflowId,
      },
    ]);

    console.log("[Webhook] Workflow started successfully");
  } catch (error) {
    console.error("[Webhook] Error during execution:", error);
    console.error(
      "[Webhook] Error stack:",
      error instanceof Error ? error.stack : "N/A"
    );

    const supabase = await createClient();
    await supabase
      .from("workflow_executions")
      .update({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);
  }
}

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workflowId: string }> }
) {
  try {
    const { workflowId } = await context.params;

    // Get workflow
    const supabase = await createClient();
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Validate API key - must belong to the workflow owner
    const authHeader = request.headers.get("Authorization");
    const apiKeyValidation = await validateApiKey(authHeader, workflow.user_id);

    if (!apiKeyValidation.valid) {
      return NextResponse.json(
        { error: apiKeyValidation.error },
        { status: apiKeyValidation.statusCode || 401, headers: corsHeaders }
      );
    }

    // Verify this is a webhook-triggered workflow
    const triggerNode = (workflow.nodes as WorkflowNode[]).find(
      (node) => node.data.type === "trigger"
    );

    if (!triggerNode || triggerNode.data.config?.triggerType !== "Webhook") {
      return NextResponse.json(
        { error: "This workflow is not configured for webhook triggers" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate that all integrationIds in workflow nodes belong to the workflow owner
    const validation = await validateWorkflowIntegrations(
      workflow.nodes as WorkflowNode[],
      workflow.user_id
    );
    if (!validation.valid) {
      console.error(
        "[Webhook] Invalid integration references:",
        validation.invalidIds
      );
      return NextResponse.json(
        { error: "Workflow contains invalid integration references" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        user_id: workflow.user_id,
        status: "running",
        input: body,
      })
      .select()
      .single();

    if (executionError || !execution) {
      throw new Error("Failed to create execution record");
    }

    console.log("[Webhook] Created execution:", execution.id);

    // Execute the workflow in the background (don't await)
    executeWorkflowBackground(
      execution.id,
      workflowId,
      workflow.nodes as WorkflowNode[],
      workflow.edges as WorkflowEdge[],
      body
    );

    // Return immediately with the execution ID
    return NextResponse.json(
      {
        executionId: execution.id,
        status: "running",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("[Webhook] Failed to start workflow execution:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute workflow",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
