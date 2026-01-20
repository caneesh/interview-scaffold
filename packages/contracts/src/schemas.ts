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
  /** Time budget in ms for large hidden tests (e.g., 500, 1000) */
  timeoutBudgetMs: z.number().positive().optional(),
  /** Large hidden tests run with budget timeout to detect suboptimal complexity */
  largeHiddenTests: z.array(TestCaseSchema).optional(),
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

// ============ Debug Lab Mode ============

export const DefectCategorySchema = z.enum([
  'Functional',
  'Concurrency',
  'Resource',
  'Distributed',
  'Heisenbug',
  'Environment',
  'Container',
  'Performance',
  'Observability',
]);

export const SeverityLevelSchema = z.enum(['Critical', 'Major', 'Minor', 'Low']);

export const PriorityLevelSchema = z.enum(['High', 'Medium', 'Low']);

export const DebugSignalSchema = z.enum([
  'failing_tests',
  'timeout',
  'crash',
  'inconsistent_repro',
  'metrics_red',
  'metrics_use',
  'memory_growth',
  'cpu_spike',
  'connection_errors',
  'data_corruption',
  'log_errors',
  'silent_failure',
]);

export const DebugToolSchema = z.enum([
  'unit_tests',
  'logging',
  'profiling',
  'tracing',
  'seed_freeze',
  'debugger',
  'binary_search',
  'metrics_analysis',
  'code_review',
  'reproduction',
  'isolation',
  'rollback',
]);

export const DebugLabDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']);

export const DebugLabLanguageSchema = z.enum(['javascript', 'typescript', 'python']);

export const DebugLabStatusSchema = z.enum([
  'STARTED',
  'TRIAGE_COMPLETED',
  'SUBMITTED',
  'PASSED',
  'FAILED',
]);

export const ExecutionSignalTypeSchema = z.enum([
  'test_failure',
  'timeout',
  'crash',
  'compile_error',
  'runtime_error',
  'success',
]);

// Debug Lab File
export const DebugLabFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  editable: z.boolean(),
});

// Observability Schemas
export const REDMetricsSchema = z.object({
  rate: z.number(),
  errorRate: z.number().min(0).max(1),
  duration: z.object({
    p50: z.number(),
    p95: z.number(),
    p99: z.number(),
  }),
  label: z.string().optional(),
});

export const USEMetricsSchema = z.object({
  utilization: z.number().min(0).max(1),
  saturation: z.number(),
  errors: z.number(),
  resource: z.string(),
  label: z.string().optional(),
});

export const ObservabilitySnapshotSchema = z.object({
  red: z.array(REDMetricsSchema).optional(),
  use: z.array(USEMetricsSchema).optional(),
  logs: z.array(z.string()).optional(),
  timestamp: z.string().optional(),
});

// Triage Schemas
export const TriageRubricSchema = z.object({
  expectedCategory: DefectCategorySchema,
  expectedSeverity: SeverityLevelSchema,
  expectedPriority: PriorityLevelSchema,
  expectedFirstActions: z.array(z.string()),
  explanation: z.string().optional(),
});

export const TriageAnswersSchema = z.object({
  category: DefectCategorySchema,
  severity: SeverityLevelSchema,
  priority: PriorityLevelSchema,
  firstActions: z.string().min(10, 'First actions must be at least 10 characters'),
});

export const TriageScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  categoryScore: z.number().min(0).max(1),
  severityScore: z.number().min(0).max(1),
  priorityScore: z.number().min(0).max(1),
  actionsScore: z.number().min(0).max(1),
  matchedActions: z.array(z.string()),
  llmFeedback: z.string().optional(),
});

// Execution Result Schema
export const ExecutionResultSchema = z.object({
  passed: z.boolean(),
  signalType: ExecutionSignalTypeSchema,
  testsPassed: z.number().int().min(0),
  testsTotal: z.number().int().min(0),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number().int(),
  executionTimeMs: z.number().min(0),
  hiddenTestsResult: z.object({
    passed: z.boolean(),
    testsPassed: z.number().int().min(0),
    testsTotal: z.number().int().min(0),
  }).optional(),
});

// Debug Lab Submission Schema
export const DebugLabSubmissionSchema = z.object({
  files: z.record(z.string()),
  explanation: z.string().min(10, 'Explanation must be at least 10 characters'),
  submittedAt: z.coerce.date(),
});

