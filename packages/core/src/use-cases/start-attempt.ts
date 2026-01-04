import type { TenantId } from '../entities/tenant.js';
import type { ProblemId, Problem } from '../entities/problem.js';
import type { Attempt } from '../entities/attempt.js';
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
  const { tenantId, userId, problemId } = input;
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
