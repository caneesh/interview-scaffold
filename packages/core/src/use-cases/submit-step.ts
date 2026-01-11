import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt, AttemptState } from '../entities/attempt.js';
import type { Step, StepType, StepResult, StepData } from '../entities/step.js';
import type { Problem } from '../entities/problem.js';
import type { PatternId, PATTERNS } from '../entities/pattern.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { EventSink } from '../ports/event-sink.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { hasPassedThinkingGate } from '../entities/attempt.js';
import {
  validateThinkingGate,
  type ThinkingGateValidationResult,
  type ThinkingGateInput,
  type ThinkingGateContext,
  type ThinkingGateLLMPort,
  createNullThinkingGateLLM,
  validateThinkingGateWithLLM,
} from '../validation/thinking-gate.js';

export interface SubmitStepInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly stepType: StepType;
  readonly data: StepData;
}

export interface SubmitStepOutput {
  readonly attempt: Attempt;
  readonly step: Step;
  readonly passed: boolean;
  readonly validation?: ThinkingGateValidationResult;
}

export interface SubmitStepDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly thinkingGateLLM?: ThinkingGateLLMPort;
}

export class StepError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'StepError';
  }
}

export async function submitStep(
  input: SubmitStepInput,
  deps: SubmitStepDeps
): Promise<SubmitStepOutput> {
  const { tenantId, userId, attemptId, stepType, data } = input;
  const { attemptRepo, contentRepo, eventSink, clock, idGenerator } = deps;
  const thinkingGateLLM = deps.thinkingGateLLM ?? createNullThinkingGateLLM();

  const attempt = await attemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new StepError('Attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  if (attempt.userId !== userId) {
    throw new StepError('Unauthorized', 'UNAUTHORIZED');
  }

  // Validate state transitions
  validateStateTransition(attempt, stepType);

  const now = clock.now();
  const stepId = idGenerator.generate();

  // For THINKING_GATE, run semantic validation
  let validation: ThinkingGateValidationResult | undefined;
  let result: StepResult;

  if (stepType === 'THINKING_GATE') {
    const d = data as Extract<StepData, { type: 'THINKING_GATE' }>;

    // Validate required fields are present
    if (!d.selectedPattern || !d.statedInvariant) {
      // Early fail if required fields are missing
      validation = {
        passed: false,
        errors: [
          ...(!d.selectedPattern ? [{
            field: 'pattern' as const,
            code: 'PATTERN_REQUIRED',
            message: 'Please select a pattern.',
            hint: 'Choose the algorithmic pattern that best fits this problem.',
          }] : []),
          ...(!d.statedInvariant ? [{
            field: 'invariant' as const,
            code: 'INVARIANT_REQUIRED',
            message: 'Please state an invariant.',
            hint: 'Describe what property your solution will maintain throughout execution.',
          }] : []),
        ],
        warnings: [],
        llmAugmented: false,
      };
      result = 'FAIL';
    } else {
      // Fetch the problem for context
      const problem = await contentRepo.findById(tenantId, attempt.problemId);
      if (!problem) {
        throw new StepError('Problem not found', 'PROBLEM_NOT_FOUND');
      }

      // Build validation context
      const validationInput: ThinkingGateInput = {
        selectedPattern: d.selectedPattern,
        statedInvariant: d.statedInvariant,
        statedComplexity: d.statedComplexity ?? null,
      };

      const validationContext: ThinkingGateContext = {
        problem,
        allowedPatterns: getAllowedPatternsForProblem(problem),
      };

      // Run semantic validation with optional LLM augmentation
      validation = await validateThinkingGateWithLLM(
        validationInput,
        validationContext,
        thinkingGateLLM
      );

      result = validation.passed ? 'PASS' : 'FAIL';
    }
  } else {
    // Evaluate non-thinking-gate steps
    result = evaluateStep(stepType, data);
  }

  const step: Step = {
    id: stepId,
    attemptId,
    type: stepType,
    result,
    data,
    startedAt: now,
    completedAt: now,
  };

  // Determine next state
  const nextState = computeNextState(attempt, stepType, result);

  const updatedAttempt: Attempt = {
    ...attempt,
    state: nextState,
    steps: [...attempt.steps, step],
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
    stepType,
    result: result ?? 'SKIP',
    durationMs,
    timestamp: now,
  });

  return {
    attempt: updatedAttempt,
    step,
    passed: result === 'PASS',
    validation,
  };
}

/**
 * Get allowed patterns for a problem
 * For now, returns only the problem's pattern (strict matching)
 * Future: could allow related patterns at different rung levels
 */
function getAllowedPatternsForProblem(problem: Problem): PatternId[] {
  return [problem.pattern];
}

