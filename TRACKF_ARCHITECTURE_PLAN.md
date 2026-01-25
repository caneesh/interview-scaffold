# TrackF: Architecture Sanity & Unified Content Bank Implementation Plan

**Date**: 2026-01-24
**Author**: Staff Engineer + Architect (Claude)
**Purpose**: Validate current architecture and plan incremental migration to Unified Content Bank supporting coding_interview, debug_lab, and system_design

---

## Executive Summary

This document provides:
1. **Current State Verification** - Mapping of existing routes to core use-cases
2. **Proposed Incremental Architecture** - How to introduce content bank while preserving existing functionality
3. **Step-by-Step Implementation Plan** - P0/P1/P2 breakdown with exact files
4. **Risks & Migration Strategy** - How to avoid breaking existing endpoints

**Key Finding**: The current architecture follows clean hexagonal principles with ports/adapters. The migration can be achieved incrementally via bridge adapters without breaking changes.

---

## 1. Current State Verification

### 1.1 Existing API Routes → Core Use-Cases Mapping

#### Coding Interview Track (`/api/attempts/*`)

| Route | Method | Core Use-Case | Deps |
|-------|--------|---------------|------|
| `/api/attempts/start` | POST | `startAttempt` | attemptRepo, contentRepo, skillRepo |
| `/api/attempts/[id]` | GET | Direct repo access | attemptRepo, contentRepo |
| `/api/attempts/[id]/submit` | POST | `submitCode` | attemptRepo, contentRepo, skillRepo, codeExecutor, llmValidation |
| `/api/attempts/[id]/step` | POST | `submitStep` | attemptRepo, contentRepo, skillRepo |
| `/api/attempts/[id]/hint` | POST | Direct access | attemptRepo, contentRepo |
| `/api/attempts/[id]/pattern-discovery/start` | POST | `startPatternDiscovery` | attemptRepo, llmValidation |
| `/api/attempts/[id]/pattern-discovery/answer` | POST | `submitPatternDiscoveryAnswer` | attemptRepo, llmValidation |
| `/api/attempts/[id]/pattern-challenge/check` | POST | `checkPatternChallenge` | attemptRepo, contentRepo, llmValidation |
| `/api/attempts/[id]/trace` | POST | Direct piston execution | pistonClient |
| `/api/attempts/[id]/adversary` | POST | Direct access | attemptRepo, contentRepo, llmValidation |

#### Problem Selection

| Route | Method | Core Use-Case | Deps |
|-------|--------|---------------|------|
| `/api/problems/next` | GET | `getNextProblem` | contentRepo, skillRepo, attemptRepo |
| `/api/problems/list` | GET | Direct repo access | contentRepo |

#### Skills

| Route | Method | Core Use-Case | Deps |
|-------|--------|---------------|------|
| `/api/skills` | GET | `getSkillMatrix` | skillRepo |

#### Bug Hunt Mode (`/api/bug-hunt/*`)

| Route | Method | Implementation | Storage |
|-------|--------|----------------|---------|
| `/api/bug-hunt/items` | GET | Direct repo access | In-memory (seed data) |
| `/api/bug-hunt/items/[id]` | GET | Direct repo access | In-memory (seed data) |
| `/api/bug-hunt/attempts` | POST | Direct repo access | In-memory |
| `/api/bug-hunt/attempts/[id]/submit` | POST | Entity validation logic | In-memory |

**Note**: Bug Hunt uses entity-level validation (`validateBugHuntSubmission` in `/packages/core/src/entities/bug-hunt.ts`) rather than use-cases.

#### Debug Lab Mode (`/api/debug-lab/*`)

| Route | Method | Implementation | Storage |
|-------|--------|----------------|---------|
| `/api/debug-lab/items` | GET | Direct repo access | `/apps/web/src/lib/debug-lab-repo.ts` (in-memory) |
| `/api/debug-lab/next` | GET | Repo logic | In-memory |
| `/api/debug-lab/start` | POST | Direct entity creation | In-memory |
| `/api/debug-lab/[id]/triage` | POST | Entity validation | In-memory |
| `/api/debug-lab/[id]/run-tests` | POST | Code execution | In-memory |
| `/api/debug-lab/[id]/submit` | POST | Entity validation + execution | In-memory |

**Note**: Debug Lab has entities (`DebugLabItem`, `DebugLabAttempt`) and port interface (`DebugLabRepo`) but no use-cases. Business logic is in entity helper functions and route handlers.

#### Coaching Sessions (`/api/coaching/*`)

| Route | Method | Implementation | Deps |
|-------|--------|----------------|------|
| `/api/coaching/sessions` | POST | `startCoachingSession` | Use-case or direct |
| `/api/coaching/sessions/[id]/framing` | POST | LLM-based coaching | llmClient |
| `/api/coaching/sessions/[id]/pattern` | POST | LLM-based coaching | llmClient |
| `/api/coaching/sessions/[id]/feynman` | POST | LLM-based coaching | llmClient |
| `/api/coaching/sessions/[id]/strategy` | POST | LLM-based coaching | llmClient |
| `/api/coaching/sessions/[id]/help` | POST | LLM-based coaching | llmClient |

**Finding**: Coaching routes exist in API but implementation details not visible in examined code paths.

### 1.2 Core Domain Entities

#### Coding Interview Track
- **Problem** - `/packages/core/src/entities/problem.ts`
- **Attempt** - `/packages/core/src/entities/attempt.ts`
- **Step** - `/packages/core/src/entities/step.ts`
- **SkillState** - `/packages/core/src/entities/skill-state.ts`

