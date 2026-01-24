/**
 * Use Case: Finalize Debug Attempt
 * Computes the final score and marks the attempt as complete.
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Clock } from '../../ports/index.js';
import type { DebugScenarioRepo, DebugAttemptRepo, DebugEventSink } from '../ports.js';
import type { DebugAttempt, DebugScore } from '../entities.js';
import { computeDebugScore } from '../scoring.js';

// ============ Input/Output Types ============

export interface FinalizeDebugAttemptInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
}

export interface FinalizeDebugAttemptOutput {
  readonly attempt: DebugAttempt;
  readonly score: DebugScore;
}

export interface FinalizeDebugAttemptDeps {
  readonly debugScenarioRepo: DebugScenarioRepo;
  readonly debugAttemptRepo: DebugAttemptRepo;
  readonly eventSink: DebugEventSink;
  readonly clock: Clock;
}

// ============ Error Class ============

export class FinalizeError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'FinalizeError';
  }
}

// ============ Use Case ============

export async function finalizeDebugAttempt(
  input: FinalizeDebugAttemptInput,
  deps: FinalizeDebugAttemptDeps
): Promise<FinalizeDebugAttemptOutput> {
  const { tenantId, userId, attemptId } = input;
  const { debugScenarioRepo, debugAttemptRepo, eventSink, clock } = deps;

  // 1. Load attempt
  const attempt = await debugAttemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new FinalizeError('Debug attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  // 2. Validate ownership
  if (attempt.userId !== userId) {
    throw new FinalizeError('Unauthorized access to attempt', 'UNAUTHORIZED');
  }

  // 3. Check if already finalized
  if (attempt.scoreJson !== null) {
    // Already finalized - return existing score
    return {
      attempt,
      score: attempt.scoreJson,
    };
  }

  // 4. Validate attempt is completed or can be completed
  if (attempt.status === 'ABANDONED') {
    throw new FinalizeError('Cannot finalize abandoned attempt', 'ATTEMPT_ABANDONED');
  }

  // 5. Load scenario for scoring context
  const scenario = await debugScenarioRepo.findById(attempt.scenarioId);
  if (!scenario) {
    throw new FinalizeError('Debug scenario not found', 'SCENARIO_NOT_FOUND');
  }

  const now = clock.now();

  // 6. Compute score
  const score = computeDebugScore(attempt, scenario, now);

  // 7. Update attempt with score
  const updatedAttempt: DebugAttempt = {
    ...attempt,
    status: 'COMPLETED',
    completedAt: attempt.completedAt ?? now,
    scoreJson: score,
  };

  const savedAttempt = await debugAttemptRepo.update(updatedAttempt);

  // 8. Emit completion event with score
  const durationMs = (attempt.completedAt ?? now).getTime() - attempt.startedAt.getTime();

  await eventSink.emit({
    type: 'DEBUG_ATTEMPT_COMPLETED',
    tenantId,
    userId,
    attemptId,
    scenarioId: attempt.scenarioId,
    score: score.overall,
    hintsUsed: attempt.hintsUsed,
    durationMs,
    timestamp: now,
  });

  return {
    attempt: savedAttempt,
    score,
  };
}
