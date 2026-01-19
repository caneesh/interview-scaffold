# Prompt 08 — Bug Hunt + Misc Polishing

Bring Bug Hunt into the same design system and polish smaller UX inconsistencies.

## Scope
- `apps/web/src/app/bug-hunt/page.tsx`
- Any shared UI components
- CSS cleanup as needed

## Requirements
1. Bug Hunt list view:
   - improve filtering UI (pattern select/search feel)
   - make item cards consistent with the new Card styles
2. Bug Hunt solve view:
   - clearer instructions and progress feedback
   - better line selection affordance + selected state clarity
3. Cross-app polish:
   - unify empty/loading/error states across pages using shared components

## Constraints
- No new dependencies.
- Keep existing API calls and behavior.

## Verification
- Bug Hunt list loads; solve flow works; submitting shows results.

