# Prompt 09 — Accessibility + Copy + QA Pass

Do a final quality pass to ensure the redesign is cohesive, accessible, and original.

## Scope
- Whole `apps/web/src/app/*` and `apps/web/src/components/*` as needed
- CSS

## Requirements
1. Accessibility checklist:
   - keyboard navigation works (menu, buttons, dialogs/drawers if added)
   - focus ring visible and consistent
   - headings are hierarchical (`h1` once per page, sensible `h2/h3`)
   - color contrast is reasonable for text and UI controls

2. Microcopy pass:
   - keep tone “calm coach”, short and direct
   - remove jargon where possible
   - ensure all copy is original (no recognizable borrowed lines)

3. QA:
   - fix visual regressions, spacing issues, broken responsive layouts
   - ensure pages without data fail gracefully

## Verification
- `pnpm -C apps/web typecheck`
- Quick manual smoke across core routes

