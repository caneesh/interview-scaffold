# Prompt 03 — Navigation + AppShell (Guided Default)

Redesign the global shell so the product feels guided and easy to navigate, without overwhelming users.

## Goal
Make the “best next action” obvious and reduce navigation confusion.

## Scope
- `apps/web/src/components/AppShell.tsx`
- Any new small components needed (e.g., `NavItem`, `TopNav`, `MobileNav`)
- CSS updates in `apps/web/src/app/globals.css`

## Requirements
1. Update nav to include the core journey pages:
   - `Dashboard` (`/`)
   - `Daily` (`/daily`)
   - `Practice` (`/practice`)
   - `Progress` (`/skills`) — rename label in UI only
   - `Interview` (`/interview`)
   - `Library` (menu grouping: `Explorer` + `Bug Hunt`)

2. Add an “Always available” primary CTA in the header (contextual):
   - On dashboard-like pages: `Start today’s session`
   - On solve pages: `Exit` / `Save & exit` (don’t change backend; just UI text)

3. Make navigation responsive:
   - Desktop: horizontal nav
   - Mobile: hamburger drawer or compact menu (no new dependencies)

4. Preserve “solve mode” header behavior for `/practice/[attemptId]` (reduce distraction).

## Constraints
- Avoid changing routing structure; only UI labels and header/nav behavior.
- Do not change `/daily` and `/interview` layout logic unless needed for consistent nav.

## Verification
- Manual: navigate to all primary routes; active nav state is correct; mobile nav works.

