import { describe, it, expect } from 'vitest';
import {
  gradeRubric,
  gradeSubmission,
  createStandardRubric,
  StandardCriteria,
  type RubricDefinition,
  type EvaluationContext,
} from './rubric.js';

describe('Rubric Grading', () => {
  describe('gradeRubric', () => {
    it('should return PASS when score >= passThreshold', () => {
      const rubric: RubricDefinition = {
        id: 'test_rubric',
        pattern: 'SLIDING_WINDOW',
        rung: 1,
        criteria: [
          StandardCriteria.allTestsPass(1.0),
        ],
        passThreshold: 0.8,
        partialThreshold: 0.4,
      };

      const context: EvaluationContext = {
        code: 'function test() {}',
        language: 'javascript',
        testsPassed: 10,
        testsTotal: 10,
      };

      const result = gradeRubric(rubric, context);
      expect(result.grade).toBe('PASS');
      expect(result.score).toBe(1);
    });

    it('should return PARTIAL when score >= partialThreshold but < passThreshold', () => {
      const rubric: RubricDefinition = {
        id: 'test_rubric',
        pattern: 'SLIDING_WINDOW',
        rung: 1,
        criteria: [
          StandardCriteria.allTestsPass(0.6),
          StandardCriteria.correctPattern('SLIDING_WINDOW', 0.4),
        ],
        passThreshold: 0.8,
        partialThreshold: 0.4,
      };

      const context: EvaluationContext = {
        code: 'function test() {}',
        language: 'javascript',
        testsPassed: 5,
        testsTotal: 10,
        patternDetected: 'SLIDING_WINDOW',
      };

      const result = gradeRubric(rubric, context);
      expect(result.grade).toBe('PARTIAL');
      expect(result.score).toBe(0.4); // Only pattern detected passes
    });

    it('should return FAIL when score < partialThreshold', () => {
      const rubric: RubricDefinition = {
        id: 'test_rubric',
        pattern: 'SLIDING_WINDOW',
        rung: 1,
        criteria: [
          StandardCriteria.allTestsPass(0.5),
          StandardCriteria.majorityTestsPass(0.3),
          StandardCriteria.anyTestPasses(0.2),
        ],
        passThreshold: 0.8,
        partialThreshold: 0.4,
      };

      const context: EvaluationContext = {
        code: 'function test() {}',
        language: 'javascript',
        testsPassed: 0,
        testsTotal: 10,
      };

      const result = gradeRubric(rubric, context);
      expect(result.grade).toBe('FAIL');
      expect(result.score).toBe(0);
    });

    it('should calculate weighted score correctly', () => {
      const rubric: RubricDefinition = {
        id: 'test_rubric',
        pattern: 'SLIDING_WINDOW',
        rung: 1,
        criteria: [
          StandardCriteria.allTestsPass(0.4),
          StandardCriteria.majorityTestsPass(0.3),
          StandardCriteria.anyTestPasses(0.3),
        ],
        passThreshold: 0.8,
        partialThreshold: 0.4,
      };

      const context: EvaluationContext = {
        code: 'function test() {}',
        language: 'javascript',
        testsPassed: 6, // 60% pass rate
        testsTotal: 10,
      };

      // all_tests_pass: false (0)
      // majority_tests_pass: true (0.3)
      // any_test_passes: true (0.3)
      // Total: 0.6
      const result = gradeRubric(rubric, context);
      expect(result.score).toBe(0.6);
      expect(result.grade).toBe('PARTIAL');
    });

    it('should include correct feedback for each criterion', () => {
      const rubric: RubricDefinition = {
        id: 'test_rubric',
        pattern: 'SLIDING_WINDOW',
        rung: 1,
        criteria: [
          StandardCriteria.allTestsPass(0.5),
          StandardCriteria.anyTestPasses(0.5),
        ],
        passThreshold: 0.8,
        partialThreshold: 0.4,
      };

      const context: EvaluationContext = {
        code: 'function test() {}',
        language: 'javascript',
        testsPassed: 5,
        testsTotal: 10,
      };

      const result = gradeRubric(rubric, context);
      expect(result.criteria).toHaveLength(2);
      expect(result.criteria[0]?.passed).toBe(false);
      expect(result.criteria[0]?.feedback).toBe('Some test cases failed.');
      expect(result.criteria[1]?.passed).toBe(true);
      expect(result.criteria[1]?.feedback).toBe('At least one test case passed.');
    });
  });

  describe('StandardCriteria', () => {
    describe('allTestsPass', () => {
      it('should pass when all tests pass', () => {
        const criterion = StandardCriteria.allTestsPass(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 10,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when any test fails', () => {
        const criterion = StandardCriteria.allTestsPass(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 9,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });
    });

    describe('majorityTestsPass', () => {
      it('should pass when exactly 50% pass', () => {
        const criterion = StandardCriteria.majorityTestsPass(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 5,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when less than 50% pass', () => {
        const criterion = StandardCriteria.majorityTestsPass(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 4,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });
    });

    describe('correctPattern', () => {
      it('should pass when pattern matches', () => {
        const criterion = StandardCriteria.correctPattern('SLIDING_WINDOW', 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          patternDetected: 'SLIDING_WINDOW',
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when pattern does not match', () => {
        const criterion = StandardCriteria.correctPattern('SLIDING_WINDOW', 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          patternDetected: 'TWO_POINTERS',
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });
    });

    describe('invariantStated', () => {
      it('should pass when invariant is stated with > 10 characters', () => {
        const criterion = StandardCriteria.invariantStated(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          invariantStated: 'Window sum equals target',
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when invariant is too short', () => {
        const criterion = StandardCriteria.invariantStated(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          invariantStated: 'short',
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });
    });

    describe('timeLimit', () => {
      it('should pass when execution time is within limit', () => {
        const criterion = StandardCriteria.timeLimit(1000, 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          executionTimeMs: 500,
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when execution time exceeds limit', () => {
        const criterion = StandardCriteria.timeLimit(1000, 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          executionTimeMs: 1500,
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });

      it('should pass when executionTimeMs is undefined', () => {
        const criterion = StandardCriteria.timeLimit(1000, 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });
    });

    describe('memoryLimit', () => {
      it('should pass when memory usage is within limit', () => {
        const criterion = StandardCriteria.memoryLimit(256, 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          memoryUsageMb: 100,
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when memory exceeds limit', () => {
        const criterion = StandardCriteria.memoryLimit(256, 1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
          memoryUsageMb: 512,
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });
    });

    describe('anyTestPasses', () => {
      it('should pass when at least one test passes', () => {
        const criterion = StandardCriteria.anyTestPasses(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 1,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(true);
      });

      it('should fail when no tests pass', () => {
        const criterion = StandardCriteria.anyTestPasses(1);
        const ctx: EvaluationContext = {
          code: '',
          language: 'javascript',
          testsPassed: 0,
          testsTotal: 10,
        };
        expect(criterion.evaluate(ctx)).toBe(false);
      });
    });
  });

  describe('createStandardRubric', () => {
    it('should create rubric with correct pattern and rung', () => {
      const rubric = createStandardRubric('SLIDING_WINDOW', 2);
      expect(rubric.id).toBe('SLIDING_WINDOW_rung_2');
      expect(rubric.pattern).toBe('SLIDING_WINDOW');
      expect(rubric.rung).toBe(2);
    });

    it('should have standard criteria', () => {
      const rubric = createStandardRubric('DFS', 1);
      expect(rubric.criteria.length).toBeGreaterThan(0);
      expect(rubric.passThreshold).toBe(0.8);
      expect(rubric.partialThreshold).toBe(0.4);
    });

    it('should have weights summing to 1', () => {
      const rubric = createStandardRubric('TWO_POINTERS', 3);
      const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBe(1);
    });
  });

  describe('gradeSubmission', () => {
    it('should grade using standard rubric for pattern/rung', () => {
      const result = gradeSubmission({
        pattern: 'SLIDING_WINDOW',
        rung: 1,
        context: {
          code: 'function maxSum(arr, k) { /* sliding window */ }',
          language: 'javascript',
          testsPassed: 10,
          testsTotal: 10,
          patternDetected: 'SLIDING_WINDOW',
          executionTimeMs: 100,
        },
      });

      expect(result.grade).toBe('PASS');
      expect(result.score).toBeGreaterThanOrEqual(0.8);
    });

    it('should return FAIL for completely failed submission', () => {
      const result = gradeSubmission({
        pattern: 'DFS',
        rung: 1,
        context: {
          code: '',
          language: 'python',
          testsPassed: 0,
          testsTotal: 10,
        },
      });

      expect(result.grade).toBe('FAIL');
      expect(result.score).toBeLessThan(0.4);
    });
  });
});