/**
 * Valid state transitions in the attempt state machine:
 *
 * THINKING_GATE -> (submit thinking gate) -> CODING (if pass) or THINKING_GATE (if fail)
 * CODING        -> (submit code)          -> COMPLETED (if pass) or REFLECTION (if fail)
 * CODING        -> (request hint)         -> CODING (hints don't change state beyond tracking)
 * REFLECTION    -> (submit reflection)    -> CODING (retry after reflection)
 * COMPLETED     -> (terminal state)       -> No further transitions allowed
 * ABANDONED     -> (terminal state)       -> No further transitions allowed
 */
function validateStateTransition(attempt: Attempt, stepType: StepType): void {
  const { state } = attempt;

  // Reject any action on terminal states
  if (state === 'COMPLETED') {
    throw new StepError(
      'Attempt is already completed. No further submissions allowed.',
      'ATTEMPT_COMPLETED'
    );
  }

  if (state === 'ABANDONED') {
    throw new StepError(
      'Attempt was abandoned. Start a new attempt.',
      'ATTEMPT_ABANDONED'
    );
  }

  switch (stepType) {
    case 'THINKING_GATE':
      if (state !== 'THINKING_GATE') {
        throw new StepError(
          `Cannot submit thinking gate: attempt is in ${state} state. Expected: THINKING_GATE`,
          'INVALID_STATE_FOR_THINKING_GATE'
        );
      }
      // Prevent re-submission if already passed
      if (hasPassedThinkingGate(attempt)) {
        throw new StepError(
          'Thinking gate already passed. Proceed to coding.',
          'THINKING_GATE_ALREADY_PASSED'
        );
      }
      break;

    case 'CODING':
      if (state !== 'CODING') {
        const hint = state === 'THINKING_GATE'
          ? 'Complete the thinking gate first.'
          : state === 'REFLECTION'
            ? 'Complete the reflection step first.'
            : 'Invalid state for code submission.';
        throw new StepError(
          `Cannot submit code: attempt is in ${state} state. ${hint}`,
          'INVALID_STATE_FOR_CODING'
        );
      }
      if (!hasPassedThinkingGate(attempt)) {
        throw new StepError(
          'Must pass thinking gate before submitting code. This is a system error.',
          'THINKING_GATE_REQUIRED'
        );
      }
      break;

    case 'REFLECTION':
      if (state !== 'REFLECTION') {
        throw new StepError(
          `Cannot submit reflection: attempt is in ${state} state. Reflection is only available after failed code submission.`,
          'INVALID_STATE_FOR_REFLECTION'
        );
      }
      break;

    case 'HINT':
      // Hints are allowed during CODING or HINT state
      if (state !== 'HINT' && state !== 'CODING') {
        throw new StepError(
          `Cannot request hint: attempt is in ${state} state. Hints are only available during coding.`,
          'INVALID_STATE_FOR_HINT'
        );
      }
      if (!hasPassedThinkingGate(attempt)) {
        throw new StepError(
          'Must pass thinking gate before requesting hints.',
          'THINKING_GATE_REQUIRED'
        );
      }
      break;
  }
}

/**
 * Evaluates non-thinking-gate steps
 * THINKING_GATE is handled separately with semantic validation
 */
function evaluateStep(stepType: StepType, data: StepData): StepResult {
  switch (stepType) {
    case 'THINKING_GATE': {
      // This should not be called for THINKING_GATE (handled separately)
      // Fallback to presence check for backwards compatibility
      const d = data as Extract<StepData, { type: 'THINKING_GATE' }>;
      return d.selectedPattern && d.statedInvariant ? 'PASS' : 'FAIL';
    }

    case 'CODING': {
      const d = data as Extract<StepData, { type: 'CODING' }>;
      // Pass if all tests pass
      const allPassed = d.testResults.every((t) => t.passed);
      return allPassed ? 'PASS' : 'FAIL';
    }

    case 'REFLECTION': {
      const d = data as Extract<StepData, { type: 'REFLECTION' }>;
      return d.correct ? 'PASS' : 'FAIL';
    }

    case 'HINT':
      return 'PASS'; // Hints always "pass"
  }
}

function computeNextState(
  attempt: Attempt,
  stepType: StepType,
  result: StepResult | null
): AttemptState {
  switch (stepType) {
    case 'THINKING_GATE':
      return result === 'PASS' ? 'CODING' : 'THINKING_GATE';

    case 'CODING':
      if (result === 'PASS') return 'COMPLETED';
      return 'REFLECTION';

    case 'REFLECTION':
      return result === 'PASS' ? 'CODING' : 'REFLECTION';

    case 'HINT':
      return 'CODING';

    default:
      return attempt.state;
  }
}
