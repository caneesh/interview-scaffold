# Scaffolded Learning Platform

A pattern-first coding interview preparation application with adaptive difficulty progression, heuristic-based validation, and optional LLM feedback.

## Problem Solved

Traditional interview prep teaches problems in isolation. This platform teaches **algorithmic patterns** through scaffolded practice, enforcing a thinking-gate before coding and providing targeted micro-lessons when specific errors are detected.

## High-Level System Flow

1. User starts an attempt on a problem (blocked if previous rung not mastered)
2. **Thinking Gate**: User must identify the pattern and state an invariant before coding
3. **Coding**: User writes solution; code is executed against test cases via Piston API
4. **Validation**: Heuristics + optional LLM analyze code for pattern-specific errors
5. **Gating Decision**: System decides next action (proceed, show micro-lesson, require reflection)
6. **Skill Update**: Score computed and persisted using exponential moving average
7. **Progression**: MEP engine decides next problem (retry, sibling, promote rung)

## Practice Flow V2 (NEW)

The V2 flow introduces a structured 5-step learning process with beginner/expert modes:

```
UNDERSTAND → PLAN → IMPLEMENT → VERIFY → REFLECT → COMPLETE
```

### Steps

1. **UNDERSTAND** (Feynman Gate): Explain the problem "like I'm 12" with structured fields. AI validates comprehension without revealing the solution.

2. **PLAN** (Pattern + Invariant): AI suggests 2-3 candidate patterns. Select one, rate confidence, and define your loop invariant (template-based for beginners).

3. **IMPLEMENT** (Coding): Write code with a hint budget that decreases with skill level. Socratic hints guide without giving answers.

4. **VERIFY** (Test + Debug): Run tests. On failure, explain what went wrong; AI provides debugging guidance (never solution code).

5. **REFLECT** (Generalize): Capture key takeaways and invariant summary for future reference.

### Modes

| Mode | UNDERSTAND | PLAN | Hints | Skip Rules |
|------|------------|------|-------|------------|
| **BEGINNER** | Required, AI validates | Template-based invariant builder | 6 (rung 1) to 2 (rung 5) | No skipping |
| **EXPERT** | Required but lighter | Free-text invariant | Fewer hints | Can skip steps |

### API Routes (V2)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/attempts/[id]/mode` | POST | Set BEGINNER or EXPERT mode |
| `/api/attempts/[id]/understand/submit` | POST | Submit understanding explanation |
| `/api/attempts/[id]/plan/suggest` | POST | Get AI pattern suggestions |
| `/api/attempts/[id]/plan/choose` | POST | Select pattern and invariant |
| `/api/attempts/[id]/verify/explain-failure` | POST | Get AI debugging guidance |
| `/api/attempts/[id]/reflect/submit` | POST | Submit reflection |

### Documentation

- [Architecture](./docs/attempt-v2-architecture.md) - State machine, data model, API contracts
- [Security Review](./docs/attempt-v2-security-review.md) - Security findings and recommendations

## Design Principles Enforced in Code

- **Pure Domain Core**: `packages/core` has zero framework dependencies; all I/O via ports
- **Deterministic Rules**: All thresholds and rules are constants, not magic numbers
- **Multi-Tenancy**: Every entity and operation is scoped to `tenantId`
- **Graceful Degradation**: LLM validation is optional; heuristics work standalone
- **Type Safety**: Branded types for IDs (`PatternId`, `RungLevel`), strict TypeScript
- **Testability**: Clock abstraction, dependency injection, pure functions

## Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.4 (strict mode) |
| Frontend | Next.js 14, React 18 |
| Database | PostgreSQL with Drizzle ORM 0.30 |
| LLM | Anthropic SDK 0.20+ (Claude Sonnet 4) |
| Code Execution | Piston API (sandboxed) |
| Build | Turborepo 2.0, pnpm 9 |
| Testing | Vitest 1.6 |
| Validation | Zod 3.22 |

## Local Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL database
- (Optional) Anthropic API key for LLM features
- (Optional) Piston API endpoint for code execution

### Installation

```bash
# Install pnpm if needed
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Environment Variables

Create `.env.local` in `apps/web/`:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/scaffold
ANTHROPIC_API_KEY=sk-ant-...  # Optional
PISTON_API_URL=https://emkc.org/api/v2/piston  # Optional
```