#### Debug Lab
- **DebugLabItem** - `/packages/core/src/entities/debug-lab.ts`
- **DebugLabAttempt** - `/packages/core/src/entities/debug-lab.ts`

#### Bug Hunt
- **BugHuntItem** - `/packages/core/src/entities/bug-hunt.ts`
- **BugHuntAttempt** - `/packages/core/src/entities/bug-hunt.ts`

### 1.3 Repository Ports

| Port | Location | Current Implementations |
|------|----------|------------------------|
| `ContentRepo` | `/packages/core/src/ports/content-repo.ts` | Drizzle (`adapter-db`), In-Memory (`apps/web/src/lib/in-memory-repos.ts`) |
| `AttemptRepo` | `/packages/core/src/ports/attempt-repo.ts` | Drizzle, In-Memory |
| `SkillRepo` | `/packages/core/src/ports/skill-repo.ts` | Drizzle, In-Memory |
| `DebugLabRepo` | `/packages/core/src/ports/debug-lab-repo.ts` | In-Memory only (`apps/web/src/lib/debug-lab-repo.ts`) |
| `BugHuntRepo` | `/packages/core/src/ports/bug-hunt-repo.ts` | In-Memory only (inferred) |

### 1.4 Database Schema (Drizzle)

**Location**: `/packages/adapter-db/src/schema.ts`

**Existing Tables**:
- `tenants` - Multi-tenancy root
- `problems` - Coding interview problems (pattern/rung indexed)
- `attempts` - User attempts on problems
- `steps` - Attempt steps (thinking gate, coding, reflection)
- `skills` - User skill mastery per pattern/rung
- `debugScenarios` - Debug scenarios (global or per-tenant)
- `debugAttempts` - User debug attempts
- `debugAttemptSteps` - Debug gate submissions
- `debugMastery` - Debug skill mastery

**Observations**:
1. **Separate domain tables**: `problems` vs `debugScenarios` vs (implicit) bug hunt items
2. **No unified content model**: Each practice mode has its own content table
3. **No versioning**: Changes to problems require migrations
4. **No metadata tracking**: Creation date only, no tags/categories beyond domain-specific fields

### 1.5 Dependency Injection

**Location**: `/apps/web/src/lib/deps.ts`

**Current Setup**:
```typescript
// Always uses in-memory repos (database integration commented out)
export const attemptRepo: AttemptRepo = inMemoryAttemptRepo;
export const skillRepo: SkillRepo = inMemorySkillRepo;
export const contentRepo: ContentRepo = inMemoryContentRepo;
```

**Finding**: Database integration exists in `packages/adapter-db` but is not wired in. This is intentional for local dev.

---

## 2. Proposed Incremental Architecture

### 2.1 Design Goals

1. **Non-Breaking**: Existing endpoints continue to work without modification
2. **Incremental**: Introduce content bank alongside existing tables
3. **Bridge Pattern**: Adapters that can serve from either old or new storage
4. **Minimal Disruption**: No changes to core use-cases initially
5. **Future-Ready**: Enable system_design mode without major refactoring

### 2.2 Unified Content Bank Schema

#### New Drizzle Tables

##### `content_items`
Polymorphic content root supporting all practice modes.

```typescript
// packages/adapter-db/src/schema.ts (new section)

export const CONTENT_TYPES = ['coding_problem', 'debug_scenario', 'bug_hunt', 'system_design_case'] as const;
export type ContentType = typeof CONTENT_TYPES[number];

export const contentItems = pgTable('content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),

  // Polymorphic type
  contentType: text('content_type').notNull(), // ContentType

  // Common metadata
  title: text('title').notNull(),
  description: text('description'),
  difficulty: text('difficulty').notNull(), // 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
  language: text('language'), // 'javascript' | 'typescript' | 'python' | null

  // Taxonomy
  tags: jsonb('tags').$type<string[]>().default([]),
  primaryCategory: text('primary_category'), // e.g., 'SLIDING_WINDOW', 'Concurrency', etc.
  secondaryCategories: jsonb('secondary_categories').$type<string[]>(),

  // Lifecycle
  status: text('status').notNull().default('DRAFT'), // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: timestamp('published_at'),
  archivedAt: timestamp('archived_at'),

  // Authorship
  createdBy: text('created_by'),
  lastModifiedBy: text('last_modified_by'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('content_items_type_idx').on(table.contentType),
  tenantTypeIdx: index('content_items_tenant_type_idx').on(table.tenantId, table.contentType),
  statusIdx: index('content_items_status_idx').on(table.status),
  categoryIdx: index('content_items_category_idx').on(table.primaryCategory),
}));
```

##### `content_versions`
Versioned content payloads with full history.

```typescript
export const contentVersions = pgTable('content_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contentItemId: uuid('content_item_id').notNull().references(() => contentItems.id, { onDelete: 'cascade' }),

  // Version tracking
  version: integer('version').notNull(), // 1, 2, 3, ...
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),

  // Polymorphic payload (JSONB stores type-specific data)
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),

  // Schema version for migrations
  schemaVersion: text('schema_version').notNull(), // '1.0', '2.0', etc.

  // Change metadata
  changeNote: text('change_note'),
  createdBy: text('created_by'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  contentVersionIdx: index('content_versions_item_version_idx').on(table.contentItemId, table.version),
  publishedIdx: index('content_versions_published_idx').on(table.contentItemId, table.isPublished),
  uniqueVersion: unique('content_versions_unique').on(table.contentItemId, table.version),
}));
```

