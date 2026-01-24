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

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    userId: text('user_id').notNull(),
    problemId: uuid('problem_id')
      .notNull()
      .references(() => problems.id),
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
