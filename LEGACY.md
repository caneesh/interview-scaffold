# Legacy Code Paths

This document identifies legacy code that is NOT part of the active application.

## Overview

This monorepo has evolved from an earlier architecture. The following paths contain legacy code that should NOT be used, modified, or referenced by new code.

## Legacy Directories

| Path | Description | Status |
|------|-------------|--------|
| `/api/` | Vercel serverless functions (JavaScript) | DEPRECATED |
| `/src/` | React/Vite frontend (JSX) | DEPRECATED |

## Legacy Root Files

| File | Description | Status |
|------|-------------|--------|
| `index.html` | Vite entry point | DEPRECATED |
| `vite.config.js` | Vite configuration | DEPRECATED |
| `tailwind.config.js` | Old Tailwind config | DEPRECATED |
| `supabase-schema*.sql` | Old Supabase schema | DEPRECATED |

## Active Application

The active application is structured as a Turborepo monorepo:

```
apps/
  web/              # Next.js 14 frontend + API routes (ACTIVE)

packages/
  core/             # Pure TypeScript business logic (ACTIVE)
  contracts/        # Zod schemas and API types (ACTIVE)
  adapter-db/       # Drizzle ORM + PostgreSQL (ACTIVE)
  adapter-llm/      # Anthropic SDK integration (ACTIVE)
  adapter-piston/   # Code execution via Piston API (ACTIVE)
  adapter-auth/     # Demo authentication (ACTIVE)
  adapter-analytics/# Console event logging (ACTIVE)
```

## Workspace Configuration

The `pnpm-workspace.yaml` only includes active paths:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Legacy directories are NOT included in the workspace.

## Safe to Delete

The following can be safely deleted after confirming no external references:

1. `/api/` directory and all contents
2. `/src/` directory and all contents
3. `index.html`
4. `vite.config.js`
5. `tailwind.config.js`
6. `supabase-schema*.sql` files

## Why Not Delete Now?

These files are preserved for:
- Historical reference during migration verification
- Potential rollback scenarios
- Documentation of previous architecture

Once the new architecture is fully validated in production, these files should be removed.
