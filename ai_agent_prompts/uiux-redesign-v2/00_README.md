# UI/UX Redesign Agent Prompts (v2 — Theme + Explorer)

This prompt pack targets the **current** UI (Home + Practice + Explorer + Skills + Bug Hunt + Debug Lab + Features) and focuses on:
- a more professional **dark theme** with better contrast and depth
- a redesigned **Explorer** that feels guided and premium
- navigation coherence across all practice modes

## Product context (include in every prompt)
- Audience: anyone preparing for coding interviews (freshers + experienced).
- Product feel: **guided + motivational**; calm coach tone; **original** wording (no copying other apps’ UI/copy).
- Primary goal now: learning outcomes + retention; monetization can be future-proof but not pushy.
- Tech: Next.js app in `apps/web/` (App Router), CSS in `apps/web/src/app/globals.css`.

## Global constraints (include in every prompt)
- Prioritize UI/UX only (layout, components, CSS, microcopy, navigation).
- Don’t change domain logic in `packages/*` or backend APIs/contracts.
- Don’t add new npm dependencies (network restricted).
- Each step should leave the app runnable.
- Keep accessibility baseline: keyboard nav, focus rings, headings hierarchy, contrast.

## Required sequence
1) `01_AUDIT_AND_TARGET_JOURNEYS.md`
2) `02_COLOR_THEME_AND_TOKENS.md`
3) `03_NAVIGATION_LIBRARY_AND_SHELL.md`
4) `04_HOME_GUIDED_DASHBOARD.md`
5) `05_EXPLORER_REDESIGN.md`
6) `06_MODE_PAGES_CONSISTENCY.md`
7) `07_ACCESSIBILITY_COPY_QA.md`

## Suggested verification per step
- `pnpm -C apps/web typecheck`
- Quick manual smoke: `/`, `/practice`, `/explorer`, `/skills`, `/daily`, `/interview`, `/bug-hunt`, `/debug-lab`, `/features`

