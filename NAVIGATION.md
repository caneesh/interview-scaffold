# Navigation Information Architecture

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Based on Code Analysis:** apps/web/src/

---

## Table of Contents

1. [Overview](#overview)
2. [Primary Navigation Structure](#primary-navigation-structure)
3. [Route Hierarchy](#route-hierarchy)
4. [Breadcrumb Patterns](#breadcrumb-patterns)
5. [Deep Linking Strategy](#deep-linking-strategy)
6. [Mobile Navigation Considerations](#mobile-navigation-considerations)
7. [Navigation States and Context](#navigation-states-and-context)

---

## Overview

The Scaffold platform uses **Next.js 14 App Router** with a context-aware navigation system. Navigation adapts based on user context (dashboard browsing vs. active practice session) to minimize distractions and maximize focus during problem-solving.

### Navigation Philosophy

- **Context-aware headers**: Navigation collapses during focused work (solve, coach, debug modes)
- **Minimal exit friction**: Single "Exit to X" button in focused modes
- **Flat hierarchy**: Most pages are 1-2 levels deep from root
- **No authentication gates**: Demo mode allows unrestricted navigation (based on code observation)

---

## Primary Navigation Structure

### Dashboard Navigation (Default Mode)

**Location**: Top header, present on all dashboard pages

**Implementation**: `DashboardHeader` in `/apps/web/src/components/AppShell.tsx`

```
┌─────────────────────────────────────────────────────┐
│ Scaffold  Practice  Debug  Coach  Explorer  Skills │
└─────────────────────────────────────────────────────┘
```

**Links**:

| Label | Route | Description |
|-------|-------|-------------|
| Scaffold (logo) | `/` | Home/landing page |
| Practice | `/practice` | Problem selection for pattern practice |
| Debug | `/debug` | Debug lab problem selection |
| Coach | `/coach` | Coaching session selection |
| Explorer | `/explorer` | Pattern explorer and learning resources |
| Skills | `/skills` | Skill matrix and progress tracking |

**Visual Specification**:
- Font size: `0.875rem`
- Color: `var(--text-secondary)` default, `var(--text-primary)` on hover
- Gap between links: `1.5rem`
- No underline on hover

### Focused Mode Navigation

When user enters focused work mode (active problem, coaching session, debug session), navigation simplifies to:

```
┌─────────────────────────────────────────┐
│ Scaffold              [Exit to X]       │
└─────────────────────────────────────────┘
```

**Modes**:

1. **Solve Mode** (`/practice/[attemptId]`):
   - Exit button: "Exit to Dashboard" → `/practice`

2. **Coach Mode** (`/coach/[sessionId]`):
   - Label: "Coaching Mode"
   - Exit button: "Exit to Coach" → `/coach`

3. **Debug Mode** (`/debug/attempts/[attemptId]`):
   - Label: "Debug Mode"
   - Exit button: "Exit to Debug" → `/debug`

**Rationale**: Reduces cognitive load and temptation to navigate away during focused practice.

### Pages Without AppShell Navigation

Some pages implement custom layouts with no AppShell header:

- `/daily` - Daily challenge (custom layout)
- `/interview` - Mock interview mode (custom layout)

**Detection Logic** (from `AppShell.tsx`):
```typescript
const hasOwnLayout = pathname.startsWith('/daily') || pathname.startsWith('/interview');
```

---

## Route Hierarchy

### Complete Route Map

```
/ (root)
├── /practice                    [Dashboard mode]
│   └── /practice/[attemptId]    [Solve mode]
│
├── /debug                       [Dashboard mode]
│   └── /debug/attempts/[attemptId]  [Debug mode]
│
├── /debug-lab                   [Dashboard mode]
│   └── (dynamic routing TBD)
│
├── /bug-hunt                    [Dashboard mode]
│   └── (dynamic routing TBD)
│
├── /coach                       [Dashboard mode]
│   └── /coach/[sessionId]       [Coach mode]
│
├── /explorer                    [Dashboard mode]
│
├── /skills                      [Dashboard mode]
│
├── /features                    [Dashboard mode]
│
├── /daily                       [Custom layout]
│
└── /interview                   [Custom layout]
```

### Route Descriptions

#### Root (`/`)

**Component**: `/apps/web/src/app/page.tsx`

**Purpose**: Landing page and feature showcase

**Content**:
- Hero section with value proposition
- Practice mode cards (Debug Lab, Bug Hunt, Pattern Practice)
- "How it works" section
- Navigation to all major features

**Primary CTAs**:
- "Start Practice" → `/practice`
- "Explore Patterns" → `/explorer`
- "All Features" → `/features`

#### Practice Routes

**`/practice`**

**Component**: `/apps/web/src/app/practice/page.tsx`

**Purpose**: Problem selection and recommendation

**Features**:
- Displays recommended next problem (adaptive algorithm)
- Shows problem metadata (pattern, rung, statement)
- "Start Problem" button → creates attempt and navigates to `/practice/[attemptId]`

**State**:
- Loading state while fetching next problem
- Error state with retry action
- Empty state if no problems available

**`/practice/[attemptId]`**

**Component**: `/apps/web/src/app/practice/[attemptId]/page.tsx`

**Purpose**: Active problem-solving session

**Features**:
- Multi-step workflow (Approach → Code → Test → Reflection)
- Dynamic UI based on attempt state
- Coach drawer (side panel)
- Trace visualization (when enabled)

**Navigation Context**: Solve mode (minimal header)

**Exit Path**: "Exit to Dashboard" → `/practice`

#### Debug Routes

**`/debug`**

**Component**: `/apps/web/src/app/debug/page.tsx`

**Purpose**: Debug lab scenario selection

**Features**: [Inferred from route existence - specific implementation not examined]
- Scenario browser
- Start debug session button

**`/debug/attempts/[attemptId]`**

**Component**: `/apps/web/src/app/debug/attempts/[attemptId]/page.tsx`

**Purpose**: Active debugging session

**Features**: [Inferred from file structure]
- Triage assessment
- Multi-file code editor
- Observability panel
- Defect fixing workflow

**Navigation Context**: Debug mode

**Exit Path**: "Exit to Debug" → `/debug`

**`/debug-lab`**

**Component**: `/apps/web/src/app/debug-lab/page.tsx`

**Purpose**: Alternative debug lab entry point

**Relationship to `/debug`**: [Not clear from code - may be legacy or alternative UI]

#### Bug Hunt Route

**`/bug-hunt`**

**Component**: `/apps/web/src/app/bug-hunt/page.tsx`

**Purpose**: Bug identification practice

**Features**: [Inferred from component name]
- Code snippet display
- Line selection for buggy code
- Invariant violation explanation

#### Coach Routes

**`/coach`**

**Component**: `/apps/web/src/app/coach/page.tsx`

**Purpose**: Coaching session selection

**Features**:
- Problem browser (filterable by pattern)
- Recent coaching sessions list
- "Start Coaching" button → creates session and navigates to `/coach/[sessionId]`

**`/coach/[sessionId]`**

**Component**: `/apps/web/src/app/coach/[sessionId]/page.tsx`

**Purpose**: Active coaching session

**Features**: [Inferred from coaching components]
- Multi-stage workflow:
  1. Problem Framing
  2. Pattern Recognition
  3. Feynman Validation
  4. Strategy Design
  5. Coding
  6. Reflection
- Stage indicator component
- Socratic Q&A panels

**Navigation Context**: Coach mode

**Exit Path**: "Exit to Coach" → `/coach`

#### Explorer Route

**`/explorer`**

**Component**: `/apps/web/src/app/explorer/page.tsx`

**Purpose**: Pattern learning and discovery

**Features**: [Inferred from navigation structure]
- Pattern catalog
- Educational resources
- Pattern relationships

#### Skills Route

**`/skills`**

**Component**: `/apps/web/src/app/skills/page.tsx`

**Purpose**: Skill matrix and progress visualization

**Features**:
- Skill ladder display (patterns × rungs)
- Mastery status indicators (locked, unlocked, mastered)
- Progress tracking

**Visual**: Grid layout with pattern rows and rung columns

#### Features Route

**`/features`**

**Component**: `/apps/web/src/app/features/page.tsx`

**Purpose**: Comprehensive feature showcase

**Features**: [Inferred from home page link]
- Full platform capabilities list
- Feature descriptions
- Links to practice modes

#### Custom Layout Routes

**`/daily`**

**Component**: `/apps/web/src/app/daily/page.tsx`

**Purpose**: Daily challenge mode

**Layout**: Custom (no AppShell header)

**`/interview`**

**Component**: `/apps/web/src/app/interview/page.tsx`

**Purpose**: Mock interview simulation

**Layout**: Custom (no AppShell header)

---

## Breadcrumb Patterns

### Current Implementation

**No explicit breadcrumb component observed in the codebase.**

Navigation context is indicated through:
1. **AppShell mode labels** (e.g., "Coaching Mode", "Debug Mode")
2. **Exit buttons** that show return destination
3. **Page titles** (h1 elements on each page)

### Recommended Breadcrumb Pattern

For future implementation, suggested patterns:

**Dashboard Pages**: No breadcrumbs needed (1 level deep)

**Focused Mode Pages**:
```
Home > Practice > Two Pointer - Rung 1: Find Pair Sum
Home > Coach > Sliding Window Session
Home > Debug > Null Pointer Exception
```

**Visual Suggestion**:
```
Home  >  Practice  >  Current Problem Title
[muted] [muted]    [primary text]
```

---

## Deep Linking Strategy

### URL Structure

All active sessions use **UUID-based dynamic routes**:

- `/practice/[attemptId]` - attemptId is a UUID
- `/coach/[sessionId]` - sessionId is a UUID
- `/debug/attempts/[attemptId]` - attemptId is a UUID

### Deep Link Behavior

**Shareable Links**: [Inferred behavior based on architecture]

1. User can copy URL from browser while in active session
2. Pasting URL directly should restore session state (if session exists)
3. If session expired or not found, redirect to selection page with error

**Example**:
```
https://scaffold.app/practice/a3f2c9d1-4b5e-6f7a-8g9h-0i1j2k3l4m5n
```

### Query Parameters

**No query parameters observed in current implementation.**

All navigation uses clean URLs with path segments only.

### Hash Fragments

**No hash-based navigation observed.**

Potential future use cases:
- Jumping to specific step in workflow (`/practice/[id]#code`)
- Linking to specific hints (`/practice/[id]#hint-2`)

---

## Mobile Navigation Considerations

### Mobile Header Behavior

**Dashboard Mode**:

Current implementation shows full horizontal navigation links at all screen sizes.

**Issue**: On mobile screens < 640px, navigation may overflow.

**Recommended Enhancement**: [Not implemented]
- Hamburger menu for mobile
- Drawer navigation on small screens

### Mobile Focused Mode

**Solve/Coach/Debug Modes**:

Header remains minimal on mobile:
```
[Logo]              [Exit Button]
```

**Responsive Behavior**:
- Logo text may truncate on very small screens
- Exit button text may abbreviate ("Exit" instead of "Exit to Dashboard")

### Touch Target Sizes

All navigation links meet **44px minimum touch target**:

- Header links: `padding: 1rem 0` (vertical) ensures >44px height
- Exit buttons: `.btn-sm` has `padding: 0.375rem 0.75rem` ≈ 28px height
  - **Accessibility Issue**: Exit button may be below minimum touch target

**Recommendation**: Increase `.btn-sm` padding on mobile to meet 44px minimum.

### Bottom Navigation (Not Implemented)

**Current**: Top navigation only

**Future Consideration**: Bottom tab bar for mobile
```
┌─────┬─────┬─────┬─────┬─────┐
│Home │Prac │Debug│Coach│Skills│
└─────┴─────┴─────┴─────┴─────┘
```

---

## Navigation States and Context

### AppMode Detection

**File**: `/apps/web/src/components/AppShell.tsx`

**Function**: `getAppMode(pathname: string): AppMode`

**Logic**:

```typescript
// Solve mode: /practice/[attemptId]
if (pathname.startsWith('/practice/') && pathname !== '/practice') {
  return 'solve';
}

// Coach mode: /coach/[sessionId]
if (pathname.startsWith('/coach/') && pathname !== '/coach') {
  return 'coach';
}

// Debug mode: /debug/attempts/[attemptId]
if (pathname.startsWith('/debug/attempts/') && pathname !== '/debug/attempts') {
  return 'debug';
}

// Default: dashboard
return 'dashboard';
```

**Data Attribute**: Layout div has `data-mode={mode}` for CSS targeting

### Active Link Indication

**Current Implementation**: No active link highlighting observed in CSS.

**Recommended Enhancement**:
```css
.nav a[aria-current="page"] {
  color: var(--text-primary);
  font-weight: 500;
  border-bottom: 2px solid var(--accent);
}
```

### Session Persistence

**Navigation During Active Session**:

Clicking "Exit to Dashboard" from `/practice/[attemptId]`:
1. Navigates to `/practice`
2. Session state persists in database (attempt not deleted)
3. User can resume by returning to same URL

**Assumption**: Browser back button should preserve session state.

### Error Navigation

**404 Not Found**: [No custom 404 page observed]
- Falls back to Next.js default 404

**Session Not Found**: [Error handling in page components]
- Displays error state
- Provides "Try Again" or "Back to X" button

---

## API Routes (Not User-Facing Navigation)

### API Route Structure

**Location**: `/apps/web/src/app/api/`

**Routes** (inferred from architecture):
```
/api/attempts/start
/api/attempts/[id]
/api/attempts/[id]/submit
/api/attempts/[id]/step
/api/attempts/[id]/trace

/api/problems/next
/api/problems/list

/api/skills

/api/debug-lab/start
/api/debug-lab/[id]/submit

/api/bug-hunt/start
/api/bug-hunt/[id]/submit
```

**These are NOT navigation routes** - they are API endpoints called via `fetch()`.

---

## Navigation Flow Diagrams

### Practice Flow

```
[Landing Page]
      ↓ "Start Practice"
[/practice] ← Shows recommended problem
      ↓ "Start Problem"
[/practice/{attemptId}] ← Solve mode
      ↓ "Exit to Dashboard"
[/practice] ← Can select different problem
```

### Coach Flow

```
[Landing Page]
      ↓ "Coach" (nav)
[/coach] ← Select problem
      ↓ "Start Coaching"
[/coach/{sessionId}] ← Coach mode
      ↓ "Exit to Coach"
[/coach] ← Select new problem or resume
```

### Debug Flow

```
[Landing Page]
      ↓ "Debug" (nav) or "Debug Lab" card
[/debug] or [/debug-lab] ← Select scenario
      ↓ "Start Debug Session"
[/debug/attempts/{attemptId}] ← Debug mode
      ↓ "Exit to Debug"
[/debug] ← Select new scenario
```

---

## Assumptions

1. **Authentication**: No login/logout navigation observed; assuming demo mode or auth implemented separately
2. **User Profile**: No profile or settings pages observed in route structure
3. **Back Button**: Browser back button behavior relies on Next.js default handling
4. **External Links**: All navigation is internal; no external links from main navigation
5. **Route Prefetching**: Next.js Link component handles automatic route prefetching

---

## Scope and Limitations

### Covered in This Document

- Primary navigation structure and links
- Route hierarchy and URL patterns
- AppMode detection logic and header variants
- Deep linking strategy with UUIDs
- Mobile navigation considerations
- Navigation state management patterns

### Not Covered

- API endpoint routing (covered in API.md)
- Authentication flows (not observed in code)
- Server-side redirects
- Middleware route protection
- Analytics tracking on navigation
- Navigation performance optimization

### Open Questions

1. **Difference between `/debug` and `/debug-lab`**: Are these duplicate entry points or different modes?
2. **Session Resume Logic**: Can users resume incomplete sessions? How are they surfaced?
3. **404 Custom Page**: Is a custom 404 page planned?
4. **Mobile Hamburger Menu**: Is mobile navigation enhancement on the roadmap?
5. **Active Link Styling**: Should active navigation links be highlighted?

---

**Document Status**: Based on code analysis as of 2026-01-24. All route specifications reflect actual implementation in the codebase at `/apps/web/src/app/`.
