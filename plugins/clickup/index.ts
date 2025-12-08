import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { ClickUpIcon } from "./icon";

const clickupPlugin: IntegrationPlugin = {
  type: "clickup",
  label: "ClickUp",
  description: "Create and manage tasks in ClickUp workspaces",

  icon: ClickUpIcon,

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "pk_...",
      configKey: "apiKey",
      envVar: "CLICKUP_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "clickup.com/api",
        url: "https://app.clickup.com/settings/apps",
      },
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testClickUp } = await import("./test");
      return testClickUp;
    },
  },

  actions: [
    {
      slug: "create-task",
      label: "Create Task",
      description: "Create a new task in a ClickUp list",
      category: "ClickUp",
      stepFunction: "createTaskStep",
      stepImportPath: "create-task",
      outputFields: [
        { field: "id", description: "Unique ID of the created task" },
        { field: "name", description: "Name of the task" },
        { field: "url", description: "URL to view the task in ClickUp" },
        { field: "status", description: "Current status of the task" },
        { field: "dateCreated", description: "Timestamp when task was created" },
      ],
      configFields: [
        {
          key: "listId",
          label: "List ID",
          type: "template-input",
          placeholder: "123456789 or {{NodeName.listId}}",
          example: "123456789",
          required: true,
        },
        {
          key: "name",
          label: "Task Name",
          type: "template-input",
          placeholder: "My task or {{NodeName.title}}",
          example: "Complete project documentation",
          required: true,
        },
        {
          key: "description",
          label: "Description",
          type: "template-textarea",
          placeholder:
            "Task description. Use {{NodeName.field}} to insert data from previous nodes.",
          rows: 4,
          example: "This task involves documenting the project setup process.",
        },
        {
          key: "assignees",
          label: "Assignees (comma-separated user IDs)",
          type: "template-input",
          placeholder: "12345678, 87654321 or {{NodeName.assignees}}",
          example: "12345678",
        },
        {
          key: "tags",
          label: "Tags (comma-separated)",
          type: "template-input",
          placeholder: "urgent, bug, feature",
          example: "documentation, priority",
        },
        {
          key: "status",
          label: "Status (optional)",
          type: "template-input",
          placeholder: "to do, in progress, complete",
          example: "to do",
        },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          defaultValue: "none",
          options: [
            { value: "none", label: "No Priority" },
            { value: "1", label: "Urgent" },
            { value: "2", label: "High" },
            { value: "3", label: "Normal" },
            { value: "4", label: "Low" },
          ],
        },
        {
          key: "dueDate",
          label: "Due Date (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698883200000 or {{NodeName.dueDate}}",
        },
        {
          key: "startDate",
          label: "Start Date (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698796800000 or {{NodeName.startDate}}",
        },
        {
          key: "timeEstimate",
          label: "Time Estimate (milliseconds)",
          type: "template-input",
          placeholder: "3600000 or {{NodeName.timeEstimate}}",
        },
        {
          key: "parentTaskId",
          label: "Parent Task ID (for subtasks)",
          type: "template-input",
          placeholder: "abc123 or {{NodeName.parentTaskId}}",
        },
      ],
    },
    {
      slug: "update-task",
      label: "Update Task",
      description: "Update an existing task in ClickUp",
      category: "ClickUp",
      stepFunction: "updateTaskStep",
      stepImportPath: "update-task",
      outputFields: [
        { field: "id", description: "Unique ID of the updated task" },
        { field: "name", description: "Updated name of the task" },
        { field: "url", description: "URL to view the task in ClickUp" },
        { field: "status", description: "Current status of the task" },
        { field: "dateUpdated", description: "Timestamp when task was last updated" },
      ],
      configFields: [
        {
          key: "taskId",
          label: "Task ID",
          type: "template-input",
          placeholder: "abc123 or {{NodeName.taskId}}",
          example: "abc123xyz",
          required: true,
        },
        {
          key: "name",
          label: "New Name (optional)",
          type: "template-input",
          placeholder: "Updated task name or {{NodeName.title}}",
        },
        {
          key: "description",
          label: "New Description (optional)",
          type: "template-textarea",
          placeholder:
            "Updated description. Use {{NodeName.field}} to insert data.",
          rows: 4,
        },
        {
          key: "status",
          label: "Status (optional)",
          type: "template-input",
          placeholder: "to do, in progress, complete",
        },
        {
          key: "priority",
          label: "Priority",
          type: "select",
          defaultValue: "none",
          options: [
            { value: "none", label: "No change" },
            { value: "1", label: "Urgent" },
            { value: "2", label: "High" },
            { value: "3", label: "Normal" },
            { value: "4", label: "Low" },
            { value: "null", label: "Clear Priority" },
          ],
        },
        {
          key: "dueDate",
          label: "Due Date (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698883200000 or {{NodeName.dueDate}}",
        },
        {
          key: "startDate",
          label: "Start Date (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698796800000 or {{NodeName.startDate}}",
        },
        {
          key: "timeEstimate",
          label: "Time Estimate (milliseconds)",
          type: "template-input",
          placeholder: "3600000 or {{NodeName.timeEstimate}}",
        },
        {
          key: "assigneesAdd",
          label: "Add Assignees (comma-separated user IDs)",
          type: "template-input",
          placeholder: "12345678, 87654321",
        },
        {
          key: "assigneesRemove",
          label: "Remove Assignees (comma-separated user IDs)",
          type: "template-input",
          placeholder: "12345678, 87654321",
        },
        {
          key: "archived",
          label: "Archived",
          type: "select",
          defaultValue: "none",
          options: [
            { value: "none", label: "No change" },
            { value: "true", label: "Archive" },
            { value: "false", label: "Unarchive" },
          ],
        },
      ],
    },
    {
      slug: "get-task",
      label: "Get Task",
      description: "Get details of a specific task from ClickUp",
      category: "ClickUp",
      stepFunction: "getTaskStep",
      stepImportPath: "get-task",
      outputFields: [
        { field: "id", description: "Unique ID of the task" },
        { field: "name", description: "Name of the task" },
        { field: "description", description: "Task description" },
        { field: "status", description: "Current status name" },
        { field: "priority", description: "Priority level" },
        { field: "url", description: "URL to view the task in ClickUp" },
        { field: "dateCreated", description: "Timestamp when task was created" },
        { field: "dateUpdated", description: "Timestamp when task was last updated" },
        { field: "dateDue", description: "Due date timestamp" },
        { field: "dateStarted", description: "Start date timestamp" },
        { field: "timeEstimate", description: "Time estimate in milliseconds" },
        { field: "assignees", description: "Array of assignee objects" },
        { field: "tags", description: "Array of tag names" },
        { field: "listId", description: "ID of the list containing this task" },
        { field: "listName", description: "Name of the list containing this task" },
        { field: "folderId", description: "ID of the folder" },
        { field: "spaceId", description: "ID of the space" },
      ],
      configFields: [
        {
          key: "taskId",
          label: "Task ID",
          type: "template-input",
          placeholder: "abc123 or {{NodeName.taskId}}",
          example: "abc123xyz",
          required: true,
        },
        {
          key: "includeSubtasks",
          label: "Include Subtasks",
          type: "select",
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
      ],
    },
    {
      slug: "create-comment",
      label: "Create Comment",
      description: "Add a comment to a task in ClickUp",
      category: "ClickUp",
      stepFunction: "createCommentStep",
      stepImportPath: "create-comment",
      outputFields: [
        { field: "id", description: "Unique ID of the created comment" },
        { field: "histId", description: "History ID of the comment" },
        { field: "date", description: "Timestamp when comment was created" },
      ],
      configFields: [
        {
          key: "taskId",
          label: "Task ID",
          type: "template-input",
          placeholder: "abc123 or {{NodeName.taskId}}",
          example: "abc123xyz",
          required: true,
        },
        {
          key: "commentText",
          label: "Comment Text",
          type: "template-textarea",
          placeholder:
            "Your comment. Use {{NodeName.field}} to insert data from previous nodes.",
          rows: 4,
          example: "This task has been reviewed and approved.",
          required: true,
        },
        {
          key: "assignee",
          label: "Assignee (user ID to assign comment)",
          type: "template-input",
          placeholder: "12345678 or {{NodeName.assignee}}",
        },
        {
          key: "notifyAll",
          label: "Notify All Assignees",
          type: "select",
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
      ],
    },
    {
      slug: "get-tasks",
      label: "Get Tasks from List",
      description: "Get all tasks from a specific ClickUp list",
      category: "ClickUp",
      stepFunction: "getTasksStep",
      stepImportPath: "get-tasks",
      outputFields: [
        { field: "tasks", description: "Array of task objects" },
        { field: "count", description: "Number of tasks returned" },
      ],
      configFields: [
        {
          key: "listId",
          label: "List ID",
          type: "template-input",
          placeholder: "123456789 or {{NodeName.listId}}",
          example: "123456789",
          required: true,
        },
        {
          key: "archived",
          label: "Include Archived",
          type: "select",
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
        {
          key: "page",
          label: "Page Number",
          type: "number",
          defaultValue: "0",
          min: 0,
        },
        {
          key: "orderBy",
          label: "Order By",
          type: "select",
          defaultValue: "none",
          options: [
            { value: "none", label: "Default" },
            { value: "id", label: "ID" },
            { value: "created", label: "Created Date" },
            { value: "updated", label: "Updated Date" },
            { value: "due_date", label: "Due Date" },
          ],
        },
        {
          key: "reverse",
          label: "Reverse Order",
          type: "select",
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
        {
          key: "subtasks",
          label: "Include Subtasks",
          type: "select",
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
        {
          key: "statuses",
          label: "Filter by Statuses (comma-separated)",
          type: "template-input",
          placeholder: "to do, in progress",
        },
        {
          key: "includeClosed",
          label: "Include Closed Tasks",
          type: "select",
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Yes" },
          ],
        },
        {
          key: "assignees",
          label: "Filter by Assignees (comma-separated user IDs)",
          type: "template-input",
          placeholder: "12345678, 87654321",
        },
        {
          key: "tags",
          label: "Filter by Tags (comma-separated)",
          type: "template-input",
          placeholder: "urgent, bug",
        },
        {
          key: "dueDateGt",
          label: "Due Date Greater Than (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698796800000",
        },
        {
          key: "dueDateLt",
          label: "Due Date Less Than (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698883200000",
        },
        {
          key: "dateCreatedGt",
          label: "Created After (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698796800000",
        },
        {
          key: "dateCreatedLt",
          label: "Created Before (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698883200000",
        },
        {
          key: "dateUpdatedGt",
          label: "Updated After (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698796800000",
        },
        {
          key: "dateUpdatedLt",
          label: "Updated Before (Unix timestamp in ms)",
          type: "template-input",
          placeholder: "1698883200000",
        },
      ],
    },
  ],
};

registerIntegration(clickupPlugin);

export default clickupPlugin;
