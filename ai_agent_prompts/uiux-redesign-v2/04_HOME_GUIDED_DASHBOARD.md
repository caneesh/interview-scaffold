# Prompt 04 — Home: Guided Dashboard (Reduce Choice Overload)

Home currently acts like a mode picker. Convert it into a lightweight guided dashboard that still exposes modes.

## Scope
- `apps/web/src/app/page.tsx`
- Optional small components in `apps/web/src/components/` (no new deps)

## Requirements
1. One primary CTA:
   - “Start recommended practice” or “Start today’s session” (choose one, keep consistent with your product).

2. Add “Next up” panel:
   - Show recommended pattern/rung + reason (use existing `/api/skills` and/or `/api/problems/next`).
   - If APIs fail, show a graceful fallback CTA to `/practice`.

3. Keep practice modes, but as secondary:
   - Present as a “Library” section with consistent cards and short descriptions:
     - Pattern Practice
     - Bug Hunt
     - Debug Lab
     - Features (optional; consider moving to footer/help)

4. Improve scannability:
   - Reduce chip count per card, and clamp descriptions.
   - Prefer consistent icon style (avoid emoji if it feels less professional; use simple inline SVG).

## Constraints
- No backend changes; only UI composition.
- Keep copy calm and original; avoid “clone-ish” phrasing.

## Verification
- Home works without skills data; modes are still reachable.

