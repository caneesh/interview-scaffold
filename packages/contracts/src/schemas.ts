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
  'SUCCESS_REFLECTION',
  'HINT',
  'COMPLETED',
  'ABANDONED',
]);

export const StepTypeSchema = z.enum([
  'THINKING_GATE',
  'PATTERN_DISCOVERY',
  'CODING',
  'REFLECTION',
  'SUCCESS_REFLECTION',
  'HINT',
]);

export const PatternDiscoveryModeSchema = z.enum(['HEURISTIC', 'SOCRATIC']);

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
export const InvariantTemplateChoicesSchema = z.object({
  templateId: z.string(),
  choices: z.record(z.number()),
  allCorrect: z.boolean(),
});

export const SubmitThinkingGateRequestSchema = z.object({
  attemptId: z.string(),
  selectedPattern: z.string(),
  statedInvariant: z.string(),
  statedComplexity: z.string().optional(),
  invariantTemplate: InvariantTemplateChoicesSchema.optional(),
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

// Submit Success Reflection
export const ConfidenceRatingSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const SubmitSuccessReflectionRequestSchema = z.object({
  attemptId: z.string(),
  confidenceRating: ConfidenceRatingSchema,
  learnedInsight: z.string(),
  improvementNote: z.string().optional(),
  skipped: z.boolean(),
});

export const SubmitSuccessReflectionResponseSchema = z.object({
  attempt: AttemptSchema,
  passed: z.boolean(),
});

// Pattern Discovery - Socratic guided pattern finding
export const PatternDiscoveryQASchema = z.object({
  questionId: z.string(),
  question: z.string(),
  answer: z.string(),
  timestamp: z.coerce.date(),
});

export const StartPatternDiscoveryRequestSchema = z.object({
  attemptId: z.string(),
  mode: PatternDiscoveryModeSchema.optional(), // Defaults to HEURISTIC if LLM unavailable
});

export const StartPatternDiscoveryResponseSchema = z.object({
  stepId: z.string(),
  mode: PatternDiscoveryModeSchema,
  question: z.string(),
  questionId: z.string(),
});

export const SubmitPatternDiscoveryAnswerRequestSchema = z.object({
  attemptId: z.string(),
  stepId: z.string(),
  questionId: z.string(),
  answer: z.string(),
});

export const SubmitPatternDiscoveryAnswerResponseSchema = z.object({
  /** Next question if discovery is ongoing */
  nextQuestion: z.string().optional(),
  nextQuestionId: z.string().optional(),
  /** Discovered pattern if discovery completed */
  discoveredPattern: PatternIdSchema.optional(),
  /** Whether discovery is complete */
  completed: z.boolean(),
  /** Full Q/A log for display */
  qaLog: z.array(PatternDiscoveryQASchema),
});

export const AbandonPatternDiscoveryRequestSchema = z.object({
  attemptId: z.string(),
  stepId: z.string(),
});

export const AbandonPatternDiscoveryResponseSchema = z.object({
  success: z.boolean(),
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

// ============ Pattern Challenge (Advocate's Trap) ============

export const PatternChallengeModeSchema = z.enum(['COUNTEREXAMPLE', 'SOCRATIC']);

export const CheckPatternChallengeRequestSchema = z.object({
  attemptId: z.string(),
  selectedPattern: PatternIdSchema,
  statedInvariant: z.string(),
});

export const CheckPatternChallengeResponseSchema = z.object({
  shouldChallenge: z.boolean(),
  challenge: z.object({
    stepId: z.string(),
    mode: PatternChallengeModeSchema,
    prompt: z.string(),
    counterexample: z.string().optional(),
    confidenceScore: z.number().min(0).max(1),
    reasons: z.array(z.string()),
    suggestedAlternatives: z.array(PatternIdSchema),
  }).optional(),
});

export const RespondPatternChallengeRequestSchema = z.object({
  attemptId: z.string(),
  stepId: z.string(),
  response: z.string(),
  decision: z.enum(['KEEP_PATTERN', 'CHANGE_PATTERN']),
  newPattern: PatternIdSchema.optional(),
});

export const RespondPatternChallengeResponseSchema = z.object({
  attempt: AttemptSchema,
  step: z.object({
    id: z.string(),
    type: z.literal('PATTERN_CHALLENGE'),
    result: z.enum(['PASS', 'SKIP']).nullable(),
    data: z.any(),
  }),
  finalPattern: PatternIdSchema,
});

export const SkipPatternChallengeRequestSchema = z.object({
  attemptId: z.string(),
  stepId: z.string(),
});

export const SkipPatternChallengeResponseSchema = z.object({
  attempt: AttemptSchema,
  finalPattern: PatternIdSchema,
});

// ============ Trace Visualization ============

/** Recursive schema for trace values */
const TraceValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.number(),
    z.string(),
    z.boolean(),
    z.null(),
    z.array(TraceValueSchema),
    z.record(TraceValueSchema),
  ])
);

export const TraceVarsSchema = z.record(TraceValueSchema);

export const TraceFrameSchema = z.object({
  iter: z.number().int().min(0),
  vars: TraceVarsSchema,
  label: z.string().optional(),
  line: z.number().int().positive().optional(),
});

export const TraceOutputSchema = z.object({
  success: z.boolean(),
  frames: z.array(TraceFrameSchema),
  error: z.string().optional(),
  array: z.array(TraceValueSchema).optional(),
  arrayName: z.string().optional(),
  pointerVars: z.array(z.string()).optional(),
});

export const TraceExecutionRequestSchema = z.object({
  attemptId: z.string(),
  code: z.string(),
  language: z.string(),
  testInput: z.string(),
  autoInsert: z.boolean().optional(),
});

export const TraceExecutionResponseSchema = z.object({
  trace: TraceOutputSchema,
  /** Hint for user if trace couldn't be auto-captured */
  insertionHint: z.string().optional(),
  /** Code with trace calls inserted (if autoInsert was successful) */
  instrumentedCode: z.string().optional(),
});

// ============ Bug Hunt Mode ============

export const BugHuntDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const BugHuntLanguageSchema = z.enum(['python', 'javascript', 'typescript']);

export const BugHuntResultSchema = z.enum(['CORRECT', 'PARTIAL', 'INCORRECT']);

export const BugHuntItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  pattern: PatternIdSchema,
  difficulty: BugHuntDifficultySchema,
  language: BugHuntLanguageSchema,
  code: z.string(),
  prompt: z.string(),
  title: z.string(),
  expectedBugLines: z.array(z.number()),
  expectedConcepts: z.array(z.string()),
  hint: z.string().optional(),
  explanation: z.string(),
  createdAt: z.coerce.date(),
});

