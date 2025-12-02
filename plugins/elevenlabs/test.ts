const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export async function testElevenlabs(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "ELEVENLABS_API_KEY is required",
      };
    }

    // Validate API key by fetching user info (lightweight read-only endpoint)
    const response = await fetch(`${ELEVENLABS_API_URL}/user`, {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your ElevenLabs API key.",
        };
      }
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
