import { describe, it, expect } from 'vitest';
import {
  parsePatternInput,
  validateJustification,
  validatePatternSelection,
  processPatternAttempt,
  createInitialPatternData,
  MAX_PATTERN_ATTEMPTS,
  MIN_JUSTIFICATION_LENGTH,
} from './pattern-recognition-gate.js';
import type { Problem } from '../entities/problem.js';

// Test fixtures
const mockProblem: Problem = {
  id: 'test-problem-1',
  tenantId: 'test-tenant',
  title: 'Two Sum',
  statement: 'Given a sorted array of integers nums and an integer target, return indices of the two numbers.',
  pattern: 'TWO_POINTERS',
  rung: 1,
  targetComplexity: 'O(n)',
  testCases: [],
  hints: [],
  createdAt: new Date(),
};

const slidingWindowProblem: Problem = {
  ...mockProblem,
  id: 'sliding-window-1',
  title: 'Longest Substring',
  pattern: 'SLIDING_WINDOW',
};

describe('Pattern Recognition Gate Module', () => {
  describe('parsePatternInput', () => {
    it('should parse "sliding window" to SLIDING_WINDOW', () => {
      expect(parsePatternInput('sliding window')).toBe('SLIDING_WINDOW');
      expect(parsePatternInput('Sliding Window')).toBe('SLIDING_WINDOW');
      expect(parsePatternInput('SLIDING_WINDOW')).toBe('SLIDING_WINDOW');
    });

    it('should parse "two pointers" to TWO_POINTERS', () => {
      expect(parsePatternInput('two pointers')).toBe('TWO_POINTERS');
      expect(parsePatternInput('2 pointers')).toBe('TWO_POINTERS');
    });

    it('should parse abbreviations', () => {
      expect(parsePatternInput('bfs')).toBe('BFS');
      expect(parsePatternInput('dfs')).toBe('DFS');
      expect(parsePatternInput('dp')).toBe('DYNAMIC_PROGRAMMING');
    });

    it('should return null for invalid patterns', () => {
      expect(parsePatternInput('invalid pattern')).toBeNull();
      expect(parsePatternInput('xyz')).toBeNull();
    });
  });

  describe('validateJustification', () => {
    it('should reject short justifications', () => {
      const result = validateJustification('too short', 'TWO_POINTERS');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('too short');
    });

    it('should accept justification with pattern keywords', () => {
      const result = validateJustification(
        'This uses two pointers because the array is sorted and we can converge from both ends',
        'TWO_POINTERS'
      );
      expect(result.isValid).toBe(true);
      expect(result.hasKeywords).toBe(true);
    });

    it('should reject justification without pattern keywords', () => {
      const result = validateJustification(
        'This is a valid approach because it will give us the correct answer efficiently',
        'TWO_POINTERS'
      );
      expect(result.isValid).toBe(false);
      expect(result.hasKeywords).toBe(false);
    });
  });

  describe('validatePatternSelection', () => {
    it('should accept correct pattern with valid justification', () => {
      const data = createInitialPatternData();
      const result = validatePatternSelection(
        {
          problem: mockProblem,
          selectedPattern: 'two pointers',
          justification: 'We can use two pointers because the array is sorted and we need to find pairs that converge to target',
        },
        data
      );
      expect(result.isCorrect).toBe(true);
      expect(result.status).toBe('PASSED');
      expect(result.feedback.type).toBe('CORRECT');
    });

    it('should reject invalid pattern name', () => {
      const data = createInitialPatternData();
      const result = validatePatternSelection(
        {
          problem: mockProblem,
          selectedPattern: 'invalid pattern',
          justification: 'Some justification that is long enough to pass',
        },
        data
      );
      expect(result.isCorrect).toBe(false);
      expect(result.feedback.type).toBe('INCORRECT');
    });

    it('should provide guiding question for related pattern', () => {
      const data = createInitialPatternData();
      // Sliding window is related to two pointers
      const result = validatePatternSelection(
        {
          problem: mockProblem,
          selectedPattern: 'sliding window',
          justification: 'We can use a sliding window to track elements as we expand and shrink the window',
        },
        data
      );
      expect(result.isCorrect).toBe(false);
      expect(result.feedback.type).toBe('CLOSE');
      expect(result.feedback.guidingQuestion).not.toBeNull();
    });

    it('should fail after max attempts', () => {
      let data = createInitialPatternData();

      // Make MAX_PATTERN_ATTEMPTS - 1 wrong attempts
      for (let i = 0; i < MAX_PATTERN_ATTEMPTS - 1; i++) {
        const { updatedData } = processPatternAttempt(
          {
            problem: mockProblem,
            selectedPattern: 'binary search',
            justification: 'We can search for the target using binary search on sorted data',
          },
          data
        );
        data = updatedData;
      }

      // This should be the final attempt
      const result = validatePatternSelection(
        {
          problem: mockProblem,
          selectedPattern: 'binary search',
          justification: 'We can search for the target using binary search on sorted data',
        },
        data
      );
      expect(result.status).toBe('FAILED');
    });
  });

  describe('processPatternAttempt', () => {
    it('should record attempt and update data', () => {
      const data = createInitialPatternData();
      const { attempt, result, updatedData } = processPatternAttempt(
        {
          problem: mockProblem,
          selectedPattern: 'two pointers',
          justification: 'We use two pointers on sorted array to find pairs that sum to target',
        },
        data
      );

      expect(attempt.pattern).toBe('TWO_POINTERS');
      expect(attempt.isCorrect).toBe(true);
      expect(updatedData.attempts.length).toBe(1);
      expect(updatedData.status).toBe('PASSED');
    });

    it('should accumulate attempts', () => {
      let data = createInitialPatternData();

      // First attempt
      const result1 = processPatternAttempt(
        {
          problem: mockProblem,
          selectedPattern: 'binary search',
          justification: 'We can use binary search to find the mid element efficiently',
        },
        data
      );
      data = result1.updatedData;
      expect(data.attempts.length).toBe(1);

      // Second attempt
      const result2 = processPatternAttempt(
        {
          problem: mockProblem,
          selectedPattern: 'two pointers',
          justification: 'We use two pointers on sorted array to find pairs',
        },
        data
      );
      expect(result2.updatedData.attempts.length).toBe(2);
    });
  });

  describe('createInitialPatternData', () => {
    it('should create empty pattern data', () => {
      const data = createInitialPatternData();

      expect(data.selectedPattern).toBeNull();
      expect(data.justification).toBeNull();
      expect(data.attempts).toHaveLength(0);
      expect(data.status).toBe('PENDING');
    });
  });
});
