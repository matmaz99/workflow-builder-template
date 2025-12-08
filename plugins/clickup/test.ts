const CLICKUP_API_URL = "https://api.clickup.com/api/v2";

type ClickUpUser = {
  user: {
    id: number;
    username: string;
    email: string;
  };
};

export async function testClickUp(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.CLICKUP_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "CLICKUP_API_KEY is required",
      };
    }

    // Validate API key by fetching the authorized user
    const response = await fetch(`${CLICKUP_API_URL}/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key. Please check your ClickUp API key.",
        };
      }
      return {
        success: false,
        error: `API validation failed: HTTP ${response.status}`,
      };
    }

    const result = (await response.json()) as ClickUpUser;

    if (!result.user?.id) {
      return {
        success: false,
        error: "Failed to verify ClickUp connection",
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
