import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ElevenlabsCredentials } from "../credentials";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

type Voice = {
  voice_id: string;
  name: string;
  category: string;
  description: string | null;
  labels: Record<string, string>;
  preview_url: string | null;
};

type VoiceInfo = {
  voiceId: string;
  name: string;
  category: string;
  description: string | null;
  labels: Record<string, string>;
  previewUrl: string | null;
};

type GetVoicesResult =
  | { success: true; voices: VoiceInfo[] }
  | { success: false; error: string };

export type GetVoicesCoreInput = Record<string, never>;

export type GetVoicesInput = StepInput &
  GetVoicesCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  _input: GetVoicesCoreInput,
  credentials: ElevenlabsCredentials
): Promise<GetVoicesResult> {
  const apiKey = credentials.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "ELEVENLABS_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
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

    const data = (await response.json()) as { voices: Voice[] };

    const voices: VoiceInfo[] = data.voices.map((voice) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description,
      labels: voice.labels,
      previewUrl: voice.preview_url,
    }));

    return {
      success: true,
      voices,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to fetch voices: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function getVoicesStep(
  input: GetVoicesInput
): Promise<GetVoicesResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler({}, credentials));
}

export const _integrationType = "elevenlabs";
