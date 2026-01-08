/**
 * GetNextMicroDrill use-case.
 * Selects the next appropriate micro-drill for a user.
 */

import type { TenantId, UserId, PatternId, Difficulty } from '../entities/types.js';
import type { MicroDrill } from '../entities/MicroDrill.js';
import type { ContentRepo } from '../ports/ContentRepo.js';
import type { ProgressRepo } from '../ports/ProgressRepo.js';
import type { Clock } from '../ports/Clock.js';
import { PATTERN_PROGRESSION, ACCURACY_THRESHOLDS } from '../policies/PromotionThresholds.js';

export interface GetNextMicroDrillInput {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly patternId?: PatternId;
  readonly difficulty?: Difficulty;
  readonly excludeDrillIds?: readonly string[];
}

export interface GetNextMicroDrillOutput {
  readonly drill: MicroDrill | null;
  readonly reason: DrillSelectionReason;
  readonly patternContext?: {
    readonly patternId: PatternId;
    readonly drillsCompleted: number;
    readonly drillsRequired: number;
    readonly accuracy: number;
  };
}

export type DrillSelectionReason =
  | 'PATTERN_REINFORCEMENT'
  | 'WEAK_AREA_FOCUS'
  | 'SPACED_REVIEW'
  | 'NEW_INTRODUCTION'
  | 'NO_DRILLS_AVAILABLE';

export interface GetNextMicroDrillDeps {
  readonly contentRepo: ContentRepo;
  readonly progressRepo: ProgressRepo;
  readonly clock: Clock;
}

export async function getNextMicroDrill(
  input: GetNextMicroDrillInput,
  deps: GetNextMicroDrillDeps
): Promise<GetNextMicroDrillOutput> {
  const { tenantId, userId, patternId, difficulty, excludeDrillIds = [] } = input;
  const { contentRepo, progressRepo, clock } = deps;

  const excludeSet = new Set(excludeDrillIds);

  // If specific pattern requested, get drill for that pattern
  if (patternId) {
    const drill = await selectDrillForPattern(
      tenantId,
      userId,
      patternId,
      difficulty,
      excludeSet,
      deps
    );

    if (drill) {
      const progress = await progressRepo.getPatternProgress(tenantId, userId, patternId);
      const result: GetNextMicroDrillOutput = {
        drill,
        reason: 'PATTERN_REINFORCEMENT',
      };
      if (progress) {
        return {
          ...result,
          patternContext: {
            patternId,
            drillsCompleted: progress.drillsCompleted,
            drillsRequired: PATTERN_PROGRESSION.DRILLS_PER_PATTERN,
            accuracy: progress.averageAccuracy,
          },
        };
      }
      return result;
    }
  }

  // Find weak patterns and prioritize them
  const patternProgress = await progressRepo.getPatternProgressByUser(tenantId, userId);
  const weakPatterns = patternProgress
    .filter(p =>
      p.averageAccuracy < ACCURACY_THRESHOLDS.MODERATE ||
      p.drillsCompleted < PATTERN_PROGRESSION.DRILLS_PER_PATTERN
    )
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy);

  // Try weak patterns first
  for (const pattern of weakPatterns) {
    const drill = await selectDrillForPattern(
      tenantId,
      userId,
      pattern.patternId,
      difficulty,
      excludeSet,
      deps
    );

    if (drill) {
      return {
        drill,
        reason: 'WEAK_AREA_FOCUS',
        patternContext: {
          patternId: pattern.patternId,
          drillsCompleted: pattern.drillsCompleted,
          drillsRequired: PATTERN_PROGRESSION.DRILLS_PER_PATTERN,
          accuracy: pattern.averageAccuracy,
        },
      };
    }
  }

  // Find drills due for spaced review
  const reviewDrill = await selectReviewDrill(
    tenantId,
    userId,
    excludeSet,
    deps
  );
  if (reviewDrill) {
    return {
      drill: reviewDrill,
      reason: 'SPACED_REVIEW',
    };
  }

  // Get any available drill
  const anyDrill = await selectAnyDrill(
    tenantId,
    userId,
    difficulty,
    excludeSet,
    deps
  );

  if (anyDrill) {
    return {
      drill: anyDrill,
      reason: 'NEW_INTRODUCTION',
    };
  }

  return {
    drill: null,
    reason: 'NO_DRILLS_AVAILABLE',
  };
}

