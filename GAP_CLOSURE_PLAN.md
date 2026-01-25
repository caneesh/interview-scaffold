# Gap Closure Plan

**Created**: 2026-01-24
**Status**: Ready for Execution
**Priority System**: P0 (blocking) → P1 (high-value) → P2 (polish)

---

## Executive Summary

This document provides a verified, code-backed gap closure plan for the interview-scaffold project. All findings have been verified against actual source code with exact file paths and line numbers.

**Key Gaps Identified**:
1. ✅ Database adapters exist but not wired (in-memory mode only)
2. ✅ Evaluation endpoint uses stub/simulator (no real test execution)
3. ✅ Socratic Coach adapter exists but hardcoded to null
4. ✅ Submit endpoint doesn't support track attempts (Debug Lab, Bug Hunt)
5. ✅ Dual attempt systems not unified (legacy vs track-based)

**Documentation Deliverables**:
- ✅ `MIGRATION.md` - Complete database migration guide
- ✅ `ARCHITECTURE.md` - Updated with unified attempt model section
- ✅ `API.md` - New evaluation, submissions, and AI feedback endpoints documented

---

## Verified Findings

### Finding 1: Database Wiring Disabled ✅ VERIFIED

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/deps.ts`
**Lines**: 47-49, 52-54, 105-120, 123

**Evidence**:
```typescript
// Line 47-49
// Always use in-memory repos for local development
// Database integration can be re-enabled by restoring the adapter-db imports
console.log('[deps] Using in-memory repositories with seed data (18 problems available)');

// Line 52-54
export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
export const skillRepo: SkillRepo = inMemorySkillRepo;
export const contentRepo: ContentRepo = inMemoryContentRepo;

// Line 105-120 - ALL TrackC repos are in-memory
export const contentBankRepo: ContentBankRepoPort = createInMemoryContentBankRepo();
export const submissionsRepo: SubmissionsRepoPort = createInMemorySubmissionsRepo();
export const evaluationsRepo: EvaluationsRepoPort = createInMemoryEvaluationsRepo();
export const aiCoachRepo: UnifiedAICoachRepoPort = createInMemoryAICoachRepo();
export const trackAttemptRepo: TrackAttemptRepo = createInMemoryTrackAttemptRepo();
```

**Impact**: Even if `DATABASE_URL` is set, database is NOT used. All data stored in JavaScript Maps.

---

### Finding 2: Track Attempts Are In-Memory Only ✅ VERIFIED

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/in-memory-track-repos.ts`
**Lines**: 56-75, 129-130, 734-775

**Evidence**:
```typescript
// Line 58-68: TrackAttempt interface
export interface TrackAttempt {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly track: Track;  // 'coding_interview' | 'debug_lab' | 'system_design'
  readonly contentItemId: string;  // Links to content_items (NOT problems)
  readonly versionId: string;
  readonly status: 'active' | 'completed' | 'abandoned';
  readonly startedAt: Date;
  readonly completedAt?: Date | null;
}

// Line 129-130: Global Map storage
const trackAttempts = globalThis.__trackAttemptsStore ?? new Map<string, TrackAttempt>();
globalThis.__trackAttemptsStore = trackAttempts;

// Line 734-775: In-memory implementation (no database)
export function createInMemoryTrackAttemptRepo(): TrackAttemptRepo {
  return {
    async create(params) { /* stores in Map */ },
    async findById(tenantId, id) { /* reads from Map */ },
    async findActiveByContent(...) { /* reads from Map */ },
    async update(attempt) { /* updates Map */ },
  };
}
```

**Impact**: No database table for `track_attempts`. Debug Lab and Bug Hunt attempts exist only in memory.

---

