import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ElevenlabsCredentials } from "../credentials";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

type TextToSpeechResult =
  | { success: true; audioBase64: string; contentType: string }
  | { success: false; error: string };

export type TextToSpeechCoreInput = {
  voiceId: string;
  text: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  outputFormat?: string;
};

export type TextToSpeechInput = StepInput &
  TextToSpeechCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: TextToSpeechCoreInput,
  credentials: ElevenlabsCredentials
): Promise<TextToSpeechResult> {
  const apiKey = credentials.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "ELEVENLABS_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.voiceId) {
    return {
      success: false,
      error: "Voice ID is required",
    };
  }

  if (!input.text || input.text.trim() === "") {
    return {
      success: false,
      error: "Text is required for text-to-speech conversion",
    };
  }

  const outputFormat = input.outputFormat || "mp3_44100_128";

  try {
    const voiceSettings: Record<string, number> = {};

    if (input.stability !== undefined) {
      voiceSettings.stability = input.stability;
    }
    if (input.similarityBoost !== undefined) {
      voiceSettings.similarity_boost = input.similarityBoost;
    }
    if (input.style !== undefined) {
      voiceSettings.style = input.style;
    }

    const requestBody: Record<string, unknown> = {
      text: input.text,
      model_id: input.modelId || "eleven_multilingual_v2",
    };

    if (Object.keys(voiceSettings).length > 0) {
      requestBody.voice_settings = voiceSettings;
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${input.voiceId}?output_format=${outputFormat}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorData = JSON.parse(errorText) as { detail?: { message?: string } };
        errorMessage =
          errorData.detail?.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      return {
        success: false,
        error: errorMessage,
      };
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    const contentType = outputFormat.startsWith("mp3") ? "audio/mpeg" : "audio/wav";

    return {
      success: true,
      audioBase64,
      contentType,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to generate speech: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function textToSpeechStep(
  input: TextToSpeechInput
): Promise<TextToSpeechResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "elevenlabs";
