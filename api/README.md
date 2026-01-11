# DEPRECATED - Legacy API Directory

> **Warning**: This directory contains legacy code and is NOT part of the active application.

## Status: DEPRECATED

This `/api` directory contains old Vercel serverless functions that were used in a previous version of the application. They have been replaced by the monorepo structure:

- **Active API routes**: `apps/web/src/app/api/`
- **Core business logic**: `packages/core/`
- **Database adapters**: `packages/adapter-db/`

## Do NOT Use

- These files are NOT maintained
- These files are NOT included in the build
- These files may have outdated dependencies (Supabase JS client)

## Migration

All functionality has been migrated to:

| Legacy File | New Location |
|-------------|--------------|
| `api/pattern-attempts.js` | `apps/web/src/app/api/attempts/` |
| `api/patterns-unlock.js` | Handled by `packages/core/src/entities/skill-state.ts` |
| `api/problems.js` | `apps/web/src/app/api/problems/` |

## Removal

This directory can be safely deleted once all stakeholders confirm the migration is complete.
