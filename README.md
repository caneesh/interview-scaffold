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

1. **Daily Session**: The `/daily` page uses hardcoded mock problems; it is not connected to the backend MEP engine or problem selection logic.

2. **Interview Mode**: The `/interview` page is a standalone form; it does not fetch real problems or submit to the backend.

3. **Analytics**: `EventSink` implementation logs to console only; no persistent analytics pipeline.

4. **Seed Problems Only**: Only BACKTRACKING and INTERVAL_MERGING patterns have seed problems (6 problems each across 3 rungs).

5. **Code Execution**: Requires external Piston API; no fallback if unavailable.

6. **No Authentication**: Auth adapter provides demo context; no real user authentication implemented.

7. **No Spaced Repetition**: Skill decay and spaced review logic is defined in docs but not implemented in code.

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

## License

Private - All rights reserved