// Debug Lab Item Schema (full, for server)
export const DebugLabItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: DebugLabDifficultySchema,
  language: DebugLabLanguageSchema,
  files: z.array(DebugLabFileSchema),
  testCommand: z.string(),
  runnerScript: z.string().optional(),
  hiddenTests: z.array(DebugLabFileSchema).optional(),
  defectCategory: DefectCategorySchema,
  severity: SeverityLevelSchema,
  priority: PriorityLevelSchema,
  signals: z.array(DebugSignalSchema),
  toolsExpected: z.array(DebugToolSchema),
  requiredTriage: z.boolean(),
  triageRubric: TriageRubricSchema.optional(),
  observabilitySnapshot: ObservabilitySnapshotSchema.optional(),
  solutionExplanation: z.string().optional(),
  solutionFiles: z.array(DebugLabFileSchema).optional(),
  createdAt: z.coerce.date(),
});

// Debug Lab Item Schema (client-safe, omits solutions and hidden tests)
export const DebugLabItemClientSchema = DebugLabItemSchema.omit({
  hiddenTests: true,
  solutionExplanation: true,
  solutionFiles: true,
  triageRubric: true, // Don't reveal expected answers
});

// Debug Lab Attempt Schema
export const DebugLabAttemptSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  itemId: z.string(),
  status: DebugLabStatusSchema,
  triageAnswers: TriageAnswersSchema.nullable(),
  triageScore: TriageScoreSchema.nullable(),
  submission: DebugLabSubmissionSchema.nullable(),
  executionResult: ExecutionResultSchema.nullable(),
  testRunCount: z.number().int().min(0),
  submissionCount: z.number().int().min(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});

// ============ Debug Lab API Requests/Responses ============

// GET /api/debug-lab/next
export const GetNextDebugLabResponseSchema = z.object({
  item: DebugLabItemClientSchema.nullable(),
  reason: z.string(),
});

// POST /api/debug-lab/start
export const StartDebugLabRequestSchema = z.object({
  itemId: z.string(),
});

export const StartDebugLabResponseSchema = z.object({
  attempt: DebugLabAttemptSchema,
  item: DebugLabItemClientSchema,
});

// POST /api/debug-lab/:attemptId/triage
export const SubmitTriageRequestSchema = z.object({
  attemptId: z.string(),
  triageAnswers: TriageAnswersSchema,
});

export const SubmitTriageResponseSchema = z.object({
  attempt: DebugLabAttemptSchema,
  triageScore: TriageScoreSchema,
  rubricExplanation: z.string().optional(),
});

// POST /api/debug-lab/:attemptId/run-tests
export const RunTestsRequestSchema = z.object({
  attemptId: z.string(),
  files: z.record(z.string()),
});

export const RunTestsResponseSchema = z.object({
  attempt: DebugLabAttemptSchema,
  executionResult: ExecutionResultSchema,
});

// POST /api/debug-lab/:attemptId/submit
export const SubmitDebugLabRequestSchema = z.object({
  attemptId: z.string(),
  files: z.record(z.string()),
  explanation: z.string().min(10, 'Explanation must be at least 10 characters'),
});

export const SubmitDebugLabResponseSchema = z.object({
  attempt: DebugLabAttemptSchema,
  executionResult: ExecutionResultSchema,
  passed: z.boolean(),
  /** Taxonomy metadata for UI display */
  taxonomy: z.object({
    defectCategory: DefectCategorySchema,
    severity: SeverityLevelSchema,
    priority: PriorityLevelSchema,
    signals: z.array(DebugSignalSchema),
  }),
  /** Solution explanation (only shown on pass or after max attempts) */
  solutionExplanation: z.string().optional(),
});

// GET /api/debug-lab/items (list available items)
export const ListDebugLabItemsResponseSchema = z.object({
  items: z.array(DebugLabItemClientSchema.pick({
    id: true,
    title: true,
    description: true,
    difficulty: true,
    language: true,
    defectCategory: true,
    severity: true,
    requiredTriage: true,
  })),
});

// GET /api/debug-lab/attempts (list user's attempts)
export const ListDebugLabAttemptsResponseSchema = z.object({
  attempts: z.array(DebugLabAttemptSchema),
});

// ============ AI Diagnostic Coach Schemas ============

/**
 * Diagnostic stages (state machine)
 */
export const DiagnosticStageSchema = z.enum([
  'TRIAGE',       // Classify the defect
  'REPRODUCE',    // Establish reproduction
  'LOCALIZE',     // Narrow down location
  'HYPOTHESIZE',  // Form hypotheses
  'FIX',          // Implement fix (user)
  'VERIFY',       // Verify fix works
  'POSTMORTEM',   // Generate learnings
]);

