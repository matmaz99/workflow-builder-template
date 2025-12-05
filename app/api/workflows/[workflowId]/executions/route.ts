import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

    // Verify workflow ownership
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Fetch executions
    const { data: executions, error: executionsError } = await supabase
      .from("workflow_executions")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (executionsError) {
      throw executionsError;
    }

    return NextResponse.json(executions || []);
  } catch (error) {
    console.error("Failed to get executions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get executions",
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

    // Verify workflow ownership
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Get all execution IDs for this workflow
    const { data: executions, error: executionsError } = await supabase
      .from("workflow_executions")
      .select("id")
      .eq("workflow_id", workflowId);

    if (executionsError) {
      throw executionsError;
    }

    const executionIds = (executions || []).map((e) => e.id);

    // Delete logs first (if there are any executions)
    if (executionIds.length > 0) {
      const { error: logsDeleteError } = await supabase
        .from("workflow_execution_logs")
        .delete()
        .in("execution_id", executionIds);

      if (logsDeleteError) {
        throw logsDeleteError;
      }

      // Then delete the executions
      const { error: executionsDeleteError } = await supabase
        .from("workflow_executions")
        .delete()
        .eq("workflow_id", workflowId);

      if (executionsDeleteError) {
        throw executionsDeleteError;
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount: executionIds.length,
    });
  } catch (error) {
    console.error("Failed to delete executions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete executions",
      },
      { status: 500 }
    );
  }
}
