import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt, AttemptScore } from '../entities/attempt.js';
import type { TestResultData, CodingData, CodingValidationData } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { SkillRepo } from '../ports/skill-repo.js';
import type { EventSink } from '../ports/event-sink.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { hasPassedThinkingGate, hasPassedReflection, needsReflection } from '../entities/attempt.js';
import { computeNewScore, RUNG_UNLOCK_THRESHOLD } from '../entities/skill-state.js';
import { computeAttemptScore } from './compute-attempt-score.js';
import { ERROR_TYPES } from '../validation/types.js';
import type { GatingDecision, ErrorEvent, ErrorType } from '../validation/types.js';
import { gradeSubmission } from '../validation/rubric.js';
import { runHeuristics } from '../validation/heuristics.js';
import { detectForbiddenConcepts, getForbiddenForPattern } from '../validation/forbidden.js';
import { makeGatingDecision } from '../validation/gating.js';
import type { LLMValidationPort, LLMValidationResponse } from '../validation/llm-port.js';
import type { PatternId } from '../entities/pattern.js';

export interface SubmitCodeInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly code: string;
  readonly language: string;
}

export interface SubmitCodeOutput {
  readonly attempt: Attempt;
  readonly testResults: readonly TestResultData[];
  readonly passed: boolean;
  readonly validation: CodingValidationData;
  readonly gatingDecision: GatingDecision;
  readonly score?: AttemptScore; // Only present when COMPLETED
}

export interface SubmitCodeDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly skillRepo: SkillRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly codeExecutor: CodeExecutor;
  readonly llmValidation?: LLMValidationPort; // Optional LLM validation
}

export interface CodeExecutor {
  execute(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[]
  ): Promise<readonly TestResultData[]>;

  /** Execute with custom timeout for complexity budget testing */
  executeWithTimeout?(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[],
    timeoutMs: number
  ): Promise<readonly TestResultData[]>;
}

export class CodeSubmitError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'CodeSubmitError';
  }
}

/**
 * Generate pattern-specific feedback when time budget is exceeded.
 */
function generateBudgetFeedback(pattern: PatternId, targetComplexity: string): string {
  const patternHints: Partial<Record<PatternId, string>> = {
    SLIDING_WINDOW: 'Consider a single-pass sliding window approach to achieve O(n).',
    TWO_POINTERS: 'Try a two-pointer technique to avoid nested iterations.',
    PREFIX_SUM: 'Precompute prefix sums to answer range queries in O(1).',
    BINARY_SEARCH: 'Binary search can reduce O(n) searches to O(log n).',
    INTERVAL_MERGING: 'Sort intervals first, then merge in a single pass.',
    DYNAMIC_PROGRAMMING: 'Use memoization or tabulation to avoid redundant computation.',
    BFS: 'BFS with proper visited tracking runs in O(V + E).',
    DFS: 'DFS with proper visited tracking runs in O(V + E).',
    BACKTRACKING: 'Prune invalid branches early to reduce search space.',
    GREEDY: 'A greedy approach can often achieve O(n log n) with sorting.',
    HEAP: 'Use a heap to efficiently track min/max in O(log n) per operation.',
    TRIE: 'A trie enables O(L) lookup where L is the word length.',
    UNION_FIND: 'Union-Find with path compression achieves near O(1) per operation.',
  };

  const hint = patternHints[pattern] ?? 'Consider a more efficient algorithmic approach.';
  return `Your approach likely exceeds the expected ${targetComplexity} time complexity. ${hint}`;
}

