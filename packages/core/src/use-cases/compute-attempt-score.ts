import type { Attempt, AttemptScore } from '../entities/attempt.js';
import type { HintLevel } from '../entities/step.js';

/**
 * ComputeAttemptScore - pure function to compute score from attempt data
 * Returns scores on 0-100 scale with penalties and bonuses
 * No side effects, no dependencies
 */

export interface ComputeAttemptScoreInput {
  readonly attempt: Attempt;
}

export interface ComputeAttemptScoreOutput {
  readonly score: AttemptScore;
}

// Scoring constants - deterministic, no hidden logic
// All penalties are in 0-100 scale points
const HINT_PENALTIES: Record<HintLevel, number> = {
  DIRECTIONAL_QUESTION: 2,
  HEURISTIC_HINT: 5,
  CONCEPT_INJECTION: 10,
  MICRO_EXAMPLE: 15,
  PATCH_SNIPPET: 25,
};

const MAX_SUBMISSIONS_BEFORE_PENALTY = 2;
const SUBMISSION_PENALTY = 5;

const THINKING_GATE_FAIL_PENALTY = 10;
const REFLECTION_FAIL_PENALTY = 3;
const FAILED_TEST_PENALTY = 2;

// Bonus constants
const BONUS_FIRST_TRY_PASS = 10; // Passed all tests on first submission
const BONUS_NO_HINTS = 5; // Completed without any hints
const BONUS_PERFECT_THINKING = 5; // Passed thinking gate on first try
const BONUS_FAST_COMPLETION_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const BONUS_FAST_COMPLETION = 5; // Completed quickly

// Component weights (must sum to 1.0)
const WEIGHT_PATTERN_RECOGNITION = 0.25;
const WEIGHT_IMPLEMENTATION = 0.35;
const WEIGHT_EDGE_CASES = 0.25;
const WEIGHT_EFFICIENCY = 0.15;

export function computeAttemptScore(
  input: ComputeAttemptScoreInput
): ComputeAttemptScoreOutput {
  const { attempt } = input;

  // Base scores (100 = perfect)
  let patternRecognition = 100;
  let implementation = 100;
  let edgeCases = 100;
  let efficiency = 100;
  let bonus = 0;

  // Pattern recognition: penalize if thinking gate failed initially
  const thinkingSteps = attempt.steps.filter((s) => s.type === 'THINKING_GATE');
  const thinkingFailures = thinkingSteps.filter((s) => s.result === 'FAIL').length;
  patternRecognition -= thinkingFailures * THINKING_GATE_FAIL_PENALTY;

  // Bonus: perfect thinking gate (passed on first try)
  if (thinkingSteps.length === 1 && thinkingSteps[0]?.result === 'PASS') {
    bonus += BONUS_PERFECT_THINKING;
  }

  // Implementation: penalize for extra submissions
  const extraSubmissions = Math.max(
    0,
    attempt.codeSubmissions - MAX_SUBMISSIONS_BEFORE_PENALTY
  );
  implementation -= extraSubmissions * SUBMISSION_PENALTY;

  // Bonus: first try pass (passed on first code submission)
  if (attempt.codeSubmissions === 1 && attempt.state === 'COMPLETED') {
    bonus += BONUS_FIRST_TRY_PASS;
  }

  // Edge cases: analyze test results from coding steps
  const codingSteps = attempt.steps.filter((s) => s.type === 'CODING');
  for (const step of codingSteps) {
    if (step.data.type === 'CODING') {
      const failedTests = step.data.testResults.filter((t) => !t.passed);
      edgeCases -= failedTests.length * FAILED_TEST_PENALTY;
    }
  }

  // Efficiency: penalize for hint usage
  for (const hintLevel of attempt.hintsUsed) {
    const penalty = HINT_PENALTIES[hintLevel] ?? 0;
    efficiency -= penalty;
  }

  // Bonus: no hints used
  if (attempt.hintsUsed.length === 0 && attempt.state === 'COMPLETED') {
    bonus += BONUS_NO_HINTS;
  }

  // Penalize for reflection failures
  const reflectionSteps = attempt.steps.filter((s) => s.type === 'REFLECTION');
  const reflectionFailures = reflectionSteps.filter(
    (s) => s.result === 'FAIL'
  ).length;
  implementation -= reflectionFailures * REFLECTION_FAIL_PENALTY;

  // Bonus: fast completion
  if (attempt.completedAt && attempt.state === 'COMPLETED') {
    const duration = attempt.completedAt.getTime() - attempt.startedAt.getTime();
    if (duration < BONUS_FAST_COMPLETION_THRESHOLD_MS) {
      bonus += BONUS_FAST_COMPLETION;
    }
  }

  // Clamp all component scores to [0, 100]
  patternRecognition = clamp(patternRecognition, 0, 100);
  implementation = clamp(implementation, 0, 100);
  edgeCases = clamp(edgeCases, 0, 100);
  efficiency = clamp(efficiency, 0, 100);
  bonus = clamp(bonus, 0, 25); // Max bonus is 25 points

  // Overall is weighted average of components + bonus, capped at 100
  const baseScore =
    patternRecognition * WEIGHT_PATTERN_RECOGNITION +
    implementation * WEIGHT_IMPLEMENTATION +
    edgeCases * WEIGHT_EDGE_CASES +
    efficiency * WEIGHT_EFFICIENCY;

  const overall = clamp(baseScore + bonus, 0, 100);

  return {
    score: {
      overall: round(overall, 1),
      patternRecognition: round(patternRecognition, 1),
      implementation: round(implementation, 1),
      edgeCases: round(edgeCases, 1),
      efficiency: round(efficiency, 1),
      bonus: round(bonus, 1),
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// Export constants for testing
export const SCORING_CONSTANTS = {
  HINT_PENALTIES,
  MAX_SUBMISSIONS_BEFORE_PENALTY,
  SUBMISSION_PENALTY,
  THINKING_GATE_FAIL_PENALTY,
  REFLECTION_FAIL_PENALTY,
  FAILED_TEST_PENALTY,
  BONUS_FIRST_TRY_PASS,
  BONUS_NO_HINTS,
  BONUS_PERFECT_THINKING,
  BONUS_FAST_COMPLETION_THRESHOLD_MS,
  BONUS_FAST_COMPLETION,
  WEIGHT_PATTERN_RECOGNITION,
  WEIGHT_IMPLEMENTATION,
  WEIGHT_EDGE_CASES,
  WEIGHT_EFFICIENCY,
} as const;