##### `submissions`
Unified submission tracking across all content types.

```typescript
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull(),

  // Link to content
  contentItemId: uuid('content_item_id').notNull().references(() => contentItems.id),
  contentVersionId: uuid('content_version_id').references(() => contentVersions.id),

  // Submission data
  submissionType: text('submission_type').notNull(), // 'code' | 'triage' | 'bug_identification' | 'design_doc'
  payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),

  // Status
  status: text('status').notNull(), // 'PENDING' | 'EVALUATING' | 'COMPLETED' | 'FAILED'

  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdx: index('submissions_user_idx').on(table.tenantId, table.userId),
  contentIdx: index('submissions_content_idx').on(table.contentItemId),
  statusIdx: index('submissions_status_idx').on(table.status),
}));
```

##### `evaluation_runs`
Deterministic and LLM evaluation results.

```typescript
export const evaluationRuns = pgTable('evaluation_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),

  // Evaluation type
  evaluatorType: text('evaluator_type').notNull(), // 'deterministic' | 'llm' | 'hybrid'

  // Results
  passed: boolean('passed').notNull(),
  score: real('score'), // 0.0 - 1.0
  feedback: text('feedback'),

  // Detailed rubric (JSON)
  rubric: jsonb('rubric').$type<Record<string, number>>(),

  // Execution metadata
  executionTimeMs: integer('execution_time_ms'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  submissionIdx: index('evaluation_runs_submission_idx').on(table.submissionId),
}));
```

##### `ai_feedback`
LLM-generated feedback separate from deterministic evaluation.

```typescript
export const aiFeedback = pgTable('ai_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  submissionId: uuid('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),

  // LLM metadata
  modelName: text('model_name').notNull(), // 'claude-sonnet-4-5', etc.
  promptVersion: text('prompt_version').notNull(), // 'v1.2', etc.

  // Feedback
  feedbackText: text('feedback_text').notNull(),
  confidence: real('confidence'), // 0.0 - 1.0
  suggestedMicroLesson: text('suggested_micro_lesson'),

  // Cost tracking
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  submissionIdx: index('ai_feedback_submission_idx').on(table.submissionId),
}));
```

##### `socratic_turns`
Multi-turn dialogues for pattern discovery, coaching, etc.

```typescript
export const socraticTurns = pgTable('socratic_turns', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull(), // Links to coaching session or discovery step

  // Turn data
  turnNumber: integer('turn_number').notNull(),
  role: text('role').notNull(), // 'system' | 'assistant' | 'user'
  content: text('content').notNull(),

  // Optional metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index('socratic_turns_session_idx').on(table.sessionId),
}));
```

##### `user_progress`
Aggregated progress tracking across all content types.

```typescript
export const userProgress = pgTable('user_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull(),

  // Content reference
  contentItemId: uuid('content_item_id').notNull().references(() => contentItems.id),

  // Aggregated metrics
  attemptsCount: integer('attempts_count').notNull().default(0),
  successfulAttemptsCount: integer('successful_attempts_count').notNull().default(0),
  bestScore: real('best_score'), // 0.0 - 1.0
  averageScore: real('average_score'),

  // Lifecycle
  firstAttemptAt: timestamp('first_attempt_at'),
  lastAttemptAt: timestamp('last_attempt_at'),
  completedAt: timestamp('completed_at'), // First successful completion

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userContentIdx: index('user_progress_user_content_idx').on(table.tenantId, table.userId, table.contentItemId),
  uniqueUserContent: unique('user_progress_unique').on(table.tenantId, table.userId, table.contentItemId),
}));
```

### 2.3 Bridge Adapter Strategy

#### ContentBankRepo Port (New)

**Location**: `/packages/core/src/ports/content-bank-repo.ts`

```typescript
import type { TenantId } from '../entities/tenant.js';

export type ContentType = 'coding_problem' | 'debug_scenario' | 'bug_hunt' | 'system_design_case';

export interface ContentBankItem {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly contentType: ContentType;
  readonly title: string;
  readonly description?: string;
  readonly difficulty: string;
  readonly language?: string;
  readonly tags: readonly string[];
  readonly primaryCategory?: string;
  readonly secondaryCategories: readonly string[];
  readonly status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  readonly publishedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ContentVersion<TPayload = Record<string, unknown>> {
  readonly id: string;
  readonly contentItemId: string;
  readonly version: number;
  readonly isPublished: boolean;
  readonly publishedAt?: Date;
  readonly payload: TPayload;
  readonly schemaVersion: string;
  readonly changeNote?: string;
  readonly createdAt: Date;
}

export interface ContentBankRepo {
  /**
   * Find content item by ID
   */
  findById(tenantId: TenantId, id: string): Promise<ContentBankItem | null>;

  /**
   * Get published version for a content item
   */
  getPublishedVersion<TPayload = Record<string, unknown>>(
    contentItemId: string
  ): Promise<ContentVersion<TPayload> | null>;

  /**
   * List content items by type
   */
  listByType(
    tenantId: TenantId,
    contentType: ContentType,
    options?: {
      difficulty?: string;
      primaryCategory?: string;
      tags?: readonly string[];
      status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      limit?: number;
      offset?: number;
    }
  ): Promise<readonly ContentBankItem[]>;

  /**
   * Create new content item with initial version
   */
  create<TPayload = Record<string, unknown>>(
    item: Omit<ContentBankItem, 'id' | 'createdAt' | 'updatedAt'>,
    payload: TPayload,
    schemaVersion: string
  ): Promise<{ item: ContentBankItem; version: ContentVersion<TPayload> }>;

  /**
   * Publish a new version
   */
  publishVersion<TPayload = Record<string, unknown>>(
    contentItemId: string,
    payload: TPayload,
    changeNote?: string
  ): Promise<ContentVersion<TPayload>>;
}
```

