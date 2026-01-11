# DEPRECATED - Legacy Frontend Directory

> **Warning**: This directory contains legacy code and is NOT part of the active application.

## Status: DEPRECATED

This `/src` directory contains old React/Vite frontend code that was used in a previous version of the application. It has been replaced by the Next.js app:

- **Active frontend**: `apps/web/src/`
- **Active components**: `apps/web/src/components/`
- **Active pages**: `apps/web/src/app/`

## Do NOT Use

- These files are NOT maintained
- These files are NOT included in the build (no Vite config in workspace)
- These files use outdated patterns (React class components, old state management)

## Related Legacy Files

The following root files are also legacy and can be ignored:

- `index.html` - Vite entry point (not used)
- `vite.config.js` - Vite configuration (not used)
- `tailwind.config.js` - Old Tailwind config (not used)

## Migration

All functionality has been migrated to `apps/web/`:

| Legacy File | New Location |
|-------------|--------------|
| `src/App.jsx` | `apps/web/src/app/page.tsx` |
| `src/main.jsx` | `apps/web/src/app/layout.tsx` |
| Components | `apps/web/src/components/` |

## Removal

This directory and related legacy files can be safely deleted once all stakeholders confirm the migration is complete.
