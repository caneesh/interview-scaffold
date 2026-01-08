/**
 * Guardrails - safety rules to prevent wasted effort and guide learning.
 * PURE TypeScript - no framework dependencies.
 */

import type { PatternId, ProblemId } from '../entities/types.js';
import type { ValidationErrorType } from '../validation/types.js';

// ============================================================================
// Guardrail Constants
// ============================================================================

export const GUARDRAIL_THRESHOLDS = {
  /** Sibling failures with same error before micro-lesson gate */
  SIBLING_FAILURES_SAME_ERROR: 2,

  /** Clean wins needed to promote or switch pattern */
  CLEAN_WINS_FOR_PROMOTION: 3,

  /** Time overrun percentage to trigger drill/discovery priority */
  TIME_OVERRUN_PERCENT: 0.5, // 50% over budget

  /** Min confidence for promotion (on 1-5 scale) */
  MIN_CONFIDENCE_FOR_PROMOTION: 4,

  /** Min drills passed for stabilization (alternative to confidence) */
  MIN_DRILLS_FOR_STABILIZATION: 3,

  /** Max retries on same problem before forced move */
  MAX_SAME_PROBLEM_RETRIES: 3,
} as const;

// ============================================================================
// Guardrail Actions
// ============================================================================

export const GuardrailAction = {
  /** Continue as normal */
  CONTINUE: 'CONTINUE',

  /** Trigger micro-lesson gate (too many failures with same error) */
  MICRO_LESSON_GATE: 'MICRO_LESSON_GATE',

  /** Serve micro-drills for reinforcement */
  SERVE_DRILLS: 'SERVE_DRILLS',

  /** Promote to next rung (clean wins achieved) */
  PROMOTE_RUNG: 'PROMOTE_RUNG',

  /** Switch to different pattern */
  SWITCH_PATTERN: 'SWITCH_PATTERN',

  /** Prioritize discovery mode (time overrun) */
  PRIORITIZE_DISCOVERY: 'PRIORITIZE_DISCOVERY',

  /** Force move to sibling problem */
  FORCE_MOVE_TO_SIBLING: 'FORCE_MOVE_TO_SIBLING',
} as const;
export type GuardrailAction = typeof GuardrailAction[keyof typeof GuardrailAction];

// ============================================================================
// Guardrail Check Input
// ============================================================================

export interface GuardrailCheckInput {
  readonly patternId: PatternId;
  readonly currentProblemId: ProblemId;

  /** Recent sibling attempts with error types */
  readonly recentSiblingAttempts: readonly {
    readonly problemId: ProblemId;
    readonly errorTypes: readonly ValidationErrorType[];
    readonly passed: boolean;
  }[];

  /** Consecutive clean wins (no errors, passed first try) */
  readonly consecutiveCleanWins: number;

  /** Confidence level on 1-5 scale */
  readonly confidenceLevel: number;

  /** Number of passed drills for this pattern */
  readonly passedDrillsCount: number;

  /** Time taken vs budget ratio (1.0 = on time, 1.5 = 50% over) */
  readonly timeRatio: number;

  /** Retries on current problem */
  readonly currentProblemRetries: number;

  /** Current rung level */
  readonly rungLevel: number;

  /** Max rung for this pattern */
  readonly maxRung: number;

  /** Whether user has achieved promotion requirements */
  readonly hasMetPromotionRequirements: boolean;
}

// ============================================================================
// Guardrail Check Result
// ============================================================================