#### Bridge Adapter: ContentRepoWithFallback

**Location**: `/packages/adapter-db/src/repositories/content-repo-bridge.ts`

This adapter implements the existing `ContentRepo` port but can serve from either `problems` table OR `content_items`/`content_versions`.

```typescript
import { eq, and } from 'drizzle-orm';
import type { ContentRepo } from '@scaffold/core/ports';
import type { Problem, ProblemId, PatternId, RungLevel, TenantId } from '@scaffold/core/entities';
import type { DbClient } from '../client.js';
import { problems, contentItems, contentVersions } from '../schema.js';

export function createContentRepoWithFallback(db: DbClient): ContentRepo {
  return {
    async findById(tenantId: TenantId, id: ProblemId): Promise<Problem | null> {
      // Strategy: Try content bank first, fallback to legacy problems table

      // 1. Check content_items
      const contentItem = await db.query.contentItems.findFirst({
        where: and(
          eq(contentItems.tenantId, tenantId),
          eq(contentItems.id, id),
          eq(contentItems.contentType, 'coding_problem')
        ),
        with: {
          publishedVersion: {
            where: eq(contentVersions.isPublished, true),
          },
        },
      });

      if (contentItem?.publishedVersion) {
        // Convert content bank item to Problem entity
        return mapContentBankToProblem(contentItem, contentItem.publishedVersion);
      }

      // 2. Fallback to legacy problems table
      const legacyProblem = await db.query.problems.findFirst({
        where: and(eq(problems.tenantId, tenantId), eq(problems.id, id)),
      });

      return legacyProblem ? mapLegacyProblem(legacyProblem) : null;
    },

    async findByPatternAndRung(
      tenantId: TenantId,
      pattern: PatternId,
      rung: RungLevel
    ): Promise<readonly Problem[]> {
      // Similar dual-source strategy
      const contentBankResults = await fetchFromContentBank(tenantId, pattern, rung);
      const legacyResults = await fetchFromLegacyTable(tenantId, pattern, rung);

      // Merge and deduplicate by ID
      return mergeResults(contentBankResults, legacyResults);
    },

    // ... other methods follow same pattern
  };
}

function mapContentBankToProblem(
  item: ContentBankItem,
  version: ContentVersion<ProblemPayload>
): Problem {
  const payload = version.payload;
  return {
    id: item.id,
    tenantId: item.tenantId,
    title: item.title,
    statement: payload.statement,
    pattern: item.primaryCategory as PatternId,
    rung: parseInt(item.difficulty.replace('RUNG_', '')) as RungLevel, // Example mapping
    targetComplexity: payload.targetComplexity,
    testCases: payload.testCases ?? [],
    hints: payload.hints ?? [],
    adversaryPrompts: payload.adversaryPrompts,
    timeoutBudgetMs: payload.timeoutBudgetMs,
    largeHiddenTests: payload.largeHiddenTests,
    createdAt: item.createdAt,
  };
}
```

**Key Insight**: This bridge allows incremental migration:
1. Old problems continue to work
2. New problems can be added to content bank
3. Gradual migration of existing problems via ETL scripts
4. Zero downtime, zero API changes

### 2.4 System Design Content Model

With the content bank in place, system design cases become first-class content:

```typescript
// Example content_items row for system design
{
  id: 'sd-001',
  tenantId: 'demo',
  contentType: 'system_design_case',
  title: 'Design a URL Shortener',
  difficulty: 'MEDIUM',
  language: null,
  tags: ['distributed-systems', 'caching', 'databases'],
  primaryCategory: 'URL_SHORTENING',
  secondaryCategories: ['LOAD_BALANCING', 'CACHING'],
  status: 'PUBLISHED',
}

// Corresponding content_versions payload
{
  contentItemId: 'sd-001',
  version: 1,
  isPublished: true,
  payload: {
    schemaVersion: '1.0',
    scenario: 'Design a URL shortening service like bit.ly...',
    functionalRequirements: [
      'Generate short aliases for long URLs',
      'Redirect users to original URL',
      'Support custom aliases',
    ],
    nonFunctionalRequirements: {
      scale: '100M URLs, 10K writes/sec, 100K reads/sec',
      availability: '99.99%',
      latency: 'p99 < 200ms',
    },
    evaluationCriteria: [
      'Scalability justification',
      'Database choice rationale',
      'Handling collision strategy',
      'Cache strategy',
    ],
    microLessons: [
      'hash-collision-strategies',
      'base62-encoding',
      'cache-aside-pattern',
    ],
  },
  schemaVersion: '1.0',
}
```

---

## 3. Step-by-Step Implementation Plan

### Phase 0: Foundation (P0 - Critical Path)

These changes establish the content bank without breaking existing functionality.

#### P0.1: Add Content Bank Schema
**Files to Create/Modify**:
- `/packages/adapter-db/src/schema.ts` (modify - add new tables)
- `/packages/adapter-db/drizzle.config.ts` (verify migration setup)

