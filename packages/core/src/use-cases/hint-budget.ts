/**
 * Hint Budget System for Attempt V2
 *
 * Manages the progressive hint system based on user's rung level.
 * Beginners get more hints, advanced users get fewer.
 *
 * The hint budget is designed to:
 * 1. Encourage independent problem-solving
 * 2. Provide scaffolding for learners who need it
 * 3. Scale support inversely with skill level
 *
 * NOTE: This module uses "V2" prefix to avoid collision with the existing
 * hint system in packages/core/src/hints/generator.ts
 */

import type { RungLevel } from '../entities/rung.js';

// ============ Constants ============

/**
 * Hint budget by rung level for V2 flow
 * Lower rungs (beginners) get more hints
 * Higher rungs (advanced) get fewer hints
 */
export const V2_HINT_BUDGET_BY_RUNG: Readonly<Record<RungLevel, number>> = {
  1: 6,  // Most hints for beginners
  2: 5,
  3: 4,
  4: 3,
  5: 2,  // Fewest hints for advanced
} as const;

/**
 * Minimum hints available regardless of rung (floor)
 */
export const V2_MIN_HINTS = 2;

/**
 * Maximum hints available regardless of rung (ceiling)
 */
export const V2_MAX_HINTS = 6;

/**
 * Hint level descriptions for progressive help in V2 flow
 */
export const V2_HINT_LEVEL_DESCRIPTIONS: Readonly<Record<number, string>> = {
  1: 'Question exposing missing insight',
  2: 'Conceptual hint about the approach',
  3: 'Invariant or condition hint',
  4: 'Structural skeleton (pseudocode)',
  5: 'Focused guidance on specific area',
} as const;

// ============ Types ============

/**
 * Attempt state relevant to hint budget in V2 flow
 * This matches fields from AttemptV2 that relate to hints
 */
export interface V2HintBudgetAttempt {
  readonly rung: RungLevel;
  readonly hintBudget: number;
  readonly hintsUsedCount: number;
}

/**
 * Result of requesting a hint in V2 flow
 */
export interface V2HintRequestResult {
  readonly success: boolean;
  readonly remaining: number;
  readonly hintLevel: number;
  readonly error?: string;
}

/**
 * Budget state for display in V2 flow
 */
export interface V2HintBudgetState {
  readonly total: number;
  readonly used: number;
  readonly remaining: number;
  readonly isExhausted: boolean;
  readonly nextHintLevel: number | null;
}

// ============ Core Functions ============

/**
 * Get the hint budget for a rung level in V2 flow
 *
 * @param rung - The user's current rung level (1-5)
 * @returns Number of hints available
 */
export function getV2HintBudget(rung: RungLevel): number {
  const budget = V2_HINT_BUDGET_BY_RUNG[rung];
  // Ensure within bounds even if rung is somehow invalid
  return Math.max(V2_MIN_HINTS, Math.min(V2_MAX_HINTS, budget ?? 4));
}

/**
 * Check if user can request another hint in V2 flow
 *
 * @param attempt - Attempt with hint budget info
 * @returns True if more hints are available
 */
export function canRequestV2Hint(attempt: V2HintBudgetAttempt): boolean {
  return attempt.hintsUsedCount < attempt.hintBudget;
}

/**
 * Get the next hint level for an attempt in V2 flow
 *
 * @param hintsUsedCount - Number of hints already used
 * @returns The next hint level (1-5) or null if exhausted
 */
export function getV2NextHintLevel(hintsUsedCount: number): number | null {
  if (hintsUsedCount >= 5) return null;
  return hintsUsedCount + 1;
}

/**
 * Consume a hint from the budget in V2 flow
 *
 * @param attempt - Current attempt state
 * @returns Result with new remaining count and hint level
 */
export function consumeV2Hint(attempt: V2HintBudgetAttempt): V2HintRequestResult {
  if (!canRequestV2Hint(attempt)) {
    return {
      success: false,
      remaining: 0,
      hintLevel: 0,
      error: 'Hint budget exhausted',
    };
  }

  const newUsedCount = attempt.hintsUsedCount + 1;
  const remaining = attempt.hintBudget - newUsedCount;
  const hintLevel = newUsedCount; // Level matches count (1-5)

  return {
    success: true,
    remaining,
    hintLevel: Math.min(hintLevel, 5), // Cap at level 5
  };
}

/**
 * Get the full hint budget state for an attempt in V2 flow
 *
 * @param attempt - Attempt with hint budget info
 * @returns Budget state for UI display
 */
export function getV2HintBudgetState(attempt: V2HintBudgetAttempt): V2HintBudgetState {
  const used = attempt.hintsUsedCount;
  const total = attempt.hintBudget;
  const remaining = Math.max(0, total - used);
  const isExhausted = remaining === 0;
  const nextHintLevel = getV2NextHintLevel(used);

  return {
    total,
    used,
    remaining,
    isExhausted,
    nextHintLevel,
  };
}

/**
 * Calculate hint budget for a new attempt in V2 flow
 *
 * @param rung - The problem's rung level
 * @returns Initial hint budget
 */
export function calculateV2InitialHintBudget(rung: RungLevel): number {
  return getV2HintBudget(rung);
}

// ============ Hint Level Helpers ============

/**
 * Get description for a hint level in V2 flow
 *
 * @param level - Hint level (1-5)
 * @returns Human-readable description
 */
export function getV2HintLevelDescription(level: number): string {
  return V2_HINT_LEVEL_DESCRIPTIONS[level] ?? 'Additional guidance';
}

/**
 * Check if a hint level reveals significant solution details
 * Levels 4 and 5 are considered "high reveal"
 *
 * @param level - Hint level (1-5)
 * @returns True if this is a high-reveal hint
 */
export function isV2HighRevealHint(level: number): boolean {
  return level >= 4;
}

/**
 * Calculate penalty for using hints (for scoring) in V2 flow
 * Each hint reduces potential score
 *
 * @param hintsUsed - Number of hints used
 * @param maxScore - Maximum possible score
 * @returns Penalty points to deduct
 */
export function calculateV2HintPenalty(
  hintsUsed: number,
  maxScore: number = 100
): number {
  // No penalty for first hint (encourages asking for help)
  if (hintsUsed === 0) return 0;

  // Progressive penalty: 5% per hint after first
  const penaltyPerHint = maxScore * 0.05;
  return Math.min(
    maxScore * 0.25, // Cap at 25% penalty
    (hintsUsed - 1) * penaltyPerHint
  );
}

// ============ Validation ============

/**
 * Validate hint budget values in V2 flow
 */
export function validateV2HintBudget(
  hintBudget: number,
  hintsUsedCount: number
): { valid: boolean; error?: string } {
  if (hintBudget < V2_MIN_HINTS || hintBudget > V2_MAX_HINTS) {
    return {
      valid: false,
      error: `Hint budget must be between ${V2_MIN_HINTS} and ${V2_MAX_HINTS}`,
    };
  }

  if (hintsUsedCount < 0) {
    return {
      valid: false,
      error: 'Hints used count cannot be negative',
    };
  }

  if (hintsUsedCount > hintBudget) {
    return {
      valid: false,
      error: 'Hints used cannot exceed budget',
    };
  }

  return { valid: true };
}
