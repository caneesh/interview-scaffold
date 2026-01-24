/**
 * Debug Track - State Machine
 * Defines gate transitions, retry limits, and policy toggles.
 * Pure TypeScript - deterministic state transitions.
 */

import type { DebugGate, DebugPatternCategory } from './types.js';
import type { DebugAttempt, DebugPolicyConfig, EvaluationResult } from './entities.js';

// ============ Gate Transition Map ============

/**
 * GATE_TRANSITIONS defines the valid next gate for each gate.
 * Gates proceed in a strict linear sequence.
 */
export const GATE_TRANSITIONS: Readonly<Record<DebugGate, DebugGate | null>> = {
  SYMPTOM_CLASSIFICATION: 'DETERMINISM_ANALYSIS',
  DETERMINISM_ANALYSIS: 'PATTERN_CLASSIFICATION',
  PATTERN_CLASSIFICATION: 'ROOT_CAUSE_HYPOTHESIS',
  ROOT_CAUSE_HYPOTHESIS: 'FIX_STRATEGY',
  FIX_STRATEGY: 'REGRESSION_PREVENTION',
  REGRESSION_PREVENTION: 'REFLECTION',
  REFLECTION: null, // Final gate - no next gate
};

/**
 * Get the ordered list of gates from start to finish
 */
export const GATE_ORDER: readonly DebugGate[] = [
  'SYMPTOM_CLASSIFICATION',
  'DETERMINISM_ANALYSIS',
  'PATTERN_CLASSIFICATION',
  'ROOT_CAUSE_HYPOTHESIS',
  'FIX_STRATEGY',
  'REGRESSION_PREVENTION',
  'REFLECTION',
];

// ============ Retry Limits ============

/**
 * DEFAULT_RETRY_LIMITS defines how many retries are allowed per gate.
 * Some gates are more lenient (reflection) while others are stricter.
 */
export const DEFAULT_RETRY_LIMITS: Readonly<Record<DebugGate, number>> = {
  SYMPTOM_CLASSIFICATION: 3,   // MCQ - limited retries
  DETERMINISM_ANALYSIS: 3,     // Keyword matching - moderate retries
  PATTERN_CLASSIFICATION: 3,   // Must identify the bug category
  ROOT_CAUSE_HYPOTHESIS: 4,    // Complex - slightly more lenient
  FIX_STRATEGY: 3,             // Must match valid strategies
  REGRESSION_PREVENTION: 4,    // Comprehensive answer expected
  REFLECTION: 5,               // Low stakes - very lenient
};

/**
 * Interview mode has stricter retry limits
 */
export const INTERVIEW_RETRY_LIMITS: Readonly<Record<DebugGate, number>> = {
  SYMPTOM_CLASSIFICATION: 2,
  DETERMINISM_ANALYSIS: 2,
  PATTERN_CLASSIFICATION: 2,
  ROOT_CAUSE_HYPOTHESIS: 2,
  FIX_STRATEGY: 2,
  REGRESSION_PREVENTION: 2,
  REFLECTION: 3,
};

// ============ State Machine Functions ============

/**
 * Get the next gate in the sequence
 */
export function getNextGate(currentGate: DebugGate): DebugGate | null {
  return GATE_TRANSITIONS[currentGate];
}

/**
 * Get the gate index (0-based position in sequence)
 */
export function getGateIndex(gate: DebugGate): number {
  return GATE_ORDER.indexOf(gate);
}

/**
 * Check if this is the final gate
 */
export function isFinalGate(gate: DebugGate): boolean {
  return gate === 'REFLECTION';
}

/**
 * Check if the user has exhausted retries for the current gate
 */
export function hasExhaustedRetries(
  attempt: DebugAttempt,
  retryLimits: Readonly<Record<DebugGate, number>> = DEFAULT_RETRY_LIMITS
): boolean {
  const gate = attempt.currentGate;
  const used = attempt.retriesPerGate[gate] ?? 0;
  const limit = retryLimits[gate] ?? 3;
  return used >= limit;
}

/**
 * Get remaining retries for the current gate
 */
export function getRemainingRetries(
  attempt: DebugAttempt,
  retryLimits: Readonly<Record<DebugGate, number>> = DEFAULT_RETRY_LIMITS
): number {
  const gate = attempt.currentGate;
  const used = attempt.retriesPerGate[gate] ?? 0;
  const limit = retryLimits[gate] ?? 3;
  return Math.max(0, limit - used);
}

// ============ Gate Transition Logic ============

/**
 * TransitionResult - the outcome of attempting a gate transition
 */
export interface TransitionResult {
  readonly allowed: boolean;
  readonly nextGate: DebugGate | null;
  readonly reason: string;
  readonly attemptCompleted: boolean;
}

