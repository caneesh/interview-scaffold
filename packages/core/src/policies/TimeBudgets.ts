/**
 * Time budget policies - default time allocations for different activities.
 * All values are in seconds.
 */

import type { Difficulty, AttemptMode, DrillType } from '../entities/types.js';

// ============================================================================
// Problem Time Budgets (seconds)
// ============================================================================

export const PROBLEM_TIME_BUDGETS: Record<Difficulty, number> = {
  EASY: 15 * 60,      // 15 minutes
  MEDIUM: 25 * 60,    // 25 minutes
  HARD: 45 * 60,      // 45 minutes
} as const;

export const STEP_TIME_BUDGETS: Record<Difficulty, number> = {
  EASY: 3 * 60,       // 3 minutes per step
  MEDIUM: 5 * 60,     // 5 minutes per step
  HARD: 8 * 60,       // 8 minutes per step
} as const;

// ============================================================================
// Drill Time Budgets (seconds)
// ============================================================================

export const DRILL_TIME_BUDGETS: Record<DrillType, number> = {
  PATTERN_RECOGNITION: 60,        // 1 minute
  CODE_COMPLETION: 2 * 60,        // 2 minutes
  BUG_FIX: 3 * 60,                // 3 minutes
  COMPLEXITY_ANALYSIS: 90,        // 1.5 minutes
  EDGE_CASE_IDENTIFICATION: 2 * 60, // 2 minutes
} as const;

// ============================================================================
// Mode-specific Adjustments
// ============================================================================

export const MODE_TIME_MULTIPLIERS: Record<AttemptMode, number> = {
  GUIDED: 1.5,        // 50% more time in guided mode
  EXPLORER: 2.0,      // Double time for exploration
  INTERVIEW: 1.0,     // Standard time for interview
  DAILY: 0.8,         // 20% less time for daily challenges
} as const;

// ============================================================================
// Session Time Budgets (seconds)
// ============================================================================

export const SESSION_TIME_BUDGETS = {
  DAILY: 15 * 60,           // 15 minutes for daily session
  PRACTICE: 30 * 60,        // 30 minutes for practice
  REVIEW: 20 * 60,          // 20 minutes for review
  INTERVIEW_PREP: 45 * 60,  // 45 minutes for interview prep
} as const;

// ============================================================================
// Time Thresholds
// ============================================================================

export const TIME_THRESHOLDS = {
  /** Minimum time spent to count as a valid attempt (seconds) */
  MIN_VALID_ATTEMPT: 30,

  /** Time spent indicates user is stuck (seconds) */
  STUCK_THRESHOLD: 5 * 60,

  /** Time buffer before warning about time running out (seconds) */
  WARNING_BUFFER: 60,

  /** Percentage of budget to show first warning */
  FIRST_WARNING_PERCENT: 0.75,

  /** Percentage of budget to show final warning */
  FINAL_WARNING_PERCENT: 0.9,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function getProblemTimeBudget(
  difficulty: Difficulty,
  mode: AttemptMode
): number {
  const base = PROBLEM_TIME_BUDGETS[difficulty];
  const multiplier = MODE_TIME_MULTIPLIERS[mode];
  return Math.round(base * multiplier);
}

export function getDrillTimeBudget(
  drillType: DrillType,
  mode: AttemptMode
): number {
  const base = DRILL_TIME_BUDGETS[drillType];
  const multiplier = MODE_TIME_MULTIPLIERS[mode];
  return Math.round(base * multiplier);
}

export function isTimeOverrun(
  elapsedSec: number,
  budgetSec: number
): boolean {
  return elapsedSec > budgetSec;
}

export function getTimeRemainingPercent(
  elapsedSec: number,
  budgetSec: number
): number {
  if (budgetSec <= 0) return 0;
  const remaining = Math.max(0, budgetSec - elapsedSec);
  return remaining / budgetSec;
}
