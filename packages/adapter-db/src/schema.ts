import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  real,
  uuid,
  index,
  unique,
  primaryKey,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

// ============ Tenants ============

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============ Problems ============

export const problems = pgTable(
  'problems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    title: text('title').notNull(),
    statement: text('statement').notNull(),
    pattern: text('pattern').notNull(),
    rung: integer('rung').notNull(),
    targetComplexity: text('target_complexity').notNull(),
    testCases: jsonb('test_cases').notNull().$type<TestCaseJson[]>(),
    hints: jsonb('hints').notNull().$type<string[]>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantPatternRungIdx: index('problems_tenant_pattern_rung_idx').on(
      table.tenantId,
      table.pattern,
      table.rung
    ),
  })
);

interface TestCaseJson {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

// ============ Attempts ============

/**
 * Unified attempts table supporting both legacy problem-based attempts
 * and new track-based content bank attempts.
 *
 * Invariant: exactly one of (problemId) OR (contentItemId) must be set.
 * - Legacy attempts: problemId is set, track/contentItemId are null
 * - Track attempts: contentItemId is set, track is set, problemId is null
 */
export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: text('user_id').notNull(),
    // Legacy problem-based attempts (nullable for track attempts)
    problemId: uuid('problem_id').references(() => problems.id),
    // Track-based content bank attempts (nullable for legacy attempts)
    track: text('track'), // 'coding_interview' | 'debug_lab' | 'system_design'
    contentItemId: uuid('content_item_id').references(() => contentItems.id),
    contentVersionId: uuid('content_version_id').references(() => contentVersions.id),
    // Common fields
    pattern: text('pattern').notNull(),
    rung: integer('rung').notNull(),
    state: text('state').notNull(),
    hintsUsed: jsonb('hints_used').notNull().$type<string[]>(),
    codeSubmissions: integer('code_submissions').notNull().default(0),
    score: jsonb('score').$type<AttemptScoreJson | null>(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    tenantUserIdx: index('attempts_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    tenantUserActiveIdx: index('attempts_tenant_user_active_idx').on(
      table.tenantId,
      table.userId,
      table.state
    ),
    // Track-based queries: find attempts by user+track sorted by recent
    userTrackStartedIdx: index('attempts_user_track_started_idx').on(
      table.userId,
      table.track,
      table.startedAt
    ),
    // Content-based queries: find attempts for a specific content item
    contentItemStartedIdx: index('attempts_content_item_started_idx').on(
      table.contentItemId,
      table.startedAt
    ),
  })
);

interface AttemptScoreJson {
  overall: number;
  patternRecognition: number;
  implementation: number;
  edgeCases: number;
  efficiency: number;
  bonus: number;
}

// ============ Steps ============

export const steps = pgTable(
  'steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id),
    type: text('type').notNull(),
    result: text('result'),
    data: jsonb('data').notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    attemptIdx: index('steps_attempt_idx').on(table.attemptId),
  })
);

// ============ Skills ============

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: text('user_id').notNull(),
    pattern: text('pattern').notNull(),
    rung: integer('rung').notNull(),
    score: real('score').notNull().default(0),
    attemptsCount: integer('attempts_count').notNull().default(0),
    lastAttemptAt: timestamp('last_attempt_at'),
    unlockedAt: timestamp('unlocked_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Idempotency: Track which attempt IDs have been applied to prevent double-counting
    lastAppliedAttemptId: uuid('last_applied_attempt_id'),
  },
  (table) => ({
    tenantUserIdx: index('skills_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    tenantUserPatternRungIdx: index('skills_tenant_user_pattern_rung_idx').on(
      table.tenantId,
      table.userId,
      table.pattern,
      table.rung
    ),
    // Unique constraint to prevent duplicate skill entries
    uniqueSkill: unique('skills_unique_skill').on(
      table.tenantId,
      table.userId,
      table.pattern,
      table.rung
    ),
  })
);

// ============ Debug Track - Scenarios ============

/**
 * Debug scenarios - can be global (no tenantId) or per-tenant.
 * Contains debugging challenges with buggy code and expected findings.
 */
