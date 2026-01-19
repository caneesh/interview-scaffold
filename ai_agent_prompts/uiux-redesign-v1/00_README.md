# UI/UX Redesign Agent Prompts (v1)

These files are **prompts** you can give to an AI coding agent to implement a more professional, guided, and motivational redesign of this product UI.

## Product context (use in every prompt)
- Audience: anyone preparing for coding interviews (freshers + experienced).
- Product feel: **guided + motivational** (original voice; no copying other products’ phrasing or UI).
- Goal right now: **activation + retention + learning outcomes**; keep monetization “future-proof” but not pushy.
- Tech: Next.js app in `apps/web/` (App Router).

## Global constraints (use in every prompt)
- Prioritize **UI/UX changes only** (layout, components, styling, microcopy, navigation).
- Do **not** change domain logic in `packages/*` or backend behavior/API contracts unless required to render UI.
- Do **not** add new npm dependencies (network is restricted). Reuse existing utilities/components.
- Keep changes incremental; each step should leave the app runnable.
- Ensure accessibility basics: keyboard focus, semantic headings, contrast, readable font sizes.

## Required sequence
1) `01_UX_AUDIT_AND_TARGET_JOURNEYS.md`
2) `02_DESIGN_SYSTEM_FOUNDATIONS.md`
3) `03_NAVIGATION_AND_APP_SHELL.md`
4) `04_DASHBOARD_HOME.md`
5) `05_DAILY_AND_INTERVIEW_EXPERIENCE.md`
6) `06_LIBRARY_EXPLORER_SKILLS.md`
7) `07_PRACTICE_AND_SOLVE_FLOW.md`
8) `08_BUG_HUNT_AND_MISC_POLISH.md`
9) `09_ACCESSIBILITY_COPY_QA.md`

## Suggested verification per step
- `pnpm -C apps/web typecheck`
- `pnpm -C apps/web test` (if configured)
- Quick manual smoke: `/`, `/practice`, `/explorer`, `/skills`, `/daily`, `/interview`, `/bug-hunt`

