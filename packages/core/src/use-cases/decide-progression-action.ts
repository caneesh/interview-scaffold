import type { Attempt, AttemptScore, LegacyAttempt } from '../entities/attempt.js';
import { isLegacyAttempt } from '../entities/attempt.js';
import type { Problem } from '../entities/problem.js';
import type { RungLevel, RUNG_LEVELS } from '../entities/rung.js';
import { RUNG_DEFINITIONS } from '../entities/rung.js';

/**
 * DecideProgressionAction - pure function to determine post-attempt progression
 * No side effects, no dependencies, fully deterministic
 */

// Progression action types
export const PROGRESSION_ACTIONS = [
  'SERVE_SIBLING', // Serve another problem at same pattern/rung
  'RETRY_SAME', // Retry the same problem
  'MICRO_LESSON_GATE', // Show micro-lesson before continuing
  'PROMOTE_RUNG', // Advance to next rung
  'COMPLETE_RUNG', // Rung mastered (at rung 5)
] as const;

export type ProgressionAction = (typeof PROGRESSION_ACTIONS)[number];

export interface ProgressionDecision {
  readonly action: ProgressionAction;
  readonly reason: string;
  readonly nextProblemId?: string; // For SERVE_SIBLING
  readonly nextRung?: RungLevel; // For PROMOTE_RUNG
  readonly microLessonTopic?: string; // For MICRO_LESSON_GATE
}

export interface DecideProgressionInput {
  readonly attempt: LegacyAttempt; // The just-completed attempt (legacy only - has problemId)
  readonly recentAttempts: readonly Attempt[]; // Last N attempts for same pattern+rung (including current)
  readonly availableSiblings: readonly Problem[]; // Other problems at same pattern+rung
}

// Mastery rules constants
const MASTERY_WINDOW = 5; // Number of attempts to consider for mastery
const MASTERY_MIN_ATTEMPTS = 3; // Minimum attempts before promotion is possible
const LOW_SCORE_THRESHOLD = 50; // Score below which triggers micro-lesson
const CONSECUTIVE_FAILURES_FOR_MICRO_LESSON = 2; // Consecutive low scores before micro-lesson

export function decideProgressionAction(
  input: DecideProgressionInput
): ProgressionDecision {
  const { attempt, recentAttempts, availableSiblings } = input;

  // Attempt must be completed to make progression decision
  if (attempt.state !== 'COMPLETED') {
    return {
      action: 'RETRY_SAME',
      reason: 'Attempt not completed',
    };
  }

  const score = attempt.score;
  if (!score) {
    return {
      action: 'RETRY_SAME',
      reason: 'No score available',
    };
  }

  // Get the last N completed attempts (including this one)
  const windowAttempts = recentAttempts
    .filter((a) => a.state === 'COMPLETED' && a.score !== null)
    .slice(0, MASTERY_WINDOW);

  // Check for consecutive low scores -> micro-lesson gate
  const consecutiveLowScores = countConsecutiveLowScores(windowAttempts);
  if (consecutiveLowScores >= CONSECUTIVE_FAILURES_FOR_MICRO_LESSON) {
    return {
      action: 'MICRO_LESSON_GATE',
      reason: `${consecutiveLowScores} consecutive attempts below ${LOW_SCORE_THRESHOLD}`,
      microLessonTopic: attempt.pattern,
    };
  }

  // Calculate mastery metrics
  const mastery = calculateMastery(windowAttempts, attempt.rung);

  // Check if eligible for promotion
  if (mastery.isEligibleForPromotion) {
    if (attempt.rung === 5) {
      // At max rung, mark as complete
      return {
        action: 'COMPLETE_RUNG',
        reason: `Mastery achieved at rung 5 with average score ${mastery.averageScore.toFixed(1)}`,
      };
    } else {
      // Promote to next rung
      const nextRung = (attempt.rung + 1) as RungLevel;
      return {
        action: 'PROMOTE_RUNG',
        reason: `Mastery threshold met (${mastery.averageScore.toFixed(1)} >= ${mastery.threshold})`,
        nextRung,
      };
    }
  }

  // Not ready for promotion - serve sibling or retry
  if (availableSiblings.length > 0) {
    // Select sibling deterministically
    const siblingIndex = selectSiblingIndex(
      attempt.problemId,
      recentAttempts.length,
      availableSiblings.length
    );
    const sibling = availableSiblings[siblingIndex];
    if (sibling) {
      return {
        action: 'SERVE_SIBLING',
        reason: `Need more practice (score: ${score.overall}, threshold: ${mastery.threshold})`,
        nextProblemId: sibling.id,
      };
    }
  }

  // No siblings available, retry same problem
  return {
    action: 'RETRY_SAME',
    reason: 'No sibling problems available',
  };
}

interface MasteryMetrics {
  readonly averageScore: number;
  readonly threshold: number;
  readonly attemptCount: number;
  readonly isEligibleForPromotion: boolean;
}

function calculateMastery(
  attempts: readonly Attempt[],
  rung: RungLevel
): MasteryMetrics {
  const threshold = RUNG_DEFINITIONS[rung].unlockThreshold;

  if (attempts.length < MASTERY_MIN_ATTEMPTS) {
    return {
      averageScore: 0,
      threshold,
      attemptCount: attempts.length,
      isEligibleForPromotion: false,
    };
  }

  // Calculate average score from window
  const scores = attempts
    .map((a) => a.score?.overall ?? 0)
    .slice(0, MASTERY_WINDOW);

  const averageScore =
    scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Must have all attempts in window above threshold for promotion
  const allAboveThreshold = scores.every((s) => s >= threshold);
  const averageAboveThreshold = averageScore >= threshold;

  return {
    averageScore,
    threshold,
    attemptCount: attempts.length,
    // Promotion requires both: average above threshold AND all recent above threshold
    isEligibleForPromotion: allAboveThreshold && averageAboveThreshold,
  };
}

function countConsecutiveLowScores(attempts: readonly Attempt[]): number {
  let count = 0;
  for (const attempt of attempts) {
    if (attempt.score && attempt.score.overall < LOW_SCORE_THRESHOLD) {
      count++;
    } else {
      break; // Stop at first non-low score
    }
  }
  return count;
}

/**
 * Deterministic sibling selection - no randomness
 * Uses attempt count and problem ID to create stable, predictable selection
 */
function selectSiblingIndex(
  currentProblemId: string,
  attemptCount: number,
  siblingCount: number
): number {
  if (siblingCount === 0) return 0;

  // Create a simple hash from problem ID for determinism
  let hash = 0;
  for (let i = 0; i < currentProblemId.length; i++) {
    const char = currentProblemId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Combine with attempt count for progression
  const index = Math.abs(hash + attemptCount) % siblingCount;
  return index;
}

// Export constants for testing
export const PROGRESSION_CONSTANTS = {
  MASTERY_WINDOW,
  MASTERY_MIN_ATTEMPTS,
  LOW_SCORE_THRESHOLD,
  CONSECUTIVE_FAILURES_FOR_MICRO_LESSON,
} as const;

// Export helper for external use
export { selectSiblingIndex };
