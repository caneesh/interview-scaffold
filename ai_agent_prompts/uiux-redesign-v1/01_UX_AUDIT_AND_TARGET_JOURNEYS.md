# Prompt 01 — UX Audit + Target Journeys (No code yet)

You are working in a Next.js product UI located at `apps/web/`. Before changing UI, do a brief audit and propose a **guided + motivational** user journey that fits this product’s unique approach (pattern-first + thinking gate).

## Task
1. Inspect the current UI entry points and primary pages:
   - `apps/web/src/app/page.tsx` (home)
   - `apps/web/src/components/AppShell.tsx` (navigation + layout)
   - `apps/web/src/app/practice/page.tsx` + `apps/web/src/app/practice/[attemptId]/page.tsx`
   - `apps/web/src/app/explorer/page.tsx`
   - `apps/web/src/app/skills/page.tsx`
   - `apps/web/src/app/daily/page.tsx`
   - `apps/web/src/app/interview/page.tsx`
   - `apps/web/src/app/bug-hunt/page.tsx`
   - `apps/web/src/app/globals.css`

2. Write down:
   - The current primary path a user is likely to take.
   - Where users might feel lost (choice overload, unclear next step).
   - 3–5 “high friction” moments (e.g., locked rungs confusion, how hints work, what to do after results).

3. Define 3 journeys (each 5–7 steps max) with **clear next actions**:
   - New user (first 10 minutes → first success)
   - Returning user (daily habit loop)
   - “I have an interview soon” user (mock interview loop)

4. Propose a revised information architecture:
   - Primary nav (max ~6 items)
   - A “guided default” CTA that is always the best next step
   - A “Library” area for exploratory content (Explorer + Bug Hunt)

## Deliverable
- Create `ai_agent_prompts/uiux-redesign-v1/01_OUTPUT.md` containing:
  - A concise journey map for the 3 journeys
  - A proposed sitemap/nav structure
  - A prioritized UI change list (top 10) referencing current files

## Constraints
- No code changes in this step other than writing `01_OUTPUT.md`.
- Keep the voice and UX **original**; do not mimic other products’ wording, UI, or mascots.

