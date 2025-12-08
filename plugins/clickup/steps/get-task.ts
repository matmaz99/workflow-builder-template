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
  color: string;
  profilePicture?: string;
};

type ClickUpTaskTag = {
  name: string;
  tag_fg: string;
  tag_bg: string;
};

type ClickUpTaskResponse = {
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
  list: {
    id: string;
    name: string;
  };
  folder: {
    id: string;
    name: string;
  };
  space: {
    id: string;
  };
  subtasks?: Array<{
    id: string;
    name: string;
    status: {
      status: string;
    };
  }>;
};

type GetTaskResult =
  | {
      success: true;
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
      listId: string;
      listName: string;
      folderId: string;
      spaceId: string;
      subtasks?: Array<{
        id: string;
        name: string;
        status: string;
      }>;
    }
  | { success: false; error: string };

export type GetTaskCoreInput = {
  taskId: string;
  includeSubtasks?: string;
};

export type GetTaskInput = StepInput &
  GetTaskCoreInput & {
    integrationId?: string;
  };

async function stepHandler(
  input: GetTaskCoreInput,
  credentials: ClickUpCredentials
): Promise<GetTaskResult> {
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

    if (input.includeSubtasks === "true") {
      params.append("include_subtasks", "true");
    }

    const queryString = params.toString();
    const url = `${CLICKUP_API_URL}/task/${input.taskId}${queryString ? `?${queryString}` : ""}`;

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

    const task = (await response.json()) as ClickUpTaskResponse;

    return {
      success: true,
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
      listId: task.list.id,
      listName: task.list.name,
      folderId: task.folder.id,
      spaceId: task.space.id,
      subtasks: task.subtasks?.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status.status,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get task: ${getErrorMessage(error)}`,
    };
  }
}

export async function getTaskStep(
  input: GetTaskInput
): Promise<GetTaskResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}
getTaskStep.maxRetries = 0;

export const _integrationType = "clickup";
