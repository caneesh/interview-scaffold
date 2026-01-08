/**
 * Promotion thresholds - criteria for advancing through learning stages.
 */

import type { Difficulty, ConfidenceLevel } from '../entities/types.js';

// ============================================================================
// Mastery Score Thresholds (0-100)
// ============================================================================

export const MASTERY_THRESHOLDS = {
  /** Score required to mark a problem as mastered */
  PROBLEM_MASTERY: 80,

  /** Score required to mark a pattern as mastered */
  PATTERN_MASTERY: 75,

  /** Score required to unlock next difficulty */
  DIFFICULTY_UNLOCK: 70,

  /** Score indicating struggling and needs review */
  NEEDS_REVIEW: 40,

  /** Score indicating beginner level */
  BEGINNER: 0,

  /** Score indicating intermediate level */
  INTERMEDIATE: 50,

  /** Score indicating advanced level */
  ADVANCED: 75,

  /** Score indicating expert level */
  EXPERT: 90,
} as const;

// ============================================================================
// Attempt-based Thresholds
// ============================================================================

export const ATTEMPT_THRESHOLDS = {
  /** Minimum attempts before mastery can be claimed */
  MIN_ATTEMPTS_FOR_MASTERY: 2,

  /** Consecutive successes needed for quick mastery */
  CONSECUTIVE_SUCCESS_FOR_MASTERY: 3,

  /** Failed attempts before suggesting easier content */
  FAILURES_BEFORE_EASIER: 3,

  /** Max hints per step before marking as assisted */
  MAX_HINTS_UNASSISTED: 2,

  /** Max attempts per step before showing solution */
  MAX_STEP_ATTEMPTS: 5,
} as const;

// ============================================================================
// Accuracy Thresholds (0-1)
// ============================================================================

export const ACCURACY_THRESHOLDS = {
  /** Accuracy needed for problem mastery */
  PROBLEM_MASTERY: 0.8,

  /** Accuracy needed for pattern mastery */
  PATTERN_MASTERY: 0.75,

  /** Accuracy indicating strong understanding */
  STRONG: 0.85,

  /** Accuracy indicating moderate understanding */
  MODERATE: 0.6,

  /** Accuracy indicating weak understanding */
  WEAK: 0.4,
} as const;

// ============================================================================
// Difficulty Progression
// ============================================================================

export const DIFFICULTY_PROGRESSION: Record<Difficulty, Difficulty | null> = {
  EASY: 'MEDIUM',
  MEDIUM: 'HARD',
  HARD: null,
} as const;

export const PROBLEMS_TO_UNLOCK_NEXT_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 5,      // Complete 5 easy problems to unlock medium
  MEDIUM: 5,    // Complete 5 medium problems to unlock hard
  HARD: 0,      // No next level
} as const;

// ============================================================================
// Pattern Progression
// ============================================================================

export const PATTERN_PROGRESSION = {
  /** Problems needed per pattern to consider it learned */
  PROBLEMS_PER_PATTERN: 3,

  /** Drills needed per pattern to reinforce learning */
  DRILLS_PER_PATTERN: 5,

  /** Days of inactivity before pattern needs review */
  DAYS_UNTIL_REVIEW: 7,

  /** Min accuracy on pattern drills to consider pattern mastered */
  DRILL_ACCURACY_THRESHOLD: 0.8,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function getMasteryLevel(score: number): string {
  if (score >= MASTERY_THRESHOLDS.EXPERT) return 'EXPERT';
  if (score >= MASTERY_THRESHOLDS.ADVANCED) return 'ADVANCED';
  if (score >= MASTERY_THRESHOLDS.INTERMEDIATE) return 'INTERMEDIATE';
  return 'BEGINNER';
}

export function canUnlockNextDifficulty(
  currentDifficulty: Difficulty,
  problemsCompleted: number,
  accuracy: number
): boolean {
  const required = PROBLEMS_TO_UNLOCK_NEXT_DIFFICULTY[currentDifficulty];
  if (required === 0) return false; // Already at max difficulty

  return (
    problemsCompleted >= required &&
    accuracy >= ACCURACY_THRESHOLDS.MODERATE
  );
}

export function shouldSuggestEasier(
  consecutiveFailures: number,
  currentDifficulty: Difficulty
): boolean {
  return (
    consecutiveFailures >= ATTEMPT_THRESHOLDS.FAILURES_BEFORE_EASIER &&
    currentDifficulty !== 'EASY'
  );
}

export function mapConfidenceToScore(confidence: ConfidenceLevel): number {
  switch (confidence) {
    case 'LOW': return 0.33;
    case 'MEDIUM': return 0.66;
    case 'HIGH': return 1.0;
  }
}
