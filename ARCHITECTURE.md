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

### What is NOT Covered

❌ **Frontend architecture** (React component hierarchy, state management)
❌ **UI/UX design decisions** (component library, styling patterns)
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
