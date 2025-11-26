import "server-only";

import { createGateway, generateObject, generateText } from "ai";
import { z } from "zod";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateBadgeTextarea } from "@/components/ui/template-badge-textarea";
import { SchemaBuilder } from "@/components/workflow/config/schema-builder";
import { fetchCredentials } from "@/lib/credential-fetcher";
import { getErrorMessageAsync } from "@/lib/utils";

type SchemaField = {
  name: string;
  type: string;
};

type GenerateTextResult =
  | { success: true; text: string }
  | { success: true; object: Record<string, unknown> }
  | { success: false; error: string };

/**
 * Gets the full model string in provider/model format.
 */
function getModelString(modelId: string): string {
  if (modelId.includes("/")) {
    return modelId;
  }

  if (modelId.startsWith("claude-")) {
    return `anthropic/${modelId}`;
  }
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1-")) {
    return `openai/${modelId}`;
  }
  return `openai/${modelId}`;
}

/**
 * Builds a Zod schema from a field definition array
 */
function buildZodSchema(
  fields: SchemaField[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.type === "string") {
      schemaShape[field.name] = z.string();
    } else if (field.type === "number") {
      schemaShape[field.name] = z.number();
    } else if (field.type === "boolean") {
      schemaShape[field.name] = z.boolean();
    }
  }

  return z.object(schemaShape);
}

/**
 * Generate Text Step
 * Uses AI Gateway to generate text with various models
 */
export async function generateTextStep(input: {
  integrationId?: string;
  aiModel?: string;
  aiPrompt?: string;
  aiFormat?: string;
  aiSchema?: string;
}): Promise<GenerateTextResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  const apiKey = credentials.AI_GATEWAY_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "AI_GATEWAY_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  const modelId = input.aiModel || "meta/llama-4-scout";
  const promptText = input.aiPrompt || "";

  if (!promptText || promptText.trim() === "") {
    return {
      success: false,
      error: "Prompt is required for text generation",
    };
  }

  const modelString = getModelString(modelId);

  try {
    const gateway = createGateway({
      apiKey,
    });

    if (input.aiFormat === "object" && input.aiSchema) {
      const schema = JSON.parse(input.aiSchema) as SchemaField[];
      const zodSchema = buildZodSchema(schema);

      const { object } = await generateObject({
        model: gateway(modelString),
        prompt: promptText,
        schema: zodSchema,
      });

      return { success: true, object };
    }

    const { text } = await generateText({
      model: gateway(modelString),
      prompt: promptText,
    });

    return { success: true, text };
  } catch (error) {
    const message = await getErrorMessageAsync(error);
    return {
      success: false,
      error: `Text generation failed: ${message}`,
    };
  }
}

/**
 * Generate Text Config Fields Component
 */
export function GenerateTextConfigFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="aiFormat">Output Format</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("aiFormat", value)}
          value={(config?.aiFormat as string) || "text"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="object">Object</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiModel">Model</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("aiModel", value)}
          value={(config?.aiModel as string) || "meta/llama-4-scout"}
        >
          <SelectTrigger className="w-full" id="aiModel">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="anthropic/claude-opus-4.5">
              Claude Opus 4.5
            </SelectItem>
            <SelectItem value="anthropic/claude-sonnet-4.0">
              Claude Sonnet 4.0
            </SelectItem>
            <SelectItem value="anthropic/claude-3.5-sonnet-20241022">
              Claude 3.5 Sonnet
            </SelectItem>
            <SelectItem value="anthropic/claude-3-7-sonnet">
              Claude 3.7 Sonnet
            </SelectItem>
            <SelectItem value="openai/gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="openai/o1">o1</SelectItem>
            <SelectItem value="openai/o1-mini">o1 Mini</SelectItem>
            <SelectItem value="openai/gpt-4-turbo">GPT-4 Turbo</SelectItem>
            <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            <SelectItem value="google/gemini-4.0-flash">
              Gemini 4.0 Flash
            </SelectItem>
            <SelectItem value="google/gemini-2.0-flash">
              Gemini 2.0 Flash
            </SelectItem>
            <SelectItem value="google/gemini-2.0-flash-lite">
              Gemini 2.0 Flash Lite
            </SelectItem>
            <SelectItem value="meta/llama-4-scout">Llama 4 Scout</SelectItem>
            <SelectItem value="meta/llama-4-instruct">
              Llama 4 Instruct
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiPrompt">Prompt</Label>
        <TemplateBadgeTextarea
          disabled={disabled}
          id="aiPrompt"
          onChange={(value) => onUpdateConfig("aiPrompt", value)}
          placeholder="Enter your prompt here. Use {{NodeName.field}} to reference previous outputs."
          rows={4}
          value={(config?.aiPrompt as string) || ""}
        />
      </div>
      {config?.aiFormat === "object" && (
        <div className="space-y-2">
          <Label>Schema</Label>
          <SchemaBuilder
            disabled={disabled}
            onChange={(schema) =>
              onUpdateConfig("aiSchema", JSON.stringify(schema))
            }
            schema={
              config?.aiSchema ? JSON.parse(config.aiSchema as string) : []
            }
          />
        </div>
      )}
    </>
  );
}
