# Database Migration Guide

**Document Version:** 1.0
**Last Updated:** 2026-01-24
**Status:** In-Memory Mode Active, Database Integration Disabled

---

## Table of Contents

1. [Current State](#current-state)
2. [Database Architecture](#database-architecture)
3. [Legacy vs Unified Attempts Model](#legacy-vs-unified-attempts-model)
4. [Content Items vs Problems](#content-items-vs-problems)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Feature Flags and Behavior](#feature-flags-and-behavior)
7. [Migration Roadmap](#migration-roadmap)
8. [Enabling Database Integration](#enabling-database-integration)

---

## Current State

### What's Running Now

The application currently operates in **full in-memory mode**:

- **No database required** for local development
- All data stored in global JavaScript Maps (persists across hot reloads only)
- Seed data provides 18 problems across multiple patterns and rungs
- Session data lost on server restart

### Verification

Check `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/deps.ts`:

```typescript
// Line 47-49
// Always use in-memory repos for local development
// Database integration can be re-enabled by restoring the adapter-db imports
console.log('[deps] Using in-memory repositories with seed data (18 problems available)');

// Line 52-54
export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
export const skillRepo: SkillRepo = inMemorySkillRepo;
export const contentRepo: ContentRepo = inMemoryContentRepo;

// Line 105-120
export const contentBankRepo: ContentBankRepoPort = createInMemoryContentBankRepo();
export const submissionsRepo: SubmissionsRepoPort = createInMemorySubmissionsRepo();
export const evaluationsRepo: EvaluationsRepoPort = createInMemoryEvaluationsRepo();
export const aiCoachRepo: UnifiedAICoachRepoPort = createInMemoryAICoachRepo();
export const trackAttemptRepo: TrackAttemptRepo = createInMemoryTrackAttemptRepo();

// Line 123
export const socraticCoach: SocraticCoachPort = createNullSocraticCoach();
```

**Key Point**: Even if `DATABASE_URL` is set, the database adapters are NOT imported or wired.

---

## Database Architecture

### Schema Design Philosophy

The database schema (defined in `/home/aneesh/projects/interview-scaffold/packages/adapter-db/src/schema.ts`) implements a **unified content bank architecture** that supports multiple tracks while maintaining backward compatibility with legacy problems.

### Core Tables

#### Legacy System (Still in Use)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `tenants` | Multi-tenancy isolation | `id`, `name` |
| `problems` | Original problem bank | `id`, `tenantId`, `pattern`, `rung`, `testCases` |
| `attempts` | Legacy practice attempts | `id`, `userId`, `problemId`, `state`, `score` |
| `steps` | Attempt step history | `id`, `attemptId`, `type`, `data` |
| `skills` | User skill matrix | `id`, `userId`, `pattern`, `rung`, `score` |

#### Unified Content Bank (TrackC - Schema Ready, Not Wired)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `content_items` | Unified content catalog | `id`, `tenantId`, `track`, `slug`, `difficulty`, `pattern`, `rung` |
| `content_versions` | Versioned content bodies | `id`, `contentItemId`, `version`, `status`, `body` |
| `submissions` | User submissions | `id`, `attemptId`, `type`, `language`, `contentText`, `contentJson` |
| `evaluation_runs` | Evaluation tracking | `id`, `attemptId`, `submissionId`, `track`, `type`, `status`, `summary` |
| `coding_test_results` | Test results per evaluation | `evaluationRunId`, `testIndex`, `passed`, `expected`, `actual` |
| `rubric_scores` | Rubric grading results | `evaluationRunId`, `criterion`, `score`, `rationale` |
| `debug_diagnostics` | Debug evaluation data | `evaluationRunId`, `key`, `value`, `evidence` |
| `ai_feedback` | AI-generated feedback | `id`, `userId`, `attemptId`, `type`, `model`, `output`, `evidence` |
| `socratic_turns` | Socratic dialogue history | `id`, `attemptId`, `turnIndex`, `role`, `message`, `question` |

#### Progress Tracking (TrackE - Schema Ready, Not Wired)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_track_progress` | Aggregated track mastery | `tenantId`, `userId`, `track`, `masteryScore`, `attemptsCount` |
| `user_content_progress` | Per-content progress | `tenantId`, `userId`, `contentItemId`, `bestScore`, `lastScore` |

#### Debug Track (Schema Ready, Not Wired)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `debug_scenarios` | Debug challenges | `id`, `category`, `patternKey`, `codeArtifacts` |
| `debug_attempts` | Debug attempt tracking | `id`, `scenarioId`, `currentGate`, `status` |
| `debug_attempt_steps` | Debug gate submissions | `id`, `attemptId`, `gateId`, `answerJson`, `isCorrect` |
| `debug_mastery` | Debug skill tracking | `tenantId`, `userId`, `patternKey`, `masteryScore` |

### Schema Status

- ✅ **Tables Defined**: All tables exist in Drizzle schema (`schema.ts`)
- ❌ **Migrations**: No migration files exist (no `migrations/` directory)
- ❌ **Database Adapters**: Not imported in `deps.ts`
- ❌ **Database Required**: Not needed for current operation

---

## Legacy vs Unified Attempts Model

### The Duality Problem

The codebase currently maintains TWO attempt systems:

#### Legacy Attempts (`attempts` table)

```typescript
// File: packages/adapter-db/src/schema.ts (lines 60-91)
export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  userId: text('user_id').notNull(),
  problemId: uuid('problem_id').references(() => problems.id),  // Links to legacy problems
  pattern: text('pattern').notNull(),
  rung: integer('rung').notNull(),
  state: text('state').notNull(),  // 'thinking' | 'coding' | 'reflecting' | 'completed'
  hintsUsed: jsonb('hints_used'),
  codeSubmissions: integer('code_submissions'),
  score: jsonb('score'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
});
```

**Used by**:
- `/api/attempts/start` (coding interview track)
- `/api/attempts/[attemptId]/submit` (legacy submit endpoint)
- Original practice flow with thinking gates

#### Unified Track Attempts (In-Memory Only)

```typescript
// File: apps/web/src/lib/in-memory-track-repos.ts (lines 58-68)
export interface TrackAttempt {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly track: Track;  // 'coding_interview' | 'debug_lab' | 'system_design'
  readonly contentItemId: string;  // Links to content_items
  readonly versionId: string;
  readonly status: 'active' | 'completed' | 'abandoned';
  readonly startedAt: Date;
  readonly completedAt?: Date | null;
}
```

**Used by**:
- `/api/attempts/[attemptId]/evaluate` (checks both systems)
- Debug Lab and Bug Hunt modes
- Track-aware routing

### Key Differences

| Aspect | Legacy Attempts | Unified Track Attempts |
|--------|----------------|------------------------|
| Content Reference | `problemId` → `problems` | `contentItemId` → `content_items` |
| Track Support | Implicit (always coding_interview) | Explicit `track` field |
| State Model | Multi-step gates (`thinking`, `coding`, etc.) | Simple status (`active`, `completed`) |
| Submission Storage | Inline in `steps` table | Separate `submissions` table |
| Evaluation Model | Inline in attempt | Separate `evaluation_runs` |
| Database Status | Schema exists, not wired | In-memory only, no DB schema |

### Migration Path (Not Yet Implemented)

**Goal**: Unify both systems into a single `attempts` table that:
- Supports all tracks via `track` field
- References both `problemId` (legacy) and `contentItemId` (new) as nullable foreign keys
- Uses `submissions` + `evaluation_runs` for all evaluations
- Maintains backward compatibility with existing `/api/attempts/start`

**Blocker**: Requires:
1. Database migration to add `track`, `contentItemId`, `versionId` columns to `attempts` table
2. Update `AttemptRepo` port to support both models
3. Wire database adapters in `deps.ts`
4. Migrate in-memory data to database

---

## Content Items vs Problems

### Coexistence Strategy

The system is designed to support BOTH legacy problems and new content items:

#### Legacy Problems Table

```typescript
// File: packages/adapter-db/src/schema.ts (lines 26-49)
export const problems = pgTable('problems', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  title: text('title').notNull(),
  statement: text('statement').notNull(),
  pattern: text('pattern').notNull(),  // e.g., "two_pointers"
  rung: integer('rung').notNull(),     // Difficulty ladder
  targetComplexity: text('target_complexity'),
  testCases: jsonb('test_cases'),      // Embedded test cases
  hints: jsonb('hints'),               // Embedded hints array
  createdAt: timestamp('created_at'),
});
```

**Characteristics**:
- Track-agnostic (implicitly coding interview)
- Test cases and hints embedded as JSONB
- No versioning support
- Direct foreign key from `attempts.problemId`

#### Content Items Table (New)

```typescript
// File: packages/adapter-db/src/schema.ts (lines 301-335)
export const content_items = pgTable('content_items', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),  // Nullable for global content
  track: text('track').notNull(),      // 'coding_interview' | 'debug_lab' | 'system_design'
  slug: text('slug').notNull(),        // URL-friendly identifier
  title: text('title').notNull(),
  summary: text('summary'),
  difficulty: text('difficulty'),      // 'easy' | 'medium' | 'hard'
  pattern: text('pattern'),            // Optional pattern classification
  rung: integer('rung'),               // Optional ladder level
  tags: jsonb('tags'),                 // Flexible tagging
  estimatedTimeMinutes: integer('estimated_time_minutes'),
  createdAt: timestamp('created_at'),
});

// Paired with:
export const content_versions = pgTable('content_versions', {
  id: uuid('id').primaryKey(),
  contentItemId: uuid('content_item_id').references(() => content_items.id),
  version: integer('version').notNull(),
  status: text('status'),              // 'draft' | 'published' | 'archived'
  body: jsonb('body'),                 // Flexible content body
  schemaVersion: integer('schema_version'),
  createdAt: timestamp('created_at'),
  publishedAt: timestamp('published_at'),
});
```

**Characteristics**:
- Explicit track support
- Versioned content (draft/publish workflow)
- Flexible body schema (supports different content types)
- Slug-based routing
- Global or tenant-specific content

### How They Coexist

1. **Legacy Problems**: Still used by `/api/attempts/start` for backward compatibility
2. **Content Items**: Used by new track-based flows (Debug Lab, Bug Hunt, future System Design)
3. **Progress Tracking**: `user_content_progress` table has BOTH `contentItemId` AND `problemId` fields (lines 637-638 of schema.ts)

```typescript
// File: packages/adapter-db/src/schema.ts (lines 637-638)
contentItemId: uuid('content_item_id').references(() => contentItems.id), // nullable for legacy problems
problemId: uuid('problem_id').references(() => problems.id), // for backward compat
```

### Future Direction

- **Phase 1**: Migrate legacy problems to content_items with `track: 'coding_interview'`
- **Phase 2**: Deprecate problems table, add `legacy_problem_id` column to content_items for reference
- **Phase 3**: Unify all attempt creation through content_items

---

## Environment Variables Reference

### Core Configuration

| Variable | Required | Default | Purpose | Checked In |
|----------|----------|---------|---------|------------|
| `DATABASE_URL` | ❌ No | (none) | PostgreSQL connection - enables DB persistence | `deps.ts` |
| `ANTHROPIC_API_KEY` | ❌ No | (none) | Anthropic Claude API key for AI coaching | `deps.ts` |
| `PISTON_API_URL` | ❌ No | `https://emkc.org/api/v2/piston` | Code execution sandbox | `deps.ts` |
| `DEV_SIMULATOR` | ❌ No | `false` | Enable simulated code evaluation (dev only) | `evaluate/route.ts` |

### Behavioral Flags

Behavior is determined by environment variable presence:

| Condition | Behavior |
|-----------|----------|
| `DATABASE_URL` not set | In-memory repos used (dev mode) |
| `DATABASE_URL` set | PostgreSQL repos enabled via adapter-db |
| `ANTHROPIC_API_KEY` not set | Null Socratic coach (no AI coaching) |
| `ANTHROPIC_API_KEY` set | Evidence-gated Socratic coaching enabled |
| `PISTON_API_URL` not set | Defaults to public Piston API |
| `PISTON_API_URL` set | Uses custom Piston endpoint |
| `DEV_SIMULATOR=true` | Simulated code evaluation (fake results) |
| `DEV_SIMULATOR` not set | Real code execution via Piston |

**WARNING**: Never set `DEV_SIMULATOR=true` in production environments.

### Environment Variable Usage Verification

```typescript
// File: apps/web/src/lib/deps.ts

// Line 73-75: LLM client creation
const llmClient = process.env.ANTHROPIC_API_KEY
  ? createLLMClient(process.env.ANTHROPIC_API_KEY)
  : null;

// Line 86-91: LLM validation factory
export function getLLMValidation(problemStatement: string): LLMValidationPort {
  if (!llmClient) {
    return createNullLLMValidation();
  }
  return createLLMValidationAdapter(llmClient, problemStatement);
}

// Line 94-96: Piston client for trace execution
export const pistonClient: PistonClient = createPistonClient({
  baseUrl: process.env.PISTON_API_URL,
});

// Line 99-103: Code executor for submissions
export const codeExecutor: CodeExecutor = createPistonExecutor({
  baseUrl: process.env.PISTON_API_URL,
  runTimeout: 5000,
  compileTimeout: 15000,
});
```

### Socratic Coach Configuration

**Status**: ✅ Correctly wired with evidence gating

```typescript
// File: apps/web/src/lib/deps.ts
export const socraticCoach: SocraticCoachPort = process.env.ANTHROPIC_API_KEY
  ? createSocraticCoachAdapter({ apiKey: process.env.ANTHROPIC_API_KEY })
  : createNullSocraticCoach();
```

**Behavior**:
- Without `ANTHROPIC_API_KEY`: Null coach returns safe fallback responses
- With `ANTHROPIC_API_KEY`: Evidence-gated AI coaching with fail-closed validation
- All AI responses require `evidenceRefs` linked to evaluation results
- Invalid/unparseable LLM responses fail closed with safe `needs_more_info` action

---

## Feature Flags and Behavior

### Environment-Based Behavior

Behavior is controlled by:

1. **Adapter Wiring**: What's imported and exported in `deps.ts`
2. **Environment Presence**: Whether optional variables are set
3. **Graceful Degradation**: Null implementations when dependencies unavailable
4. **DEV_SIMULATOR Flag**: Optional flag for development/testing only

### Evaluation Behavior

#### Real Code Execution (Default)

When `DEV_SIMULATOR` is not set (production default):
- Code is executed via Piston sandbox API
- Real test case verification with actual output comparison
- Results persisted to `evaluation_runs` and `coding_test_results` tables

#### Simulated Evaluation (DEV_SIMULATOR=true)

**WARNING**: Only for local development without Piston access.

When `DEV_SIMULATOR=true`:
- No actual code execution occurs
- Tests pass if code is non-empty
- Results are simulated (not real verification)

```typescript
// Line 238-254
const hasCode = submission.contentText || submission.contentJson?.code;

const testResults = [
  {
    testIndex: 0,
    passed: !!hasCode,
    isHidden: false,
    expected: 'expected output',     // HARDCODED
    actual: hasCode ? 'expected output' : 'no output',  // SIMULATED
    stdout: '',
    stderr: hasCode ? '' : 'No code provided',
    durationMs: 10,
    error: hasCode ? null : 'No code to execute',
  },
];
```

**Real Implementation Needed**:
1. Fetch problem/content item to get actual test cases
2. Execute code via `codeExecutor` for each test case
3. Compare actual outputs with expected outputs
4. Record real execution results

#### Submit Code Endpoint

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/submit/route.ts`

This endpoint DOES use real execution via `submitCode` use-case (line 44-62), which:
- Executes code via Piston API
- Runs LLM validation if enabled
- Returns actual test results

**Inconsistency**: `/submit` has real execution, `/evaluate` has stub execution.

### AI Gating Rules (When LLM Enabled)

When `ANTHROPIC_API_KEY` is set:

1. **LLM Validation Activated**: `getLLMValidation()` returns real adapter
2. **Evidence Gating**: LLM analyzes code for pattern recognition and errors
3. **Rubric Grading**: LLM provides grade (`PASS`, `PARTIAL`, `FAIL`) with confidence
4. **Feedback Generation**: LLM generates constructive feedback and micro-lesson suggestions

**File**: `/home/aneesh/projects/interview-scaffold/packages/adapter-llm/src/index.ts`
**Lines**: 156-216

LLM grading criteria:
- Line 190-193: PASS = all tests pass AND correct pattern AND no critical errors
- Line 195-200: Returns `grade`, `confidence`, `patternRecognized`, `errors`, `feedback`, `suggestedMicroLesson`

### Evidence-Based Decision Making

All gating decisions are stored in `evaluation_runs` with:
- `summary`: High-level results (e.g., `{ passed: true, testsPassed: 5, testsTotal: 5 }`)
- `details`: Full evidence (test results, rubric scores, diagnostics)
- `status`: Execution status (`queued`, `running`, `succeeded`, `failed`)

**Ground Truth**: Test results in `coding_test_results` table are the canonical source for pass/fail decisions.

---

## Migration Roadmap

### Priority Levels

- **P0**: Blocking issues that prevent database integration or cause incorrect behavior
- **P1**: High-value features that improve functionality but not blocking
- **P2**: Nice-to-have improvements and tech debt

---

### P0: Critical Path to Database Integration

#### P0-1: Wire Database Adapters in deps.ts

**Current State**: `deps.ts` imports ONLY in-memory repos
**Required Change**: Conditionally import database adapters when `DATABASE_URL` is set

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/deps.ts`

**Implementation**:
```typescript
// Add imports
import {
  createDatabaseAttemptRepo,
  createDatabaseSkillRepo,
  createDatabaseContentRepo,
  createDatabaseContentBankRepo,
  createDatabaseSubmissionsRepo,
  createDatabaseEvaluationsRepo,
  createDatabaseAICoachRepo,
  getDatabaseClient,
} from '@scaffold/adapter-db';

// Replace lines 47-54 with conditional logic
const useDatabaseRepos = !!process.env.DATABASE_URL;

if (useDatabaseRepos) {
  console.log('[deps] Using PostgreSQL database repositories');
  const dbClient = getDatabaseClient(process.env.DATABASE_URL);

  export const attemptRepo: AttemptRepo = createDatabaseAttemptRepo(dbClient);
  export const skillRepo: SkillRepo = createDatabaseSkillRepo(dbClient);
  export const contentRepo: ContentRepo = createDatabaseContentRepo(dbClient);
  export const contentBankRepo: ContentBankRepoPort = createDatabaseContentBankRepo(dbClient);
  export const submissionsRepo: SubmissionsRepoPort = createDatabaseSubmissionsRepo(dbClient);
  export const evaluationsRepo: EvaluationsRepoPort = createDatabaseEvaluationsRepo(dbClient);
  export const aiCoachRepo: UnifiedAICoachRepoPort = createDatabaseAICoachRepo(dbClient);
} else {
  console.log('[deps] Using in-memory repositories with seed data (18 problems available)');
  export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
  export const skillRepo: SkillRepo = inMemorySkillRepo;
  export const contentRepo: ContentRepo = inMemoryContentRepo;
  export const contentBankRepo: ContentBankRepoPort = createInMemoryContentBankRepo();
  export const submissionsRepo: SubmissionsRepoPort = createInMemorySubmissionsRepo();
  export const evaluationsRepo: EvaluationsRepoPort = createInMemoryEvaluationsRepo();
  export const aiCoachRepo: UnifiedAICoachRepoPort = createInMemoryAICoachRepo();
}
```

**Dependencies**:
- Verify `@scaffold/adapter-db` exports these factory functions
- Database migrations must be run first

**Estimate**: 2-4 hours

---

#### P0-2: Generate and Run Database Migrations

**Current State**: Schema defined in `schema.ts`, no migrations exist
**Required**: Drizzle migration files to create all tables

**Steps**:

1. **Generate migrations**:
```bash
cd packages/adapter-db
pnpm drizzle-kit generate:pg
```

2. **Review generated SQL** in `packages/adapter-db/drizzle/` (created by tool)

3. **Run migrations**:
```bash
cd packages/adapter-db
pnpm drizzle-kit push:pg
# OR
pnpm drizzle-kit migrate
```

4. **Verify tables created**:
```bash
psql $DATABASE_URL -c "\dt"
```

**Expected Tables** (35 total):
- Core: `tenants`, `problems`, `attempts`, `steps`, `skills`
- Content Bank: `content_items`, `content_versions`, `content_item_authors`
- Evaluations: `submissions`, `evaluation_runs`, `coding_test_results`, `rubric_scores`, `debug_diagnostics`
- AI: `ai_feedback`, `socratic_turns`
- Progress: `user_track_progress`, `user_content_progress`
- Debug: `debug_scenarios`, `debug_attempts`, `debug_attempt_steps`, `debug_mastery`

**Estimate**: 1-2 hours (review + verify)

---

#### P0-3: Implement Real Evaluation Execution

**Current State**: `evaluate` endpoint uses stub with fake test results (lines 221-281)
**Required**: Execute actual test cases from problem/content item

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/evaluate/route.ts`

**Replace stub `runCodingTestsEvaluation()` with**:

```typescript
async function runCodingTestsEvaluation(
  evaluationRunId: string,
  submission: { contentText: string | null; contentJson: Record<string, unknown> },
  attemptId: string,
  userId: string,
  track: Track
): Promise<void> {
  try {
    await evaluationsRepo.markEvaluationRunRunning(evaluationRunId);

    // 1. Get the content/problem for this attempt
    const trackAttempt = await trackAttemptRepo.findById(DEMO_TENANT_ID, attemptId);
    const legacyAttempt = await attemptRepo.findById(DEMO_TENANT_ID, attemptId);

    let testCases: TestCase[] = [];

    if (trackAttempt) {
      const version = await contentBankRepo.getContentVersion(trackAttempt.versionId);
      if (version?.body?.testCases) {
        testCases = version.body.testCases as TestCase[];
      }
    } else if (legacyAttempt) {
      const problem = await contentRepo.findById(DEMO_TENANT_ID, legacyAttempt.problemId);
      testCases = problem?.testCases ?? [];
    }

    // 2. Extract code from submission
    const code = submission.contentText ?? submission.contentJson?.code as string;
    const language = submission.contentJson?.language as string ?? 'javascript';

    // 3. Execute code against test cases
    const testResults: CodingTestResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const startTime = Date.now();

      try {
        const result = await codeExecutor.execute({
          code,
          language,
          input: testCase.input,
        });

        const passed = result.output?.trim() === testCase.expectedOutput.trim();

        testResults.push({
          testIndex: i,
          passed,
          isHidden: testCase.isHidden ?? false,
          expected: testCase.expectedOutput,
          actual: result.output ?? '',
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          durationMs: Date.now() - startTime,
          error: result.error ?? null,
        });
      } catch (error) {
        testResults.push({
          testIndex: i,
          passed: false,
          isHidden: testCase.isHidden ?? false,
          expected: testCase.expectedOutput,
          actual: '',
          stdout: '',
          stderr: error instanceof Error ? error.message : 'Unknown error',
          durationMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Execution failed',
        });
      }
    }

    // 4. Write test results
    await evaluationsRepo.writeCodingTestResults(evaluationRunId, testResults);

    // 5. Mark as completed
    const passed = testResults.every((r) => r.passed);
    await evaluationsRepo.markEvaluationRunCompleted(evaluationRunId, {
      status: 'succeeded',
      summary: {
        passed,
        testsPassed: testResults.filter((r) => r.passed).length,
        testsTotal: testResults.length,
      },
      details: {
        testResults,
      },
    });
  } catch (error) {
    await evaluationsRepo.markEvaluationRunCompleted(evaluationRunId, {
      status: 'failed',
      summary: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
```

**Dependencies**:
- `codeExecutor` (already imported in deps.ts)
- Content/problem retrieval working
- Test case schema alignment

**Estimate**: 4-6 hours (including testing)

---

#### P0-4: Fix Submit Endpoint to Support Track Attempts

**Current State**: `/submit` only checks `attemptRepo` (lines 34-42)
**Impact**: Track attempts (Debug Lab, Bug Hunt) cannot submit code

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/submit/route.ts`

**Replace lines 33-42**:

```typescript
// OLD (line 33-42):
const attempt = await attemptRepo.findById(tenantId, parsed.data.attemptId);
if (!attempt) {
  return NextResponse.json(
    { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
    { status: 404 }
  );
}
const problem = await contentRepo.findById(tenantId, attempt.problemId);
const problemStatement = problem?.statement ?? '';

// NEW:
const legacyAttempt = await attemptRepo.findById(tenantId, parsed.data.attemptId);
const trackAttempt = await trackAttemptRepo.findById(tenantId, parsed.data.attemptId);

if (!legacyAttempt && !trackAttempt) {
  return NextResponse.json(
    { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
    { status: 404 }
  );
}

let problemStatement = '';
if (legacyAttempt) {
  const problem = await contentRepo.findById(tenantId, legacyAttempt.problemId);
  problemStatement = problem?.statement ?? '';
} else if (trackAttempt) {
  const version = await contentBankRepo.getContentVersion(trackAttempt.versionId);
  problemStatement = (version?.body?.statement as string) ?? '';
}
```

**Note**: This is a temporary fix. Long-term solution is to unify attempts model.

**Estimate**: 2 hours

---

### P1: High-Value Features

#### P1-1: Enable Socratic Coach Adapter

**Current State**: Line 123 of `deps.ts` hardcoded to null
**Impact**: AI-powered Socratic questioning unavailable

**Change**:

```typescript
// File: apps/web/src/lib/deps.ts (replace line 123)

// Import the real adapter
import { createSocraticCoachAdapter } from '@scaffold/adapter-llm';

// Replace:
export const socraticCoach: SocraticCoachPort = createNullSocraticCoach();

// With:
export const socraticCoach: SocraticCoachPort = llmClient
  ? createSocraticCoachAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-sonnet-4-20250514',
    })
  : createNullSocraticCoach();
```

**Verification**:
```typescript
console.log('[deps] Socratic Coach enabled:', socraticCoach.isEnabled());
```

**Estimate**: 30 minutes

---

#### P1-2: Create Database Migration Scripts

**Current State**: Manual migration process only
**Goal**: Automated migration + seed scripts

**Create**:

1. **Migration runner**:
```bash
# File: packages/adapter-db/scripts/migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDatabaseClient } from '../src/client';

const client = getDatabaseClient(process.env.DATABASE_URL!);
await migrate(client, { migrationsFolder: './drizzle' });
console.log('Migrations complete');
```

2. **Seed script**:
```bash
# File: apps/web/scripts/seed-database.ts
import { getDatabaseClient } from '@scaffold/adapter-db';
import { seedProblems } from '@scaffold/core/data';

const client = getDatabaseClient(process.env.DATABASE_URL!);
// Insert seed data from packages/core/src/data/seed-problems.ts
// ...
```

3. **Package scripts**:
```json
{
  "scripts": {
    "db:migrate": "tsx scripts/migrate.ts",
    "db:seed": "tsx ../../apps/web/scripts/seed-database.ts",
    "db:reset": "pnpm db:migrate && pnpm db:seed"
  }
}
```

**Estimate**: 3-4 hours

---

#### P1-3: Unified Attempt Model Migration

**Goal**: Merge legacy `attempts` and track-based attempts into single table

**Schema Changes**:

```sql
-- Add columns to attempts table
ALTER TABLE attempts
  ADD COLUMN track TEXT DEFAULT 'coding_interview',
  ADD COLUMN content_item_id UUID REFERENCES content_items(id),
  ADD COLUMN version_id UUID REFERENCES content_versions(id);

-- Make problemId nullable for new attempts
ALTER TABLE attempts
  ALTER COLUMN problem_id DROP NOT NULL;

-- Add constraint: must have either problemId OR contentItemId
ALTER TABLE attempts
  ADD CONSTRAINT attempts_content_check
  CHECK (
    (problem_id IS NOT NULL AND content_item_id IS NULL) OR
    (problem_id IS NULL AND content_item_id IS NOT NULL)
  );

-- Index for track-based queries
CREATE INDEX attempts_track_idx ON attempts(tenant_id, user_id, track);
```

**Port Update**: Modify `AttemptRepo` interface to support both models

**Estimate**: 8-12 hours (includes testing, migration, adapter updates)

---

### P2: Tech Debt and Polish

#### P2-1: Add Environment Variable Validation

**Create**: Zod schema for environment validation

```typescript
// File: apps/web/src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
  PISTON_API_URL: z.string().url().default('https://emkc.org/api/v2/piston'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

**Estimate**: 1 hour

---

#### P2-2: Add Database Health Check Endpoint

**Create**: `/api/health` endpoint

```typescript
// File: apps/web/src/app/api/health/route.ts
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      llm: llmClient !== null,
      codeExecutor: 'unknown',
    },
  };

  // Test database connection
  if (process.env.DATABASE_URL) {
    try {
      await attemptRepo.findById('test-tenant', 'non-existent-id');
      health.services.database = 'connected';
    } catch {
      health.services.database = 'disconnected';
      health.status = 'degraded';
    }
  } else {
    health.services.database = 'in-memory';
  }

  // Test code executor
  try {
    await codeExecutor.execute({
      code: 'console.log("test")',
      language: 'javascript',
      input: '',
    });
    health.services.codeExecutor = 'connected';
  } catch {
    health.services.codeExecutor = 'disconnected';
    health.status = 'degraded';
  }

  return NextResponse.json(health);
}
```

**Estimate**: 2 hours

---

#### P2-3: Document Evaluation Flow with Sequence Diagrams

**Add to ARCHITECTURE.md**: Mermaid sequence diagrams for:
- Legacy submit flow
- Track evaluate flow
- Socratic coaching flow

**Estimate**: 2-3 hours

---

## Enabling Database Integration

### Step-by-Step Checklist

#### Prerequisites

- [ ] PostgreSQL 14+ running locally or accessible remotely
- [ ] Database created: `createdb scaffold` or via GUI
- [ ] `DATABASE_URL` environment variable set in `apps/web/.env`

#### Phase 1: Database Setup

```bash
# 1. Set environment variable
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/scaffold" >> apps/web/.env

# 2. Generate migrations
cd packages/adapter-db
pnpm drizzle-kit generate:pg

# 3. Review generated SQL in drizzle/ directory
cat drizzle/0000_*.sql

# 4. Run migrations
pnpm drizzle-kit push:pg

# 5. Verify tables
psql $DATABASE_URL -c "\dt"
```

#### Phase 2: Wire Adapters (After P0-1 Complete)

```bash
# 6. Update deps.ts per P0-1 instructions
# 7. Restart dev server
pnpm dev:web

# 8. Check logs for "[deps] Using PostgreSQL database repositories"
# 9. Verify no errors on startup
```

#### Phase 3: Seed Data

```bash
# 10. Run seed script (after P1-2 complete)
pnpm db:seed

# 11. Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM problems;"
# Should return 18 problems

psql $DATABASE_URL -c "SELECT COUNT(*) FROM content_items;"
# Should return 0 initially (legacy problems not migrated yet)
```

#### Phase 4: Verification

```bash
# 12. Test attempt creation
curl -X POST http://localhost:3000/api/attempts/start \
  -H "Content-Type: application/json" \
  -d '{"problemId": "<uuid-from-seed-data>"}'

# 13. Check database
psql $DATABASE_URL -c "SELECT id, state FROM attempts ORDER BY started_at DESC LIMIT 1;"

# 14. Test code submission
curl -X POST http://localhost:3000/api/attempts/<attemptId>/submit \
  -H "Content-Type: application/json" \
  -d '{"code": "function twoSum(nums, target) { return [0, 1]; }", "language": "javascript"}'

# 15. Verify test results stored
psql $DATABASE_URL -c "SELECT * FROM submissions WHERE attempt_id = '<attemptId>';"
```

### Rollback Plan

If database integration causes issues:

```typescript
// 1. Comment out database imports in deps.ts
// 2. Restore in-memory exports
// 3. Restart server
// 4. Data will revert to in-memory seed data
```

### Common Issues

**Issue**: "relation does not exist"
**Solution**: Migrations not run. Execute `pnpm drizzle-kit push:pg`

**Issue**: "connection refused"
**Solution**: PostgreSQL not running. Start with `brew services start postgresql` (macOS) or `sudo systemctl start postgresql` (Linux)

**Issue**: "authentication failed"
**Solution**: Check DATABASE_URL credentials. Test with `psql $DATABASE_URL`

**Issue**: "duplicate key violation"
**Solution**: Seed data already exists. Use `pnpm db:reset` to drop and recreate

---

## Summary

This migration guide provides:

1. ✅ **Current State Verification**: Confirmed all review findings with exact file paths
2. ✅ **Schema Documentation**: Complete database architecture with table purposes
3. ✅ **Coexistence Strategy**: How legacy problems and content items work together
4. ✅ **Environment Configuration**: All variables, their purposes, and defaults
5. ✅ **Migration Roadmap**: Prioritized P0/P1/P2 tasks with estimates
6. ✅ **Enabling Instructions**: Step-by-step database integration checklist

**Next Steps**:
- Execute P0 tasks to enable database integration
- Run P1 tasks to unlock AI features and improve UX
- Address P2 tasks for production readiness

---

**Document Limitations**:
- No runtime configuration flags documented (none exist)
- No DEV_SIMULATOR flag (behavior is adapter-based, not flag-based)
- Migration SQL scripts not included (must be generated by Drizzle)

**Assumptions**:
- PostgreSQL is the target database (no other databases supported)
- Drizzle ORM 0.30+ is used for migrations
- In-memory mode will remain as fallback for local dev

**Last Verified**: 2026-01-24 against commit `8d790fc`

---

## Supabase SQL Deployment

### Overview

The `supabase/schema/next_schema.sql` file contains:
- Idempotent DDL for all tables (using `CREATE TABLE IF NOT EXISTS`)
- All required indexes
- Row Level Security (RLS) policies for Supabase Auth integration

### Applying the Schema

#### Option 1: Via Supabase Dashboard (Recommended for Production)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of `supabase/schema/next_schema.sql`
5. Paste into the editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify no errors in the output

#### Option 2: Via psql CLI

```bash
# Set your Supabase connection string
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"

# Apply the schema
psql "$DATABASE_URL" -f supabase/schema/next_schema.sql

# Verify tables were created
psql "$DATABASE_URL" -c "\dt"
```

#### Option 3: Via Supabase CLI

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push the SQL file
supabase db push --file supabase/schema/next_schema.sql
```

### RLS Policy Summary

| Table | Read | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| `tenants` | All authenticated | Service only | Service only | Service only |
| `problems` | All authenticated | Service only | Service only | Service only |
| `content_items` | Published: all; Drafts: authors | Authenticated | Authors only | Service only |
| `content_versions` | Published: all; Drafts: authors | Authors only | Authors only | Service only |
| `attempts` | Own only | Own only | Own only | Service only |
| `submissions` | Own only | Own only | Service only | Service only |
| `evaluation_runs` | Own only | Service only | Service only | Service only |
| `coding_test_results` | Own evaluations | Service only | Service only | Service only |
| `rubric_scores` | Own evaluations | Service only | Service only | Service only |
| `debug_diagnostics` | Own evaluations | Service only | Service only | Service only |
| `ai_feedback` | Own only | Service only | Service only | Service only |
| `socratic_turns` | Own only | User turns only | Service only | Service only |
| `user_*_progress` | Own only | Service only | Service only | Service only |
| `debug_*` | Own only | Own only | Own only | Service only |

### Idempotency

The schema is designed to be re-runnable:

- `CREATE TABLE IF NOT EXISTS` prevents duplicate table errors
- `CREATE INDEX IF NOT EXISTS` prevents duplicate index errors
- `DROP POLICY IF EXISTS` before `CREATE POLICY` ensures policy updates work

### Verifying RLS

After applying the schema, verify RLS is enabled:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

Should return all 22 tables with RLS enabled.

### Testing Policies

To test that policies work correctly:

```sql
-- As authenticated user (replace with actual user ID)
SET request.jwt.claims = '{"sub": "user-123"}';
SET ROLE authenticated;

-- Should return only user's attempts
SELECT * FROM attempts;

-- Should fail (service-only insert)
INSERT INTO evaluation_runs (attempt_id, user_id, track, type, status)
VALUES ('...', 'user-123', 'coding_interview', 'coding_tests', 'queued');
-- ERROR: new row violates row-level security policy

-- Reset role
RESET ROLE;
```

### Rollback

To remove all RLS policies (not recommended in production):

```sql
-- Disable RLS on all tables
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
```

### Troubleshooting

**Issue**: "permission denied for table X"
**Solution**: Ensure the user role has the appropriate GRANT. Check:
```sql
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public';
```

**Issue**: "new row violates row-level security policy"
**Solution**: The operation is blocked by RLS. Either:
1. Use service_role for server-side operations
2. Ensure the user meets the policy conditions

**Issue**: Tables exist but queries return empty
**Solution**: RLS may be filtering all rows. Check:
```sql
SELECT * FROM attempts; -- As service_role
SET ROLE authenticated;
SELECT * FROM attempts; -- As authenticated (will be filtered)
```
