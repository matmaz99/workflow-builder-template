import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ElevenlabsCredentials } from "../credentials";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

type SoundEffectsResult =
  | { success: true; audioBase64: string; contentType: string }
  | { success: false; error: string };

export type SoundEffectsCoreInput = {
  text: string;
  durationSeconds?: number;
};

export type SoundEffectsInput = StepInput &
  SoundEffectsCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: SoundEffectsCoreInput,
  credentials: ElevenlabsCredentials
): Promise<SoundEffectsResult> {
  const apiKey = credentials.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "ELEVENLABS_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.text || input.text.trim() === "") {
    return {
      success: false,
      error: "Text description is required for sound effect generation",
    };
  }

  try {
    const requestBody: Record<string, unknown> = {
      text: input.text,
    };

    if (input.durationSeconds !== undefined) {
      requestBody.duration_seconds = input.durationSeconds;
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/sound-generation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

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

    return {
      success: true,
      audioBase64,
      contentType: "audio/mpeg",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to generate sound effect: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function soundEffectsStep(
  input: SoundEffectsInput
): Promise<SoundEffectsResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "elevenlabs";
