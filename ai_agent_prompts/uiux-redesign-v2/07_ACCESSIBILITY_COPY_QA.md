# Prompt 07 — Accessibility + Copy + QA

Final pass to ensure the redesign is cohesive, accessible, and uses original microcopy.

## Scope
- `apps/web/src/app/*`
- `apps/web/src/components/*`
- `apps/web/src/app/globals.css`

## Requirements
1. Accessibility
   - Keyboard navigation works everywhere (nav, lists, rung selector, buttons)
   - Visible focus ring for all interactive elements
   - Sensible heading hierarchy (`h1` once per page)
   - Check contrast for secondary text on surfaces

2. Copy
   - Calm coach tone: short, direct, supportive
   - No borrowed slogans/phrasing from well-known products
   - Replace emoji-heavy labels if they feel less professional

3. QA
   - Fix layout breaks at smaller widths
   - Ensure empty/loading/error states are consistent
   - Remove any unused CSS introduced during redesign

## Verification
- `pnpm -C apps/web typecheck`
- Manual smoke across: `/`, `/practice`, `/explorer`, `/skills`, `/bug-hunt`, `/debug-lab`, `/features`