export const debugScenarios = pgTable('debug_scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(), // DebugPatternCategory
  patternKey: text('pattern_key').notNull(), // Specific bug pattern identifier
  difficulty: text('difficulty').notNull(), // Difficulty enum
  symptomDescription: text('symptom_description').notNull(),
  codeArtifacts: jsonb('code_artifacts').notNull().$type<CodeArtifactJson[]>(),
  expectedFindings: jsonb('expected_findings').notNull().$type<string[]>(),
  fixStrategies: jsonb('fix_strategies').notNull().$type<string[]>(),
  regressionExpectation: text('regression_expectation').notNull(),
  hintLadder: jsonb('hint_ladder').notNull().$type<string[]>(),
  tags: jsonb('tags').notNull().$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

interface CodeArtifactJson {
  filename: string;
  content: string;
  language: string;
  isBuggy: boolean;
  bugLineNumbers?: number[];
}

// ============ Debug Track - Attempts ============

/**
 * Debug attempts - always tenant-scoped.
 * Tracks a user's progress through a debugging scenario.
 */
export const debugAttempts = pgTable(
  'debug_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    scenarioId: uuid('scenario_id').references((): AnyPgColumn => debugScenarios.id),
    currentGate: text('current_gate').notNull(), // DebugGate
    status: text('status').notNull(), // DebugAttemptStatus
    hintsUsed: integer('hints_used').default(0),
    scoreJson: jsonb('score_json').$type<Record<string, unknown> | null>(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantUserIdx: index('debug_attempts_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    tenantScenarioIdx: index('debug_attempts_tenant_scenario_idx').on(
      table.tenantId,
      table.scenarioId
    ),
  })
);

interface DebugAttemptScoreJson {
  overall: number;
  symptomClassification: number;
  rootCauseAnalysis: number;
  fixQuality: number;
  regressionPrevention: number;
  hintsDeduction: number;
}

// ============ Debug Track - Attempt Steps ============

/**
 * Debug attempt steps - gate submissions.
 * Records each gate answer and evaluation.
 */
export const debugAttemptSteps = pgTable(
  'debug_attempt_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => debugAttempts.id),
    gateId: text('gate_id').notNull(), // DebugGate
    answerJson: jsonb('answer_json').notNull().$type<Record<string, unknown>>(),
    isCorrect: boolean('is_correct').notNull(),
    feedbackText: text('feedback_text'),
    rubricJson: jsonb('rubric_json').$type<Record<string, number> | null>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    attemptIdx: index('debug_attempt_steps_attempt_idx').on(table.attemptId),
    attemptGateIdx: index('debug_attempt_steps_attempt_gate_idx').on(
      table.attemptId,
      table.gateId
    ),
  })
);

// ============ Debug Track - Mastery ============

/**
 * Debug mastery - user mastery tracking per pattern/category.
 * Tracks progress and skill level in debugging specific bug patterns.
 */
export const debugMastery = pgTable(
  'debug_mastery',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: text('user_id').notNull(),
    patternKey: text('pattern_key').notNull(),
    category: text('category').notNull(), // DebugPatternCategory
    masteryScore: real('mastery_score').default(0),
    lastAttemptAt: timestamp('last_attempt_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantUserIdx: index('debug_mastery_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    uniqueSkill: unique('debug_mastery_unique').on(
      table.tenantId,
      table.userId,
      table.patternKey,
      table.category
    ),
  })
);

// ============ Content Bank - Items ============

/**
 * Content Items - unified content catalog for all tracks.
 * Supports global content (tenantId null) or tenant-specific content.
 */
export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').references(() => tenants.id), // nullable for global content
    track: text('track').notNull(), // 'coding_interview' | 'debug_lab' | 'system_design'
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary'),
    difficulty: text('difficulty').notNull(), // 'easy' | 'medium' | 'hard'
    pattern: text('pattern'), // algorithm pattern or debug category
    rung: integer('rung'), // difficulty ladder level
    tags: jsonb('tags').notNull().$type<string[]>().default([]),
    estimatedTimeMinutes: integer('estimated_time_minutes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantTrackDifficultyIdx: index('content_items_tenant_track_difficulty_idx').on(
      table.tenantId,
      table.track,
      table.difficulty
    ),
    tenantTrackPatternRungIdx: index('content_items_tenant_track_pattern_rung_idx').on(
      table.tenantId,
      table.track,
      table.pattern,
      table.rung
    ),
    slugUniqueIdx: unique('content_items_slug_unique').on(
      table.tenantId,
      table.track,
      table.slug
    ),
  })
);

// ============ Content Bank - Versions ============

/**
 * Content Versions - versioned content bodies supporting draft/publish workflow.
 * Body is flexible JSON to support different content types.
 */
export const contentVersions = pgTable(
  'content_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentItemId: uuid('content_item_id')
      .notNull()
      .references(() => contentItems.id),
    version: integer('version').notNull(),
    status: text('status').notNull(), // 'draft' | 'published' | 'archived'
    body: jsonb('body').notNull().$type<Record<string, unknown>>(),
    schemaVersion: integer('schema_version').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    publishedAt: timestamp('published_at'),
  },
  (table) => ({
    contentVersionIdx: unique('content_versions_content_version_unique').on(
      table.contentItemId,
      table.version
    ),
    statusIdx: index('content_versions_status_idx').on(
      table.contentItemId,
      table.status
    ),
  })
);

