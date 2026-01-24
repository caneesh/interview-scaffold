/**
 * Debug Track - Scoring System
 * Computes debug attempt scores based on multiple factors.
 * Pure TypeScript - deterministic scoring.
 */

import type { DebugGate } from './types.js';
import type { DebugAttempt, DebugScore, DebugScenario } from './entities.js';
import { CATEGORY_WEIGHTS, GATE_WEIGHTS, GATE_ORDER, getGateIndex } from './state-machine.js';

// ============ Scoring Constants ============

/**
 * Time thresholds for time_to_diagnosis scoring (in milliseconds)
 */
const TIME_THRESHOLDS = {
  EXCELLENT: 60_000,    // Under 1 minute = 100%
  GOOD: 180_000,        // Under 3 minutes = 80%
  ACCEPTABLE: 300_000,  // Under 5 minutes = 60%
  SLOW: 600_000,        // Under 10 minutes = 40%
  // Beyond 10 minutes = 20%
} as const;

/**
 * Hint penalty per hint used (percentage points deducted)
 */
const HINT_PENALTY_PER_HINT = 5;

/**
 * Maximum hint penalty (cap)
 */
const MAX_HINT_PENALTY = 30;

/**
 * Bonus for completing all gates without retries
 */
const PERFECT_RUN_BONUS = 10;

// ============ Score Components ============

/**
 * Compute time to diagnosis score
 * Measures time from start to passing PATTERN_CLASSIFICATION gate
 */
export function computeTimeToDiagnosis(attempt: DebugAttempt, now: Date): {
  durationMs: number;
  score: number;
} {
  // Find when PATTERN_CLASSIFICATION was passed
  const patternGateSubmissions = attempt.gateHistory.filter(
    (s) => s.gateId === 'PATTERN_CLASSIFICATION' && s.evaluationResult.isCorrect
  );

  const diagnosisTime = patternGateSubmissions.length > 0
    ? patternGateSubmissions[0]!.timestamp
    : now;

  const durationMs = diagnosisTime.getTime() - attempt.startedAt.getTime();

  let score: number;
  if (durationMs <= TIME_THRESHOLDS.EXCELLENT) {
    score = 100;
  } else if (durationMs <= TIME_THRESHOLDS.GOOD) {
    score = 80;
  } else if (durationMs <= TIME_THRESHOLDS.ACCEPTABLE) {
    score = 60;
  } else if (durationMs <= TIME_THRESHOLDS.SLOW) {
    score = 40;
  } else {
    score = 20;
  }

  return { durationMs, score };
}

/**
 * Compute fix accuracy score
 * Measures percentage of gates passed without retries
 */
export function computeFixAccuracy(attempt: DebugAttempt): number {
  let gatesWithoutRetry = 0;
  let totalGatesPassed = 0;

  // Check each gate that was passed
  for (const gate of GATE_ORDER) {
    const passed = attempt.gateHistory.some(
      (s) => s.gateId === gate && s.evaluationResult.isCorrect
    );

    if (passed) {
      totalGatesPassed++;
      const retriesUsed = attempt.retriesPerGate[gate] ?? 0;
      // First attempt = 1 retry used in our counting
      if (retriesUsed <= 1) {
        gatesWithoutRetry++;
      }
    }
  }

  if (totalGatesPassed === 0) return 0;

  return (gatesWithoutRetry / totalGatesPassed) * 100;
}

/**
 * Compute hints penalty
 * Deducts points for each hint used
 */
export function computeHintsPenalty(hintsUsed: number): number {
  return Math.min(hintsUsed * HINT_PENALTY_PER_HINT, MAX_HINT_PENALTY);
}

/**
 * Compute edge cases score from REGRESSION_PREVENTION gate
 * Based on rubric scores from that gate's evaluation
 */
export function computeEdgeCasesScore(attempt: DebugAttempt): number {
  const regressionSubmissions = attempt.gateHistory.filter(
    (s) => s.gateId === 'REGRESSION_PREVENTION' && s.evaluationResult.isCorrect
  );

  if (regressionSubmissions.length === 0) return 0;

  // Use the last successful submission's completeness score
  const lastSubmission = regressionSubmissions[regressionSubmissions.length - 1]!;
  const completenessScore = lastSubmission.evaluationResult.rubricScores.COMPLETENESS ?? 0;
  const actionabilityScore = lastSubmission.evaluationResult.rubricScores.ACTIONABILITY ?? 0;

  return ((completenessScore + actionabilityScore) / 2) * 100;
}

/**
 * Compute explanation quality score
 * Based on ROOT_CAUSE_HYPOTHESIS and REFLECTION gates
 */
export function computeExplanationQuality(attempt: DebugAttempt): number {
  let totalScore = 0;
  let count = 0;

  // Check ROOT_CAUSE_HYPOTHESIS
  const hypothesisSubmissions = attempt.gateHistory.filter(
    (s) => s.gateId === 'ROOT_CAUSE_HYPOTHESIS' && s.evaluationResult.isCorrect
  );

  if (hypothesisSubmissions.length > 0) {
    const submission = hypothesisSubmissions[hypothesisSubmissions.length - 1]!;
    const technicalDepth = submission.evaluationResult.rubricScores.TECHNICAL_DEPTH ?? 0;
    const clarity = submission.evaluationResult.rubricScores.CLARITY ?? 0;
    totalScore += (technicalDepth + clarity) / 2;
    count++;
  }

  // Check REFLECTION
  const reflectionSubmissions = attempt.gateHistory.filter(
    (s) => s.gateId === 'REFLECTION' && s.evaluationResult.isCorrect
  );

  if (reflectionSubmissions.length > 0) {
    const submission = reflectionSubmissions[reflectionSubmissions.length - 1]!;
    const clarity = submission.evaluationResult.rubricScores.CLARITY ?? 0;
    const specificity = submission.evaluationResult.rubricScores.SPECIFICITY ?? 0;
    totalScore += (clarity + specificity) / 2;
    count++;
  }

  if (count === 0) return 0;

  return (totalScore / count) * 100;
}

