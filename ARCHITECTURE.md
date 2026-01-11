# Architecture

This document describes the real architecture as implemented in code, not aspirational design.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   /page     │  │  /practice  │  │   /daily    │  │ /interview  │        │
│  │   (home)    │  │ [attemptId] │  │  (UI only)  │  │  (UI only)  │        │
│  └─────────────┘  └──────┬──────┘  └─────────────┘  └─────────────┘        │
│                          │                                                  │
│  ┌───────────────────────┴────────────────────────────────────────┐        │
│  │                    React Components (UI only)                   │        │
│  │  Stepper, ProblemStatement, ThinkingGate, CodeEditor,          │        │
│  │  TestResults, HintPanel, ReflectionForm, MicroLessonModal       │        │
│  └───────────────────────┬────────────────────────────────────────┘        │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │ fetch()
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API ROUTES (Next.js Route Handlers)                │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ /api/attempts/ │  │/api/attempts/  │  │ /api/problems/ │                │
│  │     start      │  │ [id]/submit    │  │     next       │                │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                │
│          │                   │                   │                          │
│          └───────────────────┴───────────────────┘                          │
│                              │                                              │
│  ┌───────────────────────────┴───────────────────────────────────┐         │
│  │                    Dependency Injection (lib/deps.ts)          │         │
│  │   Wires adapters to ports; creates repo/service instances      │         │
│  └───────────────────────────┬───────────────────────────────────┘         │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ calls use-cases
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE DOMAIN (packages/core)                       │
│                         Pure TypeScript, NO framework deps                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           USE-CASES                                  │   │
│  │  startAttempt, submitCode, submitStep, getNextProblem,              │   │
│  │  decideProgressionAction, computeAttemptScore, selectSibling        │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                          VALIDATION                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │ Heuristics  │  │  Forbidden  │  │   Gating    │  │   Rubric   │  │   │
│  │  │ (per-pattern│  │  Concepts   │  │  Decision   │  │  Grading   │  │   │
│  │  │   checks)   │  │  Detector   │  │   Engine    │  │            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                           ENTITIES                                   │   │
│  │  Attempt, Problem, SkillState, Step, Pattern, Rung, Tenant          │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                            PORTS (Interfaces)                        │   │
│  │  AttemptRepo, ContentRepo, SkillRepo, EventSink, Clock, IdGenerator │   │
│  │  CodeExecutor, LLMValidationPort                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                               │ implemented by
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             ADAPTERS (packages/adapter-*)                   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   adapter-db    │  │   adapter-llm   │  │ adapter-piston  │             │
│  │  (Drizzle ORM)  │  │  (Anthropic SDK)│  │  (HTTP client)  │             │
│  │                 │  │                 │  │                 │             │
│  │  AttemptRepo    │  │  LLMClient      │  │  CodeExecutor   │             │
│  │  ContentRepo    │  │  LLMValidation  │  │                 │             │
│  │  SkillRepo      │  │  Port           │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐             │
│  │  adapter-auth   │  │adapter-analytics│  │                 │             │
│  │  (Demo context) │  │ (Console sink)  │  │                 │             │
│  │                 │  │                 │  │                 │             │
│  │  AuthProvider   │  │  EventSink      │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                               │ connects to
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   PostgreSQL    │  │  Anthropic API  │  │   Piston API    │             │
│  │   (Drizzle)     │  │  (Claude LLM)   │  │ (Code sandbox)  │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Major Modules and Responsibilities

### Frontend (`apps/web/`)

| Module | Responsibility |
|--------|----------------|
| `src/app/` | Next.js App Router pages and API route handlers |
| `src/components/` | Presentational React components (NO business logic) |
| `src/lib/deps.ts` | Dependency injection - wires adapters to core ports |
| `src/lib/constants.ts` | Demo tenant/user IDs for development |

### Core Domain (`packages/core/`)

| Module | Responsibility |
|--------|----------------|
| `entities/` | Immutable domain models (Attempt, Problem, SkillState, etc.) |
| `ports/` | Interface definitions for external dependencies |
| `use-cases/` | Application logic; orchestrates entities and ports |
| `validation/` | Heuristics, forbidden concepts, gating rules, rubric grading, thinking-gate semantic validation |
| `hints/` | Pattern-specific hint generation with budget enforcement |
| `data/` | Seed problems and pattern packs |

### Adapters (`packages/adapter-*/`)

| Adapter | Port Implemented | External Dependency |
|---------|------------------|---------------------|
| `adapter-db` | AttemptRepo, ContentRepo, SkillRepo | PostgreSQL via Drizzle |
| `adapter-llm` | LLMValidationPort | Anthropic Claude API |
| `adapter-piston` | CodeExecutor | Piston API (HTTP) |
| `adapter-auth` | AuthProvider | None (demo context) |
| `adapter-analytics` | EventSink | None (console.log) |

---

## Data Flow Between Modules

### Happy Path: Code Submission

