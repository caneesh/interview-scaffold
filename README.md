# Scaffolded Learning Platform

A monorepo for a scaffolded learning coding interview application with clean architecture, featuring MEP (Minimum Effective Practice), micro-drills, pattern discovery, and time-efficient learning analytics.

## Quick Demo

### Running the Demo

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the development server
pnpm dev:web

# Open http://localhost:3000 in your browser
```

### Click-Through Demo Steps

#### 1. Home Page
- Navigate to `http://localhost:3000`
- See three main options: "Start Daily Session", "Interview Mode", and "Practice Problems"

#### 2. Daily Session (10-minute structured learning)
1. Click **"Start Daily Session"**
2. Review the 10-minute session breakdown:
   - Block A (2 min): Spaced Review drill
   - Block B (6 min): MEP-selected practice task
   - Block C (2 min): Reflection
3. Click **"Start Session"** to begin
4. **Block A**: Answer the spaced review MCQ (e.g., "What is the time complexity of sliding window?")
5. Click **"Continue to Practice"** after selecting an answer
6. **Block B**: Work on the MEP-recommended problem (e.g., Two Sum II)
7. Click **"Continue to Reflection"** when ready
8. **Block C**: Rate your confidence (1-5) and add reflection notes
9. Click **"Complete Session"** to finish

#### 3. Interview Mode (simulates real interview)
1. Click **"Interview Mode"** from the home page
2. Review the interview conditions (timer, hints hidden, forced explanations)
3. Click **"Start Interview"** to begin
4. **Step 1**: Select the pattern you think applies (locks after submission)
5. **Step 2**: Explain your approach
6. **Step 3**: Define loop invariants
7. **Step 4**: Analyze time/space complexity
8. **Step 5**: Write your solution code
9. View your complete results with all explanations

#### 4. Practice Problems (free practice)
- Click **"Practice Problems"** for unstructured practice

### Key Features Demonstrated

| Feature | Location | Description |
|---------|----------|-------------|
| MEP Engine | Daily Session Block B | Selects optimal next task based on progress |
| Micro-drills | Daily Session Block A | Quick MCQ/text drills for pattern review |
| Guardrails | Core policies | 2 sibling fails → lesson, 3 wins → promote |
| Pattern Discovery | Interview Mode Step 1 | Socratic questioning to identify patterns |
| Time Analytics | All sessions | Tracks time per rung, error recurrence |
| Confidence Tracking | Reflection Block | Self-assessment (1-5) affects recommendations |

## Architecture

This project follows strict architectural principles:

1. **`packages/core`** - Pure TypeScript domain logic
   - No framework dependencies (no Next.js, no HTTP, no DB, no ORM)
   - Contains: entities, use-cases, policies, and ports (interfaces)

2. **`packages/contracts`** - DTOs and API schemas
   - Shared types between frontend and backend
   - API route definitions and error codes

3. **Adapters** - All side effects via adapters
   - `adapter-db` - Repository implementations (Supabase)
   - `adapter-auth` - Authentication context (Supabase Auth)
   - `adapter-llm` - LLM interactions (Claude API)
   - `adapter-analytics` - Event sinks for analytics

4. **`apps/web`** - Next.js UI
   - UI only - no business logic
   - Calls core use-cases via server actions
   - Renders DTOs

## Multi-tenancy

Every use-case receives `tenantId`. Every entity is tenant-scoped.

## Core Domain

### Entities

- **Problem** - Scaffolded coding problems with steps
- **Pattern** - Algorithmic patterns (Two Pointers, DP, etc.)
- **MicroDrill** - Quick exercises for pattern reinforcement
- **MicroLesson** - Short learning content
- **Attempt** - User attempts with modes: `GUIDED | EXPLORER | INTERVIEW | DAILY`
- **Session** - Learning sessions (daily, practice, review)
- **Progress** - User progress tracking

### Error Taxonomy

- `SYNTAX_ERROR`, `LOGIC_ERROR`, `EDGE_CASE_MISS`
- `PATTERN_MISAPPLY`, `COMPLEXITY_ISSUE`
- `CONFIDENCE_LOW`, `TIME_OVERRUN`, `TRANSFER_FAIL`

### Policies (Constants)

- **Time Budgets** - Default time allocations per difficulty/mode
- **Promotion Thresholds** - Mastery and difficulty unlock criteria
- **Confidence Thresholds** - Scoring and detection rules
- **Daily Session Rules** - Session composition and spaced repetition

