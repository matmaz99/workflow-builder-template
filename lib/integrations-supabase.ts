import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { IntegrationConfig, IntegrationType } from "./types/integration";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ENCRYPTION_KEY_ENV = "INTEGRATION_ENCRYPTION_KEY";

/**
 * Get or generate encryption key from environment
 * Key should be a 32-byte hex string (64 characters)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env[ENCRYPTION_KEY_ENV];

  if (!keyHex) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} environment variable is required for encrypting integration credentials`
    );
  }

  if (keyHex.length !== 64) {
    throw new Error(
      `${ENCRYPTION_KEY_ENV} must be a 64-character hex string (32 bytes)`
    );
  }

  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt sensitive data
 * Returns a string in format: iv:authTag:encryptedData (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt encrypted data
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt integration config object
 */
function encryptConfig(config: Record<string, unknown>): string {
  return encrypt(JSON.stringify(config));
}

/**
 * Decrypt integration config object
 */
function decryptConfig(encryptedConfig: string): Record<string, unknown> {
  try {
    const decrypted = decrypt(encryptedConfig);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Failed to decrypt integration config:", error);
    return {};
  }
}

export type DecryptedIntegration = {
  id: string;
  userId: string;
  name: string;
  type: IntegrationType;
  config: IntegrationConfig;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get all integrations for a user, optionally filtered by type
 */
export async function getIntegrations(
  userId: string,
  type?: IntegrationType
): Promise<DecryptedIntegration[]> {
  const supabase = await createClient();

  let query = supabase.from("integrations").select("*").eq("user_id", userId);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to get integrations:", error);
    return [];
  }

  return (data || []).map((integration) => ({
    id: integration.id,
    userId: integration.user_id,
    name: integration.name,
    type: integration.type as IntegrationType,
    config: decryptConfig(integration.config) as IntegrationConfig,
    createdAt: new Date(integration.created_at),
    updatedAt: new Date(integration.updated_at),
  }));
}

/**
 * Get a single integration by ID (with user validation via RLS)
 */
export async function getIntegration(
  integrationId: string,
  userId: string
): Promise<DecryptedIntegration | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    type: data.type as IntegrationType,
    config: decryptConfig(data.config) as IntegrationConfig,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Get a single integration by ID without user check (for system use during workflow execution)
 * Uses admin client to bypass RLS
 */
export async function getIntegrationById(
  integrationId: string
): Promise<DecryptedIntegration | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    type: data.type as IntegrationType,
    config: decryptConfig(data.config) as IntegrationConfig,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Create a new integration
 */
export async function createIntegration(
  userId: string,
  name: string,
  type: IntegrationType,
  config: IntegrationConfig
): Promise<DecryptedIntegration> {
  const supabase = await createClient();
  const encryptedConfig = encryptConfig(config);

  const { data, error } = await supabase
    .from("integrations")
    .insert({
      user_id: userId,
      name,
      type,
      config: encryptedConfig,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create integration");
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    type: data.type as IntegrationType,
    config,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Update an integration
 */
export async function updateIntegration(
  integrationId: string,
  userId: string,
  updates: {
    name?: string;
    config?: IntegrationConfig;
  }
): Promise<DecryptedIntegration | null> {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }

  if (updates.config !== undefined) {
    updateData.config = encryptConfig(updates.config);
  }

  const { data, error } = await supabase
    .from("integrations")
    .update(updateData)
    .eq("id", integrationId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    type: data.type as IntegrationType,
    config: decryptConfig(data.config) as IntegrationConfig,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Delete an integration
 */
export async function deleteIntegration(
  integrationId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("integrations")
    .delete()
    .eq("id", integrationId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to delete integration:", error);
    return false;
  }

  return (count ?? 0) > 0 || !error;
}

/**
 * Workflow node structure for validation
 */
type WorkflowNodeForValidation = {
  data?: {
    config?: {
      integrationId?: string;
    };
  };
};

/**
 * Extract all integration IDs from workflow nodes
 */
export function extractIntegrationIds(
  nodes: WorkflowNodeForValidation[]
): string[] {
  const integrationIds: string[] = [];

  for (const node of nodes) {
    const integrationId = node.data?.config?.integrationId;
    if (integrationId && typeof integrationId === "string") {
      integrationIds.push(integrationId);
    }
  }

  return [...new Set(integrationIds)];
}

/**
 * Validate that all integration IDs in workflow nodes either:
 * 1. Belong to the specified user, or
 * 2. Don't exist (deleted integrations - stale references are allowed)
 *
 * This prevents users from accessing other users' credentials by embedding
 * foreign integration IDs in their workflows, while allowing workflows
 * with references to deleted integrations to still be saved.
 *
 * Uses admin client to check all integrations regardless of RLS
 *
 * @returns Object with `valid` boolean and optional `invalidIds` array
 */
export async function validateWorkflowIntegrations(
  nodes: WorkflowNodeForValidation[],
  userId: string
): Promise<{ valid: boolean; invalidIds?: string[] }> {
  const integrationIds = extractIntegrationIds(nodes);

  if (integrationIds.length === 0) {
    return { valid: true };
  }

  const supabase = createAdminClient();

  // Query for ALL integrations with these IDs (regardless of user)
  // to check if any belong to other users
  const { data: existingIntegrations, error } = await supabase
    .from("integrations")
    .select("id, user_id")
    .in("id", integrationIds);

  if (error) {
    console.error("Failed to validate integrations:", error);
    return { valid: false };
  }

  // Find integrations that exist but belong to a different user
  // (deleted integrations won't appear here, which is fine)
  const invalidIds = (existingIntegrations || [])
    .filter((i) => i.user_id !== userId)
    .map((i) => i.id);

  if (invalidIds.length > 0) {
    return { valid: false, invalidIds };
  }

  return { valid: true };
}