export const BugHuntSubmissionSchema = z.object({
  selectedLines: z.array(z.number().int().positive()),
  explanation: z.string().min(10, 'Explanation must be at least 10 characters'),
});

export const BugHuntValidationSchema = z.object({
  result: BugHuntResultSchema,
  lineSelectionCorrect: z.boolean(),
  linesFound: z.number(),
  totalBugLines: z.number(),
  conceptsMatched: z.boolean(),
  matchedConcepts: z.array(z.string()),
  totalConcepts: z.number(),
  llmFeedback: z.string().optional(),
  llmConfidence: z.number().optional(),
});

export const BugHuntAttemptSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  itemId: z.string(),
  submission: BugHuntSubmissionSchema.nullable(),
  validation: BugHuntValidationSchema.nullable(),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  attemptNumber: z.number(),
});

// Bug Hunt API Requests/Responses
export const ListBugHuntItemsResponseSchema = z.object({
  items: z.array(BugHuntItemSchema.omit({ expectedBugLines: true, expectedConcepts: true, explanation: true })),
});

export const GetBugHuntItemResponseSchema = z.object({
  item: BugHuntItemSchema.omit({ expectedBugLines: true, expectedConcepts: true, explanation: true }),
});

export const StartBugHuntAttemptRequestSchema = z.object({
  itemId: z.string(),
});

export const StartBugHuntAttemptResponseSchema = z.object({
  attempt: BugHuntAttemptSchema,
  item: BugHuntItemSchema.omit({ expectedBugLines: true, expectedConcepts: true, explanation: true }),
});

export const SubmitBugHuntAttemptRequestSchema = z.object({
  attemptId: z.string(),
  submission: BugHuntSubmissionSchema,
});

export const SubmitBugHuntAttemptResponseSchema = z.object({
  attempt: BugHuntAttemptSchema,
  validation: BugHuntValidationSchema,
  /** Show explanation on correct/partial answer */
  explanation: z.string().optional(),
  /** Show hint on incorrect answer (first attempt only) */
  hint: z.string().optional(),
});

export const ListBugHuntAttemptsResponseSchema = z.object({
  attempts: z.array(BugHuntAttemptSchema),
});