**Actions**:
1. Add `contentItems`, `contentVersions`, `submissions`, `evaluationRuns`, `aiFeedback`, `socraticTurns`, `userProgress` table definitions to schema
2. Generate migration: `cd packages/adapter-db && pnpm drizzle-kit generate:pg`
3. Review generated migration in `/packages/adapter-db/drizzle/` directory
4. Apply migration: `pnpm drizzle-kit push:pg` (or migration runner)

**Testing**:
- Verify tables created in PostgreSQL
- Check indexes exist
- Ensure foreign key constraints are correct

**Risk**: Migration could fail on existing installations. **Mitigation**: Make all new tables independent (no FKs to existing tables initially).

#### P0.2: Create ContentBankRepo Port
**Files to Create**:
- `/packages/core/src/ports/content-bank-repo.ts` (new)
- `/packages/core/src/ports/index.ts` (modify - export new port)

**Actions**:
1. Define `ContentBankRepo` interface (see section 2.3)
2. Define `ContentBankItem` and `ContentVersion` types
3. Export from ports index

**Testing**:
- TypeScript compilation check
- No runtime changes (interface only)

#### P0.3: Implement Drizzle ContentBankRepo Adapter
**Files to Create**:
- `/packages/adapter-db/src/repositories/content-bank-repo.ts` (new)
- `/packages/adapter-db/src/repositories/index.ts` (modify - export)
- `/packages/adapter-db/src/index.ts` (modify - export)

**Actions**:
1. Implement `ContentBankRepo` against new Drizzle tables
2. Write CRUD operations for `contentItems` and `contentVersions`
3. Implement versioning logic (auto-increment version numbers)

**Testing**:
- Unit tests for repo (use in-memory Drizzle instance)
- Integration tests against real Postgres (optional)

#### P0.4: Create Bridge Adapter for ContentRepo
**Files to Create**:
- `/packages/adapter-db/src/repositories/content-repo-bridge.ts` (new)

**Actions**:
1. Implement `createContentRepoWithFallback` (see section 2.3)
2. Dual-source strategy: content bank → legacy table
3. Add mapping functions: `mapContentBankToProblem`, `mapLegacyProblem`

**Testing**:
- Test with only legacy problems (should work as before)
- Test with content bank problems (should convert correctly)
- Test with mix of both (should merge without duplicates)

**Risk**: Complex logic may introduce bugs. **Mitigation**: Extensive tests, gradual rollout flag.

#### P0.5: Add Feature Flag for Content Bank
**Files to Modify**:
- `/apps/web/src/lib/deps.ts` (modify)
- `/apps/web/.env.local` (add env var)

**Actions**:
1. Add `USE_CONTENT_BANK=false` env var (default off)
2. Conditionally wire bridge adapter:
```typescript
export const contentRepo: ContentRepo = process.env.USE_CONTENT_BANK === 'true'
  ? createContentRepoWithFallback(dbClient)
  : inMemoryContentRepo; // Or legacy Drizzle repo
```

**Testing**:
- Verify flag toggles between implementations
- E2E test with flag=true, flag=false

---

### Phase 1: Data Migration & Bug Hunt/Debug Lab Integration (P1 - High Priority)

#### P1.1: ETL Script - Migrate Existing Problems to Content Bank
**Files to Create**:
- `/scripts/migrate-problems-to-content-bank.ts` (new)
- `/scripts/package.json` (add dependencies if needed)

**Actions**:
1. Script reads from `problems` table
2. Creates `content_items` row (contentType='coding_problem')
3. Creates `content_versions` row with payload = problem data
4. Marks version as published
5. Logs migration results
6. **Does not delete from `problems` table** (keep for rollback)

**Testing**:
- Dry-run mode
- Verify problem data integrity before/after
- Check IDs match (or establish mapping)

**Risk**: Data loss if script has bugs. **Mitigation**: Dry-run, database backup, rollback plan.

#### P1.2: Migrate Debug Lab to Content Bank
**Files to Create/Modify**:
- `/packages/core/src/entities/debug-lab.ts` (add payload type)
- `/scripts/migrate-debug-lab-to-content-bank.ts` (new)

**Actions**:
1. Define `DebugLabPayload` type matching `DebugLabItem` structure
2. ETL script to migrate seed data from `/apps/web/src/lib/debug-lab-repo.ts` to content bank
3. Create content_items with contentType='debug_scenario'
4. Test dual-source serving (in-memory seed + content bank)

**Testing**:
- Verify all 14 seed scenarios migrated
- Check defect categories, signals, tools metadata preserved

#### P1.3: Migrate Bug Hunt to Content Bank
**Files to Create/Modify**:
- `/packages/core/src/entities/bug-hunt.ts` (add payload type)
- `/scripts/migrate-bug-hunt-to-content-bank.ts` (new)

**Actions**:
1. Define `BugHuntPayload` type
2. Migrate seed bug hunt items to content bank
3. Update API routes to use content bank (optional - can keep in-memory for now)

**Testing**:
- Verify bug hunt items render correctly
- Check validation logic still works

#### P1.4: Unified Submission Tracking
**Files to Create**:
- `/packages/core/src/use-cases/submit-unified.ts` (new use-case)
- `/packages/core/src/ports/submission-repo.ts` (new port)
- `/packages/adapter-db/src/repositories/submission-repo.ts` (new)

