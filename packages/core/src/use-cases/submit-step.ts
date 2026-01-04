import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt, AttemptState } from '../entities/attempt.js';
import type { Step, StepType, StepResult, StepData } from '../entities/step.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { EventSink } from '../ports/event-sink.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { hasPassedThinkingGate } from '../entities/attempt.js';

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
}

export interface SubmitStepDeps {
  readonly attemptRepo: AttemptRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
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
  const { attemptRepo, eventSink, clock, idGenerator } = deps;

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

  // Evaluate step result
  const result = evaluateStep(stepType, data);

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
  };
}

function validateStateTransition(attempt: Attempt, stepType: StepType): void {
  const { state } = attempt;

  switch (stepType) {
    case 'THINKING_GATE':
      if (state !== 'THINKING_GATE') {
        throw new StepError(
          'Cannot submit thinking gate in current state',
          'INVALID_STATE'
        );
      }
      break;

    case 'CODING':
      if (state !== 'CODING') {
        throw new StepError(
          'Cannot submit code in current state',
          'INVALID_STATE'
        );
      }
      if (!hasPassedThinkingGate(attempt)) {
        throw new StepError(
          'Must pass thinking gate before coding',
          'THINKING_GATE_REQUIRED'
        );
      }
      break;

    case 'REFLECTION':
      if (state !== 'REFLECTION') {
        throw new StepError(
          'Cannot submit reflection in current state',
          'INVALID_STATE'
        );
      }
      break;

    case 'HINT':
      if (state !== 'HINT' && state !== 'CODING') {
        throw new StepError(
          'Cannot request hint in current state',
          'INVALID_STATE'
        );
      }
      break;
  }
}

function evaluateStep(stepType: StepType, data: StepData): StepResult {
  switch (stepType) {
    case 'THINKING_GATE': {
      const d = data as Extract<StepData, { type: 'THINKING_GATE' }>;
      // Pass if pattern and invariant are provided
      if (d.selectedPattern && d.statedInvariant) {
        return 'PASS';
      }
      return 'FAIL';
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
