import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type NodeStatus = {
  nodeId: string;
  status: "pending" | "running" | "success" | "error";
};

export async function GET(
  request: Request,
  context: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the execution and verify ownership
    const { data: execution, error: executionError } = await supabase
      .from("workflow_executions")
      .select(`
        *,
        workflow:workflows(*)
      `)
      .eq("id", executionId)
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Verify the workflow belongs to the user
    if (execution.workflow.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get logs for all nodes
    const { data: logs, error: logsError } = await supabase
      .from("workflow_execution_logs")
      .select("*")
      .eq("execution_id", executionId);

    if (logsError) {
      throw logsError;
    }

    // Map logs to node statuses
    const nodeStatuses: NodeStatus[] = (logs || []).map((log) => ({
      nodeId: log.node_id,
      status: log.status,
    }));

    return NextResponse.json({
      status: execution.status,
      nodeStatuses,
    });
  } catch (error) {
    console.error("Failed to get execution status:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get execution status",
      },
      { status: 500 }
    );
  }
}
