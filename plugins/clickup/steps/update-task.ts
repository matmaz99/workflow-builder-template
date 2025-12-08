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
  date_updated: string;
  url: string;
};

type UpdateTaskResult =
  | {
      success: true;
      id: string;
      name: string;
      url: string;
      status: string;
      dateUpdated: string;
    }
  | { success: false; error: string };

export type UpdateTaskCoreInput = {
  taskId: string;
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  startDate?: string;
  timeEstimate?: string;
  assigneesAdd?: string;
  assigneesRemove?: string;
  archived?: string;
};

export type UpdateTaskInput = StepInput &
  UpdateTaskCoreInput & {
    integrationId?: string;
  };

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
  input: UpdateTaskCoreInput,
  credentials: ClickUpCredentials
): Promise<UpdateTaskResult> {
  const apiKey = credentials.CLICKUP_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "CLICKUP_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const body: Record<string, unknown> = {};

    if (input.name) {
      body.name = input.name;
    }

    if (input.description) {
      body.description = input.description;
    }

    if (input.status) {
      body.status = input.status;
    }

    if (input.priority) {
      if (input.priority === "null") {
        body.priority = null;
      } else {
        body.priority = Number.parseInt(input.priority, 10);
      }
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

    const assigneesAdd = parseNumberArray(input.assigneesAdd);
    const assigneesRemove = parseNumberArray(input.assigneesRemove);

    if (assigneesAdd.length > 0 || assigneesRemove.length > 0) {
      body.assignees = {
        add: assigneesAdd,
        rem: assigneesRemove,
      };
    }

    if (input.archived === "true") {
      body.archived = true;
    } else if (input.archived === "false") {
      body.archived = false;
    }

    // Check if there's anything to update
    if (Object.keys(body).length === 0) {
      return {
        success: false,
        error: "No fields provided to update",
      };
    }

    const response = await fetch(`${CLICKUP_API_URL}/task/${input.taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(body),
    });

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
      dateUpdated: task.date_updated,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update task: ${getErrorMessage(error)}`,
    };
  }
}

export async function updateTaskStep(
  input: UpdateTaskInput
): Promise<UpdateTaskResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
updateTaskStep.maxRetries = 0;

export const _integrationType = "clickup";