```
1. User submits code
   │
   ▼
2. API Route Handler (/api/attempts/[id]/submit)
   │
   ├── Validates request with Zod schema
   │
   ▼
3. Use-Case: submitCode()
   │
   ├── Loads attempt from AttemptRepo
   │
   ├── Loads problem from ContentRepo
   │
   ├── Validates attempt state (must be CODING or HINT)
   │
   ▼
4. Code Execution (CodeExecutor port)
   │
   ├── Sends code to Piston API
   │
   ├── Runs against test cases
   │
   └── Returns TestResult[]
   │
   ▼
5. Heuristic Analysis (validation/heuristics.ts)
   │
   ├── Runs pattern-specific heuristics
   │
   └── Returns HeuristicResult[]
   │
   ▼
6. LLM Validation (optional, LLMValidationPort)
   │
   ├── Sends code + context to Claude
   │
   └── Returns LLMValidationResponse or null
   │
   ▼
7. Gating Decision (validation/gating.ts)
   │
   ├── Analyzes rubric, heuristics, LLM result
   │
   └── Returns GatingDecision (PROCEED, BLOCK, REQUIRE_REFLECTION, SHOW_MICRO_LESSON)
   │
   ▼
8. State Transition
   │
   ├── PROCEED → COMPLETED (if all tests pass)
   │
   ├── REQUIRE_REFLECTION → REFLECTION
   │
   └── SHOW_MICRO_LESSON → CODING (with micro-lesson data)
   │
   ▼
9. Skill Update (if COMPLETED)
   │
   ├── Computes attempt score
   │
   ├── Updates SkillState with exponential moving average
   │
   └── Checks rung unlock
   │
   ▼
10. Response to Client
    │
    └── { attempt, testResults, validation, gating }
```

---

## State Management

### Attempt State Machine

```
     ┌──────────────┐
     │              │
     ▼              │
┌─────────────┐     │
│  THINKING   │     │
│    GATE     │     │
└──────┬──────┘     │
       │ (pass)     │
       ▼            │
┌─────────────┐     │
│   CODING    │◄────┤ (retry after reflection)
└──────┬──────┘     │
       │            │
       ▼            │
┌─────────────┐     │
│    HINT     │─────┤ (continue coding)
└──────┬──────┘     │
       │ (submit)   │
       ▼            │
   ┌───────┐        │
   │ Tests │        │
   │ Run   │        │
   └───┬───┘        │
       │            │
   ┌───┴───┐        │
   │ Gating│        │
   │Decision│       │
   └───┬───┘        │
       │            │
  ┌────┼────┼───┐   │
  ▼    ▼    ▼   ▼   │
┌───┐┌────┐┌───┐┌───┴─────┐
│COM││REFL││SUC││ MICRO   │
│PLE││ECTI││RFL││ LESSON  │
│TED││ON  ││   ││ (modal) │
└───┘└──┬─┘└─┬─┘└─────────┘
        │    │
        │    └─► COMPLETED
        └──────────────► (back to CODING)
```

**SUCCESS_REFLECTION (SUC RFL)**: Optional post-success reflection triggered for:
- First successful attempt (learning reinforcement)
- High rung problems (≥3)
- Success after multiple attempts (≥3)

### Skill State Scoring

```
Formula: newScore = oldScore * (1 - alpha) + attemptScore * alpha

Where:
  alpha = min(0.3, 1 / (attemptsCount + 1))

Effect:
  - First attempt: alpha = 0.5, heavy weight to first score
  - 5+ attempts: alpha = 0.166, gradual adjustment
  - Capped at 0.3 to prevent wild swings
```

---

## Persistence Layer

### Database Schema (Drizzle ORM)

```
tenants
├── id (uuid, PK)
├── name (text)
└── created_at (timestamp)

problems
├── id (uuid, PK)
├── tenant_id (uuid, FK → tenants)
├── title (text)
├── statement (text)
├── pattern (text)
├── rung (integer)
├── target_complexity (text)
├── test_cases (jsonb)
├── hints (jsonb)
└── created_at (timestamp)
│
└── INDEX: (tenant_id, pattern, rung)

attempts
├── id (uuid, PK)
├── tenant_id (uuid, FK → tenants)
├── user_id (text)
├── problem_id (uuid, FK → problems)
├── pattern (text)
├── rung (integer)
├── state (text)
├── hints_used (jsonb)
├── code_submissions (integer)
├── score (jsonb, nullable)
├── started_at (timestamp)
└── completed_at (timestamp, nullable)
│
├── INDEX: (tenant_id, user_id)
└── INDEX: (tenant_id, user_id, state)

steps
├── id (uuid, PK)
├── attempt_id (uuid, FK → attempts)
├── type (text)
├── result (text, nullable)
├── data (jsonb)
├── started_at (timestamp)
└── completed_at (timestamp, nullable)
│
└── INDEX: (attempt_id)

skills
├── id (uuid, PK)
├── tenant_id (uuid, FK → tenants)
├── user_id (text)
├── pattern (text)
├── rung (integer)
├── score (real)
├── attempts_count (integer)
├── last_attempt_at (timestamp, nullable)
├── unlocked_at (timestamp, nullable)
├── last_applied_attempt_id (uuid, nullable) -- for idempotency
└── updated_at (timestamp)
│
├── INDEX: (tenant_id, user_id)
├── INDEX: (tenant_id, user_id, pattern, rung)
└── UNIQUE: (tenant_id, user_id, pattern, rung) -- prevents duplicate skill records
```

