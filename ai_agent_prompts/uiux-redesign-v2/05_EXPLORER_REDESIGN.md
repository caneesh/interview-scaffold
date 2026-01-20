# Prompt 05 — Explorer Redesign (Guided “Pattern Briefing”)

Explorer currently feels like a left list with a mostly-empty right panel until selection. Redesign it to feel like a premium learning library: choose a pattern → get a briefing → choose rung → preview → start.

## Scope
- `apps/web/src/app/explorer/page.tsx`
- CSS in `apps/web/src/app/globals.css`
- Optional small UI components (e.g., `PatternBrief`, `RungSelector`, `PatternListItem`)

## Layout requirements
1. Left column: Pattern list
   - Add a search input at the top.
   - Add filter chips/toggles:
     - `All`
     - `Unlocked`
     - `Recommended` (if you can infer from `/api/skills`)
   - Each row shows:
     - pattern name + 1-line description
     - prereqs (if any) in a muted style
     - a small status hint (e.g., “Unlocked up to rung 3” or “New”)

2. Right column: Pattern briefing + action (when selected)
   - “When to use” (2–3 bullets, original copy)
   - “Invariant prompt” (a fill-in template; non-blocking)
   - “Common pitfalls” (max 3)
   - “Rungs” selector with clear states (Locked/Available/Mastered)
   - Unlocking microcopy: explain the rule based on current behavior (no new logic)
   - Problem preview + primary CTA (“Start this rung”)

3. Empty state (no selection)
   - Show a guided panel:
     - “Recommended next” if available
     - or “Pick a pattern to see a briefing and a starter problem”

## Interaction requirements
- Make the selected pattern visually obvious.
- Ensure keyboard navigation works for the list and rung selector.
- Keep API usage as-is: `/api/skills`, `/api/problems/next`, `/api/attempts/start`.

## Constraints
- No new backend fields; compute derived UI labels client-side.
- Keep the page performant; avoid expensive re-renders.

## Verification
- Explorer remains usable without any skills data.

