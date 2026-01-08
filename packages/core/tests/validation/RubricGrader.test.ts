import { describe, it, expect } from 'vitest';
import {
  gradeSubmission,
  GRADING_CONSTANTS,
  APPROACH_RUBRIC_TEMPLATE,
} from '../../src/validation/RubricGrader.js';
import type { Rubric } from '../../src/validation/types.js';
import { PatternId } from '../../src/entities/types.js';

describe('RubricGrader', () => {
  const createTestRubric = (
    overrides?: Partial<Rubric>
  ): Rubric => ({
    id: 'test-rubric',
    checkpoint: 'APPROACH',
    patternId: PatternId('two-pointers'),
    criteria: [
      {
        id: 'pattern',
        name: 'Pattern Recognition',
        description: 'Identifies two pointers pattern',
        weight: 3,
        required: true,
        keywords: ['two pointers', 'left', 'right'],
      },
      {
        id: 'complexity',
        name: 'Complexity',
        description: 'States O(n) complexity',
        weight: 2,
        required: false,
        keywords: ['o(n)', 'linear'],
      },
    ],
    passingScore: 80,
    partialScore: 50,
    ...overrides,
  });

  describe('gradeSubmission', () => {
    it('should return PASS when all required criteria met and score >= passingScore', () => {
      const rubric = createTestRubric();
      const submission = 'Use two pointers with left and right indices. O(n) time complexity.';

      const result = gradeSubmission({
        rubric,
        submission,
        checkpoint: 'APPROACH',
      });

      expect(result.grade).toBe('PASS');
      expect(result.totalScore).toBeGreaterThanOrEqual(80);
    });

    it('should return FAIL when required criteria not met', () => {
      const rubric = createTestRubric();
      const submission = 'Use a hash map to solve this problem.';

      const result = gradeSubmission({
        rubric,
        submission,
        checkpoint: 'APPROACH',
      });

      expect(result.grade).toBe('FAIL');
    });

    it('should return PARTIAL when score between partial and passing', () => {
      const rubric = createTestRubric({
        criteria: [
          {
            id: 'pattern',
            name: 'Pattern',
            description: 'Pattern',
            weight: 1,
            required: false,
            keywords: ['two pointers'],
          },
          {
            id: 'extra',
            name: 'Extra',
            description: 'Extra',
            weight: 1,
            required: false,
            keywords: ['optimization', 'edge case'],
          },
        ],
      });
      const submission = 'Use two pointers to solve this.';

      const result = gradeSubmission({
        rubric,
        submission,
        checkpoint: 'APPROACH',
      });

      expect(result.grade).toBe('PARTIAL');
    });

    it('should include rubric results for each criterion', () => {
      const rubric = createTestRubric();
      const submission = 'Use two pointers with left and right.';

      const result = gradeSubmission({
        rubric,
        submission,
        checkpoint: 'APPROACH',
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.criterionId).toBe('pattern');
      expect(result.results[0]?.met).toBe(true);
    });

    it('should generate checkpoint result with errors', () => {
      const rubric = createTestRubric();
      const submission = 'Invalid approach';

      const result = gradeSubmission({
        rubric,
        submission,
        checkpoint: 'APPROACH',
      });

      expect(result.checkpointResult).toBeDefined();
      expect(result.checkpointResult.checkpoint).toBe('APPROACH');
      expect(result.checkpointResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle case insensitive matching', () => {
      const rubric = createTestRubric();
      const submission = 'TWO POINTERS with LEFT and RIGHT pointers';

      const result = gradeSubmission({
        rubric,
        submission,
        checkpoint: 'APPROACH',
      });

      expect(result.results[0]?.met).toBe(true);
    });
  });

  describe('APPROACH_RUBRIC_TEMPLATE', () => {
    it('should have required pattern identification', () => {
      const patternCriterion = APPROACH_RUBRIC_TEMPLATE.criteria.find(
        c => c.id === 'pattern-identified'
      );

      expect(patternCriterion).toBeDefined();
      expect(patternCriterion?.required).toBe(true);
    });

    it('should have appropriate passing score', () => {
      expect(APPROACH_RUBRIC_TEMPLATE.passingScore).toBe(
        GRADING_CONSTANTS.DEFAULT_PASSING_SCORE
      );
    });
  });
});
