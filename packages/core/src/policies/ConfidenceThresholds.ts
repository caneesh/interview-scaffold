/**
 * Confidence thresholds - criteria for confidence assessment and adjustment.
 */

import type { ConfidenceLevel } from '../entities/types.js';

// ============================================================================
// Confidence Scoring
// ============================================================================

export const CONFIDENCE_WEIGHTS = {
  /** Weight for time performance (faster = higher confidence) */
  TIME_PERFORMANCE: 0.25,

  /** Weight for accuracy (correctness) */
  ACCURACY: 0.35,

  /** Weight for hint usage (fewer hints = higher confidence) */
  HINT_USAGE: 0.20,

  /** Weight for self-assessment */
  SELF_ASSESSMENT: 0.20,
} as const;

// ============================================================================
// Confidence Level Thresholds
// ============================================================================

export const CONFIDENCE_LEVEL_THRESHOLDS = {
  /** Minimum score for HIGH confidence */
  HIGH: 0.75,

  /** Minimum score for MEDIUM confidence */
  MEDIUM: 0.45,

  /** Below this is LOW confidence */
  LOW: 0,
} as const;

// ============================================================================
// Confidence Adjustment Factors
// ============================================================================

export const CONFIDENCE_ADJUSTMENTS = {
  /** Boost for completing without hints */
  NO_HINTS_BONUS: 0.15,

  /** Penalty per hint used */
  HINT_PENALTY: 0.05,

  /** Boost for finishing under time budget */
  UNDER_TIME_BONUS: 0.10,

  /** Penalty for time overrun */
  TIME_OVERRUN_PENALTY: 0.15,

  /** Boost for first-try success */
  FIRST_TRY_BONUS: 0.10,

  /** Penalty for pattern selection error */
  PATTERN_ERROR_PENALTY: 0.10,

  /** Max hints before confidence is capped at MEDIUM */
  MAX_HINTS_FOR_HIGH_CONFIDENCE: 2,
} as const;

// ============================================================================
// Low Confidence Triggers
// ============================================================================

export const LOW_CONFIDENCE_TRIGGERS = {
  /** Time overrun percentage that triggers low confidence */
  TIME_OVERRUN_PERCENT: 0.5, // 50% over budget

  /** Accuracy below this triggers low confidence */
  ACCURACY_THRESHOLD: 0.4,

  /** Consecutive wrong answers that trigger low confidence */
  CONSECUTIVE_WRONG: 3,

  /** Hints used that trigger low confidence */
  HINTS_THRESHOLD: 4,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function calculateConfidenceScore(params: {
  timeTakenSec: number;
  timeBudgetSec: number;
  isCorrect: boolean;
  hintsUsed: number;
  selfAssessment: ConfidenceLevel | null;
  isFirstTry: boolean;
}): number {
  const {
    timeTakenSec,
    timeBudgetSec,
    isCorrect,
    hintsUsed,
    selfAssessment,
    isFirstTry,
  } = params;

  let score = 0;

  // Time performance (0-1)
  const timeRatio = timeBudgetSec > 0 ? timeTakenSec / timeBudgetSec : 1;
  const timeScore = timeRatio <= 1
    ? 1 - (timeRatio * 0.5) // 0.5 to 1.0 for on-time
    : Math.max(0, 1 - timeRatio); // 0 to 0.5 for over-time
  score += timeScore * CONFIDENCE_WEIGHTS.TIME_PERFORMANCE;

  // Accuracy (0 or 1)
  const accuracyScore = isCorrect ? 1 : 0;
  score += accuracyScore * CONFIDENCE_WEIGHTS.ACCURACY;

  // Hint usage (0-1)
  const maxHintsForScore = 5;
  const hintScore = Math.max(0, 1 - (hintsUsed / maxHintsForScore));
  score += hintScore * CONFIDENCE_WEIGHTS.HINT_USAGE;

  // Self assessment (0-1)
  let selfScore = 0.5; // Default if no assessment
  if (selfAssessment !== null) {
    selfScore = mapConfidenceLevelToScore(selfAssessment);
  }
  score += selfScore * CONFIDENCE_WEIGHTS.SELF_ASSESSMENT;

  // Apply bonuses/penalties
  if (hintsUsed === 0 && isCorrect) {
    score += CONFIDENCE_ADJUSTMENTS.NO_HINTS_BONUS;
  }
  if (isFirstTry && isCorrect) {
    score += CONFIDENCE_ADJUSTMENTS.FIRST_TRY_BONUS;
  }
  if (timeRatio > 1.5) {
    score -= CONFIDENCE_ADJUSTMENTS.TIME_OVERRUN_PENALTY;
  }

  return Math.max(0, Math.min(1, score));
}

export function scoreToConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_LEVEL_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_LEVEL_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

export function mapConfidenceLevelToScore(level: ConfidenceLevel): number {
  switch (level) {
    case 'HIGH': return 1.0;
    case 'MEDIUM': return 0.6;
    case 'LOW': return 0.3;
  }
}

export function isLowConfidence(params: {
  timeTakenSec: number;
  timeBudgetSec: number;
  accuracy: number;
  consecutiveWrong: number;
  hintsUsed: number;
}): boolean {
  const { timeTakenSec, timeBudgetSec, accuracy, consecutiveWrong, hintsUsed } = params;

  const timeOverrunPercent = timeBudgetSec > 0
    ? (timeTakenSec - timeBudgetSec) / timeBudgetSec
    : 0;

  return (
    timeOverrunPercent >= LOW_CONFIDENCE_TRIGGERS.TIME_OVERRUN_PERCENT ||
    accuracy < LOW_CONFIDENCE_TRIGGERS.ACCURACY_THRESHOLD ||
    consecutiveWrong >= LOW_CONFIDENCE_TRIGGERS.CONSECUTIVE_WRONG ||
    hintsUsed >= LOW_CONFIDENCE_TRIGGERS.HINTS_THRESHOLD
  );
}
