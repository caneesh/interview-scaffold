# Prompt 01 — Audit + Target Journeys (Write doc first)

You are updating a Next.js product UI in `apps/web/` that now includes multiple practice modes (`Practice`, `Bug Hunt`, `Debug Lab`) and a `Features` catalog.

## Task
1. Inspect the key UI entry points and layouts:
   - `apps/web/src/app/page.tsx` (Home / mode picker)
   - `apps/web/src/components/AppShell.tsx` (global nav + layout)
   - `apps/web/src/app/explorer/page.tsx` (Explorer)
   - `apps/web/src/app/practice/page.tsx` and solve flow (`apps/web/src/app/practice/[attemptId]/page.tsx`)
   - `apps/web/src/app/bug-hunt/page.tsx`
   - `apps/web/src/app/debug-lab/page.tsx`
   - `apps/web/src/app/features/page.tsx`
   - `apps/web/src/app/globals.css` (tokens + global styles)

2. Identify mismatches:
   - Which modes are reachable from global nav vs only from Home
   - Which pages have “Back to Home” instead of consistent navigation
   - Where the UI feels visually inconsistent (token drift, spacing, cards, typography)

3. Define 3 target journeys (5–7 steps each), with one primary CTA per step:
   - New user: first 10 minutes → first success
   - Returning user: daily habit loop (guided + motivational)
   - Interview-soon: mock interview → debrief → targeted drill

4. Propose an IA update that keeps choice low:
   - A guided default CTA visible on dashboard pages
   - A `Library` concept for exploratory modes (Explorer, Bug Hunt, Debug Lab, Features)

## Deliverable
- Create `ai_agent_prompts/uiux-redesign-v2/01_OUTPUT.md` that contains:
  - Journeys (3)
  - Navigation/sitemap proposal
  - Top 12 UI issues (with file references) and the proposed fixes

## Constraints
- No code changes in this step other than writing `01_OUTPUT.md`.
- Keep copy **original** and avoid mimicking other products’ UI/copy.

