/**
 * Step Handler - Wraps step execution with logging for the workflow builder UI
 * This is NOT a step itself, it's a wrapper that handles logging transparently
 */
import "server-only";

import { redactSensitiveData } from "../utils/redact";

export type StepContext = {
  executionId?: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
};

type LogStartResult = {
  logId: string;
  startTime: number;
};

/**
 * Log the start of a step execution (not a step itself)
 */
async function logStepStart(
  context: StepContext,
  input: unknown
): Promise<LogStartResult> {
  if (!context.executionId) {
    return { logId: "", startTime: Date.now() };
  }

  try {
    const redactedInput = redactSensitiveData(input);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/workflow-log`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          data: {
            executionId: context.executionId,
            nodeId: context.nodeId,
            nodeName: context.nodeName,
            nodeType: context.nodeType,
            input: redactedInput,
          },
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      return {
        logId: result.logId || "",
        startTime: result.startTime || Date.now(),
      };
    }

    return { logId: "", startTime: Date.now() };
  } catch (error) {
    console.error("[stepHandler] Failed to log start:", error);
    return { logId: "", startTime: Date.now() };
  }
}

/**
 * Log the completion of a step execution (not a step itself)
 */
async function logStepComplete(options: {
  logId: string;
  startTime: number;
  status: "success" | "error";
  output?: unknown;
  error?: string;
}): Promise<void> {
  if (!options.logId) {
    return;
  }

  try {
    const redactedOutput = redactSensitiveData(options.output);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        data: {
          logId: options.logId,
          startTime: options.startTime,
          status: options.status,
          output: redactedOutput,
          error: options.error,
        },
      }),
    });
  } catch (error) {
    console.error("[stepHandler] Failed to log completion:", error);
  }
}

/**
 * Wrap a step function with logging
 * This handles logging before and after step execution without being a step itself
 */
export async function stepHandler<TInput, TOutput>(
  stepFn: (stepInput: TInput) => Promise<TOutput>,
  input: TInput,
  context: StepContext
): Promise<TOutput> {
  // Log the start
  const { logId, startTime } = await logStepStart(context, input);

  try {
    // Execute the actual step
    const result = await stepFn(input);

    // Check if the result indicates an error
    const isErrorResult =
      result &&
      typeof result === "object" &&
      "success" in result &&
      (result as { success: boolean }).success === false;

    if (isErrorResult) {
      const errorResult = result as { success: false; error?: string };
      await logStepComplete({
        logId,
        startTime,
        status: "error",
        output: result,
        error: errorResult.error || "Step execution failed",
      });
    } else {
      await logStepComplete({
        logId,
        startTime,
        status: "success",
        output: result,
      });
    }

    return result;
  } catch (error) {
    // Log the error
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await logStepComplete({
      logId,
      startTime,
      status: "error",
      error: errorMessage,
    });

    // Re-throw the error
    throw error;
  }
}
