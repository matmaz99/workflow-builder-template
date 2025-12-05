/**
 * Server-only workflow logging functions
 * These replace the HTTP endpoint for better security
 *
 * Uses admin client because these functions run in background workflow
 * execution context where cookies are not available.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type LogStepStartParams = {
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input?: unknown;
};

export type LogStepStartResult = {
  logId: string;
  startTime: number;
};

/**
 * Log the start of a step execution
 */
export async function logStepStartDb(
  params: LogStepStartParams
): Promise<LogStepStartResult> {
  const supabase = createAdminClient();

  const { data: log, error } = await supabase
    .from("workflow_execution_logs")
    .insert({
      execution_id: params.executionId,
      node_id: params.nodeId,
      node_name: params.nodeName,
      node_type: params.nodeType,
      status: "running",
      input: params.input,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    logId: log.id,
    startTime: Date.now(),
  };
}

export type LogStepCompleteParams = {
  logId: string;
  startTime: number;
  status: "success" | "error";
  output?: unknown;
  error?: string;
};

/**
 * Log the completion of a step execution
 */
export async function logStepCompleteDb(
  params: LogStepCompleteParams
): Promise<void> {
  const supabase = createAdminClient();
  const duration = Date.now() - params.startTime;

  const { error } = await supabase
    .from("workflow_execution_logs")
    .update({
      status: params.status,
      output: params.output,
      error: params.error,
      completed_at: new Date().toISOString(),
      duration: duration.toString(),
    })
    .eq("id", params.logId);

  if (error) throw error;
}

export type LogWorkflowCompleteParams = {
  executionId: string;
  status: "success" | "error";
  output?: unknown;
  error?: string;
  startTime: number;
};

/**
 * Log the completion of a workflow execution
 */
export async function logWorkflowCompleteDb(
  params: LogWorkflowCompleteParams
): Promise<void> {
  const supabase = createAdminClient();
  const duration = Date.now() - params.startTime;

  const { error } = await supabase
    .from("workflow_executions")
    .update({
      status: params.status,
      output: params.output,
      error: params.error,
      completed_at: new Date().toISOString(),
      duration: duration.toString(),
    })
    .eq("id", params.executionId);

  if (error) throw error;
}
