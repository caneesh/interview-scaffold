/**
 * Use Case: Request Debug Hint
 * Returns the next hint in the ladder and increments the hint count.
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Clock } from '../../ports/index.js';
import type { DebugScenarioRepo, DebugAttemptRepo, DebugEventSink } from '../ports.js';
import type { DebugAttempt, DebugScenario, DebugPolicyConfig } from '../entities.js';
import { DEFAULT_DEBUG_POLICY } from '../entities.js';
import { canRequestHint } from '../state-machine.js';

// ============ Input/Output Types ============

export interface RequestDebugHintInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: string;
}

export interface RequestDebugHintOutput {
  readonly hint: string;
  readonly hintLevel: number;
  readonly hintsRemaining: number;
  readonly attempt: DebugAttempt;
}

export interface RequestDebugHintDeps {
  readonly debugScenarioRepo: DebugScenarioRepo;
  readonly debugAttemptRepo: DebugAttemptRepo;
  readonly eventSink: DebugEventSink;
  readonly clock: Clock;
  readonly policy?: DebugPolicyConfig;
}

// ============ Error Class ============

export class DebugHintError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'DebugHintError';
  }
}

// ============ Use Case ============

export async function requestDebugHint(
  input: RequestDebugHintInput,
  deps: RequestDebugHintDeps
): Promise<RequestDebugHintOutput> {
  const { tenantId, userId, attemptId } = input;
  const { debugScenarioRepo, debugAttemptRepo, eventSink, clock } = deps;
  const policy = deps.policy ?? DEFAULT_DEBUG_POLICY;

  // 1. Load attempt
  const attempt = await debugAttemptRepo.findById(tenantId, attemptId);
  if (!attempt) {
    throw new DebugHintError('Debug attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  // 2. Validate ownership
  if (attempt.userId !== userId) {
    throw new DebugHintError('Unauthorized access to attempt', 'UNAUTHORIZED');
  }

  // 3. Validate attempt is in progress
  if (attempt.status !== 'IN_PROGRESS') {
    throw new DebugHintError(
      `Cannot request hint for ${attempt.status} attempt`,
      'ATTEMPT_NOT_ACTIVE'
    );
  }

  // 4. Load scenario for hint ladder
  const scenario = await debugScenarioRepo.findById(attempt.scenarioId);
  if (!scenario) {
    throw new DebugHintError('Debug scenario not found', 'SCENARIO_NOT_FOUND');
  }

  // 5. Check if hints are allowed
  const hintCheck = canRequestHint(attempt, policy, scenario.hintLadder.length);
  if (!hintCheck.allowed) {
    throw new DebugHintError(hintCheck.reason, 'HINTS_EXHAUSTED');
  }

  // 6. Get next hint
  const hintLevel = attempt.hintsUsed;
  const hint = scenario.hintLadder[hintLevel];
  if (!hint) {
    throw new DebugHintError('No more hints available', 'HINTS_EXHAUSTED');
  }

  const now = clock.now();

  // 7. Update attempt
  const updatedAttempt: DebugAttempt = {
    ...attempt,
    hintsUsed: attempt.hintsUsed + 1,
  };

  const savedAttempt = await debugAttemptRepo.update(updatedAttempt);

  // 8. Emit event
  await eventSink.emit({
    type: 'DEBUG_HINT_REQUESTED',
    tenantId,
    userId,
    attemptId,
    hintLevel: hintLevel + 1, // 1-indexed for display
    gate: attempt.currentGate,
    timestamp: now,
  });

  // 9. Calculate remaining
  const maxHints = Math.min(policy.maxHintsPerAttempt, scenario.hintLadder.length);
  const hintsRemaining = maxHints - (hintLevel + 1);

  return {
    hint,
    hintLevel: hintLevel + 1,
    hintsRemaining,
    attempt: savedAttempt,
  };
}