export type DiagnosticStage = z.infer<typeof DiagnosticStageSchema>;

/**
 * Guidance types from coach
 */
export const GuidanceTypeSchema = z.enum([
  'socratic_question',
  'checklist',
  'pattern_hint',
  'next_step',
  'counterexample',
  'knowledge_card',
]);

/**
 * Triage evidence
 */
export const TriageEvidenceSchema = z.object({
  defectCategory: z.string(),
  severity: z.string(),
  priority: z.string(),
  observations: z.string(),
  timestamp: z.string().datetime(),
});

/**
 * Reproduction evidence
 */
export const ReproductionEvidenceSchema = z.object({
  steps: z.array(z.string()),
  isDeterministic: z.boolean(),
  reproCommand: z.string().optional(),
  successRate: z.number().min(0).max(1).optional(),
  timestamp: z.string().datetime(),
});

/**
 * Localization evidence
 */
export const LocalizationEvidenceSchema = z.object({
  suspectedFiles: z.array(z.string()),
  suspectedFunctions: z.array(z.string()),
  stackTrace: z.string().optional(),
  narrowingHistory: z.array(z.string()).optional(),
  timestamp: z.string().datetime(),
});

/**
 * Hypothesis evidence
 */
export const HypothesisEvidenceSchema = z.object({
  id: z.string(),
  hypothesis: z.string(),
  testMethod: z.string(),
  status: z.enum(['untested', 'confirmed', 'rejected']),
  evidence: z.string().optional(),
  timestamp: z.string().datetime(),
});

/**
 * Fix attempt evidence
 */
export const FixAttemptEvidenceSchema = z.object({
  id: z.string(),
  hypothesisId: z.string(),
  approach: z.string(),
  filesModified: z.array(z.string()),
  testsPassed: z.boolean(),
  testOutput: z.string().optional(),
  timestamp: z.string().datetime(),
});

/**
 * Verification evidence
 */
export const VerificationEvidenceSchema = z.object({
  visibleTestsPassed: z.boolean(),
  hiddenTestsPassed: z.boolean().optional(),
  edgeCasesChecked: z.array(z.string()),
  regressionTestsPassed: z.boolean(),
  timestamp: z.string().datetime(),
});

/**
 * All diagnostic evidence
 */
export const DiagnosticEvidenceSchema = z.object({
  triage: TriageEvidenceSchema.optional(),
  reproduction: ReproductionEvidenceSchema.optional(),
  localization: LocalizationEvidenceSchema.optional(),
  hypotheses: z.array(HypothesisEvidenceSchema).optional(),
  fixAttempts: z.array(FixAttemptEvidenceSchema).optional(),
  verification: VerificationEvidenceSchema.optional(),
});

/**
 * AI guidance entry
 */
export const AIGuidanceEntrySchema = z.object({
  id: z.string(),
  stage: DiagnosticStageSchema,
  type: GuidanceTypeSchema,
  content: z.string(),
  helpful: z.boolean().optional(),
  timestamp: z.string().datetime(),
});

/**
 * Stage transition record
 */
export const StageTransitionSchema = z.object({
  from: DiagnosticStageSchema.nullable(),
  to: DiagnosticStageSchema,
  timestamp: z.string().datetime(),
  reason: z.string().optional(),
});

/**
 * Full diagnostic session
 */
