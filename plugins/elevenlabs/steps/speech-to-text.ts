import "server-only";

import { fetchCredentials } from "@/lib/credential-fetcher";
import { type StepInput, withStepLogging } from "@/lib/steps/step-handler";
import type { ElevenlabsCredentials } from "../credentials";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

type SpeechToTextResult =
  | { success: true; text: string; language: string }
  | { success: false; error: string };

export type SpeechToTextCoreInput = {
  audioUrl: string;
  languageCode?: string;
};

export type SpeechToTextInput = StepInput &
  SpeechToTextCoreInput & {
    integrationId?: string;
  };

/**
 * Core logic - portable between app and export
 */
async function stepHandler(
  input: SpeechToTextCoreInput,
  credentials: ElevenlabsCredentials
): Promise<SpeechToTextResult> {
  const apiKey = credentials.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error:
        "ELEVENLABS_API_KEY is not configured. Please add it in Project Integrations.",
    };
  }

  if (!input.audioUrl || input.audioUrl.trim() === "") {
    return {
      success: false,
      error: "Audio URL is required for speech-to-text conversion",
    };
  }

  try {
    // First, fetch the audio file from the URL
    const audioResponse = await fetch(input.audioUrl);

    if (!audioResponse.ok) {
      return {
        success: false,
        error: `Failed to fetch audio from URL: HTTP ${audioResponse.status}`,
      };
    }

    const audioBlob = await audioResponse.blob();
    const contentType = audioResponse.headers.get("content-type") || "audio/mpeg";

    // Determine file extension from content type
    let extension = "mp3";
    if (contentType.includes("wav")) {
      extension = "wav";
    } else if (contentType.includes("ogg")) {
      extension = "ogg";
    } else if (contentType.includes("flac")) {
      extension = "flac";
    } else if (contentType.includes("webm")) {
      extension = "webm";
    }

    // Create FormData for the multipart request
    const formData = new FormData();
    formData.append("file", audioBlob, `audio.${extension}`);
    formData.append("model_id", "scribe_v1");

    if (input.languageCode) {
      formData.append("language_code", input.languageCode);
    }

    const response = await fetch(`${ELEVENLABS_API_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
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

    const data = (await response.json()) as {
      text: string;
      language_code: string;
    };

    return {
      success: true,
      text: data.text,
      language: data.language_code,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to transcribe audio: ${message}`,
    };
  }
}

/**
 * App entry point - fetches credentials and wraps with logging
 */
export async function speechToTextStep(
  input: SpeechToTextInput
): Promise<SpeechToTextResult> {
  "use step";

  const credentials = input.integrationId
    ? await fetchCredentials(input.integrationId)
    : {};

  return withStepLogging(input, () => stepHandler(input, credentials));
}

export const _integrationType = "elevenlabs";
