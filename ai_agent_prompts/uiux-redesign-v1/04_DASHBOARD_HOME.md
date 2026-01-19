# Prompt 04 — Dashboard Home (Replace Marketing Hero with Guided Hub)

Convert the home page into a “Dashboard” that drives the guided journey.

## Scope
- `apps/web/src/app/page.tsx`
- Add any small components needed (e.g., `StatCard`, `NextUpCard`, `PlanCard`)

## Requirements
1. Replace the current hero-centric layout with a dashboard layout:
   - `Continue` (if applicable: last attempt; if not available, show “Start practice”)
   - `Today` (Daily session CTA as primary)
   - `Next up` (recommended pattern/rung + why) using existing `/api/skills` and/or `/api/problems/next`
   - `Progress snapshot` (e.g., mastered count, current focus) — basic display is fine

2. Provide gentle motivation:
   - short, original microcopy that celebrates progress without being childish
   - avoid referencing other brands, slogans, or distinctive phrasing

3. Add clear secondary CTAs:
   - `Practice`
   - `Interview mode`
   - `Open library`

4. Keep it fast:
   - handle loading/errors gracefully with `LoadingState`/`EmptyState`
   - avoid heavy client-side logic unless needed

## Constraints
- Do not change API contracts; only call existing endpoints.
- Keep copy original; do not import external assets.

## Verification
- Dashboard renders even if skills API fails (degraded mode).