### Repository Pattern

All database access goes through repository ports:
- `AttemptRepo`: CRUD for attempts, query by user/state
- `ContentRepo`: Read problems by pattern/rung
- `SkillRepo`: Read/write skill states

---

## AI/LLM Boundaries

### What LLM Can Do

1. **Evaluate Code Quality**: Grade code as PASS/PARTIAL/FAIL with confidence
2. **Detect Pattern Usage**: Identify which pattern the code implements
3. **Provide Feedback**: Generate constructive feedback for students
4. **Suggest Micro-Lessons**: Recommend educational content based on errors
5. **Generate Hints**: Create Socratic-style hints (not implemented in practice mode)
6. **Evaluate Thinking Gate**: Optional augmentation of deterministic semantic validation

### What LLM Cannot Do

1. **Execute Code**: Code execution is handled by Piston API
2. **Override Test Results**: Test pass/fail is determined by execution
3. **Bypass Gating**: Gating decisions can use LLM input but heuristics are primary
4. **Access External Data**: LLM only sees problem statement, code, and test results

### Graceful Degradation

If LLM is unavailable (no API key, API error):
- `LLMValidationPort.validateCode()` returns `null`
- Heuristics become the sole validation source
- No feedback is shown (validation panel hidden)

---

## Concurrency and Consistency

### Assumptions

1. **Single User per Attempt**: Each attempt belongs to one user; no concurrent editing
2. **Optimistic Updates**: Frontend updates UI before API response in some cases
3. **No Transactions**: Database operations are individual queries (no explicit transaction wrapping)
4. **Idempotent Reads**: Content (problems) is read-only after seeding
5. **Idempotent Skill Updates**: Skill updates track `lastAppliedAttemptId` to prevent duplicate scoring

### Idempotency Implementation

Skill updates use conditional writes to prevent duplicate scoring:
- `updateIfNotApplied(skill, attemptId)` checks if attempt was already applied
- Uses database constraint `(tenantId, userId, pattern, rung)` for uniqueness
- Returns `{ skill, wasApplied }` to indicate whether update occurred

### Potential Issues

1. **Race Condition**: If user submits code rapidly, multiple submissions could interleave
2. **Stale State**: Frontend may show stale attempt state if not refetched
3. **No Locking**: No row-level locking on attempt updates (mitigated by idempotent skill updates)

---

## Failure Modes

### External Service Failures

| Service | Failure Mode | Handling |
|---------|--------------|----------|
| PostgreSQL | Connection failure | 500 error returned |
| Anthropic API | Timeout/error | Graceful degradation (heuristics only) |
| Piston API | Timeout/error | 500 error, no test results |

### Single Points of Failure

1. **PostgreSQL**: All persistence; no fallback
2. **Piston API**: Required for code execution; no local executor fallback
3. **Next.js Server**: Single process in development

---

## Tight Coupling

| Location | Coupling | Risk |
|----------|----------|------|
| `lib/deps.ts` | Creates all adapters at module load | Cold start latency; hard to mock |
| Heuristics registry | Pattern ID hardcoded | Adding patterns requires code change |
| Gating micro-lessons | Hardcoded in gating.ts | Content changes require code deploy |
| Seed problems | Embedded in core package | Content updates require build |

---

## Scale and Correctness Concerns

### Current Limitations

1. **No Connection Pooling Config**: Drizzle uses default pg connection
2. **No Rate Limiting**: API routes have no request throttling
3. **No Caching**: Every request hits database directly
4. **Synchronous LLM Calls**: Code submission waits for LLM response (can be slow)
5. **Memory-Bound Heuristics**: Regex patterns compiled on each request

### Recommendations (Not Implemented)

1. Add connection pooling configuration
2. Implement Redis caching for skill states
3. Move LLM validation to async/background job
4. Pre-compile heuristic regexes at startup
5. Add request rate limiting per user

---

## Module Dependency Graph

```
apps/web
  └── packages/core
        └── packages/contracts
  └── packages/adapter-db
        └── packages/core (types)
  └── packages/adapter-llm
        └── packages/core (types)
  └── packages/adapter-piston
        └── packages/core (types)
  └── packages/adapter-auth
        └── packages/core (types)
  └── packages/adapter-analytics
        └── packages/core (types)
```

**Key Principle**: Core depends on nothing except contracts. All adapters depend on core for types but core does not depend on adapters.
