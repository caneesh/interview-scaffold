/**
 * Drill Grading - Deterministic grading for micro-drills.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  Drill,
  DrillSubmission,
  DrillResult,
  MCQDrill,
  ShortTextDrill,
  CodeCompletionDrill,
  TrueFalseDrill,
} from './types.js';
import { DRILL_CONSTANTS } from './types.js';

// ============================================================================
// Main Grading Function
// ============================================================================

/**
 * Grades a drill submission deterministically.
 */
export function gradeDrill(
  drill: Drill,
  submission: DrillSubmission
): DrillResult {
  switch (drill.format) {
    case 'MCQ':
      return gradeMCQ(drill, submission);
    case 'SHORT_TEXT':
      return gradeShortText(drill, submission);
    case 'CODE_COMPLETION':
      return gradeCodeCompletion(drill, submission);
    case 'TRUE_FALSE':
      return gradeTrueFalse(drill, submission);
  }
}

// ============================================================================
// MCQ Grading
// ============================================================================

function gradeMCQ(drill: MCQDrill, submission: DrillSubmission): DrillResult {
  const selectedAnswer = String(submission.answer);
  const correctOption = drill.options.find(o => o.isCorrect);
  const selectedOption = drill.options.find(o => o.id === selectedAnswer);

  const isCorrect = selectedOption?.isCorrect ?? false;
  const baseScore = isCorrect ? DRILL_CONSTANTS.PASS_SCORE : 0;
  const score = applyTimePenalty(baseScore, submission.timeTakenSec, drill.estimatedTimeSec);

  return {
    drillId: drill.id,
    isCorrect,
    score,
    feedback: isCorrect
      ? 'Correct!'
      : `Incorrect. The correct answer is: ${correctOption?.text ?? 'Unknown'}`,
    correctAnswer: correctOption?.id ?? '',
    timeTakenSec: submission.timeTakenSec,
    ...(correctOption?.explanation ? { explanation: correctOption.explanation } : {}),
  };
}

// ============================================================================
// Short Text Grading
// ============================================================================

function gradeShortText(drill: ShortTextDrill, submission: DrillSubmission): DrillResult {
  const userAnswer = String(submission.answer).trim();

  const isCorrect = drill.acceptedAnswers.some(accepted => {
    if (drill.caseSensitive) {
      return accepted === userAnswer;
    }
    return accepted.toLowerCase() === userAnswer.toLowerCase();
  });

  const baseScore = isCorrect ? DRILL_CONSTANTS.PASS_SCORE : 0;
  const score = applyTimePenalty(baseScore, submission.timeTakenSec, drill.estimatedTimeSec);

  return {
    drillId: drill.id,
    isCorrect,
    score,
    feedback: isCorrect
      ? 'Correct!'
      : `Incorrect. Accepted answers include: ${drill.acceptedAnswers[0]}`,
    correctAnswer: drill.acceptedAnswers,
    timeTakenSec: submission.timeTakenSec,
  };
}

// ============================================================================
// Code Completion Grading
// ============================================================================

function gradeCodeCompletion(
  drill: CodeCompletionDrill,
  submission: DrillSubmission
): DrillResult {
  const userAnswer = String(submission.answer).trim();
  const expectedNormalized = normalizeCode(drill.expectedOutput);
  const userNormalized = normalizeCode(userAnswer);

  const isCorrect = expectedNormalized === userNormalized;
  const baseScore = isCorrect ? DRILL_CONSTANTS.PASS_SCORE : 0;
  const score = applyTimePenalty(baseScore, submission.timeTakenSec, drill.estimatedTimeSec);

  return {
    drillId: drill.id,
    isCorrect,
    score,
    feedback: isCorrect
      ? 'Correct! Your code matches the expected output.'
      : 'Incorrect. Review the expected solution.',
    correctAnswer: drill.expectedOutput,
    timeTakenSec: submission.timeTakenSec,
  };
}

/**
 * Normalizes code for comparison (removes whitespace, newlines).
 */
function normalizeCode(code: string): string {
  return code
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}()[\],;:])\s*/g, '$1')
    .trim()
    .toLowerCase();
}

// ============================================================================
// True/False Grading
// ============================================================================

function gradeTrueFalse(drill: TrueFalseDrill, submission: DrillSubmission): DrillResult {
  const userAnswer = submission.answer === true ||
    submission.answer === 'true' ||
    submission.answer === 'True' ||
    submission.answer === 'TRUE';

  const isCorrect = userAnswer === drill.correctAnswer;
  const baseScore = isCorrect ? DRILL_CONSTANTS.PASS_SCORE : 0;
  const score = applyTimePenalty(baseScore, submission.timeTakenSec, drill.estimatedTimeSec);

  return {
    drillId: drill.id,
    isCorrect,
    score,
    feedback: isCorrect
      ? 'Correct!'
      : `Incorrect. The statement is ${drill.correctAnswer ? 'true' : 'false'}.`,
    correctAnswer: drill.correctAnswer,
    explanation: drill.explanation,
    timeTakenSec: submission.timeTakenSec,
  };
}

// ============================================================================
// Time Penalty
// ============================================================================

/**
 * Applies time penalty to score.
 */
function applyTimePenalty(
  baseScore: number,
  timeTaken: number,
  estimatedTime: number
): number {
  if (timeTaken <= estimatedTime) {
    return baseScore;
  }

  const overTime = timeTaken - estimatedTime;
  const penaltyIntervals = Math.floor(overTime / 10);
  const penaltyPercent = penaltyIntervals * DRILL_CONSTANTS.TIME_PENALTY_PERCENT;
  const finalScore = baseScore * (1 - penaltyPercent / 100);

  return Math.max(0, Math.round(finalScore));
}

// ============================================================================
// Drill Selection for Error Types
// ============================================================================

/**
 * Selects drills that target specific error types.
 */
export function selectDrillsForErrorTypes(
  drills: readonly Drill[],
  errorTypes: readonly string[],
  limit: number = 3
): readonly Drill[] {
  // Prioritize drills targeting the specific errors
  const matchingDrills = drills.filter(
    d => d.targetErrorType && errorTypes.includes(d.targetErrorType)
  );

  // Sort by difficulty (easier first for reinforcement)
  const sorted = [...matchingDrills].sort((a, b) => {
    const difficultyOrder = { EASY: 0, MEDIUM: 1, HARD: 2 };
    return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
  });

  return sorted.slice(0, limit);
}

// ============================================================================
// Drill Progress Calculation
// ============================================================================

export interface DrillProgressStats {
  readonly totalAttempts: number;
  readonly correctAttempts: number;
  readonly accuracy: number;
  readonly averageTimeSec: number;
  readonly needsReinforcement: boolean;
}

/**
 * Calculates drill progress statistics.
 */
export function calculateDrillProgress(
  results: readonly DrillResult[]
): DrillProgressStats {
  if (results.length === 0) {
    return {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: 0,
      averageTimeSec: 0,
      needsReinforcement: true,
    };
  }

  const correctAttempts = results.filter(r => r.isCorrect).length;
  const accuracy = correctAttempts / results.length;
  const averageTimeSec = results.reduce((sum, r) => sum + r.timeTakenSec, 0) / results.length;

  return {
    totalAttempts: results.length,
    correctAttempts,
    accuracy,
    averageTimeSec,
    needsReinforcement: accuracy < 0.8, // Below 80% accuracy needs reinforcement
  };
}
