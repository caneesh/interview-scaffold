import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt } from '../entities/attempt.js';
import type { TestResultData, CodingData, CodingValidationData } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { EventSink } from '../ports/event-sink.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { hasPassedThinkingGate, hasPassedReflection, needsReflection } from '../entities/attempt.js';
import type { GatingDecision, ErrorEvent } from '../validation/types.js';
import { gradeSubmission } from '../validation/rubric.js';
import { runHeuristics } from '../validation/heuristics.js';
import { detectForbiddenConcepts, getForbiddenForPattern } from '../validation/forbidden.js';
import { makeGatingDecision } from '../validation/gating.js';

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
}

export interface SubmitCodeDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly codeExecutor: CodeExecutor;
}

export interface CodeExecutor {
  execute(
    code: string,
    language: string,
    testCases: readonly { input: string; expectedOutput: string }[]
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

export async function submitCode(
  input: SubmitCodeInput,
  deps: SubmitCodeDeps
): Promise<SubmitCodeOutput> {
  const { tenantId, userId, attemptId, code, language } = input;
  const { attemptRepo, contentRepo, eventSink, clock, idGenerator, codeExecutor } = deps;

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

  // 3. Detect forbidden concepts
  const additionalForbidden = getForbiddenForPattern(attempt.pattern);
  const forbiddenResult = detectForbiddenConcepts(code, attempt.pattern, additionalForbidden);

  // 4. Collect previous failures for gating context
  const previousCodingSteps = attempt.steps.filter(
    (s) => s.type === 'CODING' && s.result === 'FAIL'
  );
  const previousFailures = previousCodingSteps
    .flatMap((s) => {
      const data = s.data as CodingData;
      return data.validation?.heuristicErrors ?? [];
    })
    .filter((e): e is string => typeof e === 'string');

  // 5. Make gating decision
  const allErrors: ErrorEvent[] = [...heuristicErrors, ...forbiddenResult.errors];

  const gatingDecision = makeGatingDecision({
    pattern: attempt.pattern,
    rung: attempt.rung,
    rubric: rubricResult,
    errors: allErrors,
    attemptCount: attempt.codeSubmissions + 1,
    hintsUsed: attempt.hintsUsed.length,
    previousFailures: previousFailures.map((e) => e as any), // ErrorType
  });

  // 6. Build validation data
  const validation: CodingValidationData = {
    rubricGrade: rubricResult.grade,
    rubricScore: rubricResult.score,
    heuristicErrors: heuristicErrors.map((e) => e.type),
    forbiddenConcepts: forbiddenResult.detected.map((d) => d.concept.id),
    gatingAction: gatingDecision.action,
    gatingReason: gatingDecision.reason,
    microLessonId: gatingDecision.microLessonId,
  };

  // ============ Determine next state based on gating ============

  const allTestsPassed = testResults.every((t) => t.passed);
  let nextState: Attempt['state'];

  if (gatingDecision.action === 'BLOCK_SUBMISSION') {
    // Blocked - stay in coding state, don't count as submission
    nextState = 'CODING';
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

  return {
    attempt: updatedAttempt,
    testResults,
    passed: allTestsPassed && gatingDecision.action === 'PROCEED',
    validation,
    gatingDecision,
  };
}
