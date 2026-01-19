# Prompt 02 — Design System Foundations (Tokens + Core UI Components)

Implement a clean, modern, professional UI foundation that supports a guided + motivational experience.

## Goal
Unify typography, spacing, surfaces, and interactive states so the app feels consistent and premium.

## Scope
- Styling: `apps/web/src/app/globals.css` (or a small set of new CSS files imported from it)
- New reusable UI primitives in `apps/web/src/components/ui/` (create folder)

## Requirements
1. Introduce a simple token system (CSS variables) for:
   - typography (sizes + weights)
   - spacing scale
   - radii
   - shadows
   - surface colors (background/elevations)
   - borders/dividers
   - focus ring

2. Create a small set of reusable components (no new dependencies):
   - `Button` (primary/secondary/ghost, sizes, loading)
   - `Card` (default, subtle, accent)
   - `Badge` (neutral/success/warn/error)
   - `PageHeader` (title + description + right-side actions)
   - `EmptyState` and `LoadingState`

3. Replace obvious one-off inline styles on key pages where it improves consistency (do not attempt full refactor yet).

4. Accessibility:
   - visible focus states for keyboard users
   - ensure buttons/links have clear hover/focus
   - headings hierarchy is sensible

## Guardrails
- Do not add dependencies (no Tailwind install, no UI libs).
- Keep changes incremental; avoid touching domain/core logic.
- Keep existing classnames working, but prefer migrating to components where easy.

## Verification
- App builds and pages render.
- Manual check: buttons/links look consistent and focusable.

