# Prompt 02 — Color Theme + Tokens (Professional Dark)

Implement a more professional, higher-contrast dark theme and eliminate token drift.

## Goal
Move away from “pure black + blue” into a deeper, more premium dark palette with clear elevation and consistent borders/focus.

## Theme choice
Use this as the default (Midnight Indigo):
- Background: `#070A12`
- Surface 1: `#0D1324`
- Surface 2: `#111B33`
- Border: `#223155`
- Text: `#EAF0FF`
- Text secondary: `#A8B3D1`
- Muted: `#6F7BA1`
- Accent: `#6366F1`
- Accent hover: `#4F46E5`
- Focus ring: `rgba(99, 102, 241, 0.45)`
- Success/Warning/Error: keep existing semantic colors unless contrast needs adjustment

## Scope
- `apps/web/src/app/globals.css`
- Optional: introduce a small `apps/web/src/app/theme.css` imported from `globals.css` (only if it reduces complexity)

## Requirements
1. Create a clear token hierarchy:
   - `--bg-*` for page backgrounds
   - `--surface-*` for cards/panels
   - `--border-*`
   - `--text-*`
   - `--accent-*`
   - `--shadow-*`
   - `--focus-ring`

2. Compatibility layer:
   - The CSS currently references tokens like `--primary`, `--primary-bg`, `--surface`, `--background`.
   - Either define these as aliases to the new system OR replace usages across CSS with the new tokens.
   - Do not leave undefined CSS variables.

3. Improve elevation and borders:
   - Cards should separate from the page background via subtle contrast + shadow (not thick borders only).
   - Make hover states visible but calm.

4. Accessibility:
   - Ensure body text and secondary text remain readable.
   - Implement a consistent focus ring for interactive elements.

## Guardrails
- No new dependencies.
- Keep class names stable where possible; update CSS rather than rewriting every component.

## Verification
- Manual: check `Home`, `Explorer`, `Bug Hunt`, `Debug Lab` for contrast and readability.

