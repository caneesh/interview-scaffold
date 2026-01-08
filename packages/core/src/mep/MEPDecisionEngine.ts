/**
 * MEP Decision Engine - Deterministic progression logic.
 * PURE TypeScript - no framework dependencies.
 *
 * Decision Priority:
 * 1) Repeated critical error → MICRO_LESSON_GATE
 * 2) Passed but confidence <3 → SERVE_MICRO_DRILL
 * 3) Score 50–74 or errors≥2 → SERVE_SIBLING
 * 4) Mastery + confidence≥4 → PROMOTE_RUNG
 * 5) Skill decay → SPACED_REVIEW
 * 6) Else RETRY_SAME or sibling (deterministic)
 */

import type {
  MEPContext,
  MEPDecision,
  MEPAction,
  TransferResult,
  SiblingProblem,
} from './types.js';
import {
  MEPAction as MEPActionEnum,
  TransferResult as TransferResultEnum,
  MEP_THRESHOLDS,
  TIME_COST_MODEL,
  RUNG_DEFINITIONS,
} from './types.js';
import type { PatternId, ProblemId, MicroDrillId, MicroLessonId } from '../entities/types.js';

// ============================================================================
// Decision Engine
// ============================================================================

/**
 * Computes the next MEP action based on current context.
 * Deterministic: same input always produces same output.
 */
export function computeMEPDecision(context: MEPContext): MEPDecision {
  // Rule 1: Repeated critical error → MICRO_LESSON_GATE
  if (context.repeatedCriticalError) {
    return createDecision({
      action: MEPActionEnum.MICRO_LESSON_GATE,
      reason: 'Repeated critical error requires lesson review',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.MICRO_LESSON_SEC,
      priority: 1,
      metadata: {
        errorCount: context.errorCount,
      },
    });
  }

  // Rule 2: Passed but confidence <3 → SERVE_MICRO_DRILL
  const passed = context.lastScore !== null && context.lastScore >= MEP_THRESHOLDS.SIBLING_SCORE_MAX;
  if (passed && context.confidence < MEP_THRESHOLDS.MIN_CONFIDENCE_TO_SKIP_DRILL) {
    return createDecision({
      action: MEPActionEnum.SERVE_MICRO_DRILL,
      reason: 'Passed but low confidence - reinforce with drill',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.MICRO_DRILL_SEC,
      priority: 2,
      metadata: {
        currentScore: context.lastScore,
        confidence: context.confidence,
      },
    });
  }

  // Rule 3: Score 50–74 or errors≥2 → SERVE_SIBLING
  const needsSibling = (
    (context.lastScore !== null &&
      context.lastScore >= MEP_THRESHOLDS.SIBLING_SCORE_MIN &&
      context.lastScore <= MEP_THRESHOLDS.SIBLING_SCORE_MAX) ||
    context.errorCount >= MEP_THRESHOLDS.SIBLING_ERROR_THRESHOLD
  );
  if (needsSibling && !context.siblingAttempted) {
    return createDecision({
      action: MEPActionEnum.SERVE_SIBLING,
      reason: 'Partial mastery - attempt sibling for transfer',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.SIBLING_SEC,
      priority: 3,
      metadata: {
        ...(context.lastScore !== null ? { currentScore: context.lastScore } : {}),
        errorCount: context.errorCount,
      },
    });
  }

  // Rule 4: Mastery + confidence≥4 → PROMOTE_RUNG
  const hasMastery = context.lastScore !== null &&
    context.lastScore >= MEP_THRESHOLDS.MASTERY_SCORE_MIN;
  const hasConfidence = context.confidence >= MEP_THRESHOLDS.MIN_CONFIDENCE_FOR_PROMOTION;
  const canPromote = context.rungLevel < context.maxRung;

  if (hasMastery && hasConfidence && canPromote) {
    return createDecision({
      action: MEPActionEnum.PROMOTE_RUNG,
      reason: 'Mastery achieved with high confidence',
      patternId: context.patternId,
      estimatedTimeSec: 0,
      priority: 4,
      metadata: {
        currentScore: context.lastScore,
        confidence: context.confidence,
      },
    });
  }

  // Check for pattern completion
  if (hasMastery && hasConfidence && !canPromote) {
    return createDecision({
      action: MEPActionEnum.COMPLETE_PATTERN,
      reason: 'Pattern mastery complete - all rungs achieved',
      patternId: context.patternId,
      estimatedTimeSec: 0,
      priority: 4,
      metadata: {
        currentScore: context.lastScore,
        confidence: context.confidence,
      },
    });
  }

  // Rule 5: Skill decay → SPACED_REVIEW
  if (context.daysSinceLastPractice >= MEP_THRESHOLDS.SKILL_DECAY_DAYS) {
    return createDecision({
      action: MEPActionEnum.SPACED_REVIEW,
      reason: 'Skill decay detected - review needed',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.SPACED_REVIEW_SEC,
      priority: 5,
      metadata: {
        daysSinceLastPractice: context.daysSinceLastPractice,
      },
    });
  }

  // Rule 6: Else RETRY_SAME or sibling (deterministic)
  // Use retry count to decide
  if (context.retryCount < MEP_THRESHOLDS.MAX_SAME_RETRIES) {
    return createDecision({
      action: MEPActionEnum.RETRY_SAME,
      reason: 'Retry current problem before moving on',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.FULL_PROBLEM_SEC,
      priority: 6,
      metadata: {
        retryCount: context.retryCount,
        ...(context.lastScore !== null ? { currentScore: context.lastScore } : {}),
      },
    });
  }

  // Max retries exceeded, try sibling
  return createDecision({
    action: MEPActionEnum.SERVE_SIBLING,
    reason: 'Max retries exceeded - try sibling problem',
    patternId: context.patternId,
    estimatedTimeSec: TIME_COST_MODEL.SIBLING_SEC,
    priority: 6,
    metadata: {
      retryCount: context.retryCount,
    },
  });
}

