/**
 * MEP (Minimum Effective Practice) types.
 * PURE TypeScript - no framework dependencies.
 */

import type { PatternId, ProblemId, MicroDrillId, MicroLessonId } from '../entities/types.js';

// ============================================================================
// MEP Actions
// ============================================================================

export const MEPAction = {
  SERVE_MICRO_DRILL: 'SERVE_MICRO_DRILL',
  SERVE_SIBLING: 'SERVE_SIBLING',
  RETRY_SAME: 'RETRY_SAME',
  MICRO_LESSON_GATE: 'MICRO_LESSON_GATE',
  PROMOTE_RUNG: 'PROMOTE_RUNG',
  SPACED_REVIEW: 'SPACED_REVIEW',
  COMPLETE_PATTERN: 'COMPLETE_PATTERN',
} as const;
export type MEPAction = typeof MEPAction[keyof typeof MEPAction];

// ============================================================================
// Transfer Results
// ============================================================================

export const TransferResult = {
  TRANSFER_SUCCESS: 'TRANSFER_SUCCESS',
  TRANSFER_FAIL: 'TRANSFER_FAIL',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type TransferResult = typeof TransferResult[keyof typeof TransferResult];

// ============================================================================
// Time Cost Model (in seconds)
// ============================================================================

export const TIME_COST_MODEL = {
  MICRO_DRILL_SEC: 60,
  SIBLING_SEC: 600, // 10 minutes
  FULL_PROBLEM_SEC: 900, // 15 minutes
  SPACED_REVIEW_SEC: 120, // 2 minutes
  MICRO_LESSON_SEC: 180, // 3 minutes
} as const;

// ============================================================================
// MEP Decision Thresholds
// ============================================================================

export const MEP_THRESHOLDS = {
  /** Minimum confidence for promotion (1-5 scale) */
  MIN_CONFIDENCE_FOR_PROMOTION: 4,

  /** Minimum confidence to skip micro-drill */
  MIN_CONFIDENCE_TO_SKIP_DRILL: 3,

  /** Score range for SERVE_SIBLING (percentage) */
  SIBLING_SCORE_MIN: 50,
  SIBLING_SCORE_MAX: 74,

  /** Error count threshold for SERVE_SIBLING */
  SIBLING_ERROR_THRESHOLD: 2,

  /** Days until skill decay triggers SPACED_REVIEW */
  SKILL_DECAY_DAYS: 7,

  /** Minimum mastery score for promotion (percentage) */
  MASTERY_SCORE_MIN: 90,

  /** Max retries before forcing sibling */
  MAX_SAME_RETRIES: 2,

  /** Consecutive wins for auto-promotion consideration */
  CLEAN_WINS_FOR_PROMOTION: 3,
} as const;

// ============================================================================
// MEP Decision Types
// ============================================================================

export interface MEPDecision {
  readonly action: MEPAction;
  readonly reason: string;
  readonly targetId: ProblemId | MicroDrillId | MicroLessonId | null;
  readonly patternId: PatternId;
  readonly estimatedTimeSec: number;
  readonly priority: number;
  readonly metadata: MEPDecisionMetadata;
}

export interface MEPDecisionMetadata {
  readonly currentScore?: number;
  readonly confidence?: number;
  readonly errorCount?: number;
  readonly retryCount?: number;
  readonly daysSinceLastPractice?: number;
  readonly consecutiveWins?: number;
  readonly transferResult?: TransferResult;
}

// ============================================================================
// MEP Context (input for decision)
// ============================================================================

export interface MEPContext {
  readonly patternId: PatternId;
  readonly currentProblemId: ProblemId | null;
  readonly lastScore: number | null;
  readonly confidence: number;
  readonly errorCount: number;
  readonly errorTypes: readonly string[];
  readonly retryCount: number;
  readonly daysSinceLastPractice: number;
  readonly consecutiveWins: number;
  readonly rungLevel: number;
  readonly maxRung: number;
  readonly hasCriticalError: boolean;
  readonly repeatedCriticalError: boolean;
  readonly timeBudgetSec: number | null;
  readonly siblingAttempted: boolean;
  readonly siblingFirstTrySuccess: boolean;
}

// ============================================================================
// Sibling Problem
// ============================================================================

export interface SiblingProblem {
  readonly problemId: ProblemId;
  readonly patternId: PatternId;
  readonly difficulty: string;
  readonly isAttempted: boolean;
  readonly estimatedTimeSec: number;
}

// ============================================================================
// Rung Definition
// ============================================================================

export interface RungDefinition {
  readonly level: number;
  readonly name: string;
  readonly requiredScore: number;
  readonly requiredConfidence: number;
  readonly problemCount: number;
}

export const RUNG_DEFINITIONS: readonly RungDefinition[] = [
  { level: 1, name: 'Novice', requiredScore: 50, requiredConfidence: 2, problemCount: 2 },
  { level: 2, name: 'Apprentice', requiredScore: 65, requiredConfidence: 3, problemCount: 3 },
  { level: 3, name: 'Practitioner', requiredScore: 75, requiredConfidence: 3, problemCount: 4 },
  { level: 4, name: 'Proficient', requiredScore: 85, requiredConfidence: 4, problemCount: 4 },
  { level: 5, name: 'Expert', requiredScore: 95, requiredConfidence: 4, problemCount: 5 },
] as const;
