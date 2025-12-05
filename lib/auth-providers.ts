type AuthProvider = "email" | "github" | "google";

type EnabledProviders = {
  email: boolean;
  github: boolean;
  google: boolean;
};

interface WindowWithEnv extends Window {
  ENV?: {
    NEXT_PUBLIC_AUTH_PROVIDERS?: string;
  };
}

/**
 * Get the list of enabled authentication providers from environment variables
 * Defaults to email only if not specified
 * Note: OAuth providers must be configured in Supabase Dashboard
 */
export function getEnabledAuthProviders(): EnabledProviders {
  const providersEnv =
    process.env.NEXT_PUBLIC_AUTH_PROVIDERS ||
    (typeof window !== "undefined"
      ? (window as WindowWithEnv).ENV?.NEXT_PUBLIC_AUTH_PROVIDERS
      : undefined) ||
    "email";

  const enabledProviders = providersEnv
    .split(",")
    .map((p: string) => p.trim().toLowerCase());

  return {
    email: enabledProviders.includes("email"),
    github: enabledProviders.includes("github"),
    google: enabledProviders.includes("google"),
  };
}

/**
 * Get array of enabled provider names
 */
export function getEnabledProvidersList(): AuthProvider[] {
  const providers = getEnabledAuthProviders();
  return Object.entries(providers)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name as AuthProvider);
}

/**
 * Get the single enabled provider, or null if there are multiple
 */
export function getSingleProvider(): AuthProvider | null {
  const providersList = getEnabledProvidersList();
  return providersList.length === 1 ? providersList[0] : null;
}
