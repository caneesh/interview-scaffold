/**
 * Daily session rules - configuration for daily learning sessions.
 */

import type { Difficulty, PatternId } from '../entities/types.js';

// ============================================================================
// Daily Session Limits
// ============================================================================

export const DAILY_LIMITS = {
  /** Maximum items in a daily session */
  MAX_ITEMS: 10,

  /** Minimum items in a daily session */
  MIN_ITEMS: 3,

  /** Default number of items */
  DEFAULT_ITEMS: 5,

  /** Maximum time for daily session (seconds) */
  MAX_TIME_SEC: 20 * 60, // 20 minutes

  /** Target time for daily session (seconds) */
  TARGET_TIME_SEC: 15 * 60, // 15 minutes
} as const;

// ============================================================================
// 10-Minute Daily Mode
// ============================================================================

/**
 * Time-boxed 10-minute daily practice session.
 * Total: 600 seconds
 */
export const DAILY_MODE_10MIN = {
  /** Total session duration in seconds */
  TOTAL_DURATION_SEC: 600,

  /** Block A: Spaced review drill (2 minutes) */
  BLOCK_A_SPACED_REVIEW: {
    DURATION_SEC: 120,
    NAME: 'Spaced Review',
    DESCRIPTION: 'Quick drill on previously learned patterns',
  },

  /** Block B: MEP-selected task (6 minutes) */
  BLOCK_B_MEP_TASK: {
    DURATION_SEC: 360,
    NAME: 'Focused Practice',
    DESCRIPTION: 'MEP-selected problem or sibling',
  },

  /** Block C: Reflection (2 minutes) */
  BLOCK_C_REFLECTION: {
    DURATION_SEC: 120,
    NAME: 'Reflection',
    DESCRIPTION: 'Self-assessment and confidence rating',
  },
} as const;

export const DailyModeBlock = {
  SPACED_REVIEW: 'SPACED_REVIEW',
  MEP_TASK: 'MEP_TASK',
  REFLECTION: 'REFLECTION',
} as const;
export type DailyModeBlock = typeof DailyModeBlock[keyof typeof DailyModeBlock];

export interface DailyModeState {
  readonly currentBlock: DailyModeBlock;
  readonly blockStartedAt: number;
  readonly totalTimeElapsedSec: number;
  readonly blocksCompleted: readonly DailyModeBlock[];
  readonly isComplete: boolean;
}

export interface DailyModeBlockInfo {
  readonly block: DailyModeBlock;
  readonly name: string;
  readonly description: string;
  readonly durationSec: number;
  readonly remainingSec: number;
}

/**
 * Get information about the current block in 10-minute daily mode.
 */
export function getDailyModeBlockInfo(state: DailyModeState): DailyModeBlockInfo {
  const config = DAILY_MODE_10MIN;

  switch (state.currentBlock) {
    case DailyModeBlock.SPACED_REVIEW:
      return {
        block: DailyModeBlock.SPACED_REVIEW,
        name: config.BLOCK_A_SPACED_REVIEW.NAME,
        description: config.BLOCK_A_SPACED_REVIEW.DESCRIPTION,
        durationSec: config.BLOCK_A_SPACED_REVIEW.DURATION_SEC,
        remainingSec: Math.max(0, config.BLOCK_A_SPACED_REVIEW.DURATION_SEC - state.totalTimeElapsedSec),
      };

    case DailyModeBlock.MEP_TASK:
      return {
        block: DailyModeBlock.MEP_TASK,
        name: config.BLOCK_B_MEP_TASK.NAME,
        description: config.BLOCK_B_MEP_TASK.DESCRIPTION,
        durationSec: config.BLOCK_B_MEP_TASK.DURATION_SEC,
        remainingSec: Math.max(0, (config.BLOCK_A_SPACED_REVIEW.DURATION_SEC + config.BLOCK_B_MEP_TASK.DURATION_SEC) - state.totalTimeElapsedSec),
      };

    case DailyModeBlock.REFLECTION:
      return {
        block: DailyModeBlock.REFLECTION,
        name: config.BLOCK_C_REFLECTION.NAME,
        description: config.BLOCK_C_REFLECTION.DESCRIPTION,
        durationSec: config.BLOCK_C_REFLECTION.DURATION_SEC,
        remainingSec: Math.max(0, config.TOTAL_DURATION_SEC - state.totalTimeElapsedSec),
      };
  }
}

