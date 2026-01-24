/**
 * Use Case: Start Debug Attempt
 * Creates a new debug attempt for a user on a specific scenario.
 */

import type { TenantId } from '../../entities/tenant.js';
import type { Clock, IdGenerator } from '../../ports/index.js';
import type { DebugScenarioRepo, DebugAttemptRepo, DebugEventSink } from '../ports.js';
import type { DebugAttempt, DebugScenario } from '../entities.js';
import { createDebugAttempt } from '../entities.js';

// ============ Input/Output Types ============

export interface StartDebugAttemptInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly scenarioId: string;
}

export interface StartDebugAttemptOutput {
  readonly attempt: DebugAttempt;
  readonly scenario: DebugScenario;
}

export interface StartDebugAttemptDeps {
  readonly debugScenarioRepo: DebugScenarioRepo;
  readonly debugAttemptRepo: DebugAttemptRepo;
  readonly eventSink: DebugEventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

// ============ Error Class ============

export class DebugAttemptError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'DebugAttemptError';
  }
}

// ============ Use Case ============

export async function startDebugAttempt(
  input: StartDebugAttemptInput,
  deps: StartDebugAttemptDeps
): Promise<StartDebugAttemptOutput> {
  const { tenantId, userId, scenarioId } = input;
  const { debugScenarioRepo, debugAttemptRepo, eventSink, clock, idGenerator } = deps;

  // 1. Check for existing active attempt
  const activeAttempt = await debugAttemptRepo.findActiveByUser(tenantId, userId);
  if (activeAttempt) {
    throw new DebugAttemptError(
      'User already has an active debug attempt. Complete or abandon it first.',
      'ACTIVE_ATTEMPT_EXISTS'
    );
  }

  // 2. Validate scenario exists
  const scenario = await debugScenarioRepo.findById(scenarioId);
  if (!scenario) {
    throw new DebugAttemptError(
      `Debug scenario not found: ${scenarioId}`,
      'SCENARIO_NOT_FOUND'
    );
  }

  // 3. Create new attempt
  const now = clock.now();
  const attemptId = idGenerator.generate();

  const attempt = createDebugAttempt({
    attemptId,
    tenantId,
    userId,
    scenarioId,
    startedAt: now,
  });

  // 4. Persist attempt
  const savedAttempt = await debugAttemptRepo.save(attempt);

  // 5. Emit event
  await eventSink.emit({
    type: 'DEBUG_ATTEMPT_STARTED',
    tenantId,
    userId,
    attemptId,
    scenarioId,
    category: scenario.category,
    difficulty: scenario.difficulty,
    timestamp: now,
  });

  return {
    attempt: savedAttempt,
    scenario,
  };
}
