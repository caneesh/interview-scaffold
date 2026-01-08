/**
 * Micro-lesson gating - forces users to review lessons when struggling.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  GatingDecision,
  GatingReason,
  ValidationErrorType,
} from './types.js';
import { GatingReason as GatingReasonEnum } from './types.js';
import type { PatternId, MicroLessonId } from '../entities/types.js';

// ============================================================================
// Gating Constants
// ============================================================================

export const GATING_CONSTANTS = {
  /** Number of same errors before gating */
  SAME_ERROR_THRESHOLD: 2,

  /** Number of Hint2 uses before gating */
  HINT2_THRESHOLD: 2,

  /** Number of retries before gating */
  RETRY_THRESHOLD: 2,

  /** Hint level considered "Hint2" */
  HINT2_LEVEL: 2,
} as const;

// ============================================================================
// Gating State
// ============================================================================

export interface GatingState {
  readonly errorHistory: readonly ValidationErrorType[];
  readonly hintsUsed: readonly number[];
  readonly retryCount: number;
  readonly patternId: PatternId;
}

// ============================================================================
// Gating Functions
// ============================================================================

/**
 * Evaluates whether the user should be gated to a micro-lesson.
 */
export function evaluateGating(state: GatingState): GatingDecision {
  // Check for same error occurring twice
  const sameErrorResult = checkSameErrorTwice(state.errorHistory);
  if (sameErrorResult.triggered) {
    return {
      shouldGate: true,
      reason: GatingReasonEnum.SAME_ERROR_TWICE,
      recommendedLessonId: getLessonForError(sameErrorResult.errorType!, state.patternId),
      errorHistory: [...state.errorHistory],
    };
  }

  // Check for Hint2 used twice
  const hint2Result = checkHint2Twice(state.hintsUsed);
  if (hint2Result.triggered) {
    return {
      shouldGate: true,
      reason: GatingReasonEnum.HINT2_TWICE,
      recommendedLessonId: getLessonForPattern(state.patternId, 'hints'),
      errorHistory: [...state.errorHistory],
    };
  }

  // Check for 2+ retries
  if (state.retryCount >= GATING_CONSTANTS.RETRY_THRESHOLD) {
    return {
      shouldGate: true,
      reason: GatingReasonEnum.RETRIES_EXCEEDED,
      recommendedLessonId: getLessonForPattern(state.patternId, 'fundamentals'),
      errorHistory: [...state.errorHistory],
    };
  }

  return {
    shouldGate: false,
    reason: null,
    recommendedLessonId: null,
    errorHistory: [...state.errorHistory],
  };
}

/**
 * Checks if the same error has occurred twice.
 */
function checkSameErrorTwice(
  errorHistory: readonly ValidationErrorType[]
): { triggered: boolean; errorType: ValidationErrorType | null } {
  if (errorHistory.length < GATING_CONSTANTS.SAME_ERROR_THRESHOLD) {
    return { triggered: false, errorType: null };
  }

  // Count occurrences of each error type
  const errorCounts = new Map<ValidationErrorType, number>();
  for (const error of errorHistory) {
    const count = (errorCounts.get(error) ?? 0) + 1;
    errorCounts.set(error, count);

    if (count >= GATING_CONSTANTS.SAME_ERROR_THRESHOLD) {
      return { triggered: true, errorType: error };
    }
  }

  return { triggered: false, errorType: null };
}

/**
 * Checks if Hint2 has been used twice.
 */
function checkHint2Twice(
  hintsUsed: readonly number[]
): { triggered: boolean } {
  const hint2Count = hintsUsed.filter(
    hint => hint >= GATING_CONSTANTS.HINT2_LEVEL
  ).length;

  return { triggered: hint2Count >= GATING_CONSTANTS.HINT2_THRESHOLD };
}

// ============================================================================
// Lesson Mapping
// ============================================================================

/**
 * Maps error types to recommended lessons.
 */
const ERROR_TO_LESSON: Record<ValidationErrorType, string> = {
  // Approach errors
  WRONG_PATTERN: 'lesson-pattern-selection',
  MISSING_EDGE_CASE: 'lesson-edge-cases',
  INCORRECT_COMPLEXITY: 'lesson-complexity-analysis',

  // Invariant errors
  MISSING_INVARIANT: 'lesson-loop-invariants',
  INCORRECT_INVARIANT: 'lesson-loop-invariants',

  // Plan errors
  INCOMPLETE_PLAN: 'lesson-problem-decomposition',
  WRONG_ORDER: 'lesson-algorithm-design',

  // Code errors
  FORBIDDEN_CONCEPT: 'lesson-common-mistakes',
  PATTERN_VIOLATION: 'lesson-pattern-implementation',
  SYNTAX_ERROR: 'lesson-syntax-basics',
  LOGIC_ERROR: 'lesson-debugging',

  // Pattern-specific errors
  NESTED_LOOP_IN_SLIDING_WINDOW: 'lesson-sliding-window-basics',
  WRONG_SHRINK_CONSTRUCT: 'lesson-sliding-window-shrinking',
  MISSING_VISITED_SET: 'lesson-dfs-visited-tracking',
  MISSING_BACKTRACK: 'lesson-backtracking-fundamentals',
};

/**
 * Gets recommended lesson for an error type.
 */
function getLessonForError(
  errorType: ValidationErrorType,
  patternId: PatternId
): string {
  const baseLesson = ERROR_TO_LESSON[errorType] ?? 'lesson-fundamentals';
  // Could be enhanced to be pattern-specific
  return `${baseLesson}-${patternId}`;
}

/**
 * Gets a general lesson for a pattern.
 */
function getLessonForPattern(
  patternId: PatternId,
  lessonType: 'hints' | 'fundamentals' | 'common-mistakes'
): string {
  return `lesson-${lessonType}-${patternId}`;
}

// ============================================================================
// State Management
// ============================================================================

/**
 * Creates initial gating state.
 */
export function createGatingState(patternId: PatternId): GatingState {
  return {
    errorHistory: [],
    hintsUsed: [],
    retryCount: 0,
    patternId,
  };
}

/**
 * Updates gating state with new error.
 */
export function addErrorToState(
  state: GatingState,
  errorType: ValidationErrorType
): GatingState {
  return {
    ...state,
    errorHistory: [...state.errorHistory, errorType],
  };
}

/**
 * Updates gating state with hint usage.
 */
export function addHintToState(
  state: GatingState,
  hintLevel: number
): GatingState {
  return {
    ...state,
    hintsUsed: [...state.hintsUsed, hintLevel],
  };
}

/**
 * Increments retry count.
 */
export function incrementRetry(state: GatingState): GatingState {
  return {
    ...state,
    retryCount: state.retryCount + 1,
  };
}

/**
 * Resets gating state after completing lesson.
 */
export function resetGatingState(state: GatingState): GatingState {
  return {
    ...state,
    errorHistory: [],
    hintsUsed: [],
    retryCount: 0,
  };
}

// ============================================================================
// Gating Messages
// ============================================================================

/**
 * Gets user-friendly message for gating reason.
 */
export function getGatingMessage(reason: GatingReason): string {
  switch (reason) {
    case GatingReasonEnum.SAME_ERROR_TWICE:
      return "You've made the same mistake twice. Let's review a quick lesson to help clarify the concept.";
    case GatingReasonEnum.HINT2_TWICE:
      return "You've needed significant hints multiple times. A short review will help solidify your understanding.";
    case GatingReasonEnum.RETRIES_EXCEEDED:
      return "Let's take a step back and review the fundamentals before continuing.";
  }
}
