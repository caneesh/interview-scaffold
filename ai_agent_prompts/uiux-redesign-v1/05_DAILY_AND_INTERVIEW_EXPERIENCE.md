# Prompt 05 — Daily + Interview Experience (Guided, Calm, Focused)

Improve the “guided session” pages so they feel premium and coach-led.

## Scope
- `apps/web/src/app/daily/page.tsx`
- `apps/web/src/app/interview/page.tsx`
- Shared supporting components in `apps/web/src/components/` if needed
- CSS in `apps/web/src/app/globals.css`

## Requirements (Daily)
1. Add a clearer session frame:
   - show session structure (3 blocks) and what the user gets
   - show time remaining/elapsed in a calm way
2. Make the “current step” obvious:
   - consistent section headers
   - strong primary CTA per step
3. End-of-session summary:
   - one “what you did well”
   - one “next improvement”
   - one “next recommended action”

## Requirements (Interview)
1. Pre-brief screen:
   - explain rules: timer, no hints by default, required explanations
2. Focused solve UI:
   - reduce distractions; keep timer visible but not stressful
3. Debrief:
   - show rubric outcomes clearly
   - suggest next practice action (link to practice / specific pattern)

## Constraints
- No new dependencies.
- Do not remove functionality; rearrange UI and refine copy.

## Verification
- Daily and Interview pages still work with existing APIs and state.

