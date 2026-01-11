import type { PatternId } from './pattern.js';
import type { RungLevel } from './rung.js';
import type { TenantId } from './tenant.js';

/**
 * SkillState - user's mastery level for a pattern-rung combination
 */
export interface SkillState {
  readonly id: string;
  readonly tenantId: TenantId;
  readonly userId: string;
  readonly pattern: PatternId;
  readonly rung: RungLevel;
  readonly score: number; // 0-100, rolling average
  readonly attemptsCount: number;
  readonly lastAttemptAt: Date | null;
  readonly unlockedAt: Date | null;
  readonly updatedAt: Date;
  // Idempotency: Track which attempt was last applied to prevent double-counting
  readonly lastAppliedAttemptId: string | null;
}

export type SkillStateId = string;

export interface SkillMatrix {
  readonly userId: string;
  readonly skills: readonly SkillState[];
}

// Mastery threshold for unlocking next rung (0-100 scale)
export const RUNG_UNLOCK_THRESHOLD = 70;

export function isRungUnlockedForUser(
  skills: readonly SkillState[],
  pattern: PatternId,
  rung: RungLevel
): boolean {
  if (rung === 1) return true;

  const previousRung = (rung - 1) as RungLevel;
  const previousSkill = skills.find(
    (s) => s.pattern === pattern && s.rung === previousRung
  );

  if (!previousSkill) return false;

  // Need 70+ score (out of 100) to unlock next rung
  return previousSkill.score >= RUNG_UNLOCK_THRESHOLD;
}

export function computeNewScore(
  currentScore: number,
  attemptsCount: number,
  newAttemptScore: number
): number {
  // Exponential moving average with more weight on recent attempts
  const alpha = Math.min(0.3, 1 / (attemptsCount + 1));
  return currentScore * (1 - alpha) + newAttemptScore * alpha;
}