**Actions**:
1. Create `SubmissionRepo` port with methods: `create`, `update`, `findById`, `listByUser`
2. Implement Drizzle adapter for `submissions`, `evaluation_runs`, `ai_feedback` tables
3. Create `submitUnified` use-case that works for any content type
4. Gradually refactor `submitCode`, debug lab submit, bug hunt submit to use unified flow

**Testing**:
- Parallel run: old path vs new path (compare results)
- Gradual rollout per content type

---

### Phase 2: System Design Support (P2 - Future)

#### P2.1: System Design Content Model
**Files to Create**:
- `/packages/core/src/entities/system-design.ts` (new)
- `/packages/contracts/src/schemas.ts` (add system design schemas)

**Actions**:
1. Define `SystemDesignCase` entity
2. Define `SystemDesignSubmission` entity
3. Define Zod schemas for API contracts
4. Define evaluation criteria structure

**Testing**:
- Type checking
- Schema validation

#### P2.2: System Design Evaluation Engine
**Files to Create**:
- `/packages/core/src/use-cases/evaluate-system-design.ts` (new)
- `/packages/core/src/validation/system-design-rubric.ts` (new)

**Actions**:
1. Implement rubric-based evaluation (e.g., check for CAP theorem mention, scaling strategy)
2. Optional LLM-based evaluation for open-ended aspects
3. Micro-lesson mapping for common gaps (e.g., "forgot to discuss consistency model")

**Testing**:
- Test with sample system design submissions
- Verify rubric scoring

#### P2.3: System Design API Routes
**Files to Create**:
- `/apps/web/src/app/api/system-design/start/route.ts` (new)
- `/apps/web/src/app/api/system-design/[attemptId]/submit/route.ts` (new)

**Actions**:
1. Create REST endpoints for system design practice
2. Wire to unified submission flow
3. Return evaluation results

**Testing**:
- E2E test: start → submit → evaluate → get feedback

#### P2.4: System Design UI Components
**Files to Create**:
- `/apps/web/src/components/SystemDesignCanvas.tsx` (new)
- `/apps/web/src/app/system-design/page.tsx` (new)

**Actions**:
1. Build diagram editor (or text-based design doc)
2. Submission form
3. Feedback display

**Testing**:
- Manual UI testing
- Accessibility checks

---

## 4. Risks & Migration Strategy

### 4.1 Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Data Migration Failure** | High | Dry-run scripts, database backups, rollback plan, keep old tables |
| **Performance Degradation** | Medium | Bridge adapter adds query overhead; add caching, monitor query times |
| **Breaking API Changes** | High | Bridge adapter prevents this; no API changes in P0/P1 |
| **Feature Flag Complexity** | Low | Simple boolean flag; clear documentation |
| **Schema Evolution** | Medium | Version field in content_versions; support multiple schemaVersions |
| **Dual Writes** | Low | Content bank is read-mostly for now; writes happen via ETL scripts |

### 4.2 Rollback Plan

#### If Content Bank Fails After Deployment:

1. **Immediate**: Set `USE_CONTENT_BANK=false` (reverts to legacy repos)
2. **Verify**: All existing endpoints work as before
3. **Investigate**: Check logs for errors in bridge adapter
4. **Fix Forward**: Patch bridge adapter, redeploy with flag=true
5. **Nuclear Option**: Drop new tables (if migration script failed), revert schema

#### Database Rollback:

1. Keep migration history in `drizzle/` directory
2. Use Drizzle's down migrations (if available) or manual rollback SQL
3. Test rollback in staging environment first

### 4.3 Gradual Rollout Strategy

#### Week 1: Internal Testing
- Deploy to staging with `USE_CONTENT_BANK=true`
- Run E2E tests
- Manual QA on all practice modes
- Performance benchmarks

#### Week 2: Canary Release
- Deploy to 10% of production traffic
- Monitor error rates, latency, user complaints
- Compare metrics: old repo vs bridge adapter
- Rollback if error rate > 1%

#### Week 3: Full Rollout
- Increase to 50%, then 100%
- Declare legacy `problems` table deprecated (but keep for rollback)
- Plan migration of debug/bug hunt to content bank (P1)

#### Week 4-8: Migration Completion
- Migrate all coding problems to content bank (ETL script)
- Migrate debug lab scenarios
- Migrate bug hunt items
- Archive legacy tables (do not drop yet)

#### Month 3+: System Design Launch
- Content bank fully operational
- Add first system design cases
- Launch system_design practice mode
- Iterate based on user feedback

---

## 5. Exact Files to Create/Modify

### P0: Foundation (Critical Path)

#### Create (New Files)
1. `/packages/core/src/ports/content-bank-repo.ts`
2. `/packages/adapter-db/src/repositories/content-bank-repo.ts`
3. `/packages/adapter-db/src/repositories/content-repo-bridge.ts`

#### Modify (Existing Files)
1. `/packages/adapter-db/src/schema.ts` - Add 7 new tables
2. `/packages/core/src/ports/index.ts` - Export `ContentBankRepo`
3. `/packages/adapter-db/src/repositories/index.ts` - Export new repos
4. `/packages/adapter-db/src/index.ts` - Export from repositories
5. `/apps/web/src/lib/deps.ts` - Add feature flag conditional wiring
6. `/apps/web/.env.local` - Add `USE_CONTENT_BANK=false`

#### Generate (Automated)
1. `/packages/adapter-db/drizzle/YYYY-MM-DD-add-content-bank-tables.sql` - Migration script (generated by drizzle-kit)

