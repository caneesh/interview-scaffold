# UI/UX Specification

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Based on Code Analysis:** apps/web/src/

---

## Table of Contents

1. [Overview](#overview)
2. [Design System](#design-system)
3. [Component Hierarchy](#component-hierarchy)
4. [Screen States and Transitions](#screen-states-and-transitions)
5. [Responsive Breakpoints](#responsive-breakpoints)
6. [Accessibility Requirements](#accessibility-requirements)
7. [Animation and Transitions](#animation-and-transitions)
8. [Interactive Patterns](#interactive-patterns)

---

## Overview

The Scaffold platform employs a **dark-first, developer-focused design system** with an emphasis on clarity, minimal cognitive load, and rapid feedback loops. The UI is optimized for focused problem-solving sessions with context-aware headers and distraction-free coding environments.

### Design Philosophy

- **Dark theme by default**: Reduces eye strain during extended coding sessions
- **Monospace code typography**: All code uses consistent monospace fonts
- **Subtle visual hierarchy**: Uses background shades and borders rather than heavy shadows
- **Inline styles with CSS variables**: Hybrid approach combining global classes with component-specific inline styles
- **No CSS framework**: Custom CSS built from scratch, no Tailwind or CSS-in-JS library

---

## Design System

### Color Palette

All colors are defined as CSS custom properties in `/apps/web/src/app/globals.css`.

#### Base Colors

```css
--bg-primary: #0a0a0a       /* Main background - near black */
--bg-secondary: #141414     /* Card backgrounds */
--bg-tertiary: #1e1e1e      /* Input fields, code editor backgrounds */
```

#### Text Colors

```css
--text-primary: #f5f5f5     /* Primary text - off-white */
--text-secondary: #a0a0a0   /* Secondary text - medium gray */
--text-muted: #666          /* Tertiary text - dark gray */
```

#### Semantic Colors

```css
--accent: #3b82f6           /* Primary blue - links, CTAs */
--accent-hover: #2563eb     /* Darker blue for hover states */
--success: #22c55e          /* Green - passing tests, completed states */
--warning: #eab308          /* Yellow - warnings, trace hints */
--error: #ef4444            /* Red - failing tests, errors */
```

#### Borders

```css
--border: #2a2a2a           /* Subtle borders between sections */
```

### Typography

#### Font Families

- **System Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace Stack**: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`
  - Used for: code editors, test results, terminal output, trace visualization

#### Type Scale

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Page Title (h1) | 2.5rem (40px) | 600 | Landing page hero |
| Section Title (h2) | 1.5rem (24px) | 600 | Problem titles, section headers |
| Subsection (h3) | 1.125rem-1.25rem | 500-600 | Card titles, step labels |
| Body Text | 0.9375rem (15px) | 400 | Problem statements, descriptions |
| Small Text | 0.875rem (14px) | 400 | Form labels, secondary info |
| Tiny Text | 0.75rem (12px) | 400-500 | Tags, metadata, step labels |

#### Line Height

- Body text: `1.5` (150%)
- Problem statements: `1.7` (170%)
- Code blocks: `1.5` (150%)

### Spacing System

Based on a **0.25rem (4px) base unit**:

- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 0.75rem (12px)
- **base**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)

**Container max-width**: `1200px` with `1.5rem` horizontal padding

### Border Radius

- **Small elements** (tags, buttons): `0.25rem` (4px)
- **Standard elements** (inputs, cards): `0.375rem-0.5rem` (6-8px)
- **Large containers** (modals, panels): `0.5rem-0.75rem` (8-12px)
- **Pills** (badges, tags): `999px` (fully rounded)
- **Circular** (avatars, icons): `50%`

### Shadows and Depth

The design uses **minimal shadows** and relies on borders and background colors for depth:

- **Cards**: `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)`
- **Button hover**: `box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25)` (primary buttons only)
- **Drawer**: `box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3)`
- **Modal backdrop**: `rgba(0, 0, 0, 0.75)` solid overlay

---

## Component Hierarchy

### Layout Components

#### AppShell

**File**: `/apps/web/src/components/AppShell.tsx`

Context-aware application shell with dynamic headers based on app mode.

**Modes**:
- `dashboard`: Main navigation pages (/, /practice, /explorer, /skills)
- `solve`: Active problem-solving (/practice/[attemptId])
- `coach`: Coaching session (/coach/[sessionId])
- `debug`: Debug mode (/debug/attempts/[attemptId])

**Header Variants**:

1. **DashboardHeader**: Full navigation with logo + links (Practice, Debug, Coach, Explorer, Skills)
2. **SolveHeader**: Minimal header with logo + "Exit to Dashboard" button
3. **CoachHeader**: Logo + "Coaching Mode" label + "Exit to Coach" button
4. **DebugHeader**: Logo + "Debug Mode" label + "Exit to Debug" button

**Pages with custom layouts** (no AppShell header):
- `/daily`
- `/interview`

### Core UI Components

#### Buttons

**Classes**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`

```css
/* Base button */
padding: 0.5rem 1rem
border-radius: 0.375rem
font-size: 0.875rem
font-weight: 500
transition: all 0.15s

/* Small variant */
.btn-sm: padding: 0.375rem 0.75rem, font-size: 0.8125rem
```

**Variants**:
- **Primary**: Blue background (`--accent`), white text
- **Secondary**: Tertiary background with border, primary text
- **Ghost**: Transparent with secondary text, hover shows tertiary background

**States**:
- `:hover` on primary buttons: Slightly darker blue + `translateY(-1px)` + shadow
- `:disabled`: `opacity: 0.5`, `cursor: not-allowed`
- `:focus-visible`: `outline: 2px solid var(--accent), outline-offset: 2px`

#### Cards

**Class**: `.card`

```css
background: var(--bg-secondary)
border: none (uses box-shadow for subtle border)
border-radius: 0.5rem
padding: 1.5rem
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)
```

#### Form Elements

**Input/Textarea/Select**:

```css
width: 100%
padding: 0.75rem
background: var(--bg-tertiary)
border: 1px solid var(--border)
border-radius: 0.375rem
color: var(--text-primary)
font-size: 0.875rem

:focus {
  outline: none
  border-color: var(--accent)
}
```

**Label**:

```css
display: block
margin-bottom: 0.5rem
font-size: 0.875rem
font-weight: 500
color: var(--text-secondary)
```

### Practice Flow Components

#### Stepper

**Component**: `Stepper.tsx`

Horizontal progress indicator showing workflow stages.

**Steps**:
1. Approach (thinking gate)
2. Code (implementation)
3. Test (results)
4. Reflection (optional, on failure)
5. Reflect (optional success reflection)
6. Complete

**States**:
- `completed`: Green background, checkmark icon
- `active`: Blue border, blue text
- `pending`: Gray border, muted text

**Visual Structure**:
```
┌─────────┐     ┌─────────┐     ┌─────────┐
│    ✓    │━━━━━│    2    │─────│    3    │
│Approach │     │  Code   │     │  Test   │
└─────────┘     └─────────┘     └─────────┘
 completed        active         pending
```

#### Code Editor

**Component**: `CodeEditor.tsx`

Language-selectable code editor with syntax highlighting preparation.

**Languages Supported**:
- JavaScript (default)
- TypeScript
- Python
- Java
- C++
- Go

**Structure**:
- **Header**: Language selector dropdown
- **Body**: Textarea with monospace font
- **Footer**: Submit button

**Styling**:
```css
background: var(--bg-tertiary)
border: 1px solid var(--border)
border-radius: 0.5rem
font-family: var(--font-mono)
font-size: 0.875rem
```

#### Test Results

**Component**: `TestResults.tsx`

Display test case outcomes with pass/fail indicators.

**States**:
- **Pass**: Green background (`rgba(34, 197, 94, 0.08)`), green border
- **Fail**: Red background (`rgba(239, 68, 68, 0.08)`), red border

**Layout**:
```
┌─────────────────────────────────────┐
│ ✓ Test Case 1                       │
│   Input: [1, 2, 3]                  │
│   Expected: 6                       │
│   Actual: 6                         │
└─────────────────────────────────────┘
```

#### Pattern Discovery

**Component**: `PatternDiscovery.tsx`

Interactive Q&A panel for guided pattern discovery (Socratic or Heuristic mode).

**Visual States**:
1. **Active**: Standard border, icon at top
2. **Completed**: Green border, success icon, gradient background

**Structure**:
- Header with icon and mode indicator
- Q&A history (collapsed previous questions)
- Current question with input
- Progress dots
- Action buttons (Submit/Skip)

#### Pattern Challenge (Advocate's Trap)

Visual component showing counterexamples or Socratic challenges to proposed patterns.

**Structure**:
- Header: "Challenge Your Approach"
- Confidence score bar
- Reasons why pattern might be wrong
- Counterexample (if mode is COUNTEREXAMPLE)
- Decision buttons: "Revise Approach" or "I'm Confident"

#### Thinking Gate

**Component**: `ThinkingGate.tsx`

Pattern selection and invariant statement form before coding.

**Visual Design**:
- Centered card (max-width: 800px)
- Gradient header with icon
- Pattern selection grid
- Invariant input (textarea)
- Complexity input (optional)
- Full-width submit button

**Pattern Grid**:
```css
display: grid
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))
gap: 1rem
```

#### Reflection Components

**ReflectionForm** (failure reflection):
- Multiple choice options
- Each option is a card with hover state
- Selected state: Blue border + blue background tint

**SuccessReflectionForm**:
- Open-ended textarea for metacognitive reflection
- Submit button

#### Trace Visualization

**Component**: `TraceVisualization.tsx`

Displays execution trace with array states and variable values.

**Structure**:
- Header with frame counter
- Array visualization (visual boxes with indices)
- Pointer indicators
- Variable table
- Frame navigation controls

**Array Cells**:
```css
min-width: 36px
height: 36px
background: var(--bg-tertiary)
border: 1px solid var(--border)
highlighted: border-color: var(--accent), background: rgba(59, 130, 246, 0.2)
```

#### Performance Panel

**Component**: `PerformancePanel.tsx`

Shows time budget and complexity analysis.

**Display Elements**:
- Progress bar for time budget
- Test execution stats
- Complexity suggestion (if exceeded)

### Modal Components

#### Modal Overlay

**Classes**: `.modal-overlay`, `.modal`

**Backdrop**:
```css
position: fixed
inset: 0
background: rgba(0, 0, 0, 0.75)
z-index: 100
animation: fadeIn 0.15s ease-out
```

**Modal**:
```css
max-width: 600px
width: 90%
max-height: 80vh
overflow-y: auto
background: var(--bg-secondary)
border: 1px solid var(--border)
border-radius: 0.5rem
```

**Structure**:
- **Header**: Title + Close button
- **Body**: Scrollable content
- **Footer**: Action buttons (right-aligned)

#### Micro-Lesson Modal

**Component**: `MicroLessonModal.tsx`

Educational content overlay triggered by gating decisions.

**Content Structure**:
- Pattern-specific tips
- Common pitfalls
- Implementation best practices

### Drawer Components

#### Coach Drawer

**Component**: `CoachDrawer.tsx`

Right-side slide-out drawer with tabbed interface.

**Specs**:
```css
width: 360px
max-width: 90vw
position: fixed (right side)
animation: slideIn 0.2s ease-out
box-shadow: -4px 0 24px rgba(0, 0, 0, 0.3)
```

**Tabs**:
- Plan (shows committed pattern/invariant)
- Hints (progressive hint system)

**Coach Button**:
- Badge indicator shows number of available hints
- Position: Top-right of solve interface

### Coaching Mode Components

#### Stage Indicator

**Component**: `coaching/StageIndicator.tsx`

Progress through coaching stages.

**Stages**:
1. Problem Framing
2. Pattern Recognition
3. Feynman Validation
4. Strategy Design
5. Coding
6. Reflection

**Visual**:
- Horizontal stepper with numbered circles
- Completed: Checkmark icon
- Current: Highlighted number
- Connector lines between stages

**Compact Mode**: Shows only current stage label

### Debug Mode Components

#### Debug Scenario Card

Grid layout showing bug scenarios with metadata (defect type, file type, severity).

#### Debug Gate Panel

Similar to thinking gate but for triage assessment.

#### Debug Feedback Panel

Shows triage accuracy and debugging performance.

---

## Screen States and Transitions

### Practice Flow State Machine

```
START
  ↓
[THINKING_GATE] ← May trigger Pattern Discovery
  ↓             ← May trigger Pattern Challenge
  ↓ (pattern/invariant committed)
  ↓
[CODING] ← May show Hint Panel
  ↓      ← May enable Trace Visualization
  ↓ (code submitted)
  ↓
[TESTING]
  ↓
  ├─→ All Pass → [SUCCESS_REFLECTION] (optional) → [COMPLETED]
  ↓
  └─→ Some Fail → [REFLECTION] → [CODING] (retry)
                     ↓
                     └─→ (micro-lesson trigger) → [MICRO_LESSON_MODAL]
```

### App Mode Transitions

**Navigation Triggers**:
- Clicking "Start Problem" → Navigate to `/practice/[attemptId]` (AppShell switches to `solve` mode)
- Clicking "Exit to Dashboard" → Navigate to `/practice` (AppShell switches to `dashboard` mode)
- Clicking "Start Coaching" → Navigate to `/coach/[sessionId]` (AppShell switches to `coach` mode)

**Header Changes**:
1. **Dashboard → Solve**: Full nav disappears, minimal header appears
2. **Solve → Dashboard**: Minimal header replaced with full nav
3. **Any mode → Custom Layout Pages**: AppShell header hidden entirely

### Loading States

**Pattern**: Spinner + text message

```jsx
<div className="loading-state">
  <div className="spinner"></div>
  <p>Finding your next problem...</p>
</div>
```

**Spinner Animation**:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Empty States

**Pattern**: Centered content with icon, message, and CTA

```jsx
<div className="empty-state">
  <h3>No problems available</h3>
  <p>Check back later...</p>
  <a href="/explorer" className="btn btn-primary">Explore Patterns</a>
</div>
```

### Error States

**Pattern**: Centered error message with retry action

---

## Responsive Breakpoints

The design uses **mobile-first responsive design** with CSS media queries.

### Breakpoints

```css
/* Mobile: < 640px (default) */

/* Tablet: 640px - 768px */
@media (max-width: 640px) { }

/* Desktop: 768px - 1024px */
@media (max-width: 768px) { }

/* Large Desktop: > 1024px */
@media (max-width: 1024px) { }
```

### Responsive Patterns

#### Pattern Challenge Component

**Mobile** (`max-width: 640px`):
```css
.challenge-decision {
  flex-direction: column /* stacks decision buttons */
  text-align: center
}

.decision-option {
  width: 100% /* full width buttons */
}

.pattern-challenge-actions {
  flex-direction: column-reverse /* stacks action buttons */
}
```

#### Skill Matrix

**Mobile** (`max-width: 640px`):
```css
.skill-row {
  grid-template-columns: 1fr /* single column layout */
}
```

#### Review Stats

**Mobile** (`max-width: 768px`):
```css
.review-stats {
  grid-template-columns: 1fr /* single column */
}
```

#### Container Padding

**Mobile adjustments**:
```css
.container {
  padding: 0 1rem /* reduce from 1.5rem on mobile */
}
```

### Touch Target Sizes

All interactive elements meet **minimum 44x44px touch target** requirements on mobile:

- Buttons: Minimum `padding: 0.5rem 1rem` (ensures >44px height)
- Pattern cards: Minimum `padding: 1rem` (ensures adequate touch area)
- Drawer tabs: `padding: 0.75rem` (ensures >44px height)

---

## Accessibility Requirements

### Keyboard Navigation

#### Focus Indicators

All interactive elements have visible focus indicators:

```css
.btn:focus-visible,
.input:focus-visible,
.pattern-card:focus-visible,
.reflection-option:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Remove focus for mouse users */
.btn:focus:not(:focus-visible) {
  outline: none;
}
```

#### Tab Order

- AppShell navigation links are in logical order
- Form inputs follow visual layout order
- Modal focus traps within modal boundary
- Skip link available for keyboard users

#### Skip Link

```css
.skip-link {
  position: absolute;
  top: -100%; /* visually hidden */

  &:focus {
    top: 0; /* visible on focus */
    background: var(--accent);
    color: white;
    padding: 0.75rem 1rem;
  }
}
```

### Semantic HTML

- Buttons use `<button>` elements (not divs)
- Links use `<a>` with `href` attributes
- Headings follow hierarchical structure (h1 → h2 → h3)
- Form inputs have associated `<label>` elements
- Lists use `<ul>`, `<ol>`, `<li>` appropriately

### ARIA Attributes

[Inferred from component structure - explicit ARIA labels not observed in code]

**Recommended**:
- Modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
- Drawers: `role="complementary"`, `aria-label="Coach drawer"`
- Loading states: `role="status"`, `aria-live="polite"`
- Tabs: `role="tablist"`, `role="tab"`, `role="tabpanel"`

### Color Contrast

All text meets **WCAG AA standards** (4.5:1 minimum):

- `--text-primary (#f5f5f5)` on `--bg-primary (#0a0a0a)`: ~18:1 ✓
- `--text-secondary (#a0a0a0)` on `--bg-primary (#0a0a0a)`: ~9:1 ✓
- `--accent (#3b82f6)` on `--bg-primary (#0a0a0a)`: ~6:1 ✓

### Screen Reader Support

**Pattern Card Selection**:
- Cards should announce selected state
- Pattern names should be announced clearly

**Test Results**:
- Pass/Fail status should be announced
- Test case details should be readable

**Progress Indicators**:
- Stepper should announce current step
- Stage indicator should announce progress

---

## Animation and Transitions

### Transition Durations

```css
Standard transitions: 0.15s
Drawer slide-in: 0.2s
Backdrop fade-in: 0.15s
Button hover: 0.15s
```

### Animation Keyframes

#### Spinner

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Applied to .spinner */
```

#### Drawer Slide-In

```css
@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
/* Applied to .drawer */
```

#### Backdrop Fade-In

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* Applied to .drawer-backdrop, .modal-overlay */
```

### Hover Effects

**Primary Buttons**:
```css
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}
```

**Secondary Buttons**:
```css
.btn-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
}
```

**Pattern Cards**:
```css
.pattern-card:hover {
  border-color: var(--accent);
}
```

**Navigation Links**:
```css
.nav a:hover {
  color: var(--text-primary);
  text-decoration: none; /* subtle, no underline */
}
```

---

## Interactive Patterns

### Selection Patterns

#### Single-Select (Pattern Selection)

**Visual States**:
1. **Default**: `border: 1px solid var(--border)`, `background: var(--bg-secondary)`
2. **Hover**: `border-color: var(--accent)`
3. **Selected**: `border-color: var(--accent)`, `background: rgba(59, 130, 246, 0.1)`

**Interaction**:
- Click to select
- Only one item can be selected at a time
- Selected state persists until another is chosen

#### Multi-Select (Reflection Options)

**Visual States**:
Same as single-select pattern

**Interaction**:
- Click to toggle selection
- Multiple items can be selected
- Submit button enabled when at least one selected

### Progressive Disclosure

#### Hint System

**Pattern**: Hints revealed one at a time

**States**:
1. No hints shown → "Request Hint" button visible
2. Hint 1 shown → "Next Hint" button enabled
3. All hints shown → No more hints available message

**Visual**: Each hint appears in `.hint-panel` with level badge

#### Problem Statement Collapse

**Pattern**: Toggle visibility of problem statement during coding

**Interaction**:
- Click header to collapse/expand
- Collapsed: Shows only title
- Expanded: Shows full statement

### Drawer Behavior

**Opening**:
1. Click "Coach" button
2. Backdrop fades in (0.15s)
3. Drawer slides in from right (0.2s)

**Closing**:
1. Click close button or backdrop
2. Drawer slides out
3. Backdrop fades out

**Focus Management**:
- Focus moves to drawer on open
- Focus returns to trigger button on close

### Modal Behavior

**Opening**:
1. Triggered by gating decision or user action
2. Backdrop fades in
3. Modal appears centered

**Closing**:
1. Click close button, backdrop, or "Continue" action
2. Modal and backdrop fade out
3. Focus returns to trigger element

**Scroll Lock**:
Body scroll should be locked when modal is open

---

## Assumptions

1. **Future Syntax Highlighting**: Code editor currently uses plain textarea; syntax highlighting infrastructure prepared but not implemented
2. **Pattern Grid Flexibility**: Pattern cards use `auto-fill` grid, adapting to screen width automatically
3. **Touch Events**: No custom touch event handlers observed; relies on native browser behavior
4. **Viewport Meta Tag**: Assumed to be set in HTML head for proper mobile rendering
5. **Dark Mode Only**: No light mode variant exists; design is dark-only

---

## Scope and Limitations

### Covered in This Document

- Design system (colors, typography, spacing, borders)
- Component visual specifications
- Layout patterns and responsive behavior
- Accessibility features implemented in CSS
- Animation and transition specifications
- Interactive state patterns

### Not Covered

- API integration details (see API.md)
- State management logic (see ARCHITECTURE.md)
- Test specifications
- Performance optimization strategies
- Analytics and tracking
- Internationalization (i18n) support

### Open Questions

1. **Dark Mode Toggle**: Is a light mode planned? Currently not implemented.
2. **Syntax Highlighting Library**: Which library will be used for code editor syntax highlighting?
3. **Accessibility Testing**: Has manual accessibility testing been conducted with screen readers?
4. **Design System Governance**: Who approves changes to the design system CSS variables?

---

**Document Status**: Based on code analysis as of 2026-01-24. All specifications reflect actual implementation in the codebase at `/apps/web/src/`.
