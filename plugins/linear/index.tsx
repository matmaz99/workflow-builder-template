import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { createTicketCodegenTemplate } from "./codegen/create-ticket";
import { findIssuesCodegenTemplate } from "./codegen/find-issues";
import { CreateTicketConfigFields } from "./steps/create-ticket/config";
import { FindIssuesConfigFields } from "./steps/find-issues/config";

const linearPlugin: IntegrationPlugin = {
  type: "linear",
  label: "Linear",
  description: "Create and manage issues in Linear",

  icon: {
    type: "image",
    value: "/integrations/linear.svg",
  },

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "lin_api_...",
      configKey: "apiKey",
      envVar: "LINEAR_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "linear.app",
        url: "https://linear.app/settings/account/security/api-keys/new",
      },
    },
    {
      id: "teamId",
      label: "Team ID (Optional)",
      type: "text",
      placeholder: "Will use first team if not specified",
      configKey: "teamId",
      envVar: "LINEAR_TEAM_ID",
      helpText: "The team ID to create issues in. Leave blank to use your first team.",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testLinear } = await import("./test");
      return testLinear;
    },
  },

  dependencies: {
    "@linear/sdk": "^63.2.0",
  },

  actions: [
    {
      slug: "create-ticket",
      label: "Create Ticket",
      description: "Create an issue in Linear",
      category: "Linear",
      stepFunction: "createTicketStep",
      stepImportPath: "create-ticket",
      configFields: CreateTicketConfigFields,
      codegenTemplate: createTicketCodegenTemplate,
      aiPrompt: `{"actionType": "linear/create-ticket", "ticketTitle": "Title", "ticketDescription": "Description", "ticketPriority": "2"}`,
    },
    {
      slug: "find-issues",
      label: "Find Issues",
      description: "Search for issues in Linear",
      category: "Linear",
      stepFunction: "findIssuesStep",
      stepImportPath: "find-issues",
      configFields: FindIssuesConfigFields,
      codegenTemplate: findIssuesCodegenTemplate,
      aiPrompt: `{"actionType": "linear/find-issues", "linearStatus": "in_progress"}`,
    },
  ],
};

// Auto-register on import
registerIntegration(linearPlugin);

export default linearPlugin;

