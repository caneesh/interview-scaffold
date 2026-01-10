import { z } from 'zod';

// ============ Enums ============

export const PatternIdSchema = z.enum([
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
]);

export const RungLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const AttemptStateSchema = z.enum([
  'THINKING_GATE',
  'CODING',
  'REFLECTION',
  'HINT',
  'COMPLETED',
  'ABANDONED',
]);

export const StepTypeSchema = z.enum([
  'THINKING_GATE',
  'CODING',
  'REFLECTION',
  'HINT',
]);

export const StepResultSchema = z.enum(['PASS', 'FAIL', 'SKIP']);

export const HintLevelSchema = z.enum([
  'DIRECTIONAL_QUESTION',
  'HEURISTIC_HINT',
  'CONCEPT_INJECTION',
  'MICRO_EXAMPLE',
  'PATCH_SNIPPET',
]);

// ============ Entities ============

export const TestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
  explanation: z.string().optional(),
});

export const ProblemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  statement: z.string(),
  pattern: PatternIdSchema,
  rung: RungLevelSchema,
  targetComplexity: z.string(),
  testCases: z.array(TestCaseSchema),
  hints: z.array(z.string()),
  createdAt: z.coerce.date(),
});

export const TestResultDataSchema = z.object({
  input: z.string(),
  expected: z.string(),
  actual: z.string(),
  passed: z.boolean(),
  error: z.string().nullable(),
});

export const AttemptScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  patternRecognition: z.number().min(0).max(1),
  implementation: z.number().min(0).max(1),
  edgeCases: z.number().min(0).max(1),
  efficiency: z.number().min(0).max(1),
});

export const AttemptSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  problemId: z.string(),
  pattern: PatternIdSchema,
  rung: RungLevelSchema,
  state: AttemptStateSchema,
  hintsUsed: z.array(HintLevelSchema),
  codeSubmissions: z.number().int().min(0),
  score: AttemptScoreSchema.nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});

export const SkillStateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  pattern: PatternIdSchema,
  rung: RungLevelSchema,
  score: z.number().min(0).max(1),
  attemptsCount: z.number().int().min(0),
  lastAttemptAt: z.coerce.date().nullable(),
  unlockedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
});

// ============ API Request/Response ============

// Start Attempt
export const StartAttemptRequestSchema = z.object({
  problemId: z.string(),
});

export const StartAttemptResponseSchema = z.object({
  attempt: AttemptSchema,
  problem: ProblemSchema,
});

// Submit Thinking Gate
export const SubmitThinkingGateRequestSchema = z.object({
  attemptId: z.string(),
  selectedPattern: z.string(),
  statedInvariant: z.string(),
  statedComplexity: z.string().optional(),
});

export const SubmitThinkingGateResponseSchema = z.object({
  attempt: AttemptSchema,
  passed: z.boolean(),
});

// Submit Code
export const SubmitCodeRequestSchema = z.object({
  attemptId: z.string(),
  code: z.string(),
  language: z.string(),
});

export const SubmitCodeResponseSchema = z.object({
  attempt: AttemptSchema,
  testResults: z.array(TestResultDataSchema),
  passed: z.boolean(),
});

// Submit Reflection
export const SubmitReflectionRequestSchema = z.object({
  attemptId: z.string(),
  selectedOptionId: z.string(),
});

export const SubmitReflectionResponseSchema = z.object({
  attempt: AttemptSchema,
  passed: z.boolean(),
});

// Request Hint
export const RequestHintRequestSchema = z.object({
  attemptId: z.string(),
});

export const RequestHintResponseSchema = z.object({
  attempt: AttemptSchema,
  hint: z.object({
    level: HintLevelSchema,
    text: z.string(),
  }),
});

// Get Skill Matrix
export const GetSkillMatrixResponseSchema = z.object({
  skills: z.array(SkillStateSchema),
  unlockedRungs: z.array(
    z.object({
      pattern: PatternIdSchema,
      rung: RungLevelSchema,
      score: z.number(),
    })
  ),
  recommendedNext: z
    .object({
      pattern: PatternIdSchema,
      rung: RungLevelSchema,
      reason: z.string(),
    })
    .nullable(),
});

// Get Next Problem
export const GetNextProblemRequestSchema = z.object({
  pattern: PatternIdSchema.optional(),
  rung: RungLevelSchema.optional(),
});

export const GetNextProblemResponseSchema = z.object({
  problem: ProblemSchema.nullable(),
  reason: z.string(),
});

// Error Response
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ============ Thinking Gate Validation ============

export const ThinkingGateErrorSchema = z.object({
  field: z.enum(['pattern', 'invariant', 'complexity']),
  code: z.string(),
  message: z.string(),
  hint: z.string().optional(),
});

export const ThinkingGateWarningSchema = z.object({
  field: z.enum(['pattern', 'invariant', 'complexity']),
  code: z.string(),
  message: z.string(),
});

export const ThinkingGateValidationResultSchema = z.object({
  passed: z.boolean(),
  errors: z.array(ThinkingGateErrorSchema),
  warnings: z.array(ThinkingGateWarningSchema),
  llmAugmented: z.boolean(),
});

// Extended Step Response for Thinking Gate
export const SubmitThinkingGateExtendedResponseSchema = z.object({
  attempt: AttemptSchema,
  step: z.object({
    id: z.string(),
    type: z.literal('THINKING_GATE'),
    result: z.enum(['PASS', 'FAIL']),
    data: z.any(),
  }),
  passed: z.boolean(),
  validation: ThinkingGateValidationResultSchema.optional(),
});