// ============ Content Bank - Authors (optional) ============

/**
 * Content Item Authors - tracks authorship/ownership of content.
 */
export const contentItemAuthors = pgTable(
  'content_item_authors',
  {
    contentItemId: uuid('content_item_id')
      .notNull()
      .references(() => contentItems.id),
    userId: text('user_id').notNull(),
    role: text('role').notNull(), // 'author' | 'reviewer' | 'editor'
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.userId] }),
  })
);

// ============ Submissions ============

/**
 * Submissions - user-submitted content for evaluation.
 * Supports multiple content types: code, text, diagrams, gate answers, etc.
 */
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id),
    userId: text('user_id').notNull(),
    type: text('type').notNull(), // 'code' | 'text' | 'diagram' | 'gate' | 'triage' | 'reflection' | 'files'
    language: text('language'), // programming language for code submissions
    contentText: text('content_text'), // plain text content
    contentJson: jsonb('content_json').notNull().$type<Record<string, unknown>>().default({}),
    isFinal: boolean('is_final').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    attemptIdx: index('submissions_attempt_idx').on(table.attemptId),
    userIdx: index('submissions_user_idx').on(table.userId),
    // P0 fix: Add composite index for user submission history queries
    userCreatedIdx: index('submissions_user_created_idx').on(table.userId, table.createdAt),
  })
);

// ============ Evaluation Runs ============

/**
 * Evaluation Runs - tracks evaluation/grading processes.
 * Supports different evaluation types: coding tests, debug gates, rubrics, AI reviews.
 */
export const evaluationRuns = pgTable(
  'evaluation_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id),
    submissionId: uuid('submission_id').references(() => submissions.id),
    userId: text('user_id').notNull(),
    track: text('track').notNull(),
    type: text('type').notNull(), // 'coding_tests' | 'debug_gate' | 'rubric' | 'ai_review'
    status: text('status').notNull(), // 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled'
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    summary: jsonb('summary').$type<Record<string, unknown>>(),
    details: jsonb('details').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    attemptIdx: index('evaluation_runs_attempt_idx').on(table.attemptId),
    submissionIdx: index('evaluation_runs_submission_idx').on(table.submissionId),
    statusIdx: index('evaluation_runs_status_idx').on(table.status),
    // P0 fix: Add composite index for user progress queries by track
    userTrackCreatedIdx: index('evaluation_runs_user_track_created_idx').on(
      table.userId,
      table.track,
      table.createdAt
    ),
  })
);

// ============ Coding Test Results ============

/**
 * Coding Test Results - individual test case results within an evaluation run.
 */
export const codingTestResults = pgTable(
  'coding_test_results',
  {
    evaluationRunId: uuid('evaluation_run_id')
      .notNull()
      .references(() => evaluationRuns.id),
    testIndex: integer('test_index').notNull(),
    passed: boolean('passed').notNull(),
    isHidden: boolean('is_hidden').notNull().default(false),
    expected: text('expected'),
    actual: text('actual'),
    stdout: text('stdout'),
    stderr: text('stderr'),
    durationMs: integer('duration_ms'),
    error: text('error'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.evaluationRunId, table.testIndex] }),
  })
);

// ============ Rubric Scores ============

/**
 * Rubric Scores - scores per criterion within an evaluation run.
 */
export const rubricScores = pgTable(
  'rubric_scores',
  {
    evaluationRunId: uuid('evaluation_run_id')
      .notNull()
      .references(() => evaluationRuns.id),
    criterion: text('criterion').notNull(),
    score: real('score').notNull(),
    maxScore: real('max_score').notNull(),
    rationale: text('rationale'),
    evidence: jsonb('evidence').$type<Record<string, unknown>>(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.evaluationRunId, table.criterion] }),
  })
);

// ============ Debug Diagnostics ============

/**
 * Debug Diagnostics - key-value diagnostic data within an evaluation run.
 */
export const debugDiagnostics = pgTable(
  'debug_diagnostics',
  {
    evaluationRunId: uuid('evaluation_run_id')
      .notNull()
      .references(() => evaluationRuns.id),
    key: text('key').notNull(),
    value: jsonb('value').$type<Record<string, unknown>>(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.evaluationRunId, table.key] }),
  })
);

// ============ AI Feedback ============

/**
 * AI Feedback - stores AI-generated feedback and coaching responses.
 */
