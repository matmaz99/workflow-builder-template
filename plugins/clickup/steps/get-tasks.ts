import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import { getErrorMessage } from "@/lib/utils";
import type { ClickUpCredentials } from "../credentials";

const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

type ClickUpTaskAssignee = {
  id: number;
  username: string;
  email: string;
};

type ClickUpTaskTag = {
  name: string;
};

type ClickUpTaskListItem = {
  id: string;
  name: string;
  description?: string;
  status: {
    status: string;
    type: string;
  };
  priority?: {
    id: string;
    priority: string;
  };
  date_created: string;
  date_updated: string;
  due_date?: string;
  start_date?: string;
  time_estimate?: number;
  url: string;
  assignees: ClickUpTaskAssignee[];
  tags: ClickUpTaskTag[];
};

type ClickUpTasksResponse = {
  tasks: ClickUpTaskListItem[];
};

type TaskItem = {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  url: string;
  dateCreated: string;
  dateUpdated: string;
  dateDue: string;
  dateStarted: string;
  timeEstimate: number;
  assignees: Array<{
    id: number;
    username: string;
    email: string;
  }>;
  tags: string[];
};

type GetTasksResult =
  | {
      success: true;
      tasks: TaskItem[];
      count: number;
    }
  | { success: false; error: string };

export type GetTasksCoreInput = {
  listId: string;
  archived?: string;
  page?: string;
  orderBy?: string;
  reverse?: string;
  subtasks?: string;
  statuses?: string;
  includeClosed?: string;
  assignees?: string;
  tags?: string;
  dueDateGt?: string;
  dueDateLt?: string;
  dateCreatedGt?: string;
  dateCreatedLt?: string;
  dateUpdatedGt?: string;
  dateUpdatedLt?: string;
};

export type GetTasksInput = StepInput &
  GetTasksCoreInput & {
    integrationId?: string;
  };

function parseCommaSeparated(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function stepHandler(
  input: GetTasksCoreInput,
  credentials: ClickUpCredentials
): Promise<GetTasksResult> {
  const apiKey = credentials.CLICKUP_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "CLICKUP_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const params = new URLSearchParams();

    if (input.archived === "true") {
      params.append("archived", "true");
    }

    if (input.page) {
      params.append("page", input.page);
    }

    if (input.orderBy) {
      params.append("order_by", input.orderBy);
    }

    if (input.reverse === "true") {
      params.append("reverse", "true");
    }

    if (input.subtasks === "true") {
      params.append("subtasks", "true");
    }

    if (input.includeClosed === "true") {
      params.append("include_closed", "true");
    }

    const statuses = parseCommaSeparated(input.statuses);
    for (const status of statuses) {
      params.append("statuses[]", status);
    }

    const assignees = parseCommaSeparated(input.assignees);
    for (const assignee of assignees) {
      params.append("assignees[]", assignee);
    }

    const tags = parseCommaSeparated(input.tags);
    for (const tag of tags) {
      params.append("tags[]", tag);
    }

    if (input.dueDateGt) {
      params.append("due_date_gt", input.dueDateGt);
    }

    if (input.dueDateLt) {
      params.append("due_date_lt", input.dueDateLt);
    }

    if (input.dateCreatedGt) {
      params.append("date_created_gt", input.dateCreatedGt);
    }

    if (input.dateCreatedLt) {
      params.append("date_created_lt", input.dateCreatedLt);
    }

    if (input.dateUpdatedGt) {
      params.append("date_updated_gt", input.dateUpdatedGt);
    }

    if (input.dateUpdatedLt) {
      params.append("date_updated_lt", input.dateUpdatedLt);
    }

    const queryString = params.toString();
    const url = `${CLICKUP_API_URL}/list/${input.listId}/task${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { err?: string; error?: string };
      return {
        success: false,
        error: errorData.err || errorData.error || `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as ClickUpTasksResponse;

    const tasks: TaskItem[] = data.tasks.map((task) => ({
      id: task.id,
      name: task.name,
      description: task.description || "",
      status: task.status.status,
      priority: task.priority?.priority || "none",
      url: task.url,
      dateCreated: task.date_created,
      dateUpdated: task.date_updated,
      dateDue: task.due_date || "",
      dateStarted: task.start_date || "",
      timeEstimate: task.time_estimate || 0,
      assignees: task.assignees.map((a) => ({
        id: a.id,
        username: a.username,
        email: a.email,
      })),
      tags: task.tags.map((t) => t.name),
    }));

    return {
      success: true,
      tasks,
      count: tasks.length,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get tasks: ${getErrorMessage(error)}`,
    };
  }
}

export async function getTasksStep(
  input: GetTasksInput
): Promise<GetTasksResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getTasksStep.maxRetries = 0;

export const _integrationType = "clickup";
