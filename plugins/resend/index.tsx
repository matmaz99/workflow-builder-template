import type { IntegrationPlugin } from "../registry";
import { registerIntegration } from "../registry";
import { sendEmailCodegenTemplate } from "./codegen/send-email";
import { ResendIcon } from "./icon";
import { SendEmailConfigFields } from "./steps/send-email/config";

const resendPlugin: IntegrationPlugin = {
  type: "resend",
  label: "Resend",
  description: "Send transactional emails",

  icon: {
    type: "svg",
    value: "ResendIcon",
    svgComponent: ResendIcon,
  },

  formFields: [
    {
      id: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "re_...",
      configKey: "apiKey",
      envVar: "RESEND_API_KEY",
      helpText: "Get your API key from ",
      helpLink: {
        text: "resend.com/api-keys",
        url: "https://resend.com/api-keys",
      },
    },
    {
      id: "fromEmail",
      label: "From Email",
      type: "text",
      placeholder: "noreply@yourdomain.com",
      configKey: "fromEmail",
      envVar: "RESEND_FROM_EMAIL",
      helpText: "The email address that will appear as the sender",
    },
  ],

  testConfig: {
    getTestFunction: async () => {
      const { testResend } = await import("./test");
      return testResend;
    },
  },

  dependencies: {
    resend: "^6.4.0",
  },

  actions: [
    {
      slug: "send-email",
      label: "Send Email",
      description: "Send an email via Resend",
      category: "Resend",
      stepFunction: "sendEmailStep",
      stepImportPath: "send-email",
      configFields: SendEmailConfigFields,
      codegenTemplate: sendEmailCodegenTemplate,
      aiPrompt: `{"actionType": "resend/send-email", "emailTo": "user@example.com", "emailSubject": "Subject", "emailBody": "Body"}`,
    },
  ],
};

// Auto-register on import
registerIntegration(resendPlugin);

export default resendPlugin;

