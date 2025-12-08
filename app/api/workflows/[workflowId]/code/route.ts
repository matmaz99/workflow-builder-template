import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateWorkflowSDKCode } from "@/lib/workflow-codegen-sdk";

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

    const { data: workflow, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", user.id)
      .single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Generate code
    const code = generateWorkflowSDKCode(
      workflow.name,
      workflow.nodes as unknown as Parameters<typeof generateWorkflowSDKCode>[1],
      workflow.edges as unknown as Parameters<typeof generateWorkflowSDKCode>[2]
    );

    return NextResponse.json({
      code,
      workflowName: workflow.name,
    });
  } catch (error) {
    console.error("Failed to get workflow code:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get workflow code",
      },
      { status: 500 }
    );
  }
}