### Running

```bash
# Development (all packages)
pnpm dev

# Web app only
pnpm dev:web

# Tests
pnpm test

# Type checking
pnpm typecheck
```

The app runs at `http://localhost:3000`.

## Folder Structure

```
.
├── apps/
│   └── web/                    # Next.js 14 application
│       ├── src/app/            # App router pages and API routes
│       ├── src/components/     # React components (UI only)
│       └── src/lib/            # Dependency injection, constants
├── packages/
│   ├── core/                   # Pure domain logic (NO framework deps)
│   │   ├── src/entities/       # Attempt, Problem, SkillState, etc.
│   │   ├── src/ports/          # Interface definitions (repos, clock, etc.)
│   │   ├── src/use-cases/      # startAttempt, submitCode, etc.
│   │   ├── src/validation/     # Heuristics, gating rules, rubric
│   │   └── src/data/           # Seed problems (BACKTRACKING, INTERVAL_MERGING)
│   ├── contracts/              # DTOs and Zod schemas
│   ├── adapter-db/             # Drizzle ORM repositories
│   ├── adapter-auth/           # Auth context provider
│   ├── adapter-llm/            # Claude API integration
│   ├── adapter-piston/         # Code execution sandbox
│   └── adapter-analytics/      # Event sink (console logging)
├── turbo.json                  # Build orchestration
├── pnpm-workspace.yaml         # Workspace definition
└── tsconfig.base.json          # Shared TypeScript config
```

## Known Limitations (Visible in Code)

1. **Daily Session Block A**: The spaced review block uses a hardcoded question. Block B (practice) is fully connected to the backend MEP engine.

2. **Analytics**: `EventSink` implementation logs to console only; no persistent analytics pipeline.

3. **Seed Problems Only**: Only BACKTRACKING and INTERVAL_MERGING patterns have seed problems (6 problems each across 3 rungs).

4. **Code Execution**: Requires external Piston API; no fallback if unavailable.

5. **No Authentication**: Auth adapter provides demo context; no real user authentication implemented.

6. **No Spaced Repetition**: Skill decay and spaced review logic is defined in docs but not implemented in code.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/attempts/start` | POST | Start a new attempt |
| `/api/attempts/[id]` | GET | Get attempt with problem |
| `/api/attempts/[id]/submit` | POST | Submit code for execution |
| `/api/attempts/[id]/step` | POST | Submit thinking gate or reflection |
| `/api/attempts/[id]/hint` | POST | Request next hint level |
| `/api/problems/next` | GET | Get MEP-recommended next problem |
| `/api/skills` | GET | Get user skill matrix |

## Debug Track

The Debug Track teaches systematic debugging skills through real-world bug scenarios. Users work through a gate-based workflow that reinforces methodical debugging practices.

### Features

- **14 Seed Scenarios** covering 6 bug categories (FUNCTIONAL_LOGIC, ALGORITHMIC, PERFORMANCE, RESOURCE, CONCURRENCY, INTEGRATION)
- **7-Gate Workflow**: SYMPTOM -> DETERMINISM -> PATTERN -> ROOT_CAUSE -> FIX -> REGRESSION -> REFLECTION
- **Progressive Hints**: 4-6 hints per scenario, from subtle to explicit
- **Scoring System**: Weighted evaluation with hint deductions
- **Interview Simulation Mode**: Timed practice with realistic constraints

### Bug Categories

| Category | Examples |
|----------|----------|
| FUNCTIONAL_LOGIC | Off-by-one, missing guards, boundary conditions |
| ALGORITHMIC | Missing memoization, incorrect visited state |
| PERFORMANCE | O(n^2) string ops, nested loop inefficiency |
| RESOURCE | Memory leaks, string concatenation in loops |
| CONCURRENCY | Race conditions, deadlocks, non-atomic operations |
| INTEGRATION | Missing error handling, retry without backoff |

### Documentation

- [Debug Track Overview](./docs/DEBUG_TRACK.md) - Full documentation
- [Scenario Authoring Guide](./docs/DEBUG_SCENARIO_AUTHORING.md) - How to create new scenarios

### Running Debug Track

```bash
pnpm dev
# Navigate to http://localhost:3000/debug
```

## License

Private - All rights reserved
