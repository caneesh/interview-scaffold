/**
 * Rubric grading system for checkpoint validation.
 * PURE TypeScript - no framework dependencies.
 */

import type {
  Rubric,
  RubricCriterion,
  RubricResult,
  GradeResult,
  CheckpointResult,
  ValidationError,
  CheckpointType,
} from './types.js';
import { GradeResult as GradeResultEnum } from './types.js';

// ============================================================================
// Grading Constants
// ============================================================================

export const GRADING_CONSTANTS = {
  /** Default passing score (0-100) */
  DEFAULT_PASSING_SCORE: 80,

  /** Default partial score threshold (0-100) */
  DEFAULT_PARTIAL_SCORE: 50,

  /** Minimum score for any criterion to count */
  MIN_CRITERION_SCORE: 0.3,
} as const;

// ============================================================================
// Rubric Grader
// ============================================================================

export interface GradeInput {
  readonly rubric: Rubric;
  readonly submission: string;
  readonly checkpoint: CheckpointType;
}

export interface GradeOutput {
  readonly grade: GradeResult;
  readonly totalScore: number;
  readonly results: readonly RubricResult[];
  readonly checkpointResult: CheckpointResult;
}

/**
 * Grades a submission against a rubric.
 */
export function gradeSubmission(input: GradeInput): GradeOutput {
  const { rubric, submission, checkpoint } = input;
  const normalizedSubmission = submission.toLowerCase().trim();

  const results: RubricResult[] = [];
  let totalWeight = 0;
  let earnedScore = 0;
  let requiredMet = true;

  for (const criterion of rubric.criteria) {
    const result = evaluateCriterion(criterion, normalizedSubmission);
    results.push(result);

    totalWeight += criterion.weight;
    earnedScore += result.score * criterion.weight;

    if (criterion.required && !result.met) {
      requiredMet = false;
    }
  }

  // Calculate percentage score
  const percentageScore = totalWeight > 0 ? (earnedScore / totalWeight) * 100 : 0;

  // Determine grade
  let grade: GradeResult;
  if (!requiredMet) {
    grade = GradeResultEnum.FAIL;
  } else if (percentageScore >= rubric.passingScore) {
    grade = GradeResultEnum.PASS;
  } else if (percentageScore >= rubric.partialScore) {
    grade = GradeResultEnum.PARTIAL;
  } else {
    grade = GradeResultEnum.FAIL;
  }

  // Generate feedback
  const feedback = generateFeedback(grade, results, percentageScore);

  // Generate errors from failed criteria
  const errors = generateErrorsFromResults(results, checkpoint);

  const checkpointResult: CheckpointResult = {
    checkpoint,
    grade,
    feedback,
    errors,
    timestamp: Date.now(),
  };

  return {
    grade,
    totalScore: percentageScore,
    results,
    checkpointResult,
  };
}

/**
 * Evaluates a single criterion against submission.
 */
