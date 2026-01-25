# Architecture Overview

**Document Version:** 2.0
**Last Updated:** 2026-01-18
**Reflects Code State:** Based on analysis of current codebase implementation

---

## Table of Contents

1. [High-Level System Architecture](#high-level-system-architecture)
2. [Monorepo Structure](#monorepo-structure)
3. [Core Architectural Patterns](#core-architectural-patterns)
4. [Package Deep Dive](#package-deep-dive)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [State Management](#state-management)
7. [Persistence Layer](#persistence-layer)
8. [Dependency Injection](#dependency-injection)
9. [Key Design Patterns](#key-design-patterns)
10. [Failure Modes and Resilience](#failure-modes-and-resilience)
11. [Module Dependency Graph](#module-dependency-graph)
12. [Scale and Performance Considerations](#scale-and-performance-considerations)

---

## High-Level System Architecture

The interview-scaffold is a **practice-oriented coding interview preparation platform** built on clean architecture principles. The system follows a strict **ports and adapters (hexagonal architecture)** pattern with framework-agnostic business logic.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                              │
│                              Next.js 14 App                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   /page     │  │  /practice  │  │ /debug-lab  │  │  /bug-hunt  │        │
│  │   (home)    │  │ [attemptId] │  │ [attemptId] │  │ [attemptId] │        │
│  │             │  │             │  │             │  │             │        │
│  │ ├─/skills   │  │             │  │             │  │             │        │
│  │ ├─/explorer │  │             │  │             │  │             │        │
│  │ └─/features │  │             │  │             │  │             │        │
│  └─────────────┘  └──────┬──────┘  └─────────────┘  └─────────────┘        │
│                          │                                                  │
│  ┌───────────────────────┴────────────────────────────────────────┐        │
│  │              React Components (Presentation Layer)              │        │
│  │  Stepper, ProblemStatement, ThinkingGate, PatternDiscovery,    │        │
│  │  CodeEditor, TestResults, HintPanel, ReflectionForm,           │        │
│  │  MicroLessonModal, TraceVisualization, PerformancePanel        │        │
│  └───────────────────────┬────────────────────────────────────────┘        │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │ HTTP (fetch)
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Route Handlers)                       │
│                          apps/web/src/app/api                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ /api/attempts/ │  │/api/attempts/  │  │ /api/problems/ │                │
│  │     start      │  │ [id]/submit    │  │     next       │                │
│  │                │  │ [id]/step      │  │                │                │
│  │                │  │ [id]/trace     │  │                │                │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘                │
│          │                   │                   │                          │
│  ┌───────┴────────┐  ┌───────┴────────┐  ┌───────┴────────┐                │
│  │  /api/skills/  │  │/api/debug-lab/ │  │ /api/bug-hunt/ │                │
│  │                │  │   start        │  │    start       │                │
│  │                │  │   [id]/submit  │  │  [id]/submit   │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                              │                                              │
│  ┌───────────────────────────┴───────────────────────────────────┐         │
│  │              Dependency Injection (lib/deps.ts)                │         │
│  │   • Wires adapters to core ports                               │         │
│  │   • Creates repository instances (in-memory or DB)             │         │
│  │   • Initializes LLM client (optional)                          │         │
│  │   • Configures code executor (Piston API)                      │         │
│  └───────────────────────────┬───────────────────────────────────┘         │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │ calls use-cases
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER (packages/core)                           │
│                    Pure TypeScript - Zero Framework Dependencies            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          USE-CASES                                   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │ Practice Flow:                                                │   │   │
│  │  │  • startAttempt        • submitCode       • submitStep       │   │   │
│  │  │  • getNextProblem      • selectSibling                        │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │ Scoring & Progression:                                        │   │   │
│  │  │  • computeAttemptScore • decideProgressionAction             │   │   │
│  │  │  • decideNextAction    • getSkillMatrix                      │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  │  ┌──────────────────────────────────────────────────────────────┐   │   │
│  │  │ Advanced Features:                                            │   │   │
│  │  │  • patternDiscovery    • patternChallenge                    │   │   │
│  │  │  • diagnosticCoaching  • postmortemGenerator                 │   │   │
│  │  └──────────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                         VALIDATION ENGINE                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │ Heuristics  │  │  Forbidden  │  │   Gating    │  │   Rubric   │  │   │
│  │  │ (Pattern-   │  │  Concepts   │  │  Decision   │  │  Grading   │  │   │
│  │  │  specific)  │  │  Detector   │  │   Engine    │  │            │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │ Thinking    │  │  Socratic   │  │  Pattern    │  │  Pattern   │  │   │
│  │  │    Gate     │  │   Repair    │  │  Discovery  │  │ Challenge  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                          ENTITIES (Domain Models)                    │   │
│  │  Attempt, Problem, SkillState, Step, Pattern, Rung, Tenant,         │   │
│  │  BugHunt, DebugLab, DiagnosticCoach, InvariantTemplate, Trace       │   │
│  └────────────────────────────────┬────────────────────────────────────┘   │
│                                   │                                         │
│  ┌────────────────────────────────┴────────────────────────────────────┐   │
│  │                     PORTS (Interface Contracts)                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ Repositories:                                                │    │   │
│  │  │  AttemptRepo, ContentRepo, SkillRepo, BugHuntRepo,          │    │   │
│  │  │  DebugLabRepo, DiagnosticSessionRepo                        │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ External Services:                                           │    │   │
│  │  │  CodeExecutor, LLMValidationPort, AICoach, EventSink,       │    │   │
│  │  │  Clock, IdGenerator, AuthContext                            │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                               │ implemented by
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   ADAPTER LAYER (packages/adapter-*)                        │
│                  Infrastructure & External Service Integration              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   adapter-db    │  │   adapter-llm   │  │ adapter-piston  │             │
│  │  (Drizzle ORM)  │  │  (Anthropic SDK)│  │  (HTTP Client)  │             │
│  │                 │  │                 │  │                 │             │
│  │ Implements:     │  │ Implements:     │  │ Implements:     │             │
│  │  AttemptRepo    │  │  LLMClient      │  │  CodeExecutor   │             │
│  │  ContentRepo    │  │  LLMValidation  │  │  TraceExecutor  │             │
│  │  SkillRepo      │  │  Port           │  │  PistonClient   │             │
│  │  BugHuntRepo    │  │  AICoach        │  │                 │             │
│  │  DebugLabRepo   │  │                 │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐             │
│  │  adapter-auth   │  │adapter-analytics│  │   contracts     │             │
│  │  (Demo Context) │  │ (Console Sink)  │  │  (Zod schemas)  │             │
│  │                 │  │                 │  │                 │             │
│  │ Implements:     │  │ Implements:     │  │ API Validation  │             │
│  │  AuthProvider   │  │  EventSink      │  │ DTOs, Types     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                               │ connects to
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                    │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │   PostgreSQL    │  │  Anthropic API  │  │   Piston API    │             │
│  │  (via Drizzle)  │  │ (Claude Sonnet) │  │ (Code Sandbox)  │             │
│  │                 │  │                 │  │                 │             │
│  │ • attempts      │  │ • Code eval     │  │ • Execute code  │             │
│  │ • problems      │  │ • Hint gen      │  │ • Run tests     │             │
│  │ • skills        │  │ • Reflection    │  │ • Trace exec    │             │
│  │ • steps         │  │ • Gate eval     │  │                 │             │
│  │ • tenants       │  │                 │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

The project uses **pnpm workspaces** with **Turborepo** for build orchestration.

```
interview-scaffold/
├── apps/
│   └── web/                         # Next.js 14 application
│       ├── src/
│       │   ├── app/                 # App Router pages & API routes
│       │   │   ├── api/             # Route handlers
│       │   │   │   ├── attempts/    # Practice session endpoints
│       │   │   │   ├── problems/    # Problem selection
│       │   │   │   ├── skills/      # Skill matrix
│       │   │   │   ├── debug-lab/   # Debug mode endpoints
│       │   │   │   └── bug-hunt/    # Bug hunt mode
│       │   │   ├── practice/        # Practice UI
│       │   │   ├── skills/          # Skill matrix UI
│       │   │   ├── debug-lab/       # Debug lab UI
│       │   │   ├── bug-hunt/        # Bug hunt UI
│       │   │   ├── explorer/        # Pattern explorer
│       │   │   └── features/        # Feature showcase
│       │   ├── components/          # React components
│       │   └── lib/
│       │       ├── deps.ts          # ⭐ Dependency injection hub
│       │       ├── constants.ts     # Demo tenant/user IDs
│       │       └── in-memory-repos.ts # In-memory repositories
│       └── package.json
│
├── packages/
│   ├── core/                        # ⭐ Domain logic (zero dependencies)
│   │   ├── src/
│   │   │   ├── entities/            # Domain models
│   │   │   │   ├── attempt.ts
│   │   │   │   ├── problem.ts
│   │   │   │   ├── skill-state.ts
│   │   │   │   ├── step.ts
│   │   │   │   ├── pattern.ts
│   │   │   │   ├── rung.ts
│   │   │   │   ├── tenant.ts
│   │   │   │   ├── bug-hunt.ts
│   │   │   │   ├── debug-lab.ts
│   │   │   │   ├── trace.ts
│   │   │   │   └── invariant-template.ts
│   │   │   ├── ports/               # Interface contracts
│   │   │   │   ├── attempt-repo.ts
│   │   │   │   ├── content-repo.ts
│   │   │   │   ├── skill-repo.ts
│   │   │   │   ├── bug-hunt-repo.ts
│   │   │   │   ├── debug-lab-repo.ts
│   │   │   │   ├── diagnostic-session-repo.ts
│   │   │   │   ├── ai-coach.ts
│   │   │   │   ├── auth-context.ts
│   │   │   │   ├── event-sink.ts
│   │   │   │   ├── clock.ts
│   │   │   │   └── id-generator.ts
│   │   │   ├── use-cases/           # Application logic
│   │   │   │   ├── start-attempt.ts
│   │   │   │   ├── submit-code.ts
│   │   │   │   ├── submit-step.ts
│   │   │   │   ├── get-next-problem.ts
│   │   │   │   ├── select-sibling.ts
│   │   │   │   ├── compute-attempt-score.ts
│   │   │   │   ├── decide-progression-action.ts
│   │   │   │   ├── decide-next-action.ts
│   │   │   │   ├── get-skill-matrix.ts
│   │   │   │   ├── pattern-discovery.ts
│   │   │   │   ├── pattern-challenge.ts
│   │   │   │   ├── diagnostic-coaching.ts
│   │   │   │   └── postmortem-generator.ts
│   │   │   ├── validation/          # Validation engine
│   │   │   │   ├── heuristics.ts    # Pattern-specific code checks
│   │   │   │   ├── forbidden.ts     # Forbidden concept detection
│   │   │   │   ├── gating.ts        # Micro-lesson gating rules
│   │   │   │   ├── rubric.ts        # Scoring rubric
│   │   │   │   ├── thinking-gate.ts # Pattern selection validator
│   │   │   │   ├── socratic-repair.ts # Guided repair hints
│   │   │   │   ├── pattern-discovery.ts # Pattern discovery logic
│   │   │   │   ├── pattern-challenge.ts # Advocate's trap
│   │   │   │   ├── llm-port.ts      # LLM validation interface
│   │   │   │   └── types.ts
│   │   │   ├── hints/               # Hint generation
│   │   │   ├── adversary/           # Adversary challenge logic
│   │   │   ├── coaching/            # Coaching strategies
│   │   │   ├── features/            # Feature flag system
│   │   │   ├── adapters/            # Test doubles (in-memory repos)
│   │   │   └── data/
│   │   │       └── seed-problems.ts # 18 seed problems (1402 lines)
│   │   └── package.json
│   │
│   ├── contracts/                   # Shared Zod schemas
│   │   ├── src/
│   │   │   └── schemas.ts           # API request/response schemas
│   │   └── package.json
│   │
│   ├── adapter-db/                  # Database adapter (Drizzle ORM)
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── schema.ts            # Drizzle schema
│   │   │   └── repositories/        # Repository implementations
│   │   │       ├── attempt-repo.ts
│   │   │       ├── content-repo.ts
│   │   │       ├── skill-repo.ts
│   │   │       ├── bug-hunt-repo.ts
│   │   │       └── debug-lab-repo.ts
│   │   └── package.json
│   │
│   ├── adapter-llm/                 # Anthropic Claude adapter
│   │   ├── src/
│   │   │   ├── index.ts             # LLM client & validation adapter
│   │   │   └── ai-coach.ts          # AI coaching implementation
│   │   └── package.json
│   │
│   ├── adapter-piston/              # Piston code executor
│   │   ├── src/
│   │   │   ├── piston-executor.ts   # CodeExecutor implementation
│   │   │   ├── piston-client.ts     # HTTP client wrapper
│   │   │   ├── language-configs.ts  # Language configurations
│   │   │   ├── types.ts
│   │   │   └── trace/               # Trace visualization
│   │   │       ├── trace-executor.ts
│   │   │       ├── trace-parser.ts
│   │   │       └── instrumentation.ts
│   │   └── package.json
│   │
│   ├── adapter-auth/                # Demo auth provider
│   │   └── src/index.ts
│   │
│   └── adapter-analytics/           # Console event sink
│       └── src/index.ts
│
├── pnpm-workspace.yaml              # Workspace definition
├── turbo.json                       # Turborepo config
├── package.json                     # Root package
└── tsconfig.base.json               # Shared TypeScript config
```

### Package Dependencies

```
@scaffold/web
  └─> @scaffold/core (domain logic)
  └─> @scaffold/contracts (Zod schemas)
  └─> @scaffold/adapter-db (repositories)
  └─> @scaffold/adapter-llm (LLM client)
  └─> @scaffold/adapter-piston (code executor)
  └─> @scaffold/adapter-auth (auth provider)
  └─> @scaffold/adapter-analytics (event sink)

@scaffold/core
  └─> (ZERO dependencies - pure TypeScript)

@scaffold/contracts
  └─> zod (validation)

@scaffold/adapter-db
  └─> @scaffold/core (types only)
  └─> drizzle-orm, postgres

@scaffold/adapter-llm
  └─> @scaffold/core (types only)
  └─> @anthropic-ai/sdk

@scaffold/adapter-piston
  └─> @scaffold/core (types only)

@scaffold/adapter-auth
  └─> @scaffold/core (types only)

@scaffold/adapter-analytics
  └─> @scaffold/core (types only)
```

**Key Architectural Constraint:** Core package has zero runtime dependencies. All external integrations go through adapters that implement core ports.

---

## Unified Attempt Model and Evaluation System

### Current Dual-System Architecture

**[Inferred from code analysis as of 2026-01-24]**

The codebase currently operates TWO parallel attempt systems that are NOT unified:

#### 1. Legacy Attempt System (In-Memory, Active)

**Used By**: Original coding interview practice flow (`/api/attempts/start`, `/api/attempts/[id]/submit`)

**Data Model**:
```typescript
// packages/core/src/entities/attempt.ts
interface Attempt {
  id: string;
  tenantId: string;
  userId: string;
  problemId: string;          // Links to problems table
  pattern: PatternId;
  rung: RungLevel;
  state: AttemptState;        // 'thinking' | 'coding' | 'reflecting' | 'completed'
  hintsUsed: HintLevel[];
  codeSubmissions: number;
  score: AttemptScore | null;
  startedAt: Date;
  completedAt: Date | null;
}
```

**Characteristics**:
- Stateful multi-gate workflow (thinking → coding → reflecting)
- Submissions stored inline in `steps` table
- Score computed and stored in attempt entity
- Track-agnostic (implicitly coding_interview)

#### 2. Track-Based Attempt System (In-Memory Only)

**Used By**: Debug Lab, Bug Hunt, Evaluate endpoint (`/api/attempts/[id]/evaluate`)

**Data Model**:
```typescript
// apps/web/src/lib/in-memory-track-repos.ts
interface TrackAttempt {
  id: string;
  tenantId: string;
  userId: string;
  track: Track;               // 'coding_interview' | 'debug_lab' | 'system_design'
  contentItemId: string;      // Links to content_items table
  versionId: string;          // Links to content_versions table
  status: 'active' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date | null;
}
```

**Characteristics**:
- Simple status-based lifecycle (no multi-step gates)
- Submissions stored in separate `submissions` table
- Evaluation results stored in separate `evaluation_runs` table
- Explicit track support for multi-track system
- **Database schema exists but NOT wired** (in-memory only)

### Evaluation System Architecture

#### Unified Evaluation Model (Schema Defined, Not Fully Implemented)

**Database Tables**:

1. **`submissions`** - User-submitted content for any attempt type
   - Supports: code, text, diagrams, gate answers, triage responses
   - References: `attemptId` (legacy or track-based)
   - Content stored as: `contentText` (plain text) + `contentJson` (structured)

2. **`evaluation_runs`** - Asynchronous evaluation execution tracking
   - Types: `coding_tests`, `debug_gate`, `rubric`, `ai_review`
   - Status: `queued` → `running` → `succeeded`/`failed`/`canceled`
   - Summary: High-level results (e.g., `{ passed: true, testsPassed: 5, testsTotal: 5 }`)
   - Details: Full evidence and diagnostic data

3. **`coding_test_results`** - Individual test case results
   - Per-test granularity: `testIndex`, `passed`, `expected`, `actual`, `stdout`, `stderr`, `error`
   - Hidden tests supported: `isHidden` flag prevents disclosure

4. **`rubric_scores`** - Multi-dimensional grading
   - Criterion-based: pattern_recognition, implementation_quality, edge_cases, efficiency
   - Evidence-based: rationale + evidence JSON

5. **`ai_feedback`** - AI-generated coaching responses
   - Types: hint, explanation, review, guidance
   - Deduplication: `inputHash` prevents redundant LLM calls
   - Evidence tracking: Stores references to test results, code snippets

6. **`socratic_turns`** - Conversational coaching dialogue
   - Turn-indexed conversation history
   - Question/validation structured data
   - Supports multi-turn Socratic method

**[Evidence: packages/adapter-db/src/schema.ts lines 389-580]**

#### Evaluation Flow (Current Stub Implementation)

**File**: `apps/web/src/app/api/attempts/[attemptId]/evaluate/route.ts`

```
POST /api/attempts/[attemptId]/evaluate
  │
  ├─> Check both attemptRepo AND trackAttemptRepo (line 32-42)
  │
  ├─> Create evaluation_run with status 'queued' (line 89-96)
  │
  ├─> [STUB] Run inline simulation (line 105-124)
  │     │
  │     ├─> SHOULD: Fetch test cases from problem/content
  │     ├─> SHOULD: Execute code via codeExecutor
  │     ├─> SHOULD: Compare actual vs expected outputs
  │     │
  │     └─> CURRENTLY: Returns fake results (line 238-254)
  │           - hasCode = !!submission.contentText
  │           - passed = hasCode (no actual execution)
  │           - expected = 'expected output' (hardcoded)
  │           - actual = hasCode ? 'expected output' : 'no output'
  │
  ├─> Write test results to coding_test_results (line 257)
  │
  └─> Mark evaluation_run as completed (line 260-271)
```

**[Evidence: apps/web/src/app/api/attempts/[attemptId]/evaluate/route.ts lines 14-282]**

#### Real Execution (Submit Endpoint)

**File**: `apps/web/src/app/api/attempts/[attemptId]/submit/route.ts`

The `/submit` endpoint DOES execute real tests via `submitCode` use-case:
- Uses `codeExecutor` (Piston API) to run code
- Compares actual outputs with expected outputs from problem test cases
- Runs LLM validation if `ANTHROPIC_API_KEY` is set
- Returns actual test results with pass/fail status

**[Evidence: apps/web/src/app/api/attempts/[attemptId]/submit/route.ts lines 44-62]**

**Inconsistency**: Legacy `/submit` has real execution, track-based `/evaluate` has stub execution.

### AI Evidence Gating Rules

When LLM validation is enabled (`ANTHROPIC_API_KEY` set):

1. **Heuristic Pre-Screening** (`packages/core/src/validation/heuristics/`)
   - Pattern-specific validators check for common errors
   - Examples: loop-missing-increment, off-by-one-index, unnecessary-extra-loop
   - Fast, deterministic, no LLM cost

2. **LLM Rubric Grading** (`packages/adapter-llm/src/index.ts` lines 156-216)
   - Criteria:
     - PASS: All tests pass AND correct pattern AND no critical errors
     - PARTIAL: Most tests pass OR correct pattern with minor issues
     - FAIL: Many tests fail OR wrong pattern OR critical errors
   - Returns: `grade`, `confidence`, `patternRecognized`, `errors[]`, `feedback`, `suggestedMicroLesson`

3. **Gating Decision Engine** (`packages/core/src/validation/gating.ts`)
   - 40+ priority-based gating rules
   - Actions:
     - `PROCEED`: Tests passed, code quality acceptable
     - `BLOCK_SUBMISSION`: Critical errors detected
     - `REQUIRE_REFLECTION`: Pattern misuse or wrong approach
     - `SHOW_MICRO_LESSON`: Specific concept deficit identified
     - `PROCEED_WITH_REFLECTION`: Passed but with teaching opportunity
   - Evidence-based: All decisions include references to test results or heuristic findings

4. **Socratic Coaching** (`packages/adapter-llm/src/socratic-coach-adapter.ts`)
   - Two-pass prompting: Analyzer → Verifier
   - Evidence requirement: All questions must cite specific test failures or code issues
   - Safety constraints: No answer revelation, no code blocks in questions
   - **Current Status**: Adapter exists but NOT wired (line 123 of deps.ts hardcoded to null)

**[Evidence: packages/core/src/validation/gating.ts lines 1-1000+, packages/adapter-llm/src/socratic-coach-adapter.ts lines 1-581]**

### Unified Attempt Model Migration Strategy

**Goal**: Single `attempts` table supporting all tracks and content types

**Proposed Schema**:
```sql
-- Extend existing attempts table
ALTER TABLE attempts
  ADD COLUMN track TEXT DEFAULT 'coding_interview',
  ADD COLUMN content_item_id UUID REFERENCES content_items(id),
  ADD COLUMN version_id UUID REFERENCES content_versions(id),
  ALTER COLUMN problem_id DROP NOT NULL;

-- Constraint: must reference either problemId OR contentItemId
ALTER TABLE attempts
  ADD CONSTRAINT attempts_content_check
  CHECK (
    (problem_id IS NOT NULL AND content_item_id IS NULL) OR
    (problem_id IS NULL AND content_item_id IS NOT NULL)
  );
```

**Migration Path**:
1. Add columns to `attempts` table
2. Migrate existing `problems` to `content_items` with `track: 'coding_interview'`
3. Update `AttemptRepo` port to support both reference types
4. Gradually migrate API endpoints to use unified model
5. Deprecate `TrackAttempt` type and in-memory track repos

**[Inferred from schema analysis and code review]**

---

## Core Architectural Patterns

### 1. Hexagonal Architecture (Ports & Adapters)

**Core Principle:** Domain logic is isolated from infrastructure concerns.

```
┌────────────────────────────────────────┐
│           CORE DOMAIN                  │
│  ┌────────────────────────────────┐    │
│  │      Use-Cases                 │    │
│  │  (business logic)              │    │
│  └──────────┬─────────────────────┘    │
│             │                          │
│  ┌──────────▼─────────────────────┐    │
│  │        Ports                   │    │◄─── Interfaces
│  │  (abstract contracts)          │    │
│  └────────────────────────────────┘    │
└────────────────────────────────────────┘
             │ implements
             ▼
┌────────────────────────────────────────┐
│          ADAPTERS                      │
│  (infrastructure implementations)      │
│                                        │
│  • Drizzle ORM (database)              │
│  • Anthropic SDK (LLM)                 │
│  • Piston HTTP (code executor)         │
│  • In-memory repos (testing)           │
└────────────────────────────────────────┘
```

**Port Examples:**

- `AttemptRepo` - Abstract persistence interface for attempts
- `CodeExecutor` - Abstract code execution interface
- `LLMValidationPort` - Abstract LLM validation interface
- `EventSink` - Abstract event publishing interface

**Adapter Examples:**

- `DrizzleAttemptRepo` - PostgreSQL implementation via Drizzle
- `PistonExecutor` - Piston API implementation
- `LLMValidationAdapter` - Anthropic Claude implementation
- `InMemoryAttemptRepo` - Test double implementation

### 2. Dependency Inversion

**High-level modules (use-cases) do NOT depend on low-level modules (adapters).** Both depend on abstractions (ports).

```typescript
// ❌ BAD: Use-case depends on concrete adapter
import { DrizzleAttemptRepo } from '@scaffold/adapter-db';

export async function submitCode(deps: { attemptRepo: DrizzleAttemptRepo }) {
  // ...
}

// ✅ GOOD: Use-case depends on port interface
import type { AttemptRepo } from '../ports/attempt-repo';

export async function submitCode(deps: { attemptRepo: AttemptRepo }) {
  // ...
}
```

### 3. Explicit Dependency Injection

All use-cases declare their dependencies as function parameters. No global state or singletons.

```typescript
export interface SubmitCodeDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly skillRepo: SkillRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly codeExecutor: CodeExecutor;
  readonly llmValidation?: LLMValidationPort; // Optional
}

export async function submitCode(
  input: SubmitCodeInput,
  deps: SubmitCodeDeps
): Promise<SubmitCodeOutput> {
  // Use deps.attemptRepo, deps.codeExecutor, etc.
}
```

**Benefits:**
- **Testability:** Easy to inject test doubles
- **Flexibility:** Swap implementations at runtime
- **Clarity:** Dependencies are explicit, not hidden

### 4. Immutable Domain Models

Entities are immutable TypeScript interfaces. State transitions create new instances.

```typescript
export interface Attempt {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly problemId: ProblemId;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly state: AttemptState;
  readonly steps: readonly Step[];
  readonly hintsUsed: readonly HintLevel[];
  readonly codeSubmissions: number;
  readonly score: AttemptScore | null;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}

// State transitions return new objects
const updatedAttempt: Attempt = {
  ...currentAttempt,
  state: 'COMPLETED',
  completedAt: new Date(),
  score: computedScore,
};
```

### 5. Clean Architecture Layers

```
┌─────────────────────────────────────┐
│   Presentation Layer (React)        │  ← UI components, no business logic
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   API Layer (Route Handlers)        │  ← HTTP endpoints, input validation
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Use-Case Layer (Business Logic)   │  ← Pure functions, domain rules
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Entity Layer (Domain Models)      │  ← Immutable data structures
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Adapter Layer (Infrastructure)    │  ← Database, APIs, external services
└─────────────────────────────────────┘
```

**Dependency Rule:** Outer layers depend on inner layers, never the reverse.

---

## Package Deep Dive

### @scaffold/core - Domain Logic

**Location:** `packages/core/`
**Dependencies:** ZERO (pure TypeScript)
**Exports:** 8 public entry points

```typescript
import { /* ... */ } from '@scaffold/core'; // Main exports
import { /* ... */ } from '@scaffold/core/entities';
import { /* ... */ } from '@scaffold/core/ports';
import { /* ... */ } from '@scaffold/core/use-cases';
import { /* ... */ } from '@scaffold/core/validation';
import { /* ... */ } from '@scaffold/core/hints';
import { /* ... */ } from '@scaffold/core/adversary';
import { /* ... */ } from '@scaffold/core/data';
```

#### Entities (Domain Models)

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `Attempt` | User's problem-solving session | state, steps, score, codeSubmissions |
| `Problem` | Coding problem definition | pattern, rung, testCases, hints, timeoutBudgetMs |
| `SkillState` | User's mastery for pattern+rung | score (0-100), attemptsCount, lastAppliedAttemptId |
| `Step` | Phase within an attempt | type (THINKING_GATE, CODING, etc.), result, data |
| `Pattern` | Algorithmic pattern (e.g., SLIDING_WINDOW) | id, name, description, prerequisites |
| `Rung` | Difficulty level (1-5) | Encoded as `RungLevel` type (1\|2\|3\|4\|5) |
| `Tenant` | Multi-tenant isolation | id, name |
| `BugHunt` | Bug finding exercise | buggyCode, bugs, userFindings |
| `DebugLab` | Debug session | breakpoints, watchExpressions |
| `Trace` | Execution trace data | snapshots, callStack |
| `InvariantTemplate` | Fill-in-blanks invariant builder | slots, correctChoices |

#### Ports (Interface Contracts)

| Port | Contract | Implementations |
|------|----------|-----------------|
| `AttemptRepo` | CRUD for attempts | `DrizzleAttemptRepo`, `InMemoryAttemptRepo` |
| `ContentRepo` | Read problems by pattern/rung | `DrizzleContentRepo`, `InMemoryContentRepo` |
| `SkillRepo` | Read/write skill states | `DrizzleSkillRepo`, `InMemorySkillRepo` |
| `BugHuntRepo` | CRUD for bug hunt sessions | `DrizzleBugHuntRepo` (planned) |
| `DebugLabRepo` | CRUD for debug sessions | `DrizzleDebugLabRepo` (planned) |
| `CodeExecutor` | Execute code with test cases | `PistonExecutor` |
| `LLMValidationPort` | Optional LLM-based validation | `LLMValidationAdapter`, `NullLLMValidation` |
| `AICoach` | Coaching & hint generation | `AnthropicAICoach` |
| `EventSink` | Publish domain events | `ConsoleEventSink` |
| `Clock` | Get current time (testable) | `SystemClock` |
| `IdGenerator` | Generate unique IDs | `UUIDGenerator` |
| `AuthContext` | Current user/tenant info | `DemoAuthProvider` |

#### Use-Cases (Application Logic)

**Practice Flow:**
- `startAttempt(input, deps)` - Create new practice attempt
- `submitCode(input, deps)` - Submit code for validation
- `submitStep(input, deps)` - Submit step (thinking gate, reflection, etc.)
- `getNextProblem(input, deps)` - Select next problem based on skill state
- `selectSibling(input, deps)` - Select isomorphic variation of problem

**Scoring & Progression:**
- `computeAttemptScore(attempt, problem)` - Calculate attempt score (0-100)
- `decideProgressionAction(skillState, problem)` - Determine next action
- `decideNextAction(attempt, problem)` - Determine next step in attempt
- `getSkillMatrix(input, deps)` - Get user's skill state matrix

**Advanced Features:**
- `patternDiscovery(input, deps)` - Socratic pattern discovery flow
- `patternChallenge(input, deps)` - Advocate's trap (challenge selection)
- `diagnosticCoaching(input, deps)` - Diagnostic assessment coaching
- `postmortemGenerator(attempt, problem)` - Generate attempt postmortem

#### Validation Engine

**Heuristics (`validation/heuristics.ts`):**
Pattern-specific code analysis using regex and AST-like checks:
- SLIDING_WINDOW: Check for nested loops, wrong shrink mechanism
- TWO_POINTERS: Detect pointer movement patterns
- PREFIX_SUM: Validate prefix array construction
- BFS: Check for queue usage, visited tracking
- DFS: Check for recursion, visited tracking
- DYNAMIC_PROGRAMMING: Detect memoization/tabulation

**Forbidden Concepts (`validation/forbidden.ts`):**
Detect disallowed approaches for pattern problems:
- Built-in methods that bypass pattern (e.g., `.sort()` in TWO_POINTERS)
- Higher-level abstractions that obscure the pattern

**Gating Engine (`validation/gating.ts`):**
Decision tree for micro-lessons and reflections:
- 40+ gating rules with priority-based execution
- Actions: PROCEED, BLOCK_SUBMISSION, REQUIRE_REFLECTION, SHOW_MICRO_LESSON, PROCEED_WITH_REFLECTION
- Pattern-specific micro-lesson triggers

**Rubric Grading (`validation/rubric.ts`):**
Multi-dimensional scoring:
- Pattern Recognition: Does code use correct pattern?
- Implementation Quality: Code correctness, edge cases
- Edge Cases: Handles boundary conditions
- Efficiency: Meets time/space complexity targets
- Overall: Weighted combination (0-100 scale)

**Thinking Gate (`validation/thinking-gate.ts`):**
Validates pattern selection and invariant statement before coding:
- Deterministic pattern validation (rule-based)
- Optional LLM-augmented invariant evaluation
- Fill-in-the-blanks invariant template support

**Socratic Repair (`validation/socratic-repair.ts`):**
Guided repair hints when code fails:
- Analyzes test failures and heuristic violations
- Generates progressive hints (conceptual → tactical)

**Pattern Discovery (`validation/pattern-discovery.ts`):**
Helps users discover patterns through Socratic questioning:
- HEURISTIC mode: Keyword-based pattern matching
- SOCRATIC mode: LLM-guided discovery dialogue

**Pattern Challenge (`validation/pattern-challenge.ts`):**
Advocate's trap - challenges questionable pattern selections:
- COUNTEREXAMPLE mode: Provides input that breaks pattern
- SOCRATIC mode: Asks probing questions

#### Data Layer

**Seed Problems (`data/seed-problems.ts`):**
- 18 canonical problems across 13 patterns
- Rung 1-3 coverage
- Isomorphic sibling variations
- Test cases with explanations
- Large hidden tests with time budgets
- 1402 lines of curated content

**Supported Patterns:**
```typescript
const PATTERNS = [
  'SLIDING_WINDOW',
  'TWO_POINTERS',
  'PREFIX_SUM',
  'BINARY_SEARCH',
  'BFS',
  'DFS',
  'DYNAMIC_PROGRAMMING',
  'BACKTRACKING',
  'GREEDY',
  'HEAP',
  'TRIE',
  'UNION_FIND',
  'INTERVAL_MERGING',
] as const;
```

---

### @scaffold/adapter-db - Database Adapter

**Location:** `packages/adapter-db/`
**Dependencies:** `@scaffold/core`, `drizzle-orm`, `postgres`

**Database Schema (Drizzle ORM):**

```sql
-- tenants: Multi-tenant isolation
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- problems: Coding problems
CREATE TABLE problems (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  pattern TEXT NOT NULL,
  rung INTEGER NOT NULL,
  target_complexity TEXT NOT NULL,
  test_cases JSONB NOT NULL,
  hints JSONB NOT NULL,
  adversary_prompts JSONB,
  timeout_budget_ms INTEGER,
  large_hidden_tests JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_problems_tenant_pattern_rung ON problems(tenant_id, pattern, rung);

-- attempts: Practice sessions
CREATE TABLE attempts (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  problem_id UUID REFERENCES problems(id),
  pattern TEXT NOT NULL,
  rung INTEGER NOT NULL,
  state TEXT NOT NULL,
  hints_used JSONB NOT NULL DEFAULT '[]',
  code_submissions INTEGER NOT NULL DEFAULT 0,
  score JSONB,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);
CREATE INDEX idx_attempts_tenant_user ON attempts(tenant_id, user_id);
CREATE INDEX idx_attempts_tenant_user_state ON attempts(tenant_id, user_id, state);

-- steps: Phases within attempts
CREATE TABLE steps (
  id UUID PRIMARY KEY,
  attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  result TEXT,
  data JSONB NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP
);
CREATE INDEX idx_steps_attempt ON steps(attempt_id);

-- skills: User skill state matrix
CREATE TABLE skills (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  user_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  rung INTEGER NOT NULL,
  score REAL NOT NULL DEFAULT 0.0,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP,
  unlocked_at TIMESTAMP,
  last_applied_attempt_id UUID,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, pattern, rung)
);
CREATE INDEX idx_skills_tenant_user ON skills(tenant_id, user_id);
CREATE INDEX idx_skills_tenant_user_pattern_rung ON skills(tenant_id, user_id, pattern, rung);
```

**Idempotency Mechanism:**

Skill updates track `last_applied_attempt_id` to prevent duplicate scoring:

```typescript
async updateIfNotApplied(
  skill: SkillState,
  attemptId: string
): Promise<{ skill: SkillState; wasApplied: boolean }> {
  // Only update if this attempt wasn't already applied
  if (skill.lastAppliedAttemptId === attemptId) {
    return { skill, wasApplied: false };
  }

  const updated = await db.update(skills)
    .set({
      score: skill.score,
      attemptsCount: skill.attemptsCount,
      lastAppliedAttemptId: attemptId,
      updatedAt: new Date(),
    })
    .where(and(
      eq(skills.id, skill.id),
      or(
        isNull(skills.lastAppliedAttemptId),
        ne(skills.lastAppliedAttemptId, attemptId)
      )
    ))
    .returning();

  return { skill: updated[0], wasApplied: true };
}
```

---

### @scaffold/adapter-llm - LLM Integration

**Location:** `packages/adapter-llm/`
**Dependencies:** `@scaffold/core`, `@anthropic-ai/sdk`

**LLM Client Interface:**

```typescript
export interface LLMClient {
  generateHint(params: GenerateHintParams): Promise<GenerateHintResult>;
  generateReflection(params: GenerateReflectionParams): Promise<GenerateReflectionResult>;
  evaluateThinkingGate(params: EvaluateThinkingGateParams): Promise<EvaluateThinkingGateResult>;
  evaluateCode(params: EvaluateCodeParams): Promise<EvaluateCodeResult>;
}
```

**Model:** `claude-sonnet-4-20250514`

**Graceful Degradation:**

If LLM is unavailable:
- `LLMValidationPort.validateCode()` returns `null`
- Heuristics become sole validation source
- No feedback panel shown to user
- System continues to function with deterministic validation

**Usage Pattern:**

```typescript
// In deps.ts
const llmClient = process.env.ANTHROPIC_API_KEY
  ? createLLMClient(process.env.ANTHROPIC_API_KEY)
  : null;

export function getLLMValidation(problemStatement: string): LLMValidationPort {
  if (!llmClient) {
    return createNullLLMValidation(); // No-op implementation
  }
  return createLLMValidationAdapter(llmClient, problemStatement);
}
```

---

### @scaffold/adapter-piston - Code Execution

**Location:** `packages/adapter-piston/`
**Dependencies:** `@scaffold/core`

**Piston Executor:**

```typescript
export interface CodeExecutor {
  execute(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[]
  ): Promise<readonly TestResultData[]>;

  executeWithTimeout?(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[],
    timeoutMs: number
  ): Promise<readonly TestResultData[]>;
}
```

**Supported Languages:**
- JavaScript (Node.js)
- Python 3
- TypeScript
- Java
- C++
- Go
- Rust

**Trace Visualization:**

Additional trace executor for step-by-step execution visualization:

```typescript
export interface TraceExecutor {
  executeWithTrace(
    code: string,
    language: string,
    input: string
  ): Promise<TraceExecutionResult>;
}
```

Instruments code with trace calls, executes, and parses snapshots for visualization.

---

### @scaffold/contracts - API Schemas

**Location:** `packages/contracts/`
**Dependencies:** `zod`

Shared Zod schemas for API request/response validation:

```typescript
export const StartAttemptRequestSchema = z.object({
  problemId: z.string(),
});

export const SubmitCodeRequestSchema = z.object({
  attemptId: z.string(),
  code: z.string(),
  language: z.string(),
});

export const SubmitStepRequestSchema = z.object({
  attemptId: z.string(),
  stepType: z.enum(['THINKING_GATE', 'REFLECTION', 'SUCCESS_REFLECTION']),
  data: z.record(z.any()),
});
```

---

## Data Flow Diagrams

### Practice Session Flow (Happy Path)

```
┌──────────┐
│  USER    │
│ Selects  │
│ Problem  │
└────┬─────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ 1. POST /api/attempts/start                             │
│    { problemId: "..." }                                 │
└────┬────────────────────────────────────────────────────┘
     │ Route Handler validates with Zod
     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Use-Case: startAttempt(input, deps)                  │
│    • Check for existing active attempt                  │
│    • Load problem from ContentRepo                      │
│    • Verify rung is unlocked (SkillRepo)                │
│    • Create new Attempt (state: THINKING_GATE)          │
│    • Save to AttemptRepo                                │
│    • Emit event to EventSink                            │
└────┬────────────────────────────────────────────────────┘
     │ Returns { attempt, problem }
     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. UI: Thinking Gate                                    │
│    User selects pattern, states invariant               │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. POST /api/attempts/[id]/step                         │
│    { stepType: "THINKING_GATE", data: {...} }           │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Use-Case: submitStep(input, deps)                    │
│    • Validate thinking gate submission                  │
│    • Check pattern correctness (deterministic)          │
│    • Optional: LLM evaluate invariant quality           │
│    • Create Step (type: THINKING_GATE, result: PASS)    │
│    • Transition Attempt to CODING state                 │
│    • Save to AttemptRepo                                │
└────┬────────────────────────────────────────────────────┘
     │ Returns { attempt, step, validation }
     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. UI: Code Editor                                      │
│    User writes code                                     │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. POST /api/attempts/[id]/submit                       │
│    { code: "...", language: "python" }                  │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Use-Case: submitCode(input, deps)                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ a. Load attempt & problem                     │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ b. Execute code (CodeExecutor port)           │    │
│    │    • Send to Piston API                       │    │
│    │    • Run against test cases                   │    │
│    │    • Return TestResult[] (pass/fail, output)  │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ c. Run heuristics (validation/heuristics.ts)  │    │
│    │    • Pattern-specific checks                  │    │
│    │    • Return HeuristicResult[]                 │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ d. Detect forbidden concepts                  │    │
│    │    • Check for banned methods/patterns        │    │
│    │    • Return ForbiddenConceptResult[]          │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ e. Optional: LLM validation                   │    │
│    │    • Send code + results to Claude            │    │
│    │    • Return LLMValidationResponse or null     │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ f. Run time budget tests (if configured)      │    │
│    │    • Execute with timeout                     │    │
│    │    • Detect TIME_BUDGET_EXCEEDED              │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ g. Grade with rubric                          │    │
│    │    • Pattern recognition, implementation,     │    │
│    │      edge cases, efficiency                   │    │
│    │    • Return RubricResult (0-100 scores)       │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ h. Gating decision (validation/gating.ts)     │    │
│    │    • Evaluate all errors & rubric             │    │
│    │    • Apply priority-ordered gating rules      │    │
│    │    • Return GatingDecision:                   │    │
│    │      - PROCEED (all tests pass, proceed)      │    │
│    │      - BLOCK_SUBMISSION (forbidden concept)   │    │
│    │      - REQUIRE_REFLECTION (repeated error)    │    │
│    │      - SHOW_MICRO_LESSON (teachable moment)   │    │
│    │      - PROCEED_WITH_REFLECTION (success+)     │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ i. State transition based on gating           │    │
│    │    • PROCEED → COMPLETED (if all pass)        │    │
│    │    • REQUIRE_REFLECTION → REFLECTION          │    │
│    │    • SHOW_MICRO_LESSON → CODING (stay)        │    │
│    │    • PROCEED_WITH_REFLECTION →                │    │
│    │        SUCCESS_REFLECTION                     │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ j. If COMPLETED: Update skill state           │    │
│    │    • Compute attempt score                    │    │
│    │    • Load or create SkillState                │    │
│    │    • Update score with exponential moving avg │    │
│    │    • Check if new rung unlocked (≥70 score)   │    │
│    │    • Save via SkillRepo (idempotent)          │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ k. Create Step (type: CODING)                 │    │
│    │    • result: PASS or FAIL                     │    │
│    │    • data: code, testResults, validation      │    │
│    └────────────────┬──────────────────────────────┘    │
│                     ▼                                    │
│    ┌───────────────────────────────────────────────┐    │
│    │ l. Save updated Attempt                       │    │
│    │    • Increment codeSubmissions                │    │
│    │    • Add step to steps array                  │    │
│    │    • Update state, score, completedAt         │    │
│    └───────────────────────────────────────────────┘    │
└────┬────────────────────────────────────────────────────┘
     │ Returns { attempt, testResults, validation, gatingDecision, score? }
     ▼
┌─────────────────────────────────────────────────────────┐
│ 9. UI: Display results                                  │
│    • Test results panel                                 │
│    • Validation feedback (if LLM enabled)               │
│    • Micro-lesson modal (if triggered)                  │
│    • Reflection form (if required)                      │
│    • Success message (if COMPLETED)                     │
└─────────────────────────────────────────────────────────┘
```

---

### Skill Progression Flow

```
┌─────────────────────────────────────────────────────────┐
│ User completes attempt with score                       │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ computeAttemptScore(attempt, problem)                   │
│  • Pattern recognition: 30%                             │
│  • Implementation quality: 30%                          │
│  • Edge cases: 20%                                      │
│  • Efficiency: 20%                                      │
│  • Bonus: +10 for first try, -5 per hint                │
│  ─────────────────────────────                          │
│  Overall Score: 0-100                                   │
└────┬────────────────────────────────────────────────────┘
     │ attemptScore = 85
     ▼
┌─────────────────────────────────────────────────────────┐
│ SkillRepo.findOrCreate(tenantId, userId, pattern, rung) │
│  • Load existing SkillState or create new (score=0)     │
└────┬────────────────────────────────────────────────────┘
     │ currentScore = 60, attemptsCount = 2
     ▼
┌─────────────────────────────────────────────────────────┐
│ computeNewScore(currentScore, attemptsCount, attemptScore) │
│  Formula: newScore = oldScore * (1 - alpha) + attemptScore * alpha │
│  Where: alpha = min(0.3, 1 / (attemptsCount + 1))       │
│  ─────────────────────────────                          │
│  alpha = min(0.3, 1/3) = 0.3                            │
│  newScore = 60 * 0.7 + 85 * 0.3 = 67.5                  │
└────┬────────────────────────────────────────────────────┘
     │ newScore = 67.5
     ▼
┌─────────────────────────────────────────────────────────┐
│ Check rung unlock condition                             │
│  if (newScore >= RUNG_UNLOCK_THRESHOLD) { ... }         │
│  RUNG_UNLOCK_THRESHOLD = 70                             │
│  ─────────────────────────────                          │
│  67.5 < 70 → No unlock (need more practice)             │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ SkillRepo.updateIfNotApplied(skill, attemptId)          │
│  • Idempotency check: lastAppliedAttemptId != attemptId │
│  • Update: score=67.5, attemptsCount=3,                 │
│            lastAppliedAttemptId=attemptId               │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Return updated SkillState to user                       │
│  • Display progress in skill matrix                     │
│  • Show "X points to unlock Rung 2" if applicable       │
└─────────────────────────────────────────────────────────┘
```

**Rung Unlock Logic:**

```typescript
export function isRungUnlockedForUser(
  skills: readonly SkillState[],
  pattern: PatternId,
  rung: RungLevel
): boolean {
  if (rung === 1) return true; // Rung 1 always unlocked

  const previousRung = (rung - 1) as RungLevel;
  const previousSkill = skills.find(
    (s) => s.pattern === pattern && s.rung === previousRung
  );

  if (!previousSkill) return false;

  // Need 70+ score to unlock next rung
  return previousSkill.score >= RUNG_UNLOCK_THRESHOLD;
}
```

---

### Pattern Discovery Flow

```
┌─────────────────────────────────────────────────────────┐
│ User clicks "Help me find the pattern" in Thinking Gate │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ POST /api/attempts/[id]/step                            │
│ { stepType: "PATTERN_DISCOVERY", mode: "HEURISTIC" }    │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Use-Case: patternDiscovery(input, deps)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ a. Mode: HEURISTIC (keyword-based)               │   │
│  │    • Analyze problem statement for keywords      │   │
│  │    • "contiguous" → SLIDING_WINDOW               │   │
│  │    • "sorted array" → BINARY_SEARCH              │   │
│  │    • "graph" → BFS or DFS                        │   │
│  │    • Generate guiding questions                  │   │
│  └────────────────┬─────────────────────────────────┘   │
│                   ▼                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ b. Mode: SOCRATIC (LLM-guided)                   │   │
│  │    • Send problem to AICoach                     │   │
│  │    • Ask probing questions                       │   │
│  │    • User answers → next question                │   │
│  │    • Converge on pattern through dialogue        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Create Step (type: PATTERN_DISCOVERY)                  │
│  • qaLog: [{ question, answer, timestamp }, ...]        │
│  • discoveredPattern: "SLIDING_WINDOW" (when complete)  │
│  • completed: true                                      │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ UI: Display discovered pattern                          │
│ • Show reasoning path                                   │
│ • Pre-fill pattern in Thinking Gate                     │
│ • User can proceed to state invariant                   │
└─────────────────────────────────────────────────────────┘
```

---

### Pattern Challenge Flow (Advocate's Trap)

```
┌─────────────────────────────────────────────────────────┐
│ User submits Thinking Gate with low-confidence pattern  │
│ (e.g., selects TWO_POINTERS for problem better suited   │
│  for SLIDING_WINDOW)                                    │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Use-Case: submitStep(input, deps)                       │
│  • Validate pattern selection                           │
│  • Check confidence via rule-based engine               │
│  • If confidence < threshold → trigger challenge        │
└────┬────────────────────────────────────────────────────┘
     │ confidence = 0.3 (low)
     ▼
┌─────────────────────────────────────────────────────────┐
│ Use-Case: patternChallenge(input, deps)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │ a. Mode: COUNTEREXAMPLE                          │   │
│  │    • Generate input that breaks selected pattern │   │
│  │    • "Try this input with your approach..."      │   │
│  │    • User walks through manually                 │   │
│  └────────────────┬─────────────────────────────────┘   │
│                   ▼                                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ b. Mode: SOCRATIC                                │   │
│  │    • Ask probing question via LLM                │   │
│  │    • "What happens if array size is 10^5?"       │   │
│  │    • User responds                               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  User decision:                                          │
│  • KEPT_PATTERN → Proceed with original                 │
│  • CHANGED_PATTERN → Select suggested alternative       │
│                                                          │
│  Create Step (type: PATTERN_CHALLENGE)                  │
│  • challengedPattern, mode, challengePrompt,            │
│    decision, newPattern                                 │
└────┬────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│ Update Thinking Gate step with final pattern            │
│ • If changed, use newPattern                            │
│ • If kept, use original (user takes responsibility)     │
└─────────────────────────────────────────────────────────┘
```

---

## State Management

### Attempt State Machine

```
                 ┌──────────────┐
                 │   START      │
                 └──────┬───────┘
                        │
                        ▼
              ┌─────────────────┐
         ┌────┤ THINKING_GATE   │
         │    └────────┬────────┘
         │             │ (pattern selected, invariant stated)
         │             ▼
         │    ┌─────────────────┐
         │    │ PATTERN_        │──┐ (optional)
         │    │ DISCOVERY       │◄─┘ (loop until pattern found)
         │    └────────┬────────┘
         │             │
         │             ▼
         │    ┌─────────────────┐
         │    │ PATTERN_        │
         │    │ CHALLENGE       │ (optional, if low confidence)
         │    └────────┬────────┘
         │             │ (gate passed)
         │             ▼
         │    ┌─────────────────┐
         └───►│    CODING       │◄──────┐
              └────────┬────────┘       │
                       │ (submit code)  │
                       ▼                │
              ┌─────────────────┐       │
              │   Run Tests +   │       │
              │   Validation    │       │
              └────────┬────────┘       │
                       │                │
                  ┌────┴────┐           │
                  │ Gating  │           │
                  │ Decision│           │
                  └────┬────┘           │
                       │                │
         ┌─────────────┼─────────────┐  │
         │             │             │  │
         ▼             ▼             ▼  │
  ┌──────────┐  ┌──────────┐  ┌─────────────┐
  │  BLOCK   │  │REQUIRE_  │  │SHOW_MICRO_  │
  │SUBMISSION│  │REFLECTION│  │LESSON (modal)│──┘
  │ (error)  │  └────┬─────┘  └─────────────┘
  └──────────┘       │
                     ▼
              ┌──────────────┐
              │  REFLECTION  │
              └──────┬───────┘
                     │ (reflection submitted)
                     │
              ┌──────┴───────┐
              │ Check answer │
              └──────┬───────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
     (correct)          (incorrect)
     ┌────────┐         ┌────────┐
     │ CODING │         │ CODING │
     │ (retry)│         │ (retry)│
     └────────┘         └────────┘
         │
         │ (all tests pass + gating PROCEED)
         ▼
  ┌───────────────┐
  │   COMPLETED   │◄──────┐
  └───────┬───────┘       │
          │               │
          │ (optional)    │
          ▼               │
  ┌───────────────┐       │
  │SUCCESS_       │       │
  │REFLECTION     │       │
  └───────┬───────┘       │
          │               │
          └───────────────┘
          │
          │ (optional, post-completion)
          ▼
  ┌───────────────┐
  │ ADVERSARY_    │
  │ CHALLENGE     │ (constraint mutation)
  └───────────────┘
```

**State Transition Rules:**

```typescript
// Valid state transitions (inferred from code)
const VALID_TRANSITIONS: Record<AttemptState, AttemptState[]> = {
  THINKING_GATE: ['CODING', 'PATTERN_DISCOVERY'],
  PATTERN_DISCOVERY: ['THINKING_GATE', 'PATTERN_CHALLENGE'],
  PATTERN_CHALLENGE: ['CODING'],
  CODING: ['CODING', 'REFLECTION', 'SUCCESS_REFLECTION', 'COMPLETED', 'HINT'],
  HINT: ['CODING'],
  REFLECTION: ['CODING'],
  SUCCESS_REFLECTION: ['COMPLETED', 'ADVERSARY_CHALLENGE'],
  ADVERSARY_CHALLENGE: ['COMPLETED'],
  COMPLETED: ['ADVERSARY_CHALLENGE'], // Can trigger adversary post-completion
  ABANDONED: [], // Terminal state
};
```

**Step Types:**

```typescript
export const STEP_TYPES = [
  'THINKING_GATE',       // Pattern selection + invariant statement
  'PATTERN_DISCOVERY',   // Socratic pattern discovery sub-flow
  'PATTERN_CHALLENGE',   // Advocate's trap - challenge selection
  'CODING',              // Code submission with test execution
  'REFLECTION',          // Required reflection after failure
  'SUCCESS_REFLECTION',  // Optional post-success reflection
  'ADVERSARY_CHALLENGE', // Post-completion constraint mutation
  'HINT',                // Hint request (not yet implemented in practice)
] as const;
```

---

## Persistence Layer

### Repository Pattern

All database access goes through repository ports. Implementations handle:
- Connection management
- Query construction
- Type mapping (DB ↔ Domain)
- Error handling

**Example: AttemptRepo**

```typescript
export interface AttemptRepo {
  findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null>;
  findActive(tenantId: TenantId, userId: string): Promise<Attempt | null>;
  findAllByUser(tenantId: TenantId, userId: string): Promise<Attempt[]>;
  save(attempt: Attempt): Promise<void>;
  update(attempt: Attempt): Promise<void>;
  delete(tenantId: TenantId, id: AttemptId): Promise<void>;
}
```

**Drizzle ORM Implementation:**

```typescript
export class DrizzleAttemptRepo implements AttemptRepo {
  constructor(private db: DbClient) {}

  async findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null> {
    const rows = await this.db
      .select()
      .from(attempts)
      .leftJoin(steps, eq(steps.attemptId, attempts.id))
      .where(and(
        eq(attempts.tenantId, tenantId),
        eq(attempts.id, id)
      ));

    if (rows.length === 0) return null;

    return this.mapRowsToAttempt(rows);
  }

  // ... other methods
}
```

**In-Memory Implementation (for development/testing):**

```typescript
export class InMemoryAttemptRepo implements AttemptRepo {
  private attempts = new Map<string, Attempt>();

  async findById(tenantId: TenantId, id: AttemptId): Promise<Attempt | null> {
    return this.attempts.get(id) ?? null;
  }

  // ... other methods
}
```

**Current Configuration:**

The system uses **in-memory repositories** loaded from seed data by default (as of `deps.ts` analysis):

```typescript
// In apps/web/src/lib/deps.ts
console.log('[deps] Using in-memory repositories with seed data (18 problems available)');

export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
export const skillRepo: SkillRepo = inMemorySkillRepo;
export const contentRepo: ContentRepo = inMemoryContentRepo;
```

Database integration via `adapter-db` can be re-enabled by switching the implementation in `deps.ts`.

---

## Dependency Injection

All dependency wiring happens in **one place**: `apps/web/src/lib/deps.ts`

### Injection Hub Pattern

```typescript
// deps.ts - Central dependency wiring
import { randomUUID } from 'crypto';
import { createDemoAuthProvider } from '@scaffold/adapter-auth';
import { createConsoleEventSink } from '@scaffold/adapter-analytics';
import { createLLMClient, createLLMValidationAdapter, createNullLLMValidation } from '@scaffold/adapter-llm';
import { createPistonExecutor, createPistonClient } from '@scaffold/adapter-piston';
import { SystemClock } from '@scaffold/core/ports';
import { inMemoryAttemptRepo, inMemorySkillRepo, inMemoryContentRepo } from './in-memory-repos';

// Repositories - in-memory implementation
export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
export const skillRepo: SkillRepo = inMemorySkillRepo;
export const contentRepo: ContentRepo = inMemoryContentRepo;

// Event sink
export const eventSink: EventSink = createConsoleEventSink();

// Clock
export const clock: Clock = SystemClock;

// ID Generator
export const idGenerator: IdGenerator = {
  generate: () => randomUUID(),
};

// Auth provider factory
export function getAuthProvider(tenantId: string, userId: string) {
  return createDemoAuthProvider(tenantId, userId);
}

// LLM Client (optional - only if API key is set)
const llmClient = process.env.ANTHROPIC_API_KEY
  ? createLLMClient(process.env.ANTHROPIC_API_KEY)
  : null;

export const isLLMEnabled = (): boolean => llmClient !== null;

export function getLLMValidation(problemStatement: string): LLMValidationPort {
  if (!llmClient) {
    return createNullLLMValidation(); // Graceful degradation
  }
  return createLLMValidationAdapter(llmClient, problemStatement);
}

// Code executor - Piston API
export const codeExecutor: CodeExecutor = createPistonExecutor({
  baseUrl: process.env.PISTON_API_URL,
  runTimeout: 5000,
  compileTimeout: 15000,
});

// Piston client for direct API access (trace execution)
export const pistonClient: PistonClient = createPistonClient({
  baseUrl: process.env.PISTON_API_URL,
});
```

### Usage in API Route Handlers

```typescript
// apps/web/src/app/api/attempts/[id]/submit/route.ts
import { submitCode } from '@scaffold/core/use-cases';
import { attemptRepo, contentRepo, skillRepo, eventSink, clock, idGenerator, codeExecutor, getLLMValidation } from '@/lib/deps';
import { SubmitCodeRequestSchema } from '@scaffold/contracts';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const validated = SubmitCodeRequestSchema.parse(body);

  // Load problem to get statement for LLM context
  const attempt = await attemptRepo.findById(DEMO_TENANT_ID, params.id);
  const problem = await contentRepo.findById(DEMO_TENANT_ID, attempt.problemId);

  const result = await submitCode(
    {
      tenantId: DEMO_TENANT_ID,
      userId: DEMO_USER_ID,
      attemptId: params.id,
      code: validated.code,
      language: validated.language,
    },
    {
      attemptRepo,
      contentRepo,
      skillRepo,
      eventSink,
      clock,
      idGenerator,
      codeExecutor,
      llmValidation: getLLMValidation(problem.statement),
    }
  );

  return Response.json(result);
}
```

**Benefits:**
- **Single Source of Truth:** All wiring in one file
- **Environment-Driven:** Use env vars to toggle implementations
- **Testable:** Easy to inject test doubles in tests
- **Flexible:** Swap implementations without touching use-cases

**Drawbacks:**
- **Cold Start:** All adapters instantiated at module load
- **Hard to Mock:** Route handlers import `deps` directly (coupling)

---

## Key Design Patterns

### 1. Port/Adapter Pattern (Hexagonal Architecture)

**Intent:** Decouple domain logic from infrastructure concerns.

**Structure:**
```
Domain (Core) → defines → Port (interface)
                             ↑
                         implements
                             │
                          Adapter
```

**Example:**

```typescript
// Port (in core)
export interface CodeExecutor {
  execute(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[]
  ): Promise<readonly TestResultData[]>;
}

// Adapter (in adapter-piston)
export function createPistonExecutor(config: PistonExecutorConfig): CodeExecutor {
  return {
    async execute(code, language, testCases) {
      // HTTP call to Piston API
      const results = await pistonClient.execute({ code, language, testCases });
      return results.map(mapToTestResultData);
    },
  };
}

// Usage in use-case
export async function submitCode(input, deps) {
  const testResults = await deps.codeExecutor.execute(
    input.code,
    input.language,
    problem.testCases
  );
}
```

### 2. Strategy Pattern (Validation Engine)

**Intent:** Select validation algorithm at runtime based on pattern.

**Structure:**
```
Context (submitCode) → selects → Strategy (HeuristicRegistry)
                                      ↓
                            SlidingWindowHeuristic
                            TwoPointersHeuristic
                            BFSHeuristic
                            ...
```

**Example:**

```typescript
// Strategy registry
const HEURISTIC_REGISTRY: Record<PatternId, HeuristicStrategy> = {
  SLIDING_WINDOW: validateSlidingWindow,
  TWO_POINTERS: validateTwoPointers,
  BFS: validateBFS,
  // ...
};

// Strategy selection
export function runHeuristics(
  code: string,
  pattern: PatternId,
  language: string
): HeuristicResult[] {
  const strategy = HEURISTIC_REGISTRY[pattern];
  if (!strategy) return [];
  return strategy(code, language);
}
```

### 3. Chain of Responsibility (Gating Rules)

**Intent:** Process gating decision through priority-ordered rules.

**Structure:**
```
GatingContext → Rule 1 (priority 1) → Rule 2 (priority 2) → ... → Default
                   ↓ match?
                Action
```

**Example:**

```typescript
const GATING_RULES: GatingRule[] = [
  {
    id: 'block_forbidden',
    priority: 1, // Highest priority
    condition: (ctx) => ctx.errors.some((e) => e.type === 'FORBIDDEN_CONCEPT'),
    action: 'BLOCK_SUBMISSION',
    reason: 'Forbidden concept detected',
  },
  {
    id: 'reflection_repeated_time_budget',
    priority: 3,
    condition: (ctx) => {
      const budgetExceeded = ctx.errors.some((e) => e.type === 'TIME_BUDGET_EXCEEDED');
      const previousBudgetFails = ctx.previousFailures.filter((e) => e === 'TIME_BUDGET_EXCEEDED');
      return budgetExceeded && previousBudgetFails.length >= 1;
    },
    action: 'REQUIRE_REFLECTION',
    reason: 'Time budget exceeded multiple times',
  },
  // ... 40+ more rules
];

export function makeGatingDecision(context: GatingContext): GatingDecision {
  // Sort by priority
  const sorted = [...GATING_RULES].sort((a, b) => a.priority - b.priority);

  // Find first matching rule
  for (const rule of sorted) {
    if (rule.condition(context)) {
      return {
        action: rule.action,
        reason: rule.reason,
        microLessonId: rule.microLessonId,
        // ...
      };
    }
  }

  // Default: PROCEED
  return { action: 'PROCEED', reason: 'All checks passed' };
}
```

### 4. Template Method (Use-Case Structure)

**Intent:** Define skeleton of algorithm, let subclasses fill in steps.

**Structure:**
```typescript
async function submitCode(input, deps) {
  // 1. Validate preconditions
  validateState(attempt);

  // 2. Execute code
  const testResults = await executeCode(code, testCases, deps.codeExecutor);

  // 3. Run validation
  const heuristics = runHeuristics(code, pattern, language);
  const forbidden = detectForbidden(code, pattern);
  const llmResult = await deps.llmValidation?.validateCode(...);

  // 4. Make gating decision
  const gating = makeGatingDecision({ rubric, errors, attemptCount, ... });

  // 5. Transition state
  const nextState = determineNextState(gating);

  // 6. Update skill (if completed)
  if (nextState === 'COMPLETED') {
    await updateSkill(attempt, score, deps.skillRepo);
  }

  // 7. Persist & return
  await deps.attemptRepo.update(updatedAttempt);
  return { attempt, testResults, validation, gatingDecision };
}
```

### 5. Factory Pattern (Adapter Creation)

**Intent:** Encapsulate object creation logic.

**Example:**

```typescript
// Factory function
export function createPistonExecutor(config: PistonExecutorConfig): CodeExecutor {
  const client = new PistonClient(config.baseUrl);

  return {
    async execute(code, language, testCases) {
      // Validate language
      if (!isSupportedLanguage(language)) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Normalize language name
      const normalized = normalizeLanguage(language);

      // Execute via client
      return client.execute({
        code,
        language: normalized,
        testCases,
        timeout: config.runTimeout,
      });
    },
  };
}

// Usage
const executor = createPistonExecutor({
  baseUrl: process.env.PISTON_API_URL,
  runTimeout: 5000,
  compileTimeout: 15000,
});
```

### 6. Null Object Pattern (Graceful Degradation)

**Intent:** Provide default behavior when real object is unavailable.

**Example:**

```typescript
export function createNullLLMValidation(): LLMValidationPort {
  return {
    validateCode: () => Promise.resolve(null), // No-op
    isEnabled: () => false,
  };
}

// Usage
export function getLLMValidation(problemStatement: string): LLMValidationPort {
  if (!llmClient) {
    return createNullLLMValidation(); // Graceful degradation
  }
  return createLLMValidationAdapter(llmClient, problemStatement);
}
```

---

## Failure Modes and Resilience

### External Service Failures

| Service | Failure Mode | Handling | User Impact |
|---------|--------------|----------|-------------|
| PostgreSQL | Connection timeout | 500 error, retry advice | Cannot save/load attempts |
| Anthropic API | Rate limit / timeout | Return `null`, use heuristics only | No LLM feedback, validation still works |
| Piston API | Execution timeout | Return error TestResult | "Code execution failed, retry" |
| Piston API | Invalid language | Throw error early | "Unsupported language" |

### Graceful Degradation Strategy

**LLM Validation:**
```typescript
// If LLM fails, fall back to heuristics only
const llmResult = await deps.llmValidation?.validateCode(...);
if (!llmResult) {
  console.warn('[submitCode] LLM validation unavailable, using heuristics only');
}

// Gating engine handles both cases
const gating = makeGatingDecision({
  rubric,
  errors: [...heuristicErrors, ...forbiddenErrors, ...(llmResult?.errors ?? [])],
  // ...
});
```

**Code Execution:**
```typescript
// If Piston fails, return clear error
try {
  const testResults = await deps.codeExecutor.execute(code, language, testCases);
} catch (error) {
  return {
    attempt,
    testResults: [],
    passed: false,
    validation: {
      errors: [{
        type: 'CODE_EXECUTION_FAILED',
        severity: 'ERROR',
        message: 'Code execution service unavailable. Please try again.',
      }],
    },
    gatingDecision: { action: 'BLOCK_SUBMISSION', reason: 'Execution failure' },
  };
}
```

### Idempotency Guarantees

**Skill Update Idempotency:**

Prevents duplicate scoring if API is called multiple times with same attempt:

```typescript
export async function updateIfNotApplied(
  skill: SkillState,
  attemptId: string
): Promise<{ skill: SkillState; wasApplied: boolean }> {
  // Check if already applied
  if (skill.lastAppliedAttemptId === attemptId) {
    console.log(`[SkillRepo] Attempt ${attemptId} already applied to skill ${skill.id}`);
    return { skill, wasApplied: false };
  }

  // Update with conditional write
  const updated = await db.update(skills)
    .set({
      score: skill.score,
      attemptsCount: skill.attemptsCount,
      lastAppliedAttemptId: attemptId,
      updatedAt: new Date(),
    })
    .where(and(
      eq(skills.id, skill.id),
      or(
        isNull(skills.lastAppliedAttemptId),
        ne(skills.lastAppliedAttemptId, attemptId)
      )
    ))
    .returning();

  return { skill: updated[0], wasApplied: true };
}
```

### Concurrency Concerns

**Current Limitations:**
- No row-level locking on attempts
- No distributed transactions
- Assumes single-user-per-attempt (no concurrent edits)

**Potential Race Conditions:**
1. User submits code twice rapidly → Two `submitCode` calls interleave
2. Two tabs open → Two attempts created for same user (blocked by `findActive` check, but race window exists)

**Mitigations (Not Implemented):**
- Optimistic locking with version field
- Database-level locks (`SELECT ... FOR UPDATE`)
- Distributed locks (Redis)

---

## Module Dependency Graph

```
apps/web
  │
  ├─> @scaffold/core (domain logic)
  │     └─> (ZERO dependencies)
  │
  ├─> @scaffold/contracts (Zod schemas)
  │     └─> zod
  │
  ├─> @scaffold/adapter-db
  │     ├─> @scaffold/core (types only)
  │     ├─> drizzle-orm
  │     └─> postgres
  │
  ├─> @scaffold/adapter-llm
  │     ├─> @scaffold/core (types only)
  │     └─> @anthropic-ai/sdk
  │
  ├─> @scaffold/adapter-piston
  │     └─> @scaffold/core (types only)
  │
  ├─> @scaffold/adapter-auth
  │     └─> @scaffold/core (types only)
  │
  └─> @scaffold/adapter-analytics
        └─> @scaffold/core (types only)
```

**Dependency Flow Visualization:**

```
┌────────────────────────────────────────────┐
│           apps/web (Next.js)               │
│  ┌──────────────────────────────────────┐  │
│  │ API Routes, UI Components, deps.ts   │  │
│  └──────────────────────────────────────┘  │
└───┬────┬────┬────┬────┬────┬────┬─────────┘
    │    │    │    │    │    │    │
    │    │    │    │    │    │    └─────┐
    │    │    │    │    │    │          │
    ▼    ▼    ▼    ▼    ▼    ▼          ▼
  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐  ┌──────────┐
  │db ││llm││pis││aut││ana││con│  │contracts │
  │   ││   ││ton││h  ││lyt││tra│  │  (Zod)   │
  └─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘└─┬─┘  └──────────┘
    │    │    │    │    │    │
    └────┴────┴────┴────┴────┘
              │
              ▼
        ┌──────────┐
        │   core   │ ◄──── ZERO dependencies
        │ (domain) │
        └──────────┘
```

**Key Invariant:** Core package never imports from adapters or apps. Dependency arrows only point inward.

---

## Scale and Performance Considerations

### Current Limitations

1. **No Connection Pooling Configuration**
   - Drizzle uses default `postgres` client settings
   - May exhaust connections under load

2. **No Caching**
   - Every request hits database/API
   - Problem content fetched repeatedly (static data)

3. **Synchronous LLM Calls**
   - `submitCode` blocks on LLM API response
   - Can add 1-3 seconds to response time

4. **Memory-Bound Heuristics**
   - Regex patterns compiled on each request
   - No pre-compilation or caching

5. **No Request Rate Limiting**
   - API routes have no throttling
   - Vulnerable to abuse

6. **Single Region Deployment**
   - No geo-distribution
   - High latency for distant users

### Bottleneck Analysis

**Estimated Latency Breakdown (submitCode):**
```
Database queries (attempt + problem):  50-100ms
Code execution (Piston API):          500-2000ms
Heuristic analysis:                    10-50ms
LLM validation (optional):            1000-3000ms
Gating decision:                       5-10ms
Database writes (attempt + step):      50-100ms
─────────────────────────────────────────────────
Total (no LLM):                       ~615-2260ms
Total (with LLM):                     ~1615-5260ms
```

**Hottest Paths:**
1. Code execution (Piston API) - 40-80% of latency
2. LLM validation (when enabled) - 20-60% of latency
3. Database queries - 10-20% of latency

### Recommended Optimizations (Not Implemented)

**1. Add Response Caching:**
```typescript
// Cache static content (problems)
const problemCache = new Map<string, Problem>();

export async function findById(tenantId: TenantId, id: ProblemId): Promise<Problem | null> {
  const cacheKey = `${tenantId}:${id}`;
  if (problemCache.has(cacheKey)) {
    return problemCache.get(cacheKey)!;
  }

  const problem = await db.query.problems.findFirst({ where: ... });
  if (problem) {
    problemCache.set(cacheKey, problem);
  }
  return problem;
}
```

**2. Pre-compile Heuristic Regexes:**
```typescript
// Instead of compiling on each request
const NESTED_LOOP_PATTERN = /for\s*\([^)]*\)\s*{[^}]*for\s*\([^)]*\)/g;

// Pre-compile at module load
const PATTERNS = {
  nestedLoops: new RegExp(...),
  whileLoop: new RegExp(...),
  // ...
};
```

**3. Async LLM Validation:**
```typescript
// Submit code without waiting for LLM
const testResults = await codeExecutor.execute(...);
const gating = makeGatingDecision({ ..., llmResult: null });

// Fire LLM validation in background
llmValidation?.validateCode(...).then((result) => {
  // Store result for later retrieval
  llmResultCache.set(attemptId, result);
});

// User can optionally poll for LLM feedback
// GET /api/attempts/[id]/llm-feedback
```

**4. Connection Pooling:**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const db = drizzle(pool);
```

**5. Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: 'Too many requests, please try again later.',
});

export async function POST(request: Request) {
  await limiter(request);
  // ... handle request
}
```

---

## UI Architecture

### Component Organization

The web application follows a **presentation-only component architecture** where components are responsible solely for rendering and user interaction. Business logic lives entirely in the core package.

**Directory Structure**:
```
apps/web/src/
├── app/                        # Next.js 14 App Router
│   ├── api/                    # Route handlers (API endpoints)
│   ├── practice/               # Practice mode pages
│   ├── coach/                  # Coaching mode pages
│   ├── debug/                  # Debug mode pages
│   ├── skills/                 # Skills matrix page
│   ├── explorer/               # Pattern explorer page
│   ├── layout.tsx              # Root layout with AppShell
│   └── globals.css             # Global styles and CSS variables
│
└── components/                 # Reusable React components
    ├── AppShell.tsx            # Context-aware header shell
    ├── Stepper.tsx             # Workflow progress indicator
    ├── CodeEditor.tsx          # Multi-language code input
    ├── TestResults.tsx         # Test case display
    ├── PatternDiscovery.tsx    # Socratic pattern discovery
    ├── ThinkingGate.tsx        # Pattern selection gate
    ├── ReflectionForm.tsx      # Failure reflection
    ├── CoachDrawer.tsx         # Side panel for hints
    ├── coaching/               # Coaching-specific components
    │   ├── StageIndicator.tsx
    │   ├── FeynmanStage.tsx
    │   └── ...
    └── debug/                  # Debug-specific components
        ├── DebugGatePanel.tsx
        ├── DebugFeedbackPanel.tsx
        └── ...
```

**Component Principles**:

1. **Pages are orchestrators**: They fetch data from API routes and manage component composition
2. **Components are presentational**: They receive props and render UI, no direct API calls
3. **Shared components in `/components`**: Mode-specific components in subdirectories
4. **Client components by default**: Most pages marked `'use client'` for interactivity

**Component Hierarchy Example** (Practice Flow):
```
AttemptPage (/practice/[attemptId]/page.tsx)
├── Stepper
├── ProblemStatement
├── ThinkingGate (conditional)
│   └── PatternDiscovery (conditional)
│   └── PatternChallenge (conditional)
├── CodeEditor (conditional)
├── TestResults (conditional)
├── PerformancePanel (conditional)
├── ReflectionForm (conditional)
├── SuccessReflectionForm (conditional)
├── ReviewSummary (conditional)
├── CoachDrawer (side panel)
│   ├── CommittedPlanBadge
│   └── HintPanel
├── TraceVisualization (conditional)
└── MicroLessonModal (conditional)
```

### Styling Approach

**Hybrid CSS Strategy**: Global CSS classes + inline styles with CSS variables

**No CSS Framework**: Custom-built styles, no Tailwind, no CSS-in-JS library

**CSS Variables** (`globals.css`):
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #141414;
  --bg-tertiary: #1e1e1e;
  --text-primary: #f5f5f5;
  --text-secondary: #a0a0a0;
  --text-muted: #666;
  --accent: #3b82f6;
  --success: #22c55e;
  --warning: #eab308;
  --error: #ef4444;
  --border: #2a2a2a;
  --font-mono: ui-monospace, SFMono-Regular, ...;
}
```

**Global CSS Classes** (defined in `globals.css`):
- **Layout**: `.container`, `.layout`, `.header`, `.main`
- **Components**: `.card`, `.btn`, `.input`, `.modal`, `.drawer`
- **Utilities**: `.btn-primary`, `.btn-secondary`, `.btn-sm`
- **State-specific**: `.test-result.pass`, `.test-result.fail`, `.step.active`

**Inline Styles** (common pattern):
```tsx
<div style={{
  display: 'flex',
  gap: '1rem',
  color: 'var(--text-secondary)'
}}>
```

**Why Hybrid Approach**:
- Global classes for consistent reusable patterns
- Inline styles for component-specific layout
- CSS variables enable theme consistency

**Responsive Design**:
- Mobile-first approach
- Media queries in `globals.css` at breakpoints: 640px, 768px, 1024px
- Flexbox and CSS Grid for layout adaptation

**File Size**: `globals.css` is ~6000 lines (large but single-file)

### Layout System

**AppShell Modes**:

The `AppShell` component provides context-aware headers based on route patterns.

**Mode Detection Logic**:
```typescript
function getAppMode(pathname: string): AppMode {
  if (pathname.startsWith('/practice/') && pathname !== '/practice')
    return 'solve';
  if (pathname.startsWith('/coach/') && pathname !== '/coach')
    return 'coach';
  if (pathname.startsWith('/debug/attempts/'))
    return 'debug';
  return 'dashboard'; // default
}
```

**Header Variants**:

| Mode | Header Content | Usage |
|------|----------------|-------|
| `dashboard` | Logo + Full Navigation Links | Browse/selection pages |
| `solve` | Logo + Exit Button | Active problem solving |
| `coach` | Logo + "Coaching Mode" + Exit | Active coaching session |
| `debug` | Logo + "Debug Mode" + Exit | Active debug session |

**Custom Layouts**:
- `/daily` and `/interview` bypass AppShell entirely
- Render only container wrapper without header

**Data Attribute**: Layout div has `data-mode={mode}` for CSS targeting

**Container Constraints**:
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}
```

### State Management Patterns in UI

**No Global State Library**: No Redux, Zustand, or Jotai observed

**State Management Strategy**:

1. **Component-local state** (`useState`):
   - Form inputs
   - Loading/error states
   - UI toggle states (drawer open/closed, modal visible)

2. **Server state** (fetch from API routes):
   - Attempt data
   - Problem data
   - Skill matrix
   - Coaching session state

3. **URL state** (Next.js router):
   - Active attempt ID (`/practice/[attemptId]`)
   - Active session ID (`/coach/[sessionId]`)

4. **Derived state** (`useMemo`, `useCallback`):
   - Step configuration based on attempt state
   - Validation results
   - UI visibility logic

**Data Flow Pattern** (Practice Example):
```
1. User navigates to /practice/[attemptId]
   ↓
2. Page component fetches attempt + problem from API
   ↓
3. Attempt data stored in local state (useState)
   ↓
4. Child components receive props (problem, attempt, handlers)
   ↓
5. User submits code → API call → Update local state
   ↓
6. Re-render with new state → Conditional components appear/disappear
```

**No Prop Drilling Solution**: Props passed directly (max 2-3 levels deep)

**State Persistence**:
- URL holds session identity
- Database (via API) holds session data
- No client-side persistence (localStorage, sessionStorage)

**Optimistic Updates**: Not observed in code

**Polling/Real-time**: Not implemented (no WebSockets or polling)

### Component Communication Patterns

**Parent-to-Child**: Props
```tsx
<CodeEditor
  initialCode={code}
  onSubmit={handleSubmit}
  loading={isSubmitting}
/>
```

**Child-to-Parent**: Callback functions
```tsx
// Parent
const handleSubmit = async (data) => { ... };

// Child calls callback
onSubmit({ code, language });
```

**Sibling Components**: Shared state in parent
```tsx
const [testResults, setTestResults] = useState([]);

<CodeEditor onSubmit={async (code) => {
  const results = await submitCode(code);
  setTestResults(results);
}} />

<TestResults results={testResults} />
```

**No Event Bus**: No custom event system

**No Context API Usage**: No `React.createContext` observed in components

### API Integration Pattern

**Fetch-Based API Calls**: Direct `fetch()` calls to API routes

**Pattern**:
```tsx
async function fetchAttempt() {
  try {
    const res = await fetch(`/api/attempts/${attemptId}`);
    const data = await res.json();

    if (data.error) {
      setError(data.error.message);
    } else {
      setAttempt(data.attempt);
      setProblem(data.problem);
    }
  } catch (err) {
    setError('Failed to load attempt');
  } finally {
    setLoading(false);
  }
}
```

**No Data Fetching Library**: No SWR, React Query, or Apollo

**Error Handling**: Manual try/catch with error state

**Loading States**: Manual boolean flags (`loading`, `submitting`, `starting`)

**Response Format**: All API responses follow `{ error: {...} | null, data: {...} }` pattern

### Accessibility in UI Layer

**Focus Management**:
- CSS `:focus-visible` selectors for keyboard navigation
- `outline: 2px solid var(--accent)` on interactive elements
- Focus removed for mouse users (`:focus:not(:focus-visible)`)

**Skip Link**:
```css
.skip-link {
  position: absolute;
  top: -100%; /* hidden */
}
.skip-link:focus {
  top: 0; /* visible on keyboard focus */
}
```

**Semantic HTML**:
- Buttons use `<button>`, links use `<a>`
- Headings follow hierarchy (h1 → h2 → h3)
- Form inputs have labels

**ARIA Attributes**: [Not extensively observed in code - minimal usage]

**Color Contrast**: All text meets WCAG AA (4.5:1 minimum)

**Touch Targets**: Buttons have minimum 44px height (via padding)

**Screen Reader Support**: [Inferred from semantic HTML - no explicit ARIA labels observed]

### UI Architecture Constraints

**Framework**: Next.js 14 (App Router, React Server Components capable)

**React Version**: [Inferred as React 18+ based on Next.js 14]

**TypeScript**: All components are TypeScript with prop interfaces

**Build Tool**: Next.js built-in (Turbopack in dev, Webpack in production)

**No Component Library**: No Material-UI, Chakra, Ant Design, etc.

**No Icon Library**: SVG icons inlined or unicode characters used

**Browser Support**: [Not specified - assumed modern evergreen browsers]

**Performance Considerations**:
- No code splitting observed (single bundle)
- No lazy loading (`React.lazy`) observed
- Images use Next.js `Image` component (not observed but recommended)

### UI Testing Strategy

[Not observed in codebase examination]

**Assumptions**:
- Manual testing primary method
- No unit tests for components observed
- No E2E tests (Playwright, Cypress) observed

---

## Scope of This Document

### What IS Covered

✅ High-level system architecture
✅ Monorepo structure and package organization
✅ Core architectural patterns (hexagonal, DI, immutability)
✅ Package responsibilities and public APIs
✅ Data flow through use-cases
✅ State machine diagrams
✅ Database schema and persistence strategy
✅ Dependency injection mechanism
✅ Key design patterns with examples
✅ Failure modes and resilience strategies
✅ Module dependency graph
✅ Performance bottlenecks and optimization recommendations
✅ **UI architecture** (component organization, styling, layout, state management)

### What is NOT Covered

❌ **Detailed UI/UX specifications** (see UI_SPEC.md for design system details)
❌ **Navigation architecture** (see NAVIGATION.md for routing and IA)
❌ **Deployment architecture** (CI/CD, infrastructure, containerization)
❌ **Security architecture** (authentication, authorization, secrets management)
❌ **API endpoint documentation** (see API docs or OpenAPI spec)
❌ **Code-level implementation details** (see source code)
❌ **Test strategy** (see test files and test documentation)
❌ **Feature roadmap** (see FEATURE_LIST.md and product docs)
❌ **Historical context** (see git history and LEGACY.md)

### Open Questions and Ambiguities

1. **Database vs In-Memory:** Code currently uses in-memory repos. When/why switch to PostgreSQL?
2. **LLM Dependency:** What is the expected uptime SLA for LLM validation? How often does it degrade?
3. **Multi-Tenancy:** Tenant model exists but only demo tenant is used. Is multi-tenancy a future requirement?
4. **Skill Progression:** Rung unlock threshold is hardcoded to 70. Should this be configurable per pattern or tenant?
5. **Concurrency Model:** No locking or transactions. What is the expected concurrent user load?
6. **Adversary Challenges:** Entity exists but integration is incomplete. Is this a priority feature?
7. **Bug Hunt & Debug Lab:** New entities added but repos are placeholders. Implementation timeline?

---

## Document Metadata

**Created:** Based on code analysis as of 2026-01-18
**Evidence Sources:**
- `packages/core/src/` (entities, ports, use-cases, validation)
- `packages/adapter-*/src/` (adapter implementations)
- `apps/web/src/lib/deps.ts` (dependency injection hub)
- `apps/web/src/app/api/` (route handlers)
- `pnpm-workspace.yaml`, `turbo.json`, `package.json` files
- Recent git commits: `8d790fc`, `d1c59a5`, `6ed9859`, `e7b7007`, `ccd5f06`

**Analysis Methodology:**
- Static code analysis (file structure, imports, types)
- Inferred behavior from implementation (no assumptions)
- Traced data flow through use-cases and adapters
- Documented observed patterns and conventions

**Limitations:**
- Does not reflect planned features or future refactorings
- Some features (Bug Hunt, Debug Lab) are partially implemented
- LLM behavior is inferred from prompts, not observed in production

---

**End of Architecture Overview**
