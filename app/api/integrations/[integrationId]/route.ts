import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteIntegration,
  getIntegration,
  updateIntegration,
} from "@/lib/integrations-supabase";
import type { IntegrationConfig } from "@/lib/types/integration";

export type GetIntegrationResponse = {
  id: string;
  name: string;
  type: string;
  config: IntegrationConfig;
  createdAt: string;
  updatedAt: string;
};

export type UpdateIntegrationRequest = {
  name?: string;
  config?: IntegrationConfig;
};

/**
 * GET /api/integrations/[integrationId]
 * Get a single integration with decrypted config
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await getIntegration(integrationId, user.id);

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const response: GetIntegrationResponse = {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      config: integration.config,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to get integration:", error);
    return NextResponse.json(
      {
        error: "Failed to get integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrations/[integrationId]
 * Update an integration
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateIntegrationRequest = await request.json();

    const integration = await updateIntegration(
      integrationId,
      user.id,
      body
    );

    if (!integration) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const response: GetIntegrationResponse = {
      id: integration.id,
      name: integration.name,
      type: integration.type,
      config: integration.config,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to update integration:", error);
    return NextResponse.json(
      {
        error: "Failed to update integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrations/[integrationId]
 * Delete an integration
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ integrationId: string }> }
) {
  try {
    const { integrationId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await deleteIntegration(integrationId, user.id);

    if (!success) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete integration:", error);
    return NextResponse.json(
      {
        error: "Failed to delete integration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
