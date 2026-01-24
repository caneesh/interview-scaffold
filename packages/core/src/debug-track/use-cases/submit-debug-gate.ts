/**
 * Use Case: Submit Debug Gate
 * Evaluates a user's answer for the current gate and handles transitions.
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Clock } from '../../ports/index.js';
import type {
  DebugScenarioRepo,
  DebugAttemptRepo,
  DebugEvaluator,
  DebugEventSink,
} from '../ports.js';
import type {
  DebugAttempt,
  DebugScenario,
  GateSubmission,
  EvaluationResult,
  GateTimer,
} from '../entities.js';
import type { DebugGate } from '../types.js';
import {
  computeTransition,
  DEFAULT_RETRY_LIMITS,
  getNextGate,
  isFinalGate,
} from '../state-machine.js';

// ============ Input/Output Types ============

export interface SubmitDebugGateInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
  readonly gateId: DebugGate;
  readonly answer: string;
}

export interface SubmitDebugGateOutput {
  readonly attempt: DebugAttempt;
  readonly evaluationResult: EvaluationResult;
  readonly transitioned: boolean;
  readonly nextGate: DebugGate | null;
  readonly attemptCompleted: boolean;
}

export interface SubmitDebugGateDeps {
  readonly debugScenarioRepo: DebugScenarioRepo;
  readonly debugAttemptRepo: DebugAttemptRepo;
  readonly debugEvaluator: DebugEvaluator;
  readonly eventSink: DebugEventSink;
  readonly clock: Clock;
}

// ============ Error Class ============

export class DebugGateError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'DebugGateError';
  }
}

// ============ Use Case ============

export async function submitDebugGate(
  input: SubmitDebugGateInput,
  deps: SubmitDebugGateDeps
): Promise<SubmitDebugGateOutput> {
  const { tenantId, userId, attemptId, gateId, answer } = input;
  const { debugScenarioRepo, debugAttemptRepo, debugEvaluator, eventSink, clock } = deps;

  // 1. Load attempt
  const attempt = await debugAttemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new DebugGateError('Debug attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  // 2. Validate ownership
  if (attempt.userId !== userId) {
    throw new DebugGateError('Unauthorized access to attempt', 'UNAUTHORIZED');
  }

  // 3. Validate attempt is in progress
  if (attempt.status !== 'IN_PROGRESS') {
    throw new DebugGateError(
      `Cannot submit to ${attempt.status} attempt`,
      'ATTEMPT_NOT_ACTIVE'
    );
  }

  // 4. Validate gate matches current gate
  if (gateId !== attempt.currentGate) {
    throw new DebugGateError(
      `Expected gate ${attempt.currentGate}, received ${gateId}`,
      'WRONG_GATE'
    );
  }

  // 5. Load scenario for evaluation context
  const scenario = await debugScenarioRepo.findById(attempt.scenarioId);
  if (!scenario) {
    throw new DebugGateError('Debug scenario not found', 'SCENARIO_NOT_FOUND');
  }

  const now = clock.now();
  const currentRetries = attempt.retriesPerGate[gateId] ?? 0;

  // 6. Evaluate the answer
  const evaluationResult = await debugEvaluator.evaluate(gateId, answer, scenario, {
    previousSubmissions: attempt.gateHistory.filter((s) => s.gateId === gateId),
    hintsUsed: attempt.hintsUsed,
    retryCount: currentRetries,
  });

  // 7. Create submission record
  const submission: GateSubmission = {
    gateId,
    answer,
    timestamp: now,
    evaluationResult,
  };

  // 8. Compute transition
  const transition = computeTransition(
    {
      ...attempt,
      retriesPerGate: {
        ...attempt.retriesPerGate,
        [gateId]: currentRetries + 1,
      },
    },
    evaluationResult,
    DEFAULT_RETRY_LIMITS
  );

  // 9. Build updated attempt
  const newGateHistory = [...attempt.gateHistory, submission];
  const newRetriesPerGate = {
    ...attempt.retriesPerGate,
    [gateId]: currentRetries + 1,
  };

  // Update timers
  let newTimers = [...attempt.timers];
  const currentTimer = newTimers.find((t) => t.gateId === gateId);

  if (transition.allowed && transition.nextGate !== gateId) {
    // Complete current timer
    if (currentTimer) {
      newTimers = newTimers.map((t) =>
        t.gateId === gateId ? { ...t, completedAt: now } : t
      );
    }

    // Start timer for next gate if not final
    if (transition.nextGate !== null) {
      const newTimer: GateTimer = {
        gateId: transition.nextGate,
        startedAt: now,
        completedAt: null,
        pausedDurationMs: 0,
      };
      newTimers = [...newTimers, newTimer];
    }
  }

  const updatedAttempt: DebugAttempt = {
    ...attempt,
    currentGate: transition.nextGate ?? attempt.currentGate,
    gateHistory: newGateHistory,
    retriesPerGate: newRetriesPerGate,
    timers: newTimers,
    status: transition.attemptCompleted ? 'COMPLETED' : attempt.status,
    completedAt: transition.attemptCompleted ? now : null,
  };

  // 10. Persist updated attempt
  const savedAttempt = await debugAttemptRepo.update(updatedAttempt);

  // 11. Emit events
  await eventSink.emit({
    type: 'DEBUG_GATE_SUBMITTED',
    tenantId,
    userId,
    attemptId,
    gate: gateId,
    isCorrect: evaluationResult.isCorrect,
    retryCount: currentRetries + 1,
    timestamp: now,
  });

  if (evaluationResult.isCorrect || evaluationResult.allowProceed) {
    const timer = attempt.timers.find((t) => t.gateId === gateId);
    const elapsedMs = timer
      ? now.getTime() - timer.startedAt.getTime() - timer.pausedDurationMs
      : 0;

    await eventSink.emit({
      type: 'DEBUG_GATE_PASSED',
      tenantId,
      userId,
      attemptId,
      gate: gateId,
      elapsedMs,
      timestamp: now,
    });
  }

  if (transition.attemptCompleted) {
    const durationMs = now.getTime() - attempt.startedAt.getTime();

    await eventSink.emit({
      type: 'DEBUG_ATTEMPT_COMPLETED',
      tenantId,
      userId,
      attemptId,
      scenarioId: attempt.scenarioId,
      score: 0, // Score computed separately in finalize
      hintsUsed: attempt.hintsUsed,
      durationMs,
      timestamp: now,
    });
  }

  return {
    attempt: savedAttempt,
    evaluationResult,
    transitioned: transition.allowed && transition.nextGate !== gateId,
    nextGate: transition.nextGate,
    attemptCompleted: transition.attemptCompleted,
  };
}
