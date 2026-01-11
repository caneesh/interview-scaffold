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
