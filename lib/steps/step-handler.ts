/**
 * Step Handler - Logging utilities for workflow builder UI
 * These functions are called FROM INSIDE steps (within "use step" context)
 * where fetch is available
 */
import "server-only";

import { redactSensitiveData } from "../utils/redact";

export type StepContext = {
  executionId?: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
};

type LogInfo = {
  logId: string;
  startTime: number;
};

/**
 * Log the start of a step execution
 * Must be called from within a "use step" context
 */
export async function logStepStart(
  context: StepContext | undefined,
  input: unknown
): Promise<LogInfo> {
  if (!context?.executionId) {
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
 * Log the completion of a step execution
 * Must be called from within a "use step" context
 */
export async function logStepComplete(
  logInfo: LogInfo,
  status: "success" | "error",
  output?: unknown,
  error?: string
): Promise<void> {
  if (!logInfo.logId) {
    return;
  }

  try {
    const redactedOutput = redactSensitiveData(output);

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflow-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        data: {
          logId: logInfo.logId,
          startTime: logInfo.startTime,
          status,
          output: redactedOutput,
          error,
        },
      }),
    });
  } catch (err) {
    console.error("[stepHandler] Failed to log completion:", err);
  }
}

/**
 * Helper to wrap step logic with logging
 * Call this from inside your step function (within "use step" context)
 *
 * @example
 * export async function myStep(input: MyInput & { _context?: StepContext }) {
 *   "use step";
 *   return withStepLogging(input._context, input, async () => {
 *     // your step logic here
 *     return { success: true, data: ... };
 *   });
 * }
 */
export async function withStepLogging<TOutput>(
  context: StepContext | undefined,
  input: unknown,
  stepLogic: () => Promise<TOutput>
): Promise<TOutput> {
  const logInfo = await logStepStart(context, input);

  try {
    const result = await stepLogic();

    // Check if result indicates an error
    const isErrorResult =
      result &&
      typeof result === "object" &&
      "success" in result &&
      (result as { success: boolean }).success === false;

    if (isErrorResult) {
      const errorResult = result as { success: false; error?: string };
      await logStepComplete(
        logInfo,
        "error",
        result,
        errorResult.error || "Step execution failed"
      );
    } else {
      await logStepComplete(logInfo, "success", result);
    }

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await logStepComplete(logInfo, "error", undefined, errorMessage);
    throw error;
  }
}
