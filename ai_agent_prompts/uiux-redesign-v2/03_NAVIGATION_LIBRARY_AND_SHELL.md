# Prompt 03 — Navigation: Library + Coherent Shell

Unify navigation so every mode is reachable from anywhere, and the product feels like one cohesive app.

## Scope
- `apps/web/src/components/AppShell.tsx`
- `apps/web/src/app/globals.css`

## Requirements
1. Primary nav items (keep to ~5–6):
   - `Dashboard` (`/`)
   - `Practice` (`/practice`)
   - `Explorer` (`/explorer`) OR move under Library (see below)
   - `Progress` (`/skills`) (label change only)
   - `Library` (dropdown / popover): `Explorer`, `Bug Hunt`, `Debug Lab`, `Features`
   - Optional: `Daily` / `Interview` if those routes are active in your product experience

2. Active state styling:
   - Make active route obvious but subtle.

3. Replace “Back to Home” patterns:
   - For mode pages like `/bug-hunt` and `/debug-lab`, rely on the global shell rather than custom “Back” links (unless in solve sub-view).

4. Responsive nav:
   - Ensure the nav works at smaller widths (simple overflow menu or hamburger; no new deps).

## Constraints
- Keep existing route paths; do not introduce breaking route changes.
- Preserve “solve mode” minimal header for `/practice/[attemptId]` and any other full-focus solve screens.

## Verification
- Manual: reach all modes from nav and return without relying on Home.