// ============================================================================
// Transfer Check
// ============================================================================

/**
 * Evaluates transfer learning success.
 * Transfer success = sibling solved on first try.
 */
export function evaluateTransfer(
  siblingFirstTrySuccess: boolean,
  siblingAttempted: boolean
): TransferResult {
  if (!siblingAttempted) {
    return TransferResultEnum.NOT_APPLICABLE;
  }
  return siblingFirstTrySuccess
    ? TransferResultEnum.TRANSFER_SUCCESS
    : TransferResultEnum.TRANSFER_FAIL;
}

// ============================================================================
// Time Budget Filtering
// ============================================================================

/**
 * Filters MEP decision based on available time budget.
 * Returns the best action that fits within budget.
 */
export function filterByTimeBudget(
  decision: MEPDecision,
  timeBudgetSec: number | null,
  fallbackActions: readonly MEPDecision[]
): MEPDecision {
  // No budget constraint
  if (timeBudgetSec === null) {
    return decision;
  }

  // Primary decision fits
  if (decision.estimatedTimeSec <= timeBudgetSec) {
    return decision;
  }

  // Find fallback that fits
  const validFallbacks = fallbackActions
    .filter(d => d.estimatedTimeSec <= timeBudgetSec)
    .sort((a, b) => a.priority - b.priority);

  if (validFallbacks.length > 0) {
    return validFallbacks[0]!;
  }

  // Nothing fits - return micro-drill as minimum viable action
  return createDecision({
    action: MEPActionEnum.SERVE_MICRO_DRILL,
    reason: 'Time budget constraint - serving quick drill',
    patternId: decision.patternId,
    estimatedTimeSec: TIME_COST_MODEL.MICRO_DRILL_SEC,
    priority: 99,
    metadata: {},
  });
}

// ============================================================================
// Confidence-Weighted Promotion
// ============================================================================

/**
 * Checks if user can be promoted based on confidence-weighted criteria.
 */
export function canPromote(
  score: number,
  confidence: number,
  rungLevel: number,
  consecutiveWins: number
): { canPromote: boolean; reason: string } {
  const rung = RUNG_DEFINITIONS.find(r => r.level === rungLevel + 1);

  if (!rung) {
    return { canPromote: false, reason: 'Already at max rung' };
  }

  if (score < rung.requiredScore) {
    return {
      canPromote: false,
      reason: `Score ${score} below required ${rung.requiredScore}`
    };
  }

  if (confidence < rung.requiredConfidence) {
    return {
      canPromote: false,
      reason: `Confidence ${confidence} below required ${rung.requiredConfidence}`
    };
  }

  // Clean wins can accelerate promotion
  if (consecutiveWins >= MEP_THRESHOLDS.CLEAN_WINS_FOR_PROMOTION) {
    return { canPromote: true, reason: 'Consecutive clean wins' };
  }

  return { canPromote: true, reason: 'Met score and confidence requirements' };
}

// ============================================================================
// Sibling Selection
// ============================================================================

/**
 * Selects the best sibling problem deterministically.
 */
