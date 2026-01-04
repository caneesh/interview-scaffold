/**
 * Rubric Grading - Deterministic scoring based on criteria
 * Pure TypeScript - no external dependencies
 */

import type {
  RubricResult,
  RubricGrade,
  CriterionResult,
} from './types.js';
import type { PatternId } from '../entities/pattern.js';

// ============ Rubric Definitions ============

export interface RubricDefinition {
  readonly id: string;
  readonly pattern: PatternId;
  readonly rung: number;
  readonly criteria: readonly CriterionDefinition[];
  readonly passThreshold: number; // 0-1
  readonly partialThreshold: number; // 0-1
}

export interface CriterionDefinition {
  readonly id: string;
  readonly name: string;
  readonly weight: number; // 0-1, all weights should sum to 1
  readonly evaluate: (context: EvaluationContext) => boolean;
  readonly feedback: {
    readonly pass: string;
    readonly fail: string;
  };
}

export interface EvaluationContext {
  readonly code: string;
  readonly language: string;
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly executionTimeMs?: number;
  readonly memoryUsageMb?: number;
  readonly patternDetected?: PatternId;
  readonly invariantStated?: string;
}

// ============ Grading Functions ============

export function gradeRubric(
  rubric: RubricDefinition,
  context: EvaluationContext
): RubricResult {
  const criteriaResults: CriterionResult[] = rubric.criteria.map((criterion) => {
    const passed = criterion.evaluate(context);
    return {
      id: criterion.id,
      name: criterion.name,
      passed,
      weight: criterion.weight,
      feedback: passed ? criterion.feedback.pass : criterion.feedback.fail,
    };
  });

  // Calculate weighted score
  const score = criteriaResults.reduce((acc, result) => {
    return acc + (result.passed ? result.weight : 0);
  }, 0);

  // Determine grade
  const grade = determineGrade(score, rubric.passThreshold, rubric.partialThreshold);

  return {
    grade,
    score: roundToThree(score),
    criteria: criteriaResults,
  };
}

function determineGrade(
  score: number,
  passThreshold: number,
  partialThreshold: number
): RubricGrade {
  if (score >= passThreshold) return 'PASS';
  if (score >= partialThreshold) return 'PARTIAL';
  return 'FAIL';
}

function roundToThree(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// ============ Standard Criteria Factories ============

export const StandardCriteria = {
  /**
   * All tests must pass
   */
  allTestsPass(weight: number = 0.4): CriterionDefinition {
    return {
      id: 'all_tests_pass',
      name: 'All Tests Pass',
      weight,
      evaluate: (ctx) => ctx.testsPassed === ctx.testsTotal,
      feedback: {
        pass: 'All test cases passed.',
        fail: 'Some test cases failed.',
      },
    };
  },

  /**
   * Majority of tests must pass
   */
  majorityTestsPass(weight: number = 0.3): CriterionDefinition {
    return {
      id: 'majority_tests_pass',
      name: 'Majority Tests Pass',
      weight,
      evaluate: (ctx) => ctx.testsPassed >= ctx.testsTotal * 0.5,
      feedback: {
        pass: 'At least half of test cases passed.',
        fail: 'Less than half of test cases passed.',
      },
    };
  },

  /**
   * Correct pattern was used
   */
  correctPattern(expectedPattern: PatternId, weight: number = 0.2): CriterionDefinition {
    return {
      id: 'correct_pattern',
      name: 'Correct Pattern',
      weight,
      evaluate: (ctx) => ctx.patternDetected === expectedPattern,
      feedback: {
        pass: `Correctly applied ${expectedPattern} pattern.`,
        fail: `Expected ${expectedPattern} pattern but detected different approach.`,
      },
    };
  },

  /**
   * Invariant was stated
   */
  invariantStated(weight: number = 0.1): CriterionDefinition {
    return {
      id: 'invariant_stated',
      name: 'Invariant Stated',
      weight,
      evaluate: (ctx) => !!ctx.invariantStated && ctx.invariantStated.length > 10,
      feedback: {
        pass: 'Invariant was clearly stated.',
        fail: 'Invariant was not properly stated.',
      },
    };
  },

  /**
   * Execution time within limit
   */
  timeLimit(limitMs: number, weight: number = 0.15): CriterionDefinition {
    return {
      id: 'time_limit',
      name: 'Time Efficiency',
      weight,
      evaluate: (ctx) => (ctx.executionTimeMs ?? 0) <= limitMs,
      feedback: {
        pass: 'Solution runs within time limit.',
        fail: 'Solution exceeds time limit.',
      },
    };
  },

  /**
   * Memory usage within limit
   */
  memoryLimit(limitMb: number, weight: number = 0.1): CriterionDefinition {
    return {
      id: 'memory_limit',
      name: 'Memory Efficiency',
      weight,
      evaluate: (ctx) => (ctx.memoryUsageMb ?? 0) <= limitMb,
      feedback: {
        pass: 'Solution uses acceptable memory.',
        fail: 'Solution uses too much memory.',
      },
    };
  },

  /**
   * At least one test passes (partial credit)
   */
  anyTestPasses(weight: number = 0.1): CriterionDefinition {
    return {
      id: 'any_test_passes',
      name: 'Any Test Passes',
      weight,
      evaluate: (ctx) => ctx.testsPassed > 0,
      feedback: {
        pass: 'At least one test case passed.',
        fail: 'No test cases passed.',
      },
    };
  },
};

// ============ Standard Rubrics ============

export function createStandardRubric(
  pattern: PatternId,
  rung: number
): RubricDefinition {
  return {
    id: `${pattern}_rung_${rung}`,
    pattern,
    rung,
    criteria: [
      StandardCriteria.allTestsPass(0.4),
      StandardCriteria.correctPattern(pattern, 0.2),
      StandardCriteria.majorityTestsPass(0.2),
      StandardCriteria.timeLimit(5000, 0.1),
      StandardCriteria.anyTestPasses(0.1),
    ],
    passThreshold: 0.8,
    partialThreshold: 0.4,
  };
}

// ============ Convenience Exports ============

export interface RubricConfig {
  readonly pattern: PatternId;
  readonly rung: number;
  readonly context: EvaluationContext;
}

/**
 * Grade a submission using standard rubric for pattern/rung
 */
export function gradeSubmission(config: RubricConfig): RubricResult {
  const rubric = createStandardRubric(config.pattern, config.rung);
  return gradeRubric(rubric, config.context);
}