/**
 * Create initial daily mode state.
 */
export function createDailyModeState(startedAt: number): DailyModeState {
  return {
    currentBlock: DailyModeBlock.SPACED_REVIEW,
    blockStartedAt: startedAt,
    totalTimeElapsedSec: 0,
    blocksCompleted: [],
    isComplete: false,
  };
}

/**
 * Advance to the next block in daily mode.
 */
export function advanceDailyModeBlock(
  state: DailyModeState,
  currentTime: number
): DailyModeState {
  const newBlocksCompleted = [...state.blocksCompleted, state.currentBlock];
  const totalTimeElapsedSec = (currentTime - state.blockStartedAt) / 1000;

  switch (state.currentBlock) {
    case DailyModeBlock.SPACED_REVIEW:
      return {
        ...state,
        currentBlock: DailyModeBlock.MEP_TASK,
        blockStartedAt: currentTime,
        totalTimeElapsedSec,
        blocksCompleted: newBlocksCompleted,
      };

    case DailyModeBlock.MEP_TASK:
      return {
        ...state,
        currentBlock: DailyModeBlock.REFLECTION,
        blockStartedAt: currentTime,
        totalTimeElapsedSec,
        blocksCompleted: newBlocksCompleted,
      };

    case DailyModeBlock.REFLECTION:
      return {
        ...state,
        totalTimeElapsedSec,
        blocksCompleted: newBlocksCompleted,
        isComplete: true,
      };
  }
}

/**
 * Check if the current block has timed out.
 */
export function isBlockTimedOut(state: DailyModeState, currentTime: number): boolean {
  const elapsedSec = (currentTime - state.blockStartedAt) / 1000;
  const config = DAILY_MODE_10MIN;

  switch (state.currentBlock) {
    case DailyModeBlock.SPACED_REVIEW:
      return elapsedSec >= config.BLOCK_A_SPACED_REVIEW.DURATION_SEC;
    case DailyModeBlock.MEP_TASK:
      return elapsedSec >= config.BLOCK_B_MEP_TASK.DURATION_SEC;
    case DailyModeBlock.REFLECTION:
      return elapsedSec >= config.BLOCK_C_REFLECTION.DURATION_SEC;
  }
}

/**
 * Validate that the daily mode fits within 600 seconds.
 */
export function validateDailyModeDuration(): boolean {
  const config = DAILY_MODE_10MIN;
  const totalDuration =
    config.BLOCK_A_SPACED_REVIEW.DURATION_SEC +
    config.BLOCK_B_MEP_TASK.DURATION_SEC +
    config.BLOCK_C_REFLECTION.DURATION_SEC;

  return totalDuration === config.TOTAL_DURATION_SEC;
}

// ============================================================================
// Item Mix Configuration
// ============================================================================

export const DAILY_MIX = {
  /** Percentage of new content (0-1) */
  NEW_CONTENT_RATIO: 0.4,

  /** Percentage of review content (0-1) */
  REVIEW_RATIO: 0.4,

  /** Percentage of reinforcement drills (0-1) */
  DRILL_RATIO: 0.2,

  /** Min new items per session */
  MIN_NEW_ITEMS: 1,

  /** Max new items per session */
  MAX_NEW_ITEMS: 3,

  /** Min review items per session */
  MIN_REVIEW_ITEMS: 1,
} as const;

// ============================================================================
// Difficulty Distribution
// ============================================================================

export const DAILY_DIFFICULTY_WEIGHTS: Record<Difficulty, number> = {
  EASY: 0.3,      // 30% easy
  MEDIUM: 0.5,    // 50% medium
  HARD: 0.2,      // 20% hard
} as const;

// ============================================================================
// Spaced Repetition Settings
// ============================================================================

export const SPACED_REPETITION = {
  /** Days until first review */
  FIRST_REVIEW_DAYS: 1,

  /** Multiplier for review interval on success */
  SUCCESS_INTERVAL_MULTIPLIER: 2.0,

  /** Multiplier for review interval on failure */
  FAILURE_INTERVAL_MULTIPLIER: 0.5,

  /** Maximum days between reviews */
  MAX_INTERVAL_DAYS: 30,

  /** Minimum days between reviews */
  MIN_INTERVAL_DAYS: 1,
} as const;

