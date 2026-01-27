import type { TenantId } from '../entities/tenant.js';
import type { ProblemId, Problem } from '../entities/problem.js';
import type { Attempt, AttemptV2Mode, AttemptV2Step } from '../entities/attempt.js';
import { getHintBudgetForRung } from '../entities/attempt.js';
import type { AttemptRepo } from '../ports/attempt-repo.js';
import type { ContentRepo } from '../ports/content-repo.js';
import type { SkillRepo } from '../ports/skill-repo.js';
import type { EventSink } from '../ports/event-sink.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import { isRungUnlockedForUser } from '../entities/skill-state.js';

export interface StartAttemptInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly problemId: ProblemId;
  /**
   * Enable V2 flow for this attempt
   * When true, attempt starts in UNDERSTAND step
   * When false (default), attempt uses legacy flow
   */
  readonly useV2Flow?: boolean;
  /**
   * Mode for V2 attempts (default: BEGINNER)
   */
  readonly mode?: AttemptV2Mode;
}

export interface StartAttemptOutput {
  readonly attempt: Attempt;
  readonly problem: Problem;
}

export interface StartAttemptDeps {
  readonly attemptRepo: AttemptRepo;
  readonly contentRepo: ContentRepo;
  readonly skillRepo: SkillRepo;
  readonly eventSink: EventSink;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

export class AttemptError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AttemptError';
  }
}

export async function startAttempt(
  input: StartAttemptInput,
  deps: StartAttemptDeps
): Promise<StartAttemptOutput> {
  const { tenantId, userId, problemId, useV2Flow = false, mode = 'BEGINNER' } = input;
  const { attemptRepo, contentRepo, skillRepo, eventSink, clock, idGenerator } = deps;

  // Check for existing active attempt
  const activeAttempt = await attemptRepo.findActive(tenantId, userId);
  if (activeAttempt) {
    throw new AttemptError(
      'User already has an active attempt',
      'ACTIVE_ATTEMPT_EXISTS'
    );
  }

  // Get problem
  const problem = await contentRepo.findById(tenantId, problemId);
  if (!problem) {
    throw new AttemptError('Problem not found', 'PROBLEM_NOT_FOUND');
  }

  // Check if rung is unlocked
  const skills = await skillRepo.findAllByUser(tenantId, userId);
  if (!isRungUnlockedForUser(skills, problem.pattern, problem.rung)) {
    throw new AttemptError(
      `Rung ${problem.rung} for ${problem.pattern} is not unlocked`,
      'RUNG_LOCKED'
    );
  }

  const now = clock.now();
  const attemptId = idGenerator.generate();

  // Calculate hint budget based on rung level
  // Lower rungs get more hints to support learning
  const hintBudget = getHintBudgetForRung(problem.rung);

  // Determine V2 step - null for legacy flow, UNDERSTAND for V2 flow
  const v2Step: AttemptV2Step | null = useV2Flow ? 'UNDERSTAND' : null;

  const attempt: Attempt = {
    id: attemptId,
    tenantId,
    userId,
    problemId,
    pattern: problem.pattern,
    rung: problem.rung,
    state: 'THINKING_GATE',
    steps: [],
    hintsUsed: [],
    codeSubmissions: 0,
    score: null,
    startedAt: now,
    completedAt: null,
    // V2 fields
    mode,
    v2Step,
    understandPayload: null,
    planPayload: null,
    verifyPayload: null,
    reflectPayload: null,
    hintBudget,
    hintsUsedCount: 0,
  };

  const savedAttempt = await attemptRepo.save(attempt);

  await eventSink.emit({
    type: 'ATTEMPT_STARTED',
    tenantId,
    userId,
    attemptId,
    pattern: problem.pattern,
    rung: problem.rung,
    timestamp: now,
  });

  return { attempt: savedAttempt, problem };
}