async function selectDrillForPattern(
  tenantId: TenantId,
  userId: UserId,
  patternId: PatternId,
  difficulty: Difficulty | undefined,
  excludeSet: Set<string>,
  deps: GetNextMicroDrillDeps
): Promise<MicroDrill | null> {
  const { contentRepo, progressRepo } = deps;

  // Get all drills for pattern
  const drills = await contentRepo.getMicroDrillsByPattern(tenantId, patternId);

  // Get user's drill progress
  const drillProgress = await progressRepo.getDrillProgressByUser(tenantId, userId);
  const progressMap = new Map(drillProgress.map(p => [p.drillId, p]));

  // Filter and score drills
  const candidates = drills
    .filter(d => !excludeSet.has(d.id))
    .filter(d => difficulty === undefined || d.difficulty === difficulty)
    .map(d => {
      const progress = progressMap.get(d.id);
      const score = scoreDrill(d, progress);
      return { drill: d, score };
    })
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.drill ?? null;
}

async function selectReviewDrill(
  tenantId: TenantId,
  userId: UserId,
  excludeSet: Set<string>,
  deps: GetNextMicroDrillDeps
): Promise<MicroDrill | null> {
  const { contentRepo, progressRepo, clock } = deps;

  const now = clock.now();
  const msPerDay = 24 * 60 * 60 * 1000;
  const reviewThresholdDays = PATTERN_PROGRESSION.DAYS_UNTIL_REVIEW;

  const drillProgress = await progressRepo.getDrillProgressByUser(tenantId, userId);

  // Find drills due for review
  const dueForReview = drillProgress
    .filter(p => {
      if (!p.lastAttemptAt || excludeSet.has(p.drillId)) return false;
      const daysSince = (now - p.lastAttemptAt) / msPerDay;
      return daysSince >= reviewThresholdDays;
    })
    .sort((a, b) => (a.lastAttemptAt ?? 0) - (b.lastAttemptAt ?? 0));

  for (const progress of dueForReview) {
    const drill = await contentRepo.getMicroDrill(tenantId, progress.drillId);
    if (drill) {
      return drill;
    }
  }

  return null;
}

async function selectAnyDrill(
  tenantId: TenantId,
  userId: UserId,
  difficulty: Difficulty | undefined,
  excludeSet: Set<string>,
  deps: GetNextMicroDrillDeps
): Promise<MicroDrill | null> {
  const { contentRepo, progressRepo } = deps;

  const drillProgress = await progressRepo.getDrillProgressByUser(tenantId, userId);
  const attemptedIds = new Set(drillProgress.map(p => p.drillId));

  const drills = await contentRepo.getMicroDrills({
    tenantId,
    ...(difficulty !== undefined && { difficulty }),
    published: true,
    limit: 50,
  });

  // Prefer unattempted drills
  const unattempted = drills.filter(
    d => !excludeSet.has(d.id) && !attemptedIds.has(d.id)
  );

  if (unattempted.length > 0) {
    return unattempted[0] ?? null;
  }

  // Fall back to any valid drill
  const valid = drills.filter(d => !excludeSet.has(d.id));
  return valid[0] ?? null;
}

function scoreDrill(
  drill: MicroDrill,
  progress: import('../entities/Progress.js').DrillProgress | undefined
): number {
  let score = 0;

  // New drills get higher priority
  if (!progress) {
    score += 10;
  } else {
    // Lower accuracy = higher priority for review
    const accuracy = progress.attemptCount > 0
      ? progress.correctCount / progress.attemptCount
      : 0;
    score += (1 - accuracy) * 5;

    // Older last attempt = higher priority
    if (progress.lastAttemptAt) {
      const daysSince = (Date.now() - progress.lastAttemptAt) / (24 * 60 * 60 * 1000);
      score += Math.min(daysSince, 7); // Cap at 7 days
    }
  }

  // Easier drills get slight priority for building confidence
  if (drill.difficulty === 'EASY') score += 1;

  return score;
}
