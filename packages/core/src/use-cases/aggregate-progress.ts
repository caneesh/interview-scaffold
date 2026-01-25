import type { TenantId } from '../entities/tenant.js';
import type { AttemptId, Attempt, AttemptScore, LegacyAttempt } from '../entities/attempt.js';
import { isLegacyAttempt } from '../entities/attempt.js';
import type { Track } from '../entities/track.js';
import type {
  UserTrackProgress,
  UserContentProgress,
  IdempotentProgressResult,
} from '../entities/user-progress.js';
import type { ProgressRepo } from '../ports/progress-repo.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';

/**
 * Input for aggregating progress after a coding attempt completes.
 */
export interface AggregateProgressInput {
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly attemptId: AttemptId;
  readonly attempt: Attempt;
  readonly score: AttemptScore;
  readonly track: Track;
  readonly problemId: string;
  readonly contentItemId?: string; // Optional: for unified content items
}

/**
 * Output from progress aggregation.
 */
export interface AggregateProgressOutput {
  readonly trackProgress: IdempotentProgressResult<UserTrackProgress>;
  readonly contentProgress: IdempotentProgressResult<UserContentProgress>;
}

/**
 * Dependencies for ProgressAggregator.
 */
export interface AggregateProgressDeps {
  readonly progressRepo: ProgressRepo;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
}

/**
 * Compute new mastery score using exponential moving average.
 * Similar to computeNewScore in skill-state.ts but for track-level aggregation.
 */
function computeAggregatedMasteryScore(
  currentScore: number,
  completedCount: number,
  newScore: number
): number {
  if (completedCount === 0) {
    return newScore;
  }
  // Exponential moving average with more weight on recent attempts
  const alpha = Math.min(0.3, 1 / (completedCount + 1));
  return currentScore * (1 - alpha) + newScore * alpha;
}

/**
 * Aggregates user progress after an attempt completes successfully.
 *
 * This function should be called after submit-code completes with a passing result.
 * It updates:
 * 1. user_track_progress - aggregated progress per track
 * 2. user_content_progress - progress per content item/problem
 *
 * Uses lastAppliedAttemptId pattern for idempotency to prevent double-counting.
 *
 * @param input - The input containing attempt details and score
 * @param deps - Dependencies for progress aggregation
 * @returns The updated progress records with idempotency info
 */
export async function aggregateProgress(
  input: AggregateProgressInput,
  deps: AggregateProgressDeps
): Promise<AggregateProgressOutput> {
  const { tenantId, userId, attemptId, score, track, problemId, contentItemId } = input;
  const { progressRepo, clock, idGenerator } = deps;

  const now = clock.now();

  // ============ Update Content Progress ============

  // Find existing content progress (by contentItemId or problemId)
  let existingContentProgress: UserContentProgress | null = null;
  if (contentItemId) {
    existingContentProgress = await progressRepo.findContentProgressByContentItem(
      tenantId,
      userId,
      contentItemId
    );
  } else {
    existingContentProgress = await progressRepo.findContentProgressByProblem(
      tenantId,
      userId,
      problemId
    );
  }

  const isFirstCompletion = !existingContentProgress?.completedAt;

  const newContentProgress: UserContentProgress = {
    id: existingContentProgress?.id ?? idGenerator.generate(),
    tenantId,
    userId,
    contentItemId: contentItemId ?? null,
    problemId,
    track,
    attemptsCount: (existingContentProgress?.attemptsCount ?? 0) + 1,
    bestScore: Math.max(existingContentProgress?.bestScore ?? 0, score.overall),
    lastScore: score.overall,
    completedAt: existingContentProgress?.completedAt ?? now, // Only set on first completion
    lastAttemptAt: now,
    updatedAt: now,
    lastAppliedAttemptId: attemptId,
  };

  const contentProgressResult = await progressRepo.updateContentProgressIfNotApplied(
    newContentProgress,
    attemptId
  );

  // ============ Update Track Progress ============

  const existingTrackProgress = await progressRepo.findTrackProgress(
    tenantId,
    userId,
    track
  );

  // Only increment completedCount if this is the first completion for this content
  // and the update was actually applied (not a duplicate)
  const shouldIncrementCompleted = isFirstCompletion && contentProgressResult.wasApplied;

  const newCompletedCount = (existingTrackProgress?.completedCount ?? 0) +
    (shouldIncrementCompleted ? 1 : 0);

  const newMasteryScore = computeAggregatedMasteryScore(
    existingTrackProgress?.masteryScore ?? 0,
    existingTrackProgress?.completedCount ?? 0,
    score.overall
  );

  const newTrackProgress: UserTrackProgress = {
    id: existingTrackProgress?.id ?? idGenerator.generate(),
    tenantId,
    userId,
    track,
    masteryScore: newMasteryScore,
    attemptsCount: (existingTrackProgress?.attemptsCount ?? 0) + 1,
    completedCount: newCompletedCount,
    lastActivityAt: now,
    updatedAt: now,
    lastAppliedAttemptId: attemptId,
  };

  const trackProgressResult = await progressRepo.updateTrackProgressIfNotApplied(
    newTrackProgress,
    attemptId
  );

  return {
    trackProgress: trackProgressResult,
    contentProgress: contentProgressResult,
  };
}

/**
 * ProgressAggregator - class-based wrapper for dependency injection.
 *
 * Use this when you need to pre-configure dependencies and reuse
 * the aggregator across multiple calls.
 */
export class ProgressAggregator {
  constructor(private readonly deps: AggregateProgressDeps) {}

  /**
   * Aggregate progress for a completed attempt.
   * Safe to call multiple times with the same attemptId - uses idempotency.
   */
  async aggregate(input: AggregateProgressInput): Promise<AggregateProgressOutput> {
    return aggregateProgress(input, this.deps);
  }

  /**
   * Convenience method for coding interview track (legacy attempts only).
   * Derives track from attempt pattern.
   */
  async aggregateCodingAttempt(
    tenantId: TenantId,
    userId: string,
    attempt: LegacyAttempt,
    score: AttemptScore
  ): Promise<AggregateProgressOutput> {
    return this.aggregate({
      tenantId,
      userId,
      attemptId: attempt.id,
      attempt,
      score,
      track: 'coding_interview',
      problemId: attempt.problemId,
    });
  }
}

/**
 * Factory function to create a ProgressAggregator with given dependencies.
 */
export function createProgressAggregator(deps: AggregateProgressDeps): ProgressAggregator {
  return new ProgressAggregator(deps);
}