/**
 * Compute individual gate scores
 */
export function computeGateScores(attempt: DebugAttempt): Record<DebugGate, number> {
  const scores: Record<DebugGate, number> = {
    SYMPTOM_CLASSIFICATION: 0,
    DETERMINISM_ANALYSIS: 0,
    PATTERN_CLASSIFICATION: 0,
    ROOT_CAUSE_HYPOTHESIS: 0,
    FIX_STRATEGY: 0,
    REGRESSION_PREVENTION: 0,
    REFLECTION: 0,
  };

  for (const gate of GATE_ORDER) {
    const gateSubmissions = attempt.gateHistory.filter((s) => s.gateId === gate);
    const passedSubmission = gateSubmissions.find((s) => s.evaluationResult.isCorrect);

    if (passedSubmission) {
      // Base score: 100 for passing
      let gateScore = 100;

      // Deduct for retries (each retry after first costs 10 points)
      const retriesUsed = attempt.retriesPerGate[gate] ?? 0;
      const retryPenalty = Math.max(0, (retriesUsed - 1) * 10);
      gateScore -= retryPenalty;

      // Use confidence as a multiplier
      gateScore *= passedSubmission.evaluationResult.confidence;

      scores[gate] = Math.max(0, Math.min(100, gateScore));
    } else if (gateSubmissions.length > 0) {
      // Gate attempted but not passed - give partial credit based on last attempt
      const lastSubmission = gateSubmissions[gateSubmissions.length - 1]!;
      scores[gate] = lastSubmission.evaluationResult.confidence * 30; // Max 30 for not passing
    }
  }

  return scores;
}

/**
 * Compute overall debug score
 * Combines all scoring components with weights
 */
export function computeDebugScore(
  attempt: DebugAttempt,
  scenario: DebugScenario,
  now: Date
): DebugScore {
  // Compute individual components
  const timeToDiagnosis = computeTimeToDiagnosis(attempt, now);
  const fixAccuracy = computeFixAccuracy(attempt);
  const hintsPenalty = computeHintsPenalty(attempt.hintsUsed);
  const edgeCasesConsidered = computeEdgeCasesScore(attempt);
  const explanationQuality = computeExplanationQuality(attempt);
  const gateScores = computeGateScores(attempt);

  // Get category weight
  const categoryWeight = CATEGORY_WEIGHTS[scenario.category];

  // Calculate weighted gate score
  let weightedGateScore = 0;
  for (const gate of GATE_ORDER) {
    weightedGateScore += gateScores[gate] * GATE_WEIGHTS[gate];
  }

  // Calculate base score (0-100)
  // Components: Gate scores (50%), Time (15%), Fix accuracy (15%), Edge cases (10%), Explanation (10%)
  let baseScore =
    weightedGateScore * 0.5 +
    timeToDiagnosis.score * 0.15 +
    fixAccuracy * 0.15 +
    edgeCasesConsidered * 0.1 +
    explanationQuality * 0.1;

  // Apply hints penalty
  baseScore -= hintsPenalty;

  // Apply perfect run bonus
  const isPerfectRun = Object.values(attempt.retriesPerGate).every((r) => r <= 1);
  if (isPerfectRun && attempt.hintsUsed === 0) {
    baseScore += PERFECT_RUN_BONUS;
  }

  // Apply category weight
  const adjustedScore = baseScore * categoryWeight;

  // Cap at 100
  const overall = Math.max(0, Math.min(100, Math.round(adjustedScore)));

  return {
    overall,
    timeToDiagnosisMs: timeToDiagnosis.durationMs,
    fixAccuracy: Math.round(fixAccuracy),
    hintsPenalty: Math.round(hintsPenalty),
    edgeCasesConsidered: Math.round(edgeCasesConsidered),
    explanationQuality: Math.round(explanationQuality),
    categoryWeight,
    gateScores,
  };
}

// ============ Score Breakdown Helpers ============

/**
 * Get a human-readable score breakdown
 */
export function getScoreBreakdown(score: DebugScore): string[] {
  const breakdown: string[] = [];

  breakdown.push(`Overall Score: ${score.overall}/100`);
  breakdown.push(`Time to Diagnosis: ${Math.round(score.timeToDiagnosisMs / 1000)}s`);
  breakdown.push(`Fix Accuracy: ${score.fixAccuracy}%`);
  breakdown.push(`Hints Penalty: -${score.hintsPenalty}`);
  breakdown.push(`Edge Cases: ${score.edgeCasesConsidered}%`);
  breakdown.push(`Explanation Quality: ${score.explanationQuality}%`);
  breakdown.push(`Category Multiplier: ${score.categoryWeight}x`);

  return breakdown;
}

/**
 * Get a letter grade from score
 */
export function getLetterGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get performance level from score
 */
export function getPerformanceLevel(score: number): string {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Proficient';
  if (score >= 60) return 'Developing';
  if (score >= 40) return 'Beginner';
  return 'Needs Practice';
}
