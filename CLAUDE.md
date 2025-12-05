# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Workflow Builder Template - A visual workflow automation platform built on Workflow DevKit. Users create workflows via drag-and-drop, connect integrations, execute them, and export to TypeScript code with `"use workflow"` directive.

## Commands

```bash
# Development
pnpm dev                    # Start dev server (auto-runs discover-plugins)
pnpm build                  # Production build

# Code Quality (run before commits)
pnpm type-check             # TypeScript validation
pnpm fix                    # Auto-fix formatting/linting (Ultracite)

# Database
pnpm db:generate            # Generate migrations from schema changes
pnpm db:push                # Apply migrations to database
pnpm db:studio              # Open Drizzle Studio

# Plugins
pnpm create-plugin          # Interactive plugin creation wizard
pnpm discover-plugins       # Regenerate plugin registries

# Testing
pnpm test:e2e               # Run Playwright tests
pnpm test:e2e:ui            # Run Playwright with UI
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with React 19, App Router
- **Workflow Engine**: Workflow DevKit (`"use workflow"` directive)
- **Database**: PostgreSQL with Drizzle ORM
- **State**: Jotai atoms for workflow canvas state
- **UI**: shadcn/ui + Tailwind CSS, React Flow for canvas
- **Auth**: Better Auth with OAuth providers
- **Code Quality**: Ultracite (Biome-based)

### Key Directories
- `app/` - Next.js App Router pages and API routes
- `components/workflow/` - Workflow canvas, nodes, config panels
- `lib/` - Core utilities, database, workflow execution/codegen
- `plugins/` - Integration plugins (self-contained per service)

### Plugin System

Each plugin lives in `plugins/[name]/` with:
- `index.ts` - Plugin definition with actions, form fields
- `credentials.ts` - Credential type (env var names as keys)
- `steps/[action].ts` - Server-side step functions
- `test.ts` - Connection validation
- `icon.tsx` - SVG icon component (or use Lucide)

Step functions follow a two-layer pattern:
```typescript
// stepHandler - core logic, receives credentials as param
async function stepHandler(input, credentials) { ... }

// [action]Step - entry point with logging wrapper
export async function myActionStep(input) {
  "use step";
  const credentials = input.integrationId ? await fetchCredentials(input.integrationId) : {};
  return withStepLogging(input, () => stepHandler(input, credentials));
}
```

### Workflow State (Jotai)

Main atoms in `lib/workflow-store.ts`:
- `nodesAtom`, `edgesAtom` - React Flow graph state
- `selectedNodeAtom`, `selectedEdgeAtom` - Selection state
- `currentWorkflowIdAtom` - Active workflow ID
- `autosaveAtom` - Debounced save to database

Use correct Jotai hooks:
- `useAtomValue(atom)` - Read only
- `useSetAtom(atom)` - Write only
- `useAtom(atom)` - Both (only when needed)

### API Architecture

Uses API routes, not server actions. Type-safe client at `@/lib/api-client`:
```typescript
import { api } from "@/lib/api-client";
api.workflow.create({ ... });
api.workflow.update(id, { ... });
api.integration.test(id);
```

### Database Schema

Tables in `lib/db/schema.ts`:
- `users`, `sessions`, `accounts` - Better Auth tables
- `workflows` - Workflow definitions (nodes/edges as JSONB)
- `integrations` - User credentials (encrypted config)
- `workflowExecutions` - Execution history
- `workflowExecutionLogs` - Per-node execution logs
- `apiKeys` - Webhook authentication

## Guidelines

### Package Manager
Always use **pnpm**. For shadcn: `pnpm dlx shadcn@latest add <component>`

### Database Migrations
Never write manual SQL. Update `lib/db/schema.ts`, then run `pnpm db:generate`.

### Plugin Development
- Use `fetch` directly - no SDK dependencies (reduces supply chain risk)
- Export `_integrationType` constant matching plugin type
- Include `"use step"` directive in entry point functions
- Use discriminated unions for result types: `{ success: true; ... } | { success: false; error: string }`

### Component Guidelines
- Use shadcn/ui components - don't duplicate functionality
- Never use native `alert()`/`confirm()` - use AlertDialog or Sonner toast
- Use `<Image>` from Next.js, not `<img>`

### Code Patterns
- Remove unused code entirely (no underscore prefixing)
- No barrel files (index re-exports)
- No server actions (`"use server"`)
- No emojis in code or documentation
