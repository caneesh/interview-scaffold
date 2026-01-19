# Prompt 06 — Library: Explorer + Progress (Skills)

Make “explore” and “progress” feel like a coherent library + mastery map.

## Scope
- `apps/web/src/app/explorer/page.tsx`
- `apps/web/src/app/skills/page.tsx`
- CSS + small components as needed

## Explorer requirements
1. Convert Explorer into a “Library” feel:
   - pattern cards remain, but add a right panel that shows:
     - short pattern summary (original copy)
     - invariant prompt (“In one sentence…”) (non-blocking)
     - common pitfalls list (original)
2. Rung selector:
   - improve clarity of locked vs unlocked vs mastered
   - add microcopy explaining unlocking rules (based on existing behavior)

## Progress (Skills) requirements
1. Make the skills matrix actionable:
   - clicking a cell should lead to the best next action (e.g., open Explorer filtered or start practice)
2. Add a “focus row” at top:
   - “Recommended next”
   - “Biggest opportunity” (lowest score among unlocked) if available

## Constraints
- Keep data sources the same (`/api/skills`).
- Do not invent new backend fields; compute UI suggestions client-side.

## Verification
- Explorer and Skills pages remain usable with empty/partial skills data.