### Finding 3: Submit Endpoint Doesn't Support Track Attempts ⚠️ CRITICAL GAP

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/submit/route.ts`
**Lines**: 34-42

**Evidence**:
```typescript
// Line 34-42: ONLY checks legacy attemptRepo
const attempt = await attemptRepo.findById(tenantId, parsed.data.attemptId);
if (!attempt) {
  return NextResponse.json(
    { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
    { status: 404 }
  );
}
const problem = await contentRepo.findById(tenantId, attempt.problemId);
const problemStatement = problem?.statement ?? '';
```

**Compare with evaluate endpoint** (`evaluate/route.ts` lines 32-42):
```typescript
// Evaluate endpoint DOES check both systems
const legacyAttempt = await attemptRepo.findById(tenantId, attemptId);
const trackAttempt = await trackAttemptRepo.findById(tenantId, attemptId);

if (!legacyAttempt && !trackAttempt) {
  return NextResponse.json(
    { error: { code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' } },
    { status: 404 }
  );
}
```

**Impact**: Debug Lab and Bug Hunt attempts CANNOT use `/api/attempts/[id]/submit` endpoint.

---

### Finding 4: Evaluate Endpoint is Stub/Simulator ✅ VERIFIED

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/evaluate/route.ts`
**Lines**: 98-124, 221-281

**Evidence**:
```typescript
// Line 98-124: Comment indicates this is temporary
// In a real system, we would:
// 1. Publish a message to a queue for async processing
// 2. A worker would pick up the message and run the evaluation
// 3. The worker would update the evaluation run status

// For now, we'll simulate immediate execution for coding_tests
if (evaluationType === 'coding_tests' && submission) {
  try {
    await runCodingTestsEvaluation(evaluationRun.id, submission, attemptId, userId, track);
  } catch (evalError) { /* ... */ }
}

// Line 238-254: Stub implementation with fake results
const hasCode = submission.contentText || submission.contentJson?.code;

const testResults = [
  {
    testIndex: 0,
    passed: !!hasCode,  // NOT REAL EXECUTION
    isHidden: false,
    expected: 'expected output',  // HARDCODED
    actual: hasCode ? 'expected output' : 'no output',  // SIMULATED
    stdout: '',
    stderr: hasCode ? '' : 'No code provided',
    durationMs: 10,
    error: hasCode ? null : 'No code to execute',
  },
];
```

**Contrast with real submit endpoint**:
- `/submit` uses `submitCode` use-case which calls `codeExecutor.execute()` (Piston API)
- `/evaluate` returns fake test results without executing code

**Impact**: Evaluation results are NOT based on actual test execution.

---

### Finding 5: Socratic Coach Always Null Despite Adapter Existing ✅ VERIFIED

**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/deps.ts`
**Line**: 123

**Evidence**:
```typescript
// Line 123: Hardcoded to null implementation
export const socraticCoach: SocraticCoachPort = createNullSocraticCoach();
```

**Adapter exists** at `/home/aneesh/projects/interview-scaffold/packages/adapter-llm/src/socratic-coach-adapter.ts`:
- Lines 44-165: Full `createSocraticCoachAdapter()` implementation
- Two-pass prompting (Analyzer → Verifier)
- Evidence-based questioning
- Safety constraints (no answer revelation)

**Expected behavior**:
```typescript
export const socraticCoach: SocraticCoachPort = process.env.ANTHROPIC_API_KEY
  ? createSocraticCoachAdapter({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
    })
  : createNullSocraticCoach();
```

**Impact**: Socratic coaching features cannot use AI even when API key is set.

---

### Finding 6: Database Schema Exists (PostgreSQL, Not Supabase) ✅ VERIFIED

**File**: `/home/aneesh/projects/interview-scaffold/packages/adapter-db/src/schema.ts`

**Tables Defined**:
- **Legacy**: `tenants`, `problems`, `attempts`, `steps`, `skills` (lines 18-161)
- **Content Bank**: `content_items`, `content_versions`, `content_item_authors` (lines 295-387)
- **Evaluations**: `submissions`, `evaluation_runs`, `coding_test_results`, `rubric_scores`, `debug_diagnostics` (lines 389-521)
- **AI**: `ai_feedback`, `socratic_turns` (lines 523-579)
- **Progress**: `user_track_progress`, `user_content_progress` (lines 581-648)
- **Debug**: `debug_scenarios`, `debug_attempts`, `debug_attempt_steps`, `debug_mastery` (lines 163-293)

**Migration Files**: ❌ None found (no `migrations/` directory)

**Impact**: Schema ready, but no migrations generated. Database cannot be initialized.

---

## Priority 0: Critical Path to Database Integration

### P0-1: Wire Database Adapters in deps.ts

**Estimated Time**: 2-4 hours
**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/deps.ts`

**Change**:
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

// Replace lines 47-120 with conditional logic
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
  console.log('[deps] Using in-memory repositories with seed data');
  // ... existing in-memory exports
}
```

**Verification**:
```bash
DATABASE_URL=postgresql://localhost:5432/scaffold pnpm dev:web
# Check logs for "[deps] Using PostgreSQL database repositories"
```

**Dependencies**:
- Verify `@scaffold/adapter-db` exports these factory functions
- Database migrations must be run first (P0-2)

---

### P0-2: Generate and Run Database Migrations

**Estimated Time**: 1-2 hours

**Steps**:

1. Generate migrations:
```bash
cd packages/adapter-db
pnpm drizzle-kit generate:pg
```

2. Review generated SQL in `packages/adapter-db/drizzle/`

3. Run migrations:
```bash
pnpm drizzle-kit push:pg
# OR
pnpm drizzle-kit migrate
```

4. Verify tables:
```bash
psql $DATABASE_URL -c "\dt"
# Should show 35 tables
```

**Expected Tables**:
- Core: `tenants`, `problems`, `attempts`, `steps`, `skills`
- Content: `content_items`, `content_versions`, `content_item_authors`
- Evaluations: `submissions`, `evaluation_runs`, `coding_test_results`, `rubric_scores`, `debug_diagnostics`
- AI: `ai_feedback`, `socratic_turns`
- Progress: `user_track_progress`, `user_content_progress`
- Debug: `debug_scenarios`, `debug_attempts`, `debug_attempt_steps`, `debug_mastery`

---

### P0-3: Implement Real Evaluation Execution

**Estimated Time**: 4-6 hours
**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/evaluate/route.ts`

**Replace stub `runCodingTestsEvaluation()` (lines 221-281) with**:

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

    // 1. Get test cases from problem/content item
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

    // 3. Execute code against each test case
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

**Testing**:
```bash
# Start attempt, create submission, trigger evaluation
curl -X POST http://localhost:3000/api/attempts/{attemptId}/evaluate
# Should return real test execution results
```

---

### P0-4: Fix Submit Endpoint to Support Track Attempts

**Estimated Time**: 2 hours
**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/app/api/attempts/[attemptId]/submit/route.ts`

**Replace lines 33-42**:

```typescript
// NEW: Check both attempt systems
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

**Impact**: Enables Debug Lab and Bug Hunt to use `/submit` endpoint.

**Testing**:
```bash
# Create track attempt (Debug Lab)
curl -X POST http://localhost:3000/api/debug-lab/start -d '{"itemId": "debug-001"}'

# Submit code (should work now)
curl -X POST http://localhost:3000/api/attempts/{attemptId}/submit \
  -d '{"code": "...", "language": "javascript"}'
```

---

## Priority 1: High-Value Features

### P1-1: Enable Socratic Coach Adapter

**Estimated Time**: 30 minutes
**File**: `/home/aneesh/projects/interview-scaffold/apps/web/src/lib/deps.ts`

**Change (line 123)**:

```typescript
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
```bash
ANTHROPIC_API_KEY=sk-ant-... pnpm dev:web
# Check logs for socratic coach enabled status
```

**Impact**: Unlocks AI-powered Socratic questioning in Pattern Discovery and Adversary Challenge modes.

---

### P1-2: Create Database Migration Scripts

**Estimated Time**: 3-4 hours

**Create**:

1. **Migration runner** (`packages/adapter-db/scripts/migrate.ts`):
```typescript
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDatabaseClient } from '../src/client';

const client = getDatabaseClient(process.env.DATABASE_URL!);
await migrate(client, { migrationsFolder: './drizzle' });
console.log('Migrations complete');
```

2. **Seed script** (`apps/web/scripts/seed-database.ts`):
```typescript
import { getDatabaseClient } from '@scaffold/adapter-db';
import { seedProblems } from '@scaffold/core/data';

const client = getDatabaseClient(process.env.DATABASE_URL!);
// Insert seed data from packages/core/src/data/seed-problems.ts
// ...
```

3. **Package scripts** (`packages/adapter-db/package.json`):
```json
{
  "scripts": {
    "db:migrate": "tsx scripts/migrate.ts",
    "db:seed": "tsx ../../apps/web/scripts/seed-database.ts",
    "db:reset": "pnpm db:migrate && pnpm db:seed"
  }
}
```

**Usage**:
```bash
pnpm db:reset  # One command to setup database
```

---

### P1-3: Unified Attempt Model Migration

**Estimated Time**: 8-12 hours

**Schema Changes**:

```sql
-- Add columns to attempts table
ALTER TABLE attempts
  ADD COLUMN track TEXT DEFAULT 'coding_interview',
  ADD COLUMN content_item_id UUID REFERENCES content_items(id),
  ADD COLUMN version_id UUID REFERENCES content_versions(id);

-- Make problemId nullable
ALTER TABLE attempts
  ALTER COLUMN problem_id DROP NOT NULL;

-- Constraint: must have either problemId OR contentItemId
ALTER TABLE attempts
  ADD CONSTRAINT attempts_content_check
  CHECK (
    (problem_id IS NOT NULL AND content_item_id IS NULL) OR
    (problem_id IS NULL AND content_item_id IS NOT NULL)
  );

-- Index for track queries
CREATE INDEX attempts_track_idx ON attempts(tenant_id, user_id, track);
```

**Port Update**:
- Modify `AttemptRepo` interface to support both `problemId` and `contentItemId`
- Update all use-cases to handle both reference types

**Data Migration**:
- Backfill existing attempts with `track: 'coding_interview'`
- Migrate legacy problems to content_items table
- Update all attempts to reference content_items

---

## Priority 2: Polish and Tech Debt

### P2-1: Add Environment Variable Validation

**Estimated Time**: 1 hour
**File**: `apps/web/src/lib/env.ts` (new)

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-').optional(),
  PISTON_API_URL: z.string().url().default('https://emkc.org/api/v2/piston'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

**Usage in deps.ts**:
```typescript
import { env } from './env';

const dbClient = env.DATABASE_URL ? getDatabaseClient(env.DATABASE_URL) : null;
```

---

### P2-2: Add Database Health Check Endpoint

**Estimated Time**: 2 hours
**File**: `apps/web/src/app/api/health/route.ts` (new)

```typescript
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

**Usage**:
```bash
curl http://localhost:3000/api/health
```

---

### P2-3: Document Evaluation Flow with Sequence Diagrams

**Estimated Time**: 2-3 hours
**File**: `ARCHITECTURE.md`

**Add Mermaid diagrams for**:
- Legacy submit flow (thinking gate → coding → reflection)
- Track evaluate flow (submission → evaluation run → results)
- Socratic coaching flow (question → response → validation → follow-up)

---

## Execution Checklist

### Phase 1: Database Setup (Prerequisites)

- [ ] PostgreSQL 14+ installed and running
- [ ] Database created: `createdb scaffold`
- [ ] `DATABASE_URL` set in `apps/web/.env`
- [ ] P0-2: Generate migrations (`pnpm drizzle-kit generate:pg`)
- [ ] P0-2: Review generated SQL in `packages/adapter-db/drizzle/`
- [ ] P0-2: Run migrations (`pnpm drizzle-kit push:pg`)
- [ ] P0-2: Verify 35 tables created (`psql $DATABASE_URL -c "\dt"`)

### Phase 2: Wire Adapters

- [ ] P0-1: Add database adapter imports to `deps.ts`
- [ ] P0-1: Implement conditional repo creation (in-memory vs database)
- [ ] P0-1: Restart dev server and verify log "[deps] Using PostgreSQL database repositories"
- [ ] P0-1: Test attempt creation hits database
- [ ] P0-1: Verify no errors on startup

### Phase 3: Fix Critical Gaps

- [ ] P0-4: Update `/submit` endpoint to check both attempt systems
- [ ] P0-4: Test Debug Lab code submission works
- [ ] P0-4: Test Bug Hunt code submission works
- [ ] P0-3: Replace stub `runCodingTestsEvaluation()` with real execution
- [ ] P0-3: Test evaluation returns actual test results (not fake data)
- [ ] P0-3: Verify test failures are correctly reported

### Phase 4: Enable AI Features

- [ ] P1-1: Wire Socratic Coach adapter in `deps.ts`
- [ ] P1-1: Set `ANTHROPIC_API_KEY` in `.env`
- [ ] P1-1: Test Pattern Discovery with AI mode
- [ ] P1-1: Test Adversary Challenge Socratic mode
- [ ] P1-1: Verify Socratic turns are stored in database

### Phase 5: Tooling and Polish

- [ ] P1-2: Create migration runner script
- [ ] P1-2: Create seed data script
- [ ] P1-2: Add `db:reset` npm script
- [ ] P1-2: Test fresh database setup
- [ ] P2-1: Add environment variable validation
- [ ] P2-2: Create health check endpoint
- [ ] P2-3: Add sequence diagrams to ARCHITECTURE.md

### Phase 6: Unified Attempt Model (Optional - Future Work)

- [ ] P1-3: Design unified attempt schema changes
- [ ] P1-3: Create migration SQL for schema extension
- [ ] P1-3: Update `AttemptRepo` port interface
- [ ] P1-3: Migrate legacy problems to content_items
- [ ] P1-3: Backfill existing attempts with track field
- [ ] P1-3: Update all API endpoints to use unified model
- [ ] P1-3: Deprecate `TrackAttempt` type

---

## Rollback Plan

If database integration causes issues:

```typescript
// apps/web/src/lib/deps.ts

// Comment out database imports
// import { createDatabaseAttemptRepo, ... } from '@scaffold/adapter-db';

// Force in-memory mode
const useDatabaseRepos = false; // was: !!process.env.DATABASE_URL

// Restart server
pnpm dev:web
```

**Data will revert to in-memory seed data** (18 problems, global Maps).

---

## Success Criteria

### Phase 1-2 Success (Database Integration)
- [ ] `DATABASE_URL` set → database repos used (not in-memory)
- [ ] Attempts persist across server restarts
- [ ] No "relation does not exist" errors
- [ ] Seed data loaded into database (18 problems)

### Phase 3 Success (Real Evaluation)
- [ ] `/evaluate` endpoint executes code via Piston
- [ ] Test results show actual output vs expected
- [ ] Failures correctly identify which test failed
- [ ] Submit endpoint works for track attempts

### Phase 4 Success (AI Features)
- [ ] Socratic Coach generates questions when API key set
- [ ] Questions cite specific test failures
- [ ] Follow-up questions adapt to user responses
- [ ] AI feedback stored in `ai_feedback` table

### Overall Success
- [ ] All P0 tasks completed and tested
- [ ] Database integration working without errors
- [ ] Evaluation returns real test execution results
- [ ] Socratic coaching available when API key provided
- [ ] Documentation accurately reflects implementation

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database adapter exports missing | Medium | High | Verify `@scaffold/adapter-db` exports before P0-1 |
| Migration SQL conflicts | Low | Medium | Review generated SQL manually before running |
| Test case schema mismatch | Medium | High | Align test case types between problem/content |
| Piston API rate limits | Low | Medium | Add retry logic with exponential backoff |
| LLM API costs | Medium | Low | Cache responses by `inputHash` (already implemented) |
| Breaking changes to API | Low | High | Maintain backward compatibility with legacy endpoints |

---

## Time Estimates Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| P0 (Blocking) | 4 tasks | 9-14 hours |
| P1 (High-Value) | 3 tasks | 11.5-16.5 hours |
| P2 (Polish) | 3 tasks | 5-6 hours |
| **Total** | 10 tasks | **25.5-36.5 hours** |

**Recommended Execution Order**: P0-2 → P0-1 → P0-4 → P0-3 → P1-1 → P1-2 → P2-1 → P2-2

---

## Documentation Updates Completed

### 1. MIGRATION.md ✅
**Created**: `/home/aneesh/projects/interview-scaffold/MIGRATION.md`

**Sections**:
- Current State (in-memory mode verification)
- Database Architecture (table catalog with purposes)
- Legacy vs Unified Attempts (dual system explanation)
- Content Items vs Problems (coexistence strategy)
- Environment Variables Reference (all variables documented)
- Feature Flags and Behavior (simulator/stub details)
- Migration Roadmap (P0/P1/P2 tasks)
- Enabling Database Integration (step-by-step checklist)

### 2. ARCHITECTURE.md ✅
**Updated**: `/home/aneesh/projects/interview-scaffold/ARCHITECTURE.md`

**Added Section**: "Unified Attempt Model and Evaluation System"
- Current Dual-System Architecture
- Legacy Attempt System (multi-gate workflow)
- Track-Based Attempt System (simple status-based)
- Evaluation System Architecture (tables and flow)
- Evaluation Flow (stub vs real implementation)
- AI Evidence Gating Rules (LLM criteria)
- Unified Attempt Model Migration Strategy

### 3. API.md ✅
**Updated**: `/home/aneesh/projects/interview-scaffold/API.md`

**Added Sections**:
- Evaluation API (trigger/get evaluation endpoints)
- Submissions API (create/list submissions)
- AI Feedback API (get feedback/Socratic turns)
- Implementation Status Notes (fully/partially/not implemented)
- Evaluation Flow Example (curl commands)

**Updated**: Implementation status notes with stub behavior warnings

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Execute P0 tasks** in order (P0-2 → P0-1 → P0-4 → P0-3)
3. **Test thoroughly** after each P0 task
4. **Execute P1 tasks** based on priority and resource availability
5. **Monitor** for issues and update plan as needed

---

**Document Status**: Ready for Execution
**Code Analysis Date**: 2026-01-24
**Commit Reference**: `8d790fc`
**Verification**: All findings backed by file paths and line numbers
