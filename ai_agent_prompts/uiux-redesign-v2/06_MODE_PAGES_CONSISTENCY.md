# Prompt 06 — Mode Pages Consistency (Bug Hunt + Debug Lab + Features)

Make each mode feel like it belongs to the same product by standardizing page headers, filters, card styling, and “how it works” framing.

## Scope
- `apps/web/src/app/bug-hunt/page.tsx`
- `apps/web/src/app/debug-lab/page.tsx`
- `apps/web/src/app/features/page.tsx`
- `apps/web/src/app/globals.css`

## Requirements
1. Shared header pattern:
   - Title, 1-line subtitle, right-side actions (optional)
   - A short “How it works” strip (3 steps) for each mode

2. Consistent filters:
   - Align select/input sizes and spacing with theme tokens.

3. Consistent cards:
   - Same radii, shadow, border, hover
   - Clamp long descriptions to keep grids aligned

4. Reduce “Back to Home” dependencies:
   - Use global navigation; keep “Back” only for in-mode solve subviews.

## Constraints
- No behavior changes; keep API calls and flows intact.
- No new dependencies.

## Verification
- Bug Hunt list + solve, Debug Lab list + solve, Features page all remain functional.