export interface GuardrailCheckResult {
  readonly action: GuardrailAction;
  readonly reason: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ============================================================================
// Guardrail Check Functions
// ============================================================================

/**
 * Check all guardrails and return the highest priority action.
 */
export function checkGuardrails(input: GuardrailCheckInput): GuardrailCheckResult {
  // Priority 1: Check for repeated sibling failures with same error
  const siblingFailureCheck = checkRepeatedSiblingFailures(input);
  if (siblingFailureCheck.action !== GuardrailAction.CONTINUE) {
    return siblingFailureCheck;
  }

  // Priority 2: Check for time overrun
  const timeOverrunCheck = checkTimeOverrun(input);
  if (timeOverrunCheck.action !== GuardrailAction.CONTINUE) {
    return timeOverrunCheck;
  }

  // Priority 3: Check for max retries on same problem
  const maxRetriesCheck = checkMaxRetries(input);
  if (maxRetriesCheck.action !== GuardrailAction.CONTINUE) {
    return maxRetriesCheck;
  }

  // Priority 4: Check for promotion opportunity (clean wins)
  const promotionCheck = checkPromotionOpportunity(input);
  if (promotionCheck.action !== GuardrailAction.CONTINUE) {
    return promotionCheck;
  }

  // No guardrail triggered
  return {
    action: GuardrailAction.CONTINUE,
    reason: 'No guardrails triggered',
    metadata: {},
  };
}

/**
 * Check for repeated sibling failures with the same error type.
 * Rule: 2 sibling failures same error → lesson + drills
 */
function checkRepeatedSiblingFailures(input: GuardrailCheckInput): GuardrailCheckResult {
  const { recentSiblingAttempts } = input;

  // Get failed attempts
  const failedAttempts = recentSiblingAttempts.filter(a => !a.passed);
  if (failedAttempts.length < GUARDRAIL_THRESHOLDS.SIBLING_FAILURES_SAME_ERROR) {
    return { action: GuardrailAction.CONTINUE, reason: '', metadata: {} };
  }

  // Count error type occurrences
  const errorCounts = new Map<ValidationErrorType, number>();
  for (const attempt of failedAttempts) {
    for (const errorType of attempt.errorTypes) {
      const count = (errorCounts.get(errorType) ?? 0) + 1;
      errorCounts.set(errorType, count);
    }
  }

  // Find repeated error types
  for (const [errorType, count] of errorCounts) {
    if (count >= GUARDRAIL_THRESHOLDS.SIBLING_FAILURES_SAME_ERROR) {
      return {
        action: GuardrailAction.MICRO_LESSON_GATE,
        reason: `${count} sibling failures with same error: ${errorType}`,
        metadata: {
          repeatedErrorType: errorType,
          failureCount: count,
        },
      };
    }
  }

  return { action: GuardrailAction.CONTINUE, reason: '', metadata: {} };
}

/**
 * Check for time overrun.
 * Rule: TIME_OVERRUN → prioritize drill/discovery
 */
function checkTimeOverrun(input: GuardrailCheckInput): GuardrailCheckResult {
  const { timeRatio } = input;

  if (timeRatio > 1 + GUARDRAIL_THRESHOLDS.TIME_OVERRUN_PERCENT) {
    return {
      action: GuardrailAction.PRIORITIZE_DISCOVERY,
      reason: `Time overrun: ${Math.round((timeRatio - 1) * 100)}% over budget`,
      metadata: {
        timeRatio,
        overrunPercent: (timeRatio - 1) * 100,
      },
    };
  }

  return { action: GuardrailAction.CONTINUE, reason: '', metadata: {} };
}

/**
 * Check for max retries on same problem.
 */
function checkMaxRetries(input: GuardrailCheckInput): GuardrailCheckResult {
  const { currentProblemRetries } = input;

  if (currentProblemRetries >= GUARDRAIL_THRESHOLDS.MAX_SAME_PROBLEM_RETRIES) {
    return {
      action: GuardrailAction.FORCE_MOVE_TO_SIBLING,
      reason: `Max retries (${currentProblemRetries}) on same problem`,
      metadata: {
        retryCount: currentProblemRetries,
      },
    };
  }

  return { action: GuardrailAction.CONTINUE, reason: '', metadata: {} };
}

/**
 * Check for promotion opportunity.
 * Rule: 3 clean wins → promote or switch pattern
 */
function checkPromotionOpportunity(input: GuardrailCheckInput): GuardrailCheckResult {
  const {
    consecutiveCleanWins,
    confidenceLevel,
    passedDrillsCount,
    rungLevel,
    maxRung,
  } = input;

  if (consecutiveCleanWins < GUARDRAIL_THRESHOLDS.CLEAN_WINS_FOR_PROMOTION) {
    return { action: GuardrailAction.CONTINUE, reason: '', metadata: {} };
  }

  // Check if promotion requirements are met
  const hasHighConfidence = confidenceLevel >= GUARDRAIL_THRESHOLDS.MIN_CONFIDENCE_FOR_PROMOTION;
  const hasStabilization = passedDrillsCount >= GUARDRAIL_THRESHOLDS.MIN_DRILLS_FOR_STABILIZATION;

  if (!hasHighConfidence && !hasStabilization) {
    // Need more drills for stabilization
    return {
      action: GuardrailAction.SERVE_DRILLS,
      reason: 'Clean wins achieved but confidence not stabilized',
      metadata: {
        cleanWins: consecutiveCleanWins,
        confidenceLevel,
        passedDrillsCount,
        needsConfidence: !hasHighConfidence,
        needsStabilization: !hasStabilization,
      },
    };
  }

  // Can promote
  if (rungLevel < maxRung) {
    return {
      action: GuardrailAction.PROMOTE_RUNG,
      reason: `${consecutiveCleanWins} clean wins with sufficient confidence`,
      metadata: {
        cleanWins: consecutiveCleanWins,
        confidenceLevel,
        currentRung: rungLevel,
        nextRung: rungLevel + 1,
      },
    };
  }

  // Already at max rung, switch pattern
  return {
    action: GuardrailAction.SWITCH_PATTERN,
    reason: 'Mastered pattern, ready to switch',
    metadata: {
      cleanWins: consecutiveCleanWins,
      currentRung: rungLevel,
      maxRung,
    },
  };
}

// ============================================================================
// Promotion Requirements Check
// ============================================================================

export interface PromotionRequirementsInput {
  readonly confidenceLevel: number;
  readonly passedDrillsCount: number;
  readonly hasAttemptWithHighConfidence: boolean;
}

/**
 * Check if promotion requirements are met.
 * Rule: Promotion requires ≥1 attempt with confidence ≥4, or stabilization via passed micro-drills
 */
export function checkPromotionRequirements(input: PromotionRequirementsInput): {
  readonly canPromote: boolean;
  readonly reason: string;
  readonly via: 'confidence' | 'stabilization' | 'not_met';
} {
  const { confidenceLevel, passedDrillsCount, hasAttemptWithHighConfidence } = input;

  // Check high confidence requirement
  if (hasAttemptWithHighConfidence || confidenceLevel >= GUARDRAIL_THRESHOLDS.MIN_CONFIDENCE_FOR_PROMOTION) {
    return {
      canPromote: true,
      reason: 'Has attempt with confidence >= 4',
      via: 'confidence',
    };
  }

  // Check stabilization via drills
  if (passedDrillsCount >= GUARDRAIL_THRESHOLDS.MIN_DRILLS_FOR_STABILIZATION) {
    return {
      canPromote: true,
      reason: `Stabilized via ${passedDrillsCount} passed micro-drills`,
      via: 'stabilization',
    };
  }

  return {
    canPromote: false,
    reason: 'Needs high confidence attempt or more passed drills',
    via: 'not_met',
  };
}