/**
 * Determine if a gate transition is allowed based on evaluation result
 */
export function computeTransition(
  attempt: DebugAttempt,
  evaluationResult: EvaluationResult,
  retryLimits: Readonly<Record<DebugGate, number>> = DEFAULT_RETRY_LIMITS
): TransitionResult {
  const currentGate = attempt.currentGate;

  // If correct, proceed to next gate
  if (evaluationResult.isCorrect || evaluationResult.allowProceed) {
    const nextGate = getNextGate(currentGate);

    if (nextGate === null) {
      // Completed final gate
      return {
        allowed: true,
        nextGate: null,
        reason: 'All gates completed successfully.',
        attemptCompleted: true,
      };
    }

    return {
      allowed: true,
      nextGate,
      reason: `Proceeding to ${formatGateName(nextGate)}.`,
      attemptCompleted: false,
    };
  }

  // If incorrect, check retries
  const retriesUsed = (attempt.retriesPerGate[currentGate] ?? 0) + 1;
  const maxRetries = retryLimits[currentGate] ?? 3;

  if (retriesUsed >= maxRetries) {
    // Exhausted retries - allow proceed with penalty (configurable)
    const nextGate = getNextGate(currentGate);

    return {
      allowed: true,
      nextGate,
      reason: `Retries exhausted for ${formatGateName(currentGate)}. Proceeding with penalty.`,
      attemptCompleted: nextGate === null,
    };
  }

  // Still have retries - stay on current gate
  return {
    allowed: false,
    nextGate: currentGate,
    reason: `Incorrect answer. ${maxRetries - retriesUsed} retries remaining.`,
    attemptCompleted: false,
  };
}

/**
 * Format gate name for display
 */
export function formatGateName(gate: DebugGate): string {
  return gate
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============ Policy Checks ============

/**
 * Check if hints are allowed given current policy
 */
export function areHintsAllowed(
  policy: DebugPolicyConfig,
  isSimulationMode: boolean
): boolean {
  if (isSimulationMode && !policy.allowHintsInSimulation) {
    return false;
  }
  return true;
}

/**
 * Check if the user can request another hint
 */
export function canRequestHint(
  attempt: DebugAttempt,
  policy: DebugPolicyConfig,
  hintLadderLength: number
): { allowed: boolean; reason: string } {
  if (attempt.hintsUsed >= policy.maxHintsPerAttempt) {
    return {
      allowed: false,
      reason: `Maximum hints (${policy.maxHintsPerAttempt}) reached for this attempt.`,
    };
  }

  if (attempt.hintsUsed >= hintLadderLength) {
    return {
      allowed: false,
      reason: 'All available hints have been used.',
    };
  }

  return {
    allowed: true,
    reason: 'Hint available.',
  };
}

/**
 * Check if solution can be revealed
 */
export function canRevealSolution(
  attempt: DebugAttempt,
  policy: DebugPolicyConfig,
  retryLimits: Readonly<Record<DebugGate, number>> = DEFAULT_RETRY_LIMITS
): boolean {
  if (!policy.revealSolutionOnlyIfExhausted) {
    return true;
  }
  return hasExhaustedRetries(attempt, retryLimits);
}

// ============ Category Weights ============

/**
 * Weights for each category when computing final score.
 * More complex categories get higher weight bonuses.
 */
export const CATEGORY_WEIGHTS: Readonly<Record<DebugPatternCategory, number>> = {
  FUNCTIONAL_LOGIC: 1.0,      // Baseline difficulty
  ALGORITHMIC: 1.1,           // Slightly harder
  PERFORMANCE: 1.15,          // Requires optimization thinking
  RESOURCE: 1.2,              // Systems knowledge needed
  CONCURRENCY: 1.3,           // Notoriously difficult
  INTEGRATION: 1.2,           // Multiple systems involved
  DISTRIBUTED: 1.4,           // Highest complexity
  PRODUCTION_REALITY: 1.25,   // Real-world messiness
};

/**
 * Gate weights for scoring - some gates matter more
 */
export const GATE_WEIGHTS: Readonly<Record<DebugGate, number>> = {
  SYMPTOM_CLASSIFICATION: 0.1,    // Basic observation
  DETERMINISM_ANALYSIS: 0.1,      // Classification
  PATTERN_CLASSIFICATION: 0.2,    // Key insight
  ROOT_CAUSE_HYPOTHESIS: 0.25,    // Core debugging skill
  FIX_STRATEGY: 0.2,              // Practical application
  REGRESSION_PREVENTION: 0.1,     // Forward thinking
  REFLECTION: 0.05,               // Low stakes consolidation
};