**Total**: 3 new files, 6 modified files, 1 generated migration

---

### P1: Data Migration & Integration

#### Create (New Files)
1. `/scripts/migrate-problems-to-content-bank.ts`
2. `/scripts/migrate-debug-lab-to-content-bank.ts`
3. `/scripts/migrate-bug-hunt-to-content-bank.ts`
4. `/packages/core/src/use-cases/submit-unified.ts`
5. `/packages/core/src/ports/submission-repo.ts`
6. `/packages/adapter-db/src/repositories/submission-repo.ts`

#### Modify (Existing Files)
1. `/packages/core/src/entities/debug-lab.ts` - Add payload type
2. `/packages/core/src/entities/bug-hunt.ts` - Add payload type
3. `/packages/core/src/ports/index.ts` - Export `SubmissionRepo`
4. `/packages/adapter-db/src/repositories/index.ts` - Export submission repo

**Total**: 6 new files, 4 modified files

---

### P2: System Design Support

#### Create (New Files)
1. `/packages/core/src/entities/system-design.ts`
2. `/packages/core/src/use-cases/evaluate-system-design.ts`
3. `/packages/core/src/validation/system-design-rubric.ts`
4. `/apps/web/src/app/api/system-design/start/route.ts`
5. `/apps/web/src/app/api/system-design/[attemptId]/submit/route.ts`
6. `/apps/web/src/components/SystemDesignCanvas.tsx`
7. `/apps/web/src/app/system-design/page.tsx`

#### Modify (Existing Files)
1. `/packages/contracts/src/schemas.ts` - Add system design schemas
2. `/packages/core/src/entities/index.ts` - Export system design entity
3. `/packages/core/src/use-cases/index.ts` - Export evaluate-system-design

**Total**: 7 new files, 3 modified files

---

## 6. Dependency Graph

```
P0.1 (Schema)
  ↓
P0.2 (Port) → P0.3 (Drizzle Adapter)
                ↓
              P0.4 (Bridge Adapter)
                ↓
              P0.5 (Feature Flag)
                ↓
              P1.1 (ETL Problems)
                ↓
          ┌─────┴─────┐
          ↓           ↓
    P1.2 (Debug)  P1.3 (Bug Hunt)
          ↓           ↓
          └─────┬─────┘
                ↓
          P1.4 (Unified Submission)
                ↓
          P2.1 (System Design Entities)
                ↓
          P2.2 (Evaluation Engine)
                ↓
          P2.3 (API Routes)
                ↓
          P2.4 (UI Components)
```

**Critical Path**: P0.1 → P0.2 → P0.3 → P0.4 → P0.5 (must be sequential)

**Parallel Work After P0.5**:
- P1.1 (ETL) can run independently
- P1.2 and P1.3 can happen in parallel
- P1.4 depends on P1.2 and P1.3 completion

---

## 7. Testing Strategy

### Unit Tests
- All new ports: Mock implementations
- All new use-cases: Dependency injection with mocks
- Entity helpers: Pure function tests

### Integration Tests
- ContentBankRepo against real Postgres (test DB)
- Bridge adapter with dual data sources
- ETL scripts against test data

### E2E Tests
- Complete user flow: start attempt → submit code → get feedback
- Test with `USE_CONTENT_BANK=true` and `false`
- Regression suite: All existing tests must pass

### Performance Tests
- Query latency before/after bridge adapter
- Load test: 100 concurrent submissions
- Acceptable: < 10% performance degradation

---

## 8. Success Metrics

### P0 Success Criteria
- [ ] All existing API routes return same responses
- [ ] Feature flag toggle works without errors
- [ ] Database migrations apply cleanly
- [ ] Zero breaking changes to frontend

### P1 Success Criteria
- [ ] All coding problems migrated to content bank
- [ ] Debug lab scenarios accessible from content bank
- [ ] Bug hunt items accessible from content bank
- [ ] Unified submission flow handles all content types

### P2 Success Criteria
- [ ] First system design case published
- [ ] Evaluation rubric returns scores
- [ ] UI allows diagram/doc submission
- [ ] User feedback collected and analyzed

---

## 9. Open Questions & Decisions Needed

### Architecture Decisions

**AD-1**: Should we maintain dual writes (legacy table + content bank) or only write to content bank after migration?
- **Recommendation**: Write to content bank only; read from bridge adapter (dual-source). Simpler, no sync issues.

**AD-2**: How to handle version conflicts if a problem is updated in both places?
- **Recommendation**: After ETL, mark legacy table as read-only in application code. Use DB-level triggers to prevent writes (optional).

**AD-3**: Should system design submissions support real-time collaboration?
- **Defer to P2**: Start with single-user submissions, add collaboration in future phase.

**AD-4**: How to handle schema evolution in `content_versions.payload`?
- **Recommendation**: Add `schemaVersion` field, write migration logic for old versions, support multiple versions in read path.

### Product Decisions

**PD-1**: What difficulty levels for system design? Reuse EASY/MEDIUM/HARD or create new scale?
- **Recommendation**: Reuse existing scale but allow customization per content type (stored in metadata).

**PD-2**: Should debug lab support in-browser debugging tools or require local setup?
- **Defer**: Start with test execution only, add browser debugger integration in future.

**PD-3**: What feedback format for system design? Rubric scores only or detailed LLM feedback?
- **Recommendation**: Both. Rubric for deterministic checks (scalability, availability), LLM for open-ended quality.

