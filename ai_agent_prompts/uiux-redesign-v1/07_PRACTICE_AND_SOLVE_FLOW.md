# Prompt 07 — Practice + Solve Flow (Reduce Friction, Increase Momentum)

Refine the Practice flow to feel guided and reduce “what do I do now?” moments.

## Scope
- `apps/web/src/app/practice/page.tsx`
- `apps/web/src/app/practice/[attemptId]/page.tsx`
- Any related components used in solve UI (keep domain logic untouched)

## Requirements
1. Practice landing (`/practice`):
   - clarify what the user will do in this attempt (Thinking Gate → Code → Feedback)
   - show the “why this problem” reason prominently but concise
   - show estimated time and what “Rung” means (original copy)

2. Solve page (`/practice/[attemptId]`):
   - ensure a single primary CTA at a time
   - improve layout for scanning (problem vs editor vs feedback)
   - make “Thinking Gate” feel like a coach prompt (but keep validation rules the same)
   - improve results section readability (pass/fail, next step)

3. Post-submit next actions:
   - clear buttons: `Retry`, `Continue`, `Review mistakes`, `Back to dashboard`
   - keep decisions consistent with current gating behavior; only presentation changes

## Constraints
- Do not change server behavior, attempt state machine, or validation logic.
- No new dependencies.

## Verification
- Start attempt from Practice works.
- Submit flow still works and renders results.

