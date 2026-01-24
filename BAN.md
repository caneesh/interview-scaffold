# Baseline Architecture Notes (BAN)

**Last Updated**: January 2026
**Scope**: interview-scaffold monorepo - Pattern-first coding interview platform
**Target Audience**: Debugging Track sub-agents, architectural decision makers
**Status**: Complete system analysis for multi-agent implementation

---

## Quick Reference for Debugging Track

### Key Patterns to Follow

| Area | Convention | Example |
|------|------------|---------|
| Entities | Readonly properties, branded types | `readonly tenantId: TenantId` |
| Use Cases | Pure functions, dependency injection | `startAttempt(input, deps)` |
| State | Enum-like constants with `as const` | `['SYMPTOM', 'ROOT_CAUSE'] as const` |
| Repos | Port interfaces in core, adapters implement | `DebugAttemptRepo` port |
| Tests | Vitest, factory helpers, mock deps | `createBaseDebugAttempt()` |
| API | Next.js App Router, x-tenant-id header | `POST /api/debug/attempts/start` |
| DB | Drizzle ORM, snake_case tables | `debug_attempts`, `debug_scenarios` |

---

## 1. Package Structure

```
interview-scaffold/
├── apps/web/                    # Next.js 14 frontend
├── packages/
│   ├── core/                    # Pure domain logic (zero deps)
│   │   ├── entities/            # Domain models
│   │   ├── ports/               # Interface abstractions
│   │   ├── use-cases/           # Business logic
│   │   ├── validation/          # Gating rules, heuristics
│   │   └── data/                # Seed data
│   ├── contracts/               # Shared Zod schemas
│   ├── adapter-db/              # Drizzle ORM + PostgreSQL
│   ├── adapter-llm/             # Anthropic Claude integration
│   └── adapter-piston/          # Code execution sandbox
```

---

## 2. Entity Patterns

### Standard Entity Structure
```typescript
export interface DebugAttempt {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly scenarioId: string;
  readonly currentGate: DebugGate;
  readonly gateHistory: readonly GateSubmission[];
  readonly hintsUsed: number;
  readonly status: DebugAttemptStatus;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
}
```

### Branded Types
```typescript
export type TenantId = string & { readonly __brand: 'TenantId' };
```

### Enum-like Constants
```typescript
export const DEBUG_GATES = [
  'SYMPTOM_CLASSIFICATION',
  'DETERMINISM_ANALYSIS',
  'PATTERN_CLASSIFICATION',
  'ROOT_CAUSE_HYPOTHESIS',
  'FIX_STRATEGY',
  'REGRESSION_PREVENTION',
  'REFLECTION',
] as const;
export type DebugGate = typeof DEBUG_GATES[number];
```

---

## 3. Use Case Pattern

```typescript
// packages/core/src/use-cases/start-debug-attempt.ts
export interface StartDebugAttemptInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly scenarioId: string;
}

export interface StartDebugAttemptDeps {
  readonly debugAttemptRepo: DebugAttemptRepo;
  readonly debugScenarioRepo: DebugScenarioRepo;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export async function startDebugAttempt(
  input: StartDebugAttemptInput,
  deps: StartDebugAttemptDeps
): Promise<DebugAttempt> {
  // 1. Validate scenario exists
  // 2. Create attempt
  // 3. Persist
  // 4. Return
}
```

---

## 4. Port Interfaces

```typescript
// packages/core/src/ports/debug-attempt-repo.ts
export interface DebugAttemptRepo {
  save(attempt: DebugAttempt): Promise<DebugAttempt>;
  findById(tenantId: TenantId, attemptId: string): Promise<DebugAttempt | null>;
  update(attempt: DebugAttempt): Promise<DebugAttempt>;
}

export interface DebugScenarioRepo {
  findById(id: string): Promise<DebugScenario | null>;
  findAll(filter?: { category?: DebugPatternCategory; difficulty?: Difficulty }): Promise<DebugScenario[]>;
}

export interface DebugEvaluator {
  evaluate(gate: DebugGate, answer: string, scenario: DebugScenario): EvaluationResult;
}
```

---

## 5. Gating Rules Engine

Follow existing pattern from `packages/core/src/validation/gating.ts`:

```typescript
export interface GatingRule {
  readonly id: string;
  readonly priority: number;
  readonly condition: (context: GatingContext) => boolean;
  readonly action: GatingAction;
  readonly reason: string;
}

// Rules evaluated in priority order (lower = higher priority)
```

---

## 6. Scoring Pattern

Follow existing EMA (Exponential Moving Average) from skill-state:

```typescript
export function computeNewScore(
  currentScore: number,
  attemptsCount: number,
  newAttemptScore: number
): number {
  const alpha = Math.min(0.3, 1 / (attemptsCount + 1));
  return currentScore * (1 - alpha) + newAttemptScore * alpha;
}
```

---

## 7. API Route Pattern

```typescript
// apps/web/src/app/api/debug/attempts/start/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') ?? DEMO_TENANT_ID;
  const body = await request.json();

  try {
    const result = await startDebugAttempt(
      { tenantId, userId: getUserId(), scenarioId: body.scenarioId },
      deps
    );
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'ERROR_CODE', message: error.message } },
      { status: 400 }
    );
  }
}
```

---

## 8. Database Schema Pattern

```typescript
// packages/adapter-db/src/schema.ts
export const debugScenarios = pgTable('debug_scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  patternKey: text('pattern_key').notNull(),
  difficulty: text('difficulty').notNull(),
  symptomDescription: text('symptom_description').notNull(),
  codeArtifacts: jsonb('code_artifacts').notNull(),
  expectedFindings: jsonb('expected_findings').notNull(),
  fixStrategies: jsonb('fix_strategies').notNull(),
  hintLadder: jsonb('hint_ladder').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const debugAttempts = pgTable('debug_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  scenarioId: uuid('scenario_id').references(() => debugScenarios.id),
  currentGate: text('current_gate').notNull(),
  status: text('status').notNull(),
  hintsUsed: integer('hints_used').default(0),
  scoreJson: jsonb('score_json'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  tenantUserIdx: index('debug_attempts_tenant_user_idx').on(table.tenantId, table.userId),
}));
```

---

## 9. Test Pattern

```typescript
// packages/core/src/use-cases/start-debug-attempt.test.ts
import { describe, it, expect } from 'vitest';

function createMockDeps(): StartDebugAttemptDeps {
  return {
    debugAttemptRepo: {
      save: async (attempt) => attempt,
      findById: async () => null,
      update: async (attempt) => attempt,
    },
    debugScenarioRepo: {
      findById: async () => mockScenario,
      findAll: async () => [mockScenario],
    },
    clock: { now: () => new Date('2024-01-01T12:00:00Z') },
    idGenerator: { generate: () => 'id-123' },
  };
}

describe('startDebugAttempt', () => {
  it('creates attempt with initial gate', async () => {
    const result = await startDebugAttempt(
      { tenantId: 'tenant-1', userId: 'user-1', scenarioId: 'scenario-1' },
      createMockDeps()
    );
    expect(result.currentGate).toBe('SYMPTOM_CLASSIFICATION');
    expect(result.status).toBe('IN_PROGRESS');
  });
});
```

---

## 10. Debugging Track Specific Types

### DebugScenario
```typescript
export interface DebugScenario {
  readonly id: string;
  readonly category: DebugPatternCategory;
  readonly patternKey: string;
  readonly difficulty: Difficulty;
  readonly symptomDescription: string;
  readonly codeArtifacts: readonly CodeArtifact[];
  readonly expectedFindings: readonly string[];
  readonly fixStrategies: readonly string[];
  readonly regressionExpectation: string;
  readonly hintLadder: readonly string[];
  readonly tags: readonly string[];
}
```

### DebugPatternCategory
```typescript
export const DEBUG_PATTERN_CATEGORIES = [
  'FUNCTIONAL_LOGIC',
  'ALGORITHMIC',
  'PERFORMANCE',
  'RESOURCE',
  'CONCURRENCY',
  'INTEGRATION',
  'DISTRIBUTED',
  'PRODUCTION_REALITY',
] as const;
export type DebugPatternCategory = typeof DEBUG_PATTERN_CATEGORIES[number];
```

### GateSubmission
```typescript
export interface GateSubmission {
  readonly gateId: DebugGate;
  readonly answer: string;
  readonly timestamp: Date;
  readonly evaluationResult: EvaluationResult;
}
```

### EvaluationResult
```typescript
export interface EvaluationResult {
  readonly isCorrect: boolean;
  readonly confidence: number;
  readonly feedback: string;
  readonly rubricScores: Record<string, number>;
  readonly nextGate: DebugGate | null;
  readonly allowProceed: boolean;
}
```

---

## Critical Rules for All Agents

1. **Always scope by tenantId** - Every query must include tenant filter
2. **Use readonly everywhere** - Entities are immutable
3. **Inject dependencies** - No globals, no direct imports of adapters in core
4. **Tests alongside code** - Every use case gets a .test.ts file
5. **Small commits** - One concern per commit
6. **No secrets** - Read from env, disable in tests
7. **LLM is optional** - Heuristics are primary, LLM behind port

---

**Document Version**: 1.0
**Ready for sub-agent consumption**