### MEP Engine (Minimum Effective Practice)

The MEP decision engine determines what action the user should take next:

| Action | When | Description |
|--------|------|-------------|
| `SERVE_SAME` | Score < 70% | Retry the same problem |
| `SERVE_SIBLING` | Score ≥ 70%, not mastered | Try a similar problem |
| `PROMOTE` | 3+ consecutive wins | Advance to next difficulty |
| `DRILL` | Critical error detected | Micro-drill for weak pattern |
| `LESSON` | Repeated critical errors | Review lesson content |
| `TRANSFER_CHECK` | High confidence | Test pattern transfer ability |

### Guardrails

Automatic safeguards to prevent frustration and ensure progress:

- **2 sibling failures with same error** → Route to lesson
- **3 clean wins** → Auto-promote to next rung
- **Time overrun >50%** → Prioritize discovery mode

### Analytics Events

Events tracked for learning efficiency analysis:

- `HINT_USED`, `ERROR_DETECTED`
- `MICRO_DRILL_PASSED`, `MICRO_DRILL_FAILED`
- `TRANSFER_SUCCESS`, `TRANSFER_FAIL`
- `PROMOTED`, `TIME_OVERRUN`

### Learning Metrics

Computed metrics for progress tracking:

| Metric | Formula | Purpose |
|--------|---------|---------|
| `minutesPerMasteredRung` | total_time / rungs_mastered | Efficiency measure |
| `errorRecurrenceRate` | recurring_errors / unique_errors | Pattern retention |
| `transferSuccessRate` | transfers_passed / transfers_attempted | Generalization ability |
| `drillPassRate` | drills_passed / drills_attempted | Foundational strength |

### Use-cases

- `CreateDailySession` - Creates personalized 10-min learning session
- `GetNextMicroDrill` - Selects next appropriate drill based on pattern progress
- `GetMEPRecommendation` - Determines optimal next action using MEP logic
- `SubmitMicroDrillAttempt` - Grades drill attempt and updates progress
- `RunPatternDiscovery` - Socratic questioning for pattern identification

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+

### Installation

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run all dev servers
pnpm dev

# Run only the web app
pnpm dev:web

# Run the legacy Vite app
pnpm dev:legacy
```

### Testing

```bash
# Run all tests
pnpm test

# Run core tests only
pnpm test:core

# Run tests once (no watch)
pnpm test:run
```

### Building

```bash
# Build all packages
pnpm build

# Build core only
pnpm build:core

# Type check
pnpm typecheck
```

## Project Structure

```
.
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/            # Next.js app router pages
│       │   ├── components/     # React components
│       │   └── lib/            # Adapters & server actions
│       └── package.json
├── packages/
│   ├── core/                   # Pure domain logic
│   │   ├── src/
│   │   │   ├── entities/       # Domain entities
│   │   │   ├── ports/          # Interface definitions
│   │   │   ├── policies/       # Business rules (constants)
│   │   │   └── use-cases/      # Application use-cases
│   │   └── tests/              # Unit tests
│   ├── contracts/              # DTOs & API schemas
│   ├── adapter-db/             # Database adapter (Supabase)
│   ├── adapter-auth/           # Auth adapter (Supabase Auth)
│   ├── adapter-llm/            # LLM adapter (Claude)
│   └── adapter-analytics/      # Analytics adapter
├── src/                        # Legacy Vite app (to be migrated)
├── api/                        # Legacy API routes
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_DEFAULT_TENANT_ID=default
ANTHROPIC_API_KEY=your-claude-api-key
```

## Database Schema

The required database tables for Supabase are in `supabase-schema.sql`.

Additional tables needed for the new entities:

- `patterns` - Algorithmic patterns
- `micro_drills` - Quick exercises
- `micro_lessons` - Short lessons
- `sessions` - Learning sessions
- `problem_attempts` - Problem attempt tracking
- `drill_attempts` - Drill attempt tracking
- `problem_progress` - Per-problem progress
- `pattern_progress` - Per-pattern progress
- `drill_progress` - Per-drill progress
- `user_stats` - Aggregated user statistics
- `learning_events` - Analytics events

## Key Design Decisions

1. **Determinism over cleverness** - All rules encoded as constants
2. **No hidden logic** - Business rules in policies, not UI
3. **Pure core** - Framework-agnostic domain logic
4. **Type-safe** - Branded types for IDs, strict TypeScript
5. **Testable** - Clock abstraction, dependency injection

## License

Private - All rights reserved
