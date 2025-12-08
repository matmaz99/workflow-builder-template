import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ClickUpCredentials } from "../credentials";

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

type ClickUpTask = {
  id: string;
  name: string;
  status: {
    status: string;
    type: string;
  };
  date_created: string;
  url: string;
};

type CreateTaskResult =
  | {
      success: true;
      id: string;
      name: string;
      url: string;
      status: string;
      dateCreated: string;
    }
  | { success: false; error: string };

export type CreateTaskCoreInput = {
  listId: string;
  name: string;
  description?: string;
  assignees?: string;
  tags?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  startDate?: string;
  timeEstimate?: string;
  parentTaskId?: string;
};

export type CreateTaskInput = StepInput &
  CreateTaskCoreInput & {
    integrationId?: string;
  };

function parseCommaSeparated(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumberArray(value?: string): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => !Number.isNaN(n));
}

async function stepHandler(
  input: CreateTaskCoreInput,
  credentials: ClickUpCredentials
): Promise<CreateTaskResult> {
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
      name: input.name,
    };

    if (input.description) {
      body.description = input.description;
    }

    const assignees = parseNumberArray(input.assignees);
    if (assignees.length > 0) {
      body.assignees = assignees;
    }

    const tags = parseCommaSeparated(input.tags);
    if (tags.length > 0) {
      body.tags = tags;
    }

    if (input.status) {
      body.status = input.status;
    }

    if (input.priority && input.priority !== "none") {
      body.priority = Number.parseInt(input.priority, 10);
    }

    if (input.dueDate) {
      body.due_date = Number.parseInt(input.dueDate, 10);
      body.due_date_time = true;
    }

    if (input.startDate) {
      body.start_date = Number.parseInt(input.startDate, 10);
      body.start_date_time = true;
    }

    if (input.timeEstimate) {
      body.time_estimate = Number.parseInt(input.timeEstimate, 10);
    }

    if (input.parentTaskId) {
      body.parent = input.parentTaskId;
    }

    const response = await fetch(
      `${CLICKUP_API_URL}/list/${input.listId}/task`,
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

    const task = (await response.json()) as ClickUpTask;

    return {
      success: true,
      id: task.id,
      name: task.name,
      url: task.url,
      status: task.status.status,
      dateCreated: task.date_created,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create task: ${getErrorMessage(error)}`,
    };
  }
}

export async function createTaskStep(
  input: CreateTaskInput
): Promise<CreateTaskResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
createTaskStep.maxRetries = 0;

export const _integrationType = "clickup";