// ============================================================================
// Priority Scoring
// ============================================================================

export const PRIORITY_WEIGHTS = {
  /** Weight for items due for review */
  DUE_FOR_REVIEW: 10,

  /** Weight for weak patterns */
  WEAK_PATTERN: 8,

  /** Weight for new content */
  NEW_CONTENT: 5,

  /** Weight for maintaining streak */
  STREAK_MAINTENANCE: 3,

  /** Penalty for recently practiced */
  RECENT_PENALTY: -5,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export interface DailySessionConfig {
  readonly totalItems: number;
  readonly newItems: number;
  readonly reviewItems: number;
  readonly drillItems: number;
  readonly targetTimeSec: number;
  readonly focusPatterns: readonly PatternId[];
}

export function calculateDailySessionConfig(params: {
  availableTimeSec?: number;
  preferredItemCount?: number;
  weakPatterns?: readonly PatternId[];
  itemsDueForReview?: number;
}): DailySessionConfig {
  const {
    availableTimeSec = DAILY_LIMITS.TARGET_TIME_SEC,
    preferredItemCount = DAILY_LIMITS.DEFAULT_ITEMS,
    weakPatterns = [],
    itemsDueForReview = 0,
  } = params;

  // Calculate total items based on time and preference
  const totalItems = Math.min(
    DAILY_LIMITS.MAX_ITEMS,
    Math.max(
      DAILY_LIMITS.MIN_ITEMS,
      preferredItemCount,
      Math.floor(availableTimeSec / (3 * 60)) // ~3 min per item
    )
  );

  // Distribute items
  const reviewItems = Math.min(
    Math.ceil(totalItems * DAILY_MIX.REVIEW_RATIO),
    itemsDueForReview
  );

  const drillItems = Math.floor(totalItems * DAILY_MIX.DRILL_RATIO);
  const newItems = Math.min(
    DAILY_MIX.MAX_NEW_ITEMS,
    Math.max(
      DAILY_MIX.MIN_NEW_ITEMS,
      totalItems - reviewItems - drillItems
    )
  );

  return {
    totalItems,
    newItems,
    reviewItems: Math.max(DAILY_MIX.MIN_REVIEW_ITEMS, reviewItems),
    drillItems,
    targetTimeSec: Math.min(availableTimeSec, DAILY_LIMITS.MAX_TIME_SEC),
    focusPatterns: weakPatterns.slice(0, 3), // Focus on top 3 weak patterns
  };
}

export function calculateNextReviewDate(params: {
  lastReviewDate: number;
  wasSuccessful: boolean;
  currentIntervalDays: number;
}): number {
  const { lastReviewDate, wasSuccessful, currentIntervalDays } = params;

  const multiplier = wasSuccessful
    ? SPACED_REPETITION.SUCCESS_INTERVAL_MULTIPLIER
    : SPACED_REPETITION.FAILURE_INTERVAL_MULTIPLIER;

  const newInterval = Math.min(
    SPACED_REPETITION.MAX_INTERVAL_DAYS,
    Math.max(
      SPACED_REPETITION.MIN_INTERVAL_DAYS,
      Math.round(currentIntervalDays * multiplier)
    )
  );

  const msPerDay = 24 * 60 * 60 * 1000;
  return lastReviewDate + (newInterval * msPerDay);
}

export function calculateItemPriority(params: {
  isDueForReview: boolean;
  isWeakPattern: boolean;
  isNew: boolean;
  daysSinceLastPractice: number;
  streakDays: number;
}): number {
  let priority = 0;

  if (params.isDueForReview) {
    priority += PRIORITY_WEIGHTS.DUE_FOR_REVIEW;
  }
  if (params.isWeakPattern) {
    priority += PRIORITY_WEIGHTS.WEAK_PATTERN;
  }
  if (params.isNew) {
    priority += PRIORITY_WEIGHTS.NEW_CONTENT;
  }
  if (params.streakDays > 0) {
    priority += PRIORITY_WEIGHTS.STREAK_MAINTENANCE;
  }
  if (params.daysSinceLastPractice < 1) {
    priority += PRIORITY_WEIGHTS.RECENT_PENALTY;
  }

  return priority;
}