export function selectSibling(
  siblings: readonly SiblingProblem[],
  currentProblemId: ProblemId | null,
  timeBudgetSec: number | null
): SiblingProblem | null {
  // Filter out current problem and already attempted
  let candidates = siblings.filter(
    s => s.problemId !== currentProblemId && !s.isAttempted
  );

  // Apply time budget filter if present
  if (timeBudgetSec !== null) {
    candidates = candidates.filter(s => s.estimatedTimeSec <= timeBudgetSec);
  }

  // Sort by difficulty (easier first for transfer check)
  candidates = [...candidates].sort((a, b) => {
    const difficultyOrder: Record<string, number> = {
      'EASY': 0,
      'MEDIUM': 1,
      'HARD': 2,
    };
    return (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
  });

  return candidates[0] ?? null;
}

// ============================================================================
// Helper Functions
// ============================================================================

interface CreateDecisionInput {
  action: MEPAction;
  reason: string;
  patternId: PatternId;
  estimatedTimeSec: number;
  priority: number;
  metadata: {
    currentScore?: number;
    confidence?: number;
    errorCount?: number;
    retryCount?: number;
    daysSinceLastPractice?: number;
    consecutiveWins?: number;
    transferResult?: TransferResult;
  };
  targetId?: ProblemId | MicroDrillId | MicroLessonId | null;
}

function createDecision(input: CreateDecisionInput): MEPDecision {
  const metadata: MEPDecision['metadata'] = {};

  if (input.metadata.currentScore !== undefined) {
    (metadata as { currentScore?: number }).currentScore = input.metadata.currentScore;
  }
  if (input.metadata.confidence !== undefined) {
    (metadata as { confidence?: number }).confidence = input.metadata.confidence;
  }
  if (input.metadata.errorCount !== undefined) {
    (metadata as { errorCount?: number }).errorCount = input.metadata.errorCount;
  }
  if (input.metadata.retryCount !== undefined) {
    (metadata as { retryCount?: number }).retryCount = input.metadata.retryCount;
  }
  if (input.metadata.daysSinceLastPractice !== undefined) {
    (metadata as { daysSinceLastPractice?: number }).daysSinceLastPractice = input.metadata.daysSinceLastPractice;
  }
  if (input.metadata.consecutiveWins !== undefined) {
    (metadata as { consecutiveWins?: number }).consecutiveWins = input.metadata.consecutiveWins;
  }
  if (input.metadata.transferResult !== undefined) {
    (metadata as { transferResult?: TransferResult }).transferResult = input.metadata.transferResult;
  }

  return {
    action: input.action,
    reason: input.reason,
    targetId: input.targetId ?? null,
    patternId: input.patternId,
    estimatedTimeSec: input.estimatedTimeSec,
    priority: input.priority,
    metadata,
  };
}

// ============================================================================
// Decision Summary for Daily Mode
// ============================================================================

/**
 * Gets a prioritized list of actions for time-boxed sessions.
 */
export function getTimeBudgetedActions(
  context: MEPContext,
  timeBudgetSec: number
): readonly MEPDecision[] {
  const decisions: MEPDecision[] = [];

  // Always consider micro-drill (60s)
  if (timeBudgetSec >= TIME_COST_MODEL.MICRO_DRILL_SEC) {
    decisions.push(createDecision({
      action: MEPActionEnum.SERVE_MICRO_DRILL,
      reason: 'Quick reinforcement drill',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.MICRO_DRILL_SEC,
      priority: 1,
      metadata: {},
    }));
  }

  // Consider spaced review (120s)
  if (timeBudgetSec >= TIME_COST_MODEL.SPACED_REVIEW_SEC) {
    decisions.push(createDecision({
      action: MEPActionEnum.SPACED_REVIEW,
      reason: 'Spaced review for retention',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.SPACED_REVIEW_SEC,
      priority: 2,
      metadata: {},
    }));
  }

  // Consider sibling (600s)
  if (timeBudgetSec >= TIME_COST_MODEL.SIBLING_SEC) {
    decisions.push(createDecision({
      action: MEPActionEnum.SERVE_SIBLING,
      reason: 'Sibling problem for transfer',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.SIBLING_SEC,
      priority: 3,
      metadata: {},
    }));
  }

  // Consider full problem (900s)
  if (timeBudgetSec >= TIME_COST_MODEL.FULL_PROBLEM_SEC) {
    decisions.push(createDecision({
      action: MEPActionEnum.RETRY_SAME,
      reason: 'Full problem practice',
      patternId: context.patternId,
      estimatedTimeSec: TIME_COST_MODEL.FULL_PROBLEM_SEC,
      priority: 4,
      metadata: {},
    }));
  }

  return decisions;
}