export async function submitCode(
  input: SubmitCodeInput,
  deps: SubmitCodeDeps
): Promise<SubmitCodeOutput> {
  const { tenantId, userId, attemptId, code, language } = input;
  const { attemptRepo, contentRepo, skillRepo, eventSink, clock, idGenerator, codeExecutor } = deps;

  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new CodeSubmitError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  if (attempt.userId !== userId) {
    throw new CodeSubmitError('Unauthorized', 'UNAUTHORIZED');
  }

  // Gate checks
  if (!hasPassedThinkingGate(attempt)) {
    throw new CodeSubmitError(
      'Must pass thinking gate before submitting code',
      'THINKING_GATE_REQUIRED'
    );
  }

  if (needsReflection(attempt) && !hasPassedReflection(attempt)) {
    throw new CodeSubmitError(
      'Must pass reflection gate before resubmitting',
      'REFLECTION_REQUIRED'
    );
  }

  if (attempt.state !== 'CODING') {
    throw new CodeSubmitError(
      'Cannot submit code in current state',
      'INVALID_STATE'
    );
  }

  // Get problem for test cases
  const problem = await contentRepo.findById(tenantId, attempt.problemId);
  if (!problem) {
    throw new CodeSubmitError('Problem not found', 'PROBLEM_NOT_FOUND');
  }

  // Execute code against test cases
  const testResults = await codeExecutor.execute(
    code,
    language,
    problem.testCases.map((tc) => ({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    }))
  );

  // ============ Budget Tests (Large Hidden Tests) ============
  // Run large hidden tests with stricter timeout to detect suboptimal complexity
  let budgetTestResults: readonly TestResultData[] = [];
  let timeBudgetExceeded = false;
  let timeBudgetResult: CodingValidationData['timeBudgetResult'] = undefined;
  let complexitySuggestion: string | undefined;

  if (
    problem.largeHiddenTests &&
    problem.largeHiddenTests.length > 0 &&
    problem.timeoutBudgetMs &&
    codeExecutor.executeWithTimeout
  ) {
    const budgetTimeout = problem.timeoutBudgetMs;

    budgetTestResults = await codeExecutor.executeWithTimeout(
      code,
      language,
      problem.largeHiddenTests.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
      })),
      budgetTimeout
    );

    // Check if any budget test timed out (Time Limit Exceeded)
    const timedOutTests = budgetTestResults.filter(
      (r) => !r.passed && r.error?.includes('Time Limit Exceeded')
    );
    timeBudgetExceeded = timedOutTests.length > 0;

    timeBudgetResult = {
      exceeded: timeBudgetExceeded,
      budgetMs: budgetTimeout,
      testsRun: budgetTestResults.length,
      testsFailed: budgetTestResults.filter((r) => !r.passed).length,
    };

    if (timeBudgetExceeded) {
      complexitySuggestion = generateBudgetFeedback(
        attempt.pattern,
        problem.targetComplexity
      );
    }
  }

  const now = clock.now();
  const stepId = idGenerator.generate();

  // ============ Validation Engine ============

  // 1. Run rubric grading
  const testsPassed = testResults.filter((t) => t.passed).length;
  const testsTotal = testResults.length;

  const rubricResult = gradeSubmission({
    pattern: attempt.pattern,
    rung: attempt.rung,
    context: {
      code,
      language,
      testsPassed,
      testsTotal,
      patternDetected: attempt.pattern, // From thinking gate
    },
  });

  // 2. Run pattern-specific heuristics
  const heuristicResults = runHeuristics(attempt.pattern, code, language);
  const heuristicErrors: ErrorEvent[] = heuristicResults
    .filter((r) => !r.passed && r.errorType)
    .map((r) => ({
      type: r.errorType!,
      severity: 'ERROR' as const,
      message: r.suggestion ?? 'Heuristic check failed',
      evidence: r.evidence,
    }));

  // 2b. Add TIME_BUDGET_EXCEEDED error if budget was exceeded
  if (timeBudgetExceeded && complexitySuggestion) {
    heuristicErrors.push({
      type: 'TIME_BUDGET_EXCEEDED',
      severity: 'ERROR',
      message: complexitySuggestion,
      evidence: ['Large input test exceeded time budget'],
    });
  }

  // 3. Detect forbidden concepts
  const additionalForbidden = getForbiddenForPattern(attempt.pattern);
  const forbiddenResult = detectForbiddenConcepts(code, attempt.pattern, additionalForbidden);

  // 4. Optional LLM validation (if enabled)
  let llmResult: LLMValidationResponse | null = null;
  if (deps.llmValidation?.isEnabled()) {
    llmResult = await deps.llmValidation.validateCode({
      code,
      language,
      expectedPattern: attempt.pattern,
      testResults: testResults.map((t) => ({
        input: t.input,
        expected: t.expected,
        actual: t.actual,
        passed: t.passed,
      })),
      heuristicErrors: heuristicErrors,
    });

    // Merge LLM-detected errors with heuristic errors
    if (llmResult?.errors) {
      for (const error of llmResult.errors) {
        // Only add if not a duplicate
        const isDuplicate = heuristicErrors.some(
          (e) => e.type === error.type && e.message === error.message
        );
        if (!isDuplicate) {
          // Map LLM error type to known ErrorType, default to 'UNKNOWN'
          const errorType: ErrorType = ERROR_TYPES.includes(error.type as ErrorType)
            ? (error.type as ErrorType)
            : 'UNKNOWN';
          heuristicErrors.push({
            type: errorType,
            severity: error.severity,
            message: error.message,
            evidence: error.lineNumber ? [`Line ${error.lineNumber}`] : undefined,
          });
        }
      }
    }
  }

  // 5. Collect previous failures for gating context
  const previousCodingSteps = attempt.steps.filter(
    (s) => s.type === 'CODING' && s.result === 'FAIL'
  );
  const previousFailures = previousCodingSteps
    .flatMap((s) => {
      const data = s.data as CodingData;
      return data.validation?.heuristicErrors ?? [];
    })
    .filter((e): e is string => typeof e === 'string');

  // 6. Make gating decision
  const allErrors: ErrorEvent[] = [...heuristicErrors, ...forbiddenResult.errors];

  let gatingDecision = makeGatingDecision({
    pattern: attempt.pattern,
    rung: attempt.rung,
    rubric: rubricResult,
    errors: allErrors,
    attemptCount: attempt.codeSubmissions + 1,
    hintsUsed: attempt.hintsUsed.length,
    previousFailures: previousFailures.map((e) => e as any), // ErrorType
  });

  // 6b. Override gating decision if LLM detected issues with high confidence
  const LLM_CONFIDENCE_THRESHOLD = 0.8;
  if (
    llmResult &&
    llmResult.confidence >= LLM_CONFIDENCE_THRESHOLD &&
    llmResult.grade === 'FAIL' &&
    gatingDecision.action === 'PROCEED'
  ) {
    // LLM detected a problem that heuristics missed - require reflection
    gatingDecision = {
      action: 'REQUIRE_REFLECTION',
      reason: `LLM detected code issues: ${llmResult.feedback?.slice(0, 100)}...`,
      microLessonId: llmResult.suggestedMicroLesson ?? undefined,
    };
  } else if (
    llmResult &&
    llmResult.confidence >= LLM_CONFIDENCE_THRESHOLD &&
    llmResult.grade === 'PARTIAL' &&
    gatingDecision.action === 'PROCEED'
  ) {
    // LLM detected partial issues - show micro lesson
    gatingDecision = {
      action: 'SHOW_MICRO_LESSON',
      reason: `LLM suggests improvement: ${llmResult.feedback?.slice(0, 100)}...`,
      microLessonId: llmResult.suggestedMicroLesson ?? undefined,
    };
  }

  // 7. Build validation data
  const validation: CodingValidationData = {
    rubricGrade: llmResult?.grade ?? rubricResult.grade, // Use LLM grade if available
    rubricScore: rubricResult.score,
    heuristicErrors: heuristicErrors.map((e) => e.type),
    forbiddenConcepts: forbiddenResult.detected.map((d) => d.concept.id),
    gatingAction: gatingDecision.action,
    gatingReason: gatingDecision.reason,
    microLessonId: llmResult?.suggestedMicroLesson ?? gatingDecision.microLessonId,
    llmFeedback: llmResult?.feedback,
    llmConfidence: llmResult?.confidence,
    successReflectionPrompt: gatingDecision.successReflectionPrompt,
    timeBudgetResult,
    complexitySuggestion,
  };

  // ============ Determine next state based on gating ============

  const allTestsPassed = testResults.every((t) => t.passed);
  let nextState: Attempt['state'];

  if (gatingDecision.action === 'BLOCK_SUBMISSION') {
    // Blocked - stay in coding state, don't count as submission
    nextState = 'CODING';
  } else if (gatingDecision.action === 'PROCEED_WITH_REFLECTION' && allTestsPassed) {
    // Success with optional reflection - go to SUCCESS_REFLECTION state
    nextState = 'SUCCESS_REFLECTION';
  } else if (gatingDecision.action === 'PROCEED' && allTestsPassed) {
    nextState = 'COMPLETED';
  } else if (gatingDecision.action === 'SHOW_MICRO_LESSON') {
    // Show lesson then allow retry
    nextState = 'CODING';
  } else if (gatingDecision.action === 'REQUIRE_REFLECTION') {
    nextState = 'REFLECTION';
  } else {
    // Default: go to reflection if failed
    nextState = allTestsPassed ? 'COMPLETED' : 'REFLECTION';
  }

  const codingData: CodingData = {
    type: 'CODING',
    code,
    language,
    testResults,
    validation,
  };

  const newStep = {
    id: stepId,
    attemptId,
    type: 'CODING' as const,
    result: allTestsPassed ? ('PASS' as const) : ('FAIL' as const),
    data: codingData,
    startedAt: now,
    completedAt: now,
  };

  const updatedAttempt: Attempt = {
    ...attempt,
    state: nextState,
    steps: [...attempt.steps, newStep],
    codeSubmissions: gatingDecision.action === 'BLOCK_SUBMISSION'
      ? attempt.codeSubmissions // Don't count blocked submissions
      : attempt.codeSubmissions + 1,
    completedAt: nextState === 'COMPLETED' ? now : null,
  };

  await attemptRepo.update(updatedAttempt);

  // ============ Persist Skill Score on Completion ============
  // Score is computed when attempt transitions to COMPLETED or SUCCESS_REFLECTION
  // (both indicate all tests have passed)
  let attemptScore: AttemptScore | undefined;

  if (nextState === 'COMPLETED' || nextState === 'SUCCESS_REFLECTION') {
    // Compute attempt score
    const scoreResult = computeAttemptScore({ attempt: updatedAttempt });
    attemptScore = scoreResult.score;

    // Update or create skill state using idempotent update
    const existingSkill = await skillRepo.findByUserAndPattern(
      tenantId,
      userId,
      attempt.pattern,
      attempt.rung
    );

    if (existingSkill) {
      // Update with new score using exponential moving average
      // Use idempotent update to prevent double-counting
      const newScore = computeNewScore(
        existingSkill.score,
        existingSkill.attemptsCount,
        attemptScore.overall
      );

      await skillRepo.updateIfNotApplied(
        {
          ...existingSkill,
          score: newScore,
          attemptsCount: existingSkill.attemptsCount + 1,
          lastAttemptAt: now,
          updatedAt: now,
          // Set unlockedAt if crossing threshold for first time
          unlockedAt:
            newScore >= RUNG_UNLOCK_THRESHOLD && !existingSkill.unlockedAt
              ? now
              : existingSkill.unlockedAt,
        },
        attemptId // Use attempt ID as idempotency key
      );
    } else {
      // Create new skill state with attempt ID for idempotency
      await skillRepo.save({
        id: idGenerator.generate(),
        tenantId,
        userId,
        pattern: attempt.pattern,
        rung: attempt.rung,
        score: attemptScore.overall,
        attemptsCount: 1,
        lastAttemptAt: now,
        unlockedAt: attemptScore.overall >= RUNG_UNLOCK_THRESHOLD ? now : null,
        updatedAt: now,
        lastAppliedAttemptId: attemptId, // Track which attempt was applied
      });
    }
  }

  const startedAt = attempt.steps.length > 0
    ? attempt.steps[attempt.steps.length - 1]?.completedAt ?? attempt.startedAt
    : attempt.startedAt;
  const durationMs = now.getTime() - startedAt.getTime();

  await eventSink.emit({
    type: 'STEP_COMPLETED',
    tenantId,
    userId,
    attemptId,
    stepType: 'CODING',
    result: allTestsPassed ? 'PASS' : 'FAIL',
    durationMs,
    timestamp: now,
  });

  // passed is true when all tests pass and gating allows progress
  // Both PROCEED and PROCEED_WITH_REFLECTION indicate success
  const passed = allTestsPassed && (
    gatingDecision.action === 'PROCEED' ||
    gatingDecision.action === 'PROCEED_WITH_REFLECTION'
  );

  return {
    attempt: updatedAttempt,
    testResults,
    passed,
    validation,
    gatingDecision,
    score: attemptScore,
  };
}