---

## 10. Timeline Estimate

### P0: Foundation
- **P0.1** Schema + Migration: 1 day
- **P0.2** Port Definition: 0.5 day
- **P0.3** Drizzle Adapter: 2 days
- **P0.4** Bridge Adapter: 3 days
- **P0.5** Feature Flag: 0.5 day
- **Testing & QA**: 2 days
- **Total**: ~9 days (2 weeks with buffer)

### P1: Migration & Integration
- **P1.1** ETL Problems: 2 days
- **P1.2** Debug Lab Migration: 1 day
- **P1.3** Bug Hunt Migration: 1 day
- **P1.4** Unified Submission: 3 days
- **Testing & QA**: 2 days
- **Total**: ~9 days (2 weeks with buffer)

### P2: System Design
- **P2.1** Entities: 1 day
- **P2.2** Evaluation: 3 days
- **P2.3** API Routes: 2 days
- **P2.4** UI Components: 3 days
- **Testing & QA**: 2 days
- **Total**: ~11 days (2.5 weeks with buffer)

**Grand Total**: 6.5 weeks (P0 + P1 + P2)

**Recommendation**: Execute P0 immediately, P1 in parallel with frontend work, defer P2 until P1 is stable.

---

## 11. Conclusion & Next Steps

### Summary
This architecture plan provides a **non-breaking, incremental migration** to a unified content bank that supports:
1. Coding interview problems (existing)
2. Debug lab scenarios (existing, separate)
3. Bug hunt items (existing, separate)
4. System design cases (new)

The **bridge adapter strategy** ensures zero downtime and allows gradual rollout with feature flags.

### Recommended Next Steps

1. **Immediate** (This Week):
   - Review this document with team
   - Get approval on schema design (especially `content_items` and `content_versions`)
   - Set up test environment for migration dry-run

2. **Week 1-2** (P0 Execution):
   - Implement schema changes
   - Build content bank repos and bridge adapter
   - Deploy to staging with feature flag

3. **Week 3-4** (P1 Execution):
   - Run ETL scripts for problems, debug lab, bug hunt
   - Implement unified submission flow
   - Canary release to 10% production

4. **Week 5-6** (Stabilization):
   - Monitor metrics, fix bugs
   - Full rollout to 100%
   - Declare legacy tables deprecated

5. **Month 2-3** (P2 Planning & Execution):
   - Design system design UI/UX
   - Implement evaluation engine
   - Launch first system design case

---

## Appendix A: Sample Content Bank Queries

### Query 1: Get All Published Coding Problems for a Pattern
```sql
SELECT
  ci.id, ci.title, ci.difficulty, cv.payload
FROM content_items ci
JOIN content_versions cv ON ci.id = cv.content_item_id
WHERE ci.tenant_id = 'demo'
  AND ci.content_type = 'coding_problem'
  AND ci.status = 'PUBLISHED'
  AND ci.primary_category = 'SLIDING_WINDOW'
  AND cv.is_published = true
ORDER BY ci.created_at DESC;
```

### Query 2: Get User Progress Across All Content Types
```sql
SELECT
  ci.content_type,
  ci.title,
  up.attempts_count,
  up.best_score,
  up.completed_at
FROM user_progress up
JOIN content_items ci ON up.content_item_id = ci.id
WHERE up.tenant_id = 'demo'
  AND up.user_id = 'user-123'
ORDER BY up.last_attempt_at DESC;
```

### Query 3: Get All Submissions with Evaluations for a Content Item
```sql
SELECT
  s.id AS submission_id,
  s.created_at,
  er.passed,
  er.score,
  er.feedback,
  af.feedback_text AS llm_feedback
FROM submissions s
LEFT JOIN evaluation_runs er ON s.id = er.submission_id
LEFT JOIN ai_feedback af ON s.id = af.submission_id
WHERE s.content_item_id = 'content-123'
  AND s.user_id = 'user-123'
ORDER BY s.created_at DESC;
```

---

## Appendix B: Example Payload Structures

### Coding Problem Payload (content_versions.payload)
```json
{
  "schemaVersion": "1.0",
  "statement": "Given an array of integers...",
  "targetComplexity": "O(n)",
  "testCases": [
    {"input": "[1,2,3]", "expectedOutput": "6", "isHidden": false}
  ],
  "hints": ["Consider using a sliding window"],
  "adversaryPrompts": [
    {"condition": "MISSING_EDGE_CASE", "prompt": "What if the array is empty?"}
  ],
  "timeoutBudgetMs": 1000,
  "largeHiddenTests": [...]
}
```

### System Design Payload (content_versions.payload)
```json
{
  "schemaVersion": "1.0",
  "scenario": "Design a URL shortening service...",
  "functionalRequirements": ["Generate short URLs", "Redirect to original"],
  "nonFunctionalRequirements": {
    "scale": "100M URLs, 10K writes/sec",
    "availability": "99.99%"
  },
  "evaluationCriteria": [
    {
      "criterion": "Database Choice",
      "weight": 0.3,
      "keywords": ["SQL", "NoSQL", "sharding"],
      "rubric": {
        "poor": "No database mentioned",
        "adequate": "Database choice stated without justification",
        "good": "Database choice with clear tradeoffs"
      }
    }
  ],
  "microLessons": ["hash-collision-strategies", "base62-encoding"]
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-01-24
**Status**: Draft for Review
**Reviewers**: Engineering Team, Product Manager, Architect

---

**End of Document**
