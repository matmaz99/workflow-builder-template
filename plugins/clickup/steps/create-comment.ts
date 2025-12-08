import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ClickUpCredentials } from "../credentials";

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

type ClickUpCommentResponse = {
  id: string;
  hist_id: string;
  date: string;
};

type CreateCommentResult =
  | {
      success: true;
      id: string;
      histId: string;
      date: string;
    }
  | { success: false; error: string };

export type CreateCommentCoreInput = {
  taskId: string;
  commentText: string;
  assignee?: string;
  notifyAll?: string;
};

export type CreateCommentInput = StepInput &
  CreateCommentCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: CreateCommentCoreInput,
  credentials: ClickUpCredentials
): Promise<CreateCommentResult> {
  const apiKey = credentials.CLICKUP_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "CLICKUP_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const body: Record<string, unknown> = {
      comment_text: input.commentText,
      notify_all: input.notifyAll === "true",
    };

    if (input.assignee) {
      const assigneeId = Number.parseInt(input.assignee, 10);
      if (!Number.isNaN(assigneeId)) {
        body.assignee = assigneeId;
      }
    }

    const response = await fetch(
      `${CLICKUP_API_URL}/task/${input.taskId}/comment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { err?: string; error?: string };
      return {
        success: false,
        error: errorData.err || errorData.error || `HTTP ${response.status}`,
      };
    }

    const comment = (await response.json()) as ClickUpCommentResponse;

    return {
      success: true,
      id: comment.id,
      histId: comment.hist_id,
      date: comment.date,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create comment: ${getErrorMessage(error)}`,
    };
  }
}

export async function createCommentStep(
  input: CreateCommentInput
): Promise<CreateCommentResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createCommentStep.maxRetries = 0;

export const _integrationType = "clickup";
