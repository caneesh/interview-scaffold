/**
 * Progress entity - tracks user progress across problems and patterns.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  TenantId,
  UserId,
  ProblemId,
  PatternId,
  MicroDrillId,
  Difficulty,
  ConfidenceLevel,
} from './types.js';

export interface ProblemProgress {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly problemId: ProblemId;
  readonly isCompleted: boolean;
  readonly bestTimeSec: number | null;
  readonly attemptCount: number;
  readonly lastAttemptAt: number | null;
  readonly hintsUsedTotal: number;
  readonly confidenceLevel: ConfidenceLevel;
  readonly masteryScore: number; // 0-100
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface PatternProgress {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly patternId: PatternId;
  readonly problemsCompleted: number;
  readonly problemsTotal: number;
  readonly drillsCompleted: number;
  readonly drillsTotal: number;
  readonly averageAccuracy: number; // 0-1
  readonly averageTimeSec: number;
  readonly confidenceLevel: ConfidenceLevel;
  readonly masteryScore: number; // 0-100
  readonly rungLevel: number; // 1-5 rung progression
  readonly lastPracticedAt: number | null;
  readonly streak: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface DrillProgress {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly drillId: MicroDrillId;
  readonly isCompleted: boolean;
  readonly bestTimeSec: number | null;
  readonly attemptCount: number;
  readonly correctCount: number;
  readonly lastAttemptAt: number | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface UserStats {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly totalProblemsCompleted: number;
  readonly totalDrillsCompleted: number;
  readonly totalTimeSpentSec: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastActiveAt: number | null;
  readonly preferredDifficulty: Difficulty;
  readonly strongPatterns: readonly PatternId[];
  readonly weakPatterns: readonly PatternId[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

// Factory functions
export function createProblemProgress(
  params: Omit<ProblemProgress, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): ProblemProgress {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}

export function createPatternProgress(
  params: Omit<PatternProgress, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): PatternProgress {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}

export function createDrillProgress(
  params: Omit<DrillProgress, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): DrillProgress {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}

export function createUserStats(
  params: Omit<UserStats, 'createdAt' | 'updatedAt'> & {
    createdAt?: number;
    updatedAt?: number;
  }
): UserStats {
  const now = Date.now();
  return {
    ...params,
    createdAt: params.createdAt ?? now,
    updatedAt: params.updatedAt ?? now,
  };
}