export const DiagnosticSessionSchema = z.object({
  id: z.string(),
  attemptId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  currentStage: DiagnosticStageSchema,
  stageHistory: z.array(StageTransitionSchema),
  evidence: DiagnosticEvidenceSchema,
  aiGuidance: z.array(AIGuidanceEntrySchema),
  aiEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ============ AI Coach Request/Response Schemas ============

/**
 * Problem context for AI (NO solution/answer info)
 */
export const ProblemContextSchema = z.object({
  problemId: z.string(),
  problemTitle: z.string(),
  problemStatement: z.string(),
  visibleTestCases: z.array(z.string()),
  defectCategory: z.string().optional(),
  signals: z.array(z.string()).optional(),
});

/**
 * Request to AI coach
 */
export const AICoachRequestSchema = z.object({
  stage: DiagnosticStageSchema,
  problemContext: ProblemContextSchema,
  evidence: DiagnosticEvidenceSchema,
  userMessage: z.string().optional(),
});

/**
 * Response from AI coach
 * CRITICAL: Must NOT contain code blocks, fixes, or line numbers
 */
export const AICoachResponseSchema = z.object({
  guidance: z.string(),
  guidanceType: GuidanceTypeSchema,
  questions: z.array(z.string()).optional(),
  checklist: z.array(z.string()).optional(),
  suggestedNextStage: DiagnosticStageSchema.optional(),
  confidence: z.number().min(0).max(1),
}).refine(
  (data) => {
    // Reject if guidance contains code blocks
    const hasCodeBlock = /```[\s\S]*```/.test(data.guidance);
    const hasInlineCode = /`[^`]+`/.test(data.guidance) && /\b(function|const|let|var|return|if|for|while)\b/.test(data.guidance);
    return !hasCodeBlock && !hasInlineCode;
  },
  { message: 'AI guidance must not contain code blocks or inline code fixes' }
);

// ============ Diagnostic Coach API Schemas ============

// POST /api/diagnostic-coach/start
export const StartDiagnosticSessionRequestSchema = z.object({
  attemptId: z.string(),
  aiEnabled: z.boolean().default(true),
});

export const StartDiagnosticSessionResponseSchema = z.object({
  session: DiagnosticSessionSchema,
});

// POST /api/diagnostic-coach/:sessionId/guidance
export const GetGuidanceRequestSchema = z.object({
  sessionId: z.string(),
  userMessage: z.string().optional(),
});

export const GetGuidanceResponseSchema = z.object({
  guidance: AICoachResponseSchema,
  session: DiagnosticSessionSchema,
});

// POST /api/diagnostic-coach/:sessionId/evidence
export const AddEvidenceRequestSchema = z.object({
  sessionId: z.string(),
  evidenceType: z.enum(['triage', 'reproduction', 'localization', 'hypothesis', 'fixAttempt', 'verification']),
  evidence: z.union([
    TriageEvidenceSchema,
    ReproductionEvidenceSchema,
    LocalizationEvidenceSchema,
    HypothesisEvidenceSchema,
    FixAttemptEvidenceSchema,
    VerificationEvidenceSchema,
  ]),
});

export const AddEvidenceResponseSchema = z.object({
  session: DiagnosticSessionSchema,
  stageComplete: z.boolean(),
  recommendedNextStage: DiagnosticStageSchema.optional(),
});

// POST /api/diagnostic-coach/:sessionId/transition
export const TransitionStageRequestSchema = z.object({
  sessionId: z.string(),
  targetStage: DiagnosticStageSchema,
  reason: z.string().optional(),
});

export const TransitionStageResponseSchema = z.object({
  session: DiagnosticSessionSchema,
  success: z.boolean(),
  error: z.string().optional(),
});

// ============ Learner-Centric Coaching Schemas ============

/**
 * Coaching stages
 */
export const CoachingStageSchema = z.enum([
  'PROBLEM_FRAMING',
  'PATTERN_RECOGNITION',
  'FEYNMAN_VALIDATION',
  'STRATEGY_DESIGN',
  'CODING',
  'REFLECTION',
]);

export type CoachingStageType = z.infer<typeof CoachingStageSchema>;

/**
 * Help level (1-5)
 */
export const HelpLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/**
 * Answer quality assessment
 */
export const AnswerQualitySchema = z.enum(['SHALLOW', 'ADEQUATE', 'DEEP']);

/**
 * Pattern gate status
 */
export const PatternGateStatusSchema = z.enum(['PENDING', 'PASSED', 'FAILED']);

/**
 * Coach response type
 */
export const CoachResponseTypeSchema = z.enum([
  'QUESTION',
  'FEEDBACK',
  'GUIDANCE',
  'WARNING',
  'HINT',
  'CONGRATULATIONS',
  'NEXT_STAGE',
]);

/**
 * Coach next action
 */
export const CoachNextActionSchema = z.enum([
  'CONTINUE',
  'ADVANCE',
  'RETRY',
  'REQUEST_HELP',
  'COMPLETE',
]);

/**
 * Coach response metadata
 */
export const CoachResponseMetadataSchema = z.object({
  stage: CoachingStageSchema,
  attemptCount: z.number().int().min(0),
  helpUsed: z.number().min(0),
  timeElapsed: z.number().min(0),
});

/**
 * Coach response
 */
export const CoachResponseSchema = z.object({
  type: CoachResponseTypeSchema,
  content: z.string(),
  questions: z.array(z.string()),
  helpLevel: HelpLevelSchema.nullable(),
  nextAction: CoachNextActionSchema,
  metadata: CoachResponseMetadataSchema,
});

/**
 * Problem framing question
 */
export const ProblemFramingQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: z.enum([
    'INPUT_OUTPUT',
    'CONSTRAINTS',
    'EDGE_CASES',
    'EXAMPLES',
    'CLARIFICATION',
    'RESTATEMENT',
  ]),
  userAnswer: z.string().nullable(),
  answerQuality: AnswerQualitySchema.nullable(),
  followUpQuestion: z.string().nullable(),
  timestamp: z.coerce.date(),
});

/**
 * Coaching session (simplified for API)
 */
export const CoachingSessionSchema = z.object({
  id: z.string(),
  attemptId: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  problemId: z.string(),
  currentStage: CoachingStageSchema,
  helpLevel: HelpLevelSchema,
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});

// ============ Coaching API Request/Response Schemas ============

// POST /api/coaching/sessions - Start a coaching session
export const StartCoachingSessionRequestSchema = z.object({
  attemptId: z.string(),
  problemId: z.string(),
});

export const StartCoachingSessionResponseSchema = z.object({
  session: CoachingSessionSchema,
  initialQuestions: z.array(z.string()),
});

// POST /api/coaching/sessions/:sessionId/framing - Submit framing answer
export const SubmitFramingAnswerRequestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answer: z.string().min(1),
});

export const SubmitFramingAnswerResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  understandingScore: z.number().min(0).max(1),
  isComplete: z.boolean(),
});

// POST /api/coaching/sessions/:sessionId/pattern - Submit pattern selection
export const SubmitPatternSelectionRequestSchema = z.object({
  sessionId: z.string(),
  selectedPattern: z.string(),
  justification: z.string().min(20),
});

export const SubmitPatternSelectionResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  status: PatternGateStatusSchema,
  isCorrect: z.boolean(),
});

// POST /api/coaching/sessions/:sessionId/feynman - Submit Feynman explanation
export const SubmitFeynmanExplanationRequestSchema = z.object({
  sessionId: z.string(),
  explanation: z.string().min(10),
});

export const SubmitFeynmanExplanationResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  score: z.number().min(0).max(1),
  isValid: z.boolean(),
});

// POST /api/coaching/sessions/:sessionId/strategy - Submit strategy
export const SubmitStrategyRequestSchema = z.object({
  sessionId: z.string(),
  strategy: z.string().min(50),
});

export const SubmitStrategyResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  isReady: z.boolean(),
  adversarialQuestions: z.array(z.object({
    id: z.string(),
    question: z.string(),
  })),
});

// POST /api/coaching/sessions/:sessionId/strategy/adversarial - Answer adversarial question
export const SubmitAdversarialAnswerRequestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answer: z.string().min(10),
});

export const SubmitAdversarialAnswerResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  isReady: z.boolean(),
});

// POST /api/coaching/sessions/:sessionId/code - Analyze code
export const AnalyzeCodeRequestSchema = z.object({
  sessionId: z.string(),
  code: z.string(),
  language: z.string(),
});

export const AnalyzeCodeResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  observations: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    lineNumber: z.number().nullable(),
  })),
  warnings: z.array(z.object({
    id: z.string(),
    type: z.string(),
    description: z.string(),
    lineNumber: z.number().nullable(),
  })),
});

// POST /api/coaching/sessions/:sessionId/help - Request help
export const RequestHelpRequestSchema = z.object({
  sessionId: z.string(),
  requestedLevel: HelpLevelSchema,
  explicitlyRequested: z.boolean().default(false),
  context: z.object({
    code: z.string().optional(),
    strategy: z.string().optional(),
  }).optional(),
});

export const RequestHelpResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  level: HelpLevelSchema,
  penalty: z.number().min(0).max(1),
});

// POST /api/coaching/sessions/:sessionId/reflection - Submit coaching reflection
export const SubmitCoachingReflectionRequestSchema = z.object({
  sessionId: z.string(),
  keyInsight: z.string().min(20),
  misleadingFactors: z.array(z.string()),
  recognitionTips: z.string().min(20),
});

export const SubmitCoachingReflectionResponseSchema = z.object({
  session: CoachingSessionSchema,
  response: CoachResponseSchema,
  summary: z.string(),
  suggestedFollowUps: z.array(z.object({
    problemId: z.string(),
    title: z.string(),
  })),
});

// GET /api/coaching/sessions/:sessionId - Get session state
export const GetCoachingSessionResponseSchema = z.object({
  session: CoachingSessionSchema,
  currentStage: CoachingStageSchema,
  progress: z.object({
    stageIndex: z.number().int().min(0),
    totalStages: z.number().int().positive(),
    percentComplete: z.number().min(0).max(100),
  }),
});