export const aiFeedback = pgTable(
  'ai_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    attemptId: uuid('attempt_id').references(() => attempts.id),
    submissionId: uuid('submission_id').references(() => submissions.id),
    type: text('type').notNull(), // feedback type: 'hint' | 'explanation' | 'review' | 'guidance'
    model: text('model').notNull(), // AI model used
    promptVersion: text('prompt_version').notNull(),
    inputHash: text('input_hash').notNull(), // hash of input for deduplication
    output: jsonb('output').notNull().$type<Record<string, unknown>>(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('ai_feedback_user_idx').on(table.userId),
    attemptIdx: index('ai_feedback_attempt_idx').on(table.attemptId),
    inputHashIdx: index('ai_feedback_input_hash_idx').on(table.inputHash),
    // P0 fix: Add composite index for user+attempt queries
    userAttemptIdx: index('ai_feedback_user_attempt_idx').on(table.userId, table.attemptId),
  })
);

// ============ Socratic Turns ============

/**
 * Socratic Turns - conversation turns in Socratic coaching dialogues.
 */
export const socraticTurns = pgTable(
  'socratic_turns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id),
    userId: text('user_id').notNull(),
    turnIndex: integer('turn_index').notNull(),
    role: text('role').notNull(), // 'user' | 'assistant' | 'system'
    message: text('message').notNull(),
    question: jsonb('question').$type<Record<string, unknown>>(), // structured question if applicable
    validation: jsonb('validation').$type<Record<string, unknown>>(), // validation result if applicable
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    attemptIdx: index('socratic_turns_attempt_idx').on(table.attemptId),
    attemptTurnIdx: unique('socratic_turns_attempt_turn_unique').on(
      table.attemptId,
      table.turnIndex
    ),
  })
);

// ============ User Track Progress (TrackE) ============

/**
 * User Track Progress - aggregated progress per user per track.
 * Tracks overall mastery and activity across a track (coding_interview, debug_lab, system_design).
 */
export const userTrackProgress = pgTable(
  'user_track_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: text('user_id').notNull(),
    track: text('track').notNull(), // 'coding_interview' | 'debug_lab' | 'system_design'
    masteryScore: real('mastery_score').notNull().default(0), // 0-100, aggregated across content
    attemptsCount: integer('attempts_count').notNull().default(0),
    completedCount: integer('completed_count').notNull().default(0),
    lastActivityAt: timestamp('last_activity_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Idempotency: Track which attempt ID was last applied to prevent double-counting
    lastAppliedAttemptId: uuid('last_applied_attempt_id'),
  },
  (table) => ({
    tenantUserIdx: index('user_track_progress_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    tenantUserTrackIdx: index('user_track_progress_tenant_user_track_idx').on(
      table.tenantId,
      table.userId,
      table.track
    ),
    // Unique constraint to prevent duplicate track progress entries
    uniqueTrackProgress: unique('user_track_progress_unique').on(
      table.tenantId,
      table.userId,
      table.track
    ),
  })
);

// ============ User Content Progress (TrackE) ============

/**
 * User Content Progress - progress per user per content item.
 * Tracks individual problem/scenario completion and scores.
 */
export const userContentProgress = pgTable(
  'user_content_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: text('user_id').notNull(),
    contentItemId: uuid('content_item_id').references(() => contentItems.id), // nullable for legacy problems
    problemId: uuid('problem_id').references(() => problems.id), // for backward compat with existing problems table
    track: text('track').notNull(), // 'coding_interview' | 'debug_lab' | 'system_design'
    attemptsCount: integer('attempts_count').notNull().default(0),
    bestScore: real('best_score'), // highest score achieved (0-100)
    lastScore: real('last_score'), // most recent attempt score
    completedAt: timestamp('completed_at'), // first successful completion
    lastAttemptAt: timestamp('last_attempt_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Idempotency: Track which attempt ID was last applied to prevent double-counting
    lastAppliedAttemptId: uuid('last_applied_attempt_id'),
  },
  (table) => ({
    tenantUserIdx: index('user_content_progress_tenant_user_idx').on(
      table.tenantId,
      table.userId
    ),
    tenantUserContentIdx: index('user_content_progress_tenant_user_content_idx').on(
      table.tenantId,
      table.userId,
      table.contentItemId
    ),
    tenantUserProblemIdx: index('user_content_progress_tenant_user_problem_idx').on(
      table.tenantId,
      table.userId,
      table.problemId
    ),
    // Unique constraint for content items (when contentItemId is set)
    uniqueContentProgress: unique('user_content_progress_content_unique').on(
      table.tenantId,
      table.userId,
      table.contentItemId
    ),
    // Unique constraint for legacy problems (when problemId is set)
    uniqueProblemProgress: unique('user_content_progress_problem_unique').on(
      table.tenantId,
      table.userId,
      table.problemId
    ),
    // P0 fix: Add index for activity tracking queries
    activityIdx: index('user_content_progress_activity_idx').on(
      table.userId,
      table.track,
      table.lastAttemptAt
    ),
  })
);