function evaluateCriterion(
  criterion: RubricCriterion,
  submission: string
): RubricResult {
  let matchCount = 0;
  let totalChecks = 0;

  // Check keywords
  if (criterion.keywords && criterion.keywords.length > 0) {
    for (const keyword of criterion.keywords) {
      totalChecks++;
      if (submission.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
  }

  // Check regex patterns
  if (criterion.patterns && criterion.patterns.length > 0) {
    for (const pattern of criterion.patterns) {
      totalChecks++;
      if (pattern.test(submission)) {
        matchCount++;
      }
    }
  }

  // If no checks defined, assume pass
  if (totalChecks === 0) {
    return {
      criterionId: criterion.id,
      met: true,
      score: 1,
      feedback: `${criterion.name}: Met (no specific checks)`,
    };
  }

  const score = matchCount / totalChecks;
  const met = score >= GRADING_CONSTANTS.MIN_CRITERION_SCORE;

  return {
    criterionId: criterion.id,
    met,
    score,
    feedback: met
      ? `${criterion.name}: Met (${Math.round(score * 100)}%)`
      : `${criterion.name}: Not met - ${criterion.description}`,
  };
}

/**
 * Generates human-readable feedback from grading results.
 */
function generateFeedback(
  grade: GradeResult,
  results: readonly RubricResult[],
  score: number
): string {
  const failedCriteria = results.filter(r => !r.met);

  if (grade === GradeResultEnum.PASS) {
    return `Great work! Score: ${Math.round(score)}%. All criteria met.`;
  }

  if (grade === GradeResultEnum.PARTIAL) {
    const missing = failedCriteria.map(r => r.feedback).join('; ');
    return `Partial credit. Score: ${Math.round(score)}%. Missing: ${missing}`;
  }

  const missing = failedCriteria.map(r => r.feedback).join('; ');
  return `Not passing. Score: ${Math.round(score)}%. Issues: ${missing}`;
}

/**
 * Generates validation errors from failed rubric results.
 */
function generateErrorsFromResults(
  results: readonly RubricResult[],
  checkpoint: CheckpointType
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const result of results) {
    if (!result.met) {
      errors.push({
        type: mapCheckpointToErrorType(checkpoint),
        message: result.feedback,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Maps checkpoint type to appropriate error type.
 */
function mapCheckpointToErrorType(
  checkpoint: CheckpointType
): import('./types.js').ValidationErrorType {
  switch (checkpoint) {
    case 'APPROACH':
      return 'WRONG_PATTERN';
    case 'INVARIANT':
      return 'MISSING_INVARIANT';
    case 'PLAN':
      return 'INCOMPLETE_PLAN';
    case 'CODE':
      return 'LOGIC_ERROR';
  }
}

// ============================================================================
// Pre-built Rubrics
// ============================================================================

export const APPROACH_RUBRIC_TEMPLATE: Omit<Rubric, 'id' | 'patternId'> = {
  checkpoint: 'APPROACH',
  criteria: [
    {
      id: 'pattern-identified',
      name: 'Pattern Identification',
      description: 'Correctly identifies the algorithmic pattern',
      weight: 3,
      required: true,
      keywords: [],
    },
    {
      id: 'complexity-stated',
      name: 'Complexity Analysis',
      description: 'States time and space complexity',
      weight: 2,
      required: false,
      keywords: ['o(n)', 'o(1)', 'o(log', 'time', 'space', 'complexity'],
    },
    {
      id: 'edge-cases',
      name: 'Edge Cases',
      description: 'Mentions relevant edge cases',
      weight: 1,
      required: false,
      keywords: ['empty', 'null', 'single', 'edge', 'boundary', 'zero'],
    },
  ],
  passingScore: GRADING_CONSTANTS.DEFAULT_PASSING_SCORE,
  partialScore: GRADING_CONSTANTS.DEFAULT_PARTIAL_SCORE,
};

export const INVARIANT_RUBRIC_TEMPLATE: Omit<Rubric, 'id' | 'patternId'> = {
  checkpoint: 'INVARIANT',
  criteria: [
    {
      id: 'invariant-stated',
      name: 'Invariant Statement',
      description: 'Clearly states the loop invariant',
      weight: 3,
      required: true,
      keywords: ['always', 'maintain', 'invariant', 'property', 'holds'],
    },
    {
      id: 'invariant-correct',
      name: 'Invariant Correctness',
      description: 'Invariant is correct for the pattern',
      weight: 2,
      required: true,
      keywords: [],
    },
  ],
  passingScore: GRADING_CONSTANTS.DEFAULT_PASSING_SCORE,
  partialScore: GRADING_CONSTANTS.DEFAULT_PARTIAL_SCORE,
};

export const PLAN_RUBRIC_TEMPLATE: Omit<Rubric, 'id' | 'patternId'> = {
  checkpoint: 'PLAN',
  criteria: [
    {
      id: 'steps-complete',
      name: 'Complete Steps',
      description: 'All major implementation steps listed',
      weight: 3,
      required: true,
      keywords: ['1', '2', '3', 'first', 'then', 'finally', 'step'],
    },
    {
      id: 'order-logical',
      name: 'Logical Order',
      description: 'Steps are in correct logical order',
      weight: 2,
      required: false,
      keywords: [],
    },
  ],
  passingScore: GRADING_CONSTANTS.DEFAULT_PASSING_SCORE,
  partialScore: GRADING_CONSTANTS.DEFAULT_PARTIAL_SCORE,
};
