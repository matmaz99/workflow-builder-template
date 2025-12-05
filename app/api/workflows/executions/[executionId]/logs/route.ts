import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { redactSensitiveData } from "@/lib/utils/redact";

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

    // Get logs
    const { data: logs, error: logsError } = await supabase
      .from("workflow_execution_logs")
      .select("*")
      .eq("execution_id", executionId)
      .order("timestamp", { ascending: false });

    if (logsError) {
      throw logsError;
    }

    // Apply an additional layer of redaction to ensure no sensitive data is exposed
    // Even though data should already be redacted when stored, this provides defense in depth
    const redactedLogs = (logs || []).map((log) => ({
      ...log,
      input: redactSensitiveData(log.input),
      output: redactSensitiveData(log.output),
    }));

    return NextResponse.json({
      execution,
      logs: redactedLogs,
    });
  } catch (error) {
    console.error("Failed to get execution logs:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get execution logs",
      },
      { status: 500 }
    );
  }
}
