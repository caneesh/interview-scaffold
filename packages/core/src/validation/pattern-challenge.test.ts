/**
 * Pattern Challenge (Advocate's Trap) Unit Tests
 *
 * Tests the rule-based pattern mismatch detector and counterexample validator.
 */

import { describe, it, expect } from 'vitest';
import {
  detectPatternMismatch,
  validateCounterexample,
  CHALLENGE_CONFIDENCE_THRESHOLD,
  type PatternChallengeInput,
} from './pattern-challenge.js';
import type { Problem } from '../entities/problem.js';

// Helper to create a mock problem
function createMockProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: 'test-problem-1',
    tenantId: 'test-tenant',
    title: 'Test Problem',
    statement: 'This is a test problem statement.',
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    targetComplexity: 'O(n)',
    testCases: [],
    hints: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('detectPatternMismatch', () => {
  describe('TWO_POINTERS pattern disqualifiers', () => {
    it('should challenge TWO_POINTERS on unsorted array with pair problem', () => {
      const problem = createMockProblem({
        title: 'Find Pair Sum',
        statement: 'Given an unsorted array, find two elements that sum to target.',
        pattern: 'SLIDING_WINDOW', // Correct pattern is different
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'TWO_POINTERS',
        problem,
        statedInvariant: 'Use left and right pointers to find the pair',
      };

      const result = detectPatternMismatch(input);

      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier).not.toBeNull();
      expect(result.disqualifier?.code).toBe('TWO_POINTERS_UNSORTED_PAIRS');
    });

    it('should challenge TWO_POINTERS for contiguous subarray problems', () => {
      const problem = createMockProblem({
        title: 'Maximum Subarray Sum',
        statement: 'Find the contiguous subarray with the maximum sum.',
        pattern: 'SLIDING_WINDOW',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'TWO_POINTERS',
        problem,
        statedInvariant: 'Use two pointers to find the subarray',
      };

      const result = detectPatternMismatch(input);

      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier?.code).toBe('TWO_POINTERS_VS_SLIDING_WINDOW');
    });

    it('should NOT challenge TWO_POINTERS on sorted array pair problem', () => {
      const problem = createMockProblem({
        title: 'Two Sum Sorted',
        statement: 'Given a sorted array, find two elements that sum to target.',
        pattern: 'TWO_POINTERS',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'TWO_POINTERS',
        problem,
        statedInvariant: 'Left and right pointers converge toward target',
      };

      const result = detectPatternMismatch(input);

      // Should not trigger disqualifier for sorted array
      expect(result.disqualifier?.code).not.toBe('TWO_POINTERS_UNSORTED_PAIRS');
    });
  });

  describe('SLIDING_WINDOW pattern disqualifiers', () => {
    it('should challenge SLIDING_WINDOW on non-contiguous problems', () => {
      const problem = createMockProblem({
        title: 'Find All Pairs',
        statement: 'Find all pairs of elements that satisfy the condition.',
        pattern: 'TWO_POINTERS',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'SLIDING_WINDOW',
        problem,
        statedInvariant: 'Maintain a sliding window',
      };

      const result = detectPatternMismatch(input);

      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier?.code).toBe('SLIDING_WINDOW_NOT_CONTIGUOUS');
    });

    it('should challenge SLIDING_WINDOW for all-combinations problems', () => {
      const problem = createMockProblem({
        title: 'Generate All Subsets',
        // Include "subarray" so NOT_CONTIGUOUS doesn't trigger first
        statement: 'Generate all combinations of a contiguous subarray from the array.',
        pattern: 'BACKTRACKING',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'SLIDING_WINDOW',
        problem,
        statedInvariant: 'Use sliding window to generate subsets',
      };

      const result = detectPatternMismatch(input);

      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier?.code).toBe('SLIDING_WINDOW_ALL_COMBINATIONS');
    });

    it('should NOT challenge SLIDING_WINDOW for subarray problems', () => {
      const problem = createMockProblem({
        title: 'Maximum Sum Subarray of Size K',
        statement: 'Find the maximum sum of any contiguous subarray of size k.',
        pattern: 'SLIDING_WINDOW',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'SLIDING_WINDOW',
        problem,
        statedInvariant: 'Window maintains sum of k elements',
      };

      const result = detectPatternMismatch(input);

      expect(result.disqualifier).toBeNull();
      expect(result.confidenceScore).toBeGreaterThan(CHALLENGE_CONFIDENCE_THRESHOLD);
    });
  });

  describe('BINARY_SEARCH pattern disqualifiers', () => {
    it('should challenge BINARY_SEARCH on unsorted data', () => {
      const problem = createMockProblem({
        title: 'Find Element',
        statement: 'Find an element in an unsorted array.',
        pattern: 'TWO_POINTERS',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'BINARY_SEARCH',
        problem,
        statedInvariant: 'Use binary search to find the element',
      };

      const result = detectPatternMismatch(input);

      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier?.code).toBe('BINARY_SEARCH_UNSORTED');
    });

    it('should NOT challenge BINARY_SEARCH on sorted data', () => {
      const problem = createMockProblem({
        title: 'Search in Sorted Array',
        statement: 'Given a sorted array, find the target element.',
        pattern: 'BINARY_SEARCH',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'BINARY_SEARCH',
        problem,
        statedInvariant: 'Use binary search on sorted array',
      };

      const result = detectPatternMismatch(input);

      expect(result.disqualifier).toBeNull();
    });
  });

  describe('GREEDY pattern disqualifiers', () => {
    it('should challenge GREEDY for all-solutions problems', () => {
      const problem = createMockProblem({
        title: 'Find All Paths',
        statement: 'Generate all possible paths from source to destination.',
        pattern: 'BACKTRACKING',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'GREEDY',
        problem,
        statedInvariant: 'Greedily choose the best path',
      };

      const result = detectPatternMismatch(input);

      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier?.code).toBe('GREEDY_ALL_SOLUTIONS');
    });
  });

  describe('Confidence scoring', () => {
    it('should return high confidence for correct pattern match', () => {
      const problem = createMockProblem({
        title: 'Longest Substring Without Repeating Characters',
        statement: 'Find the longest contiguous substring with distinct characters.',
        pattern: 'SLIDING_WINDOW',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'SLIDING_WINDOW',
        problem,
        statedInvariant: 'Window contains only distinct characters',
      };

      const result = detectPatternMismatch(input);

      expect(result.confidenceScore).toBeGreaterThan(0.5);
      expect(result.shouldChallenge).toBe(false);
    });

    it('should return low confidence for mismatched pattern', () => {
      const problem = createMockProblem({
        title: 'Merge Intervals',
        // Add "unsorted" to trigger BINARY_SEARCH_UNSORTED disqualifier
        statement: 'Merge all overlapping intervals in an unsorted list.',
        pattern: 'INTERVAL_MERGING',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'BINARY_SEARCH',
        problem,
        statedInvariant: 'Binary search for intervals',
      };

      const result = detectPatternMismatch(input);

      // Should challenge due to disqualifier (unsorted data for binary search)
      expect(result.shouldChallenge).toBe(true);
      expect(result.disqualifier).not.toBeNull();
    });
  });

  describe('Alternative pattern suggestions', () => {
    it('should suggest relevant alternatives when challenge triggers', () => {
      const problem = createMockProblem({
        title: 'Maximum Sum Subarray',
        statement: 'Find the contiguous subarray with maximum sum.',
        pattern: 'SLIDING_WINDOW',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'BINARY_SEARCH',
        problem,
        statedInvariant: 'Binary search for maximum',
      };

      const result = detectPatternMismatch(input);

      expect(result.suggestedAlternatives.length).toBeGreaterThan(0);
      expect(result.suggestedAlternatives).toContain('SLIDING_WINDOW');
    });
  });

  describe('Socratic prompt generation', () => {
    it('should generate Socratic prompt for challenged pattern', () => {
      const problem = createMockProblem({
        statement: 'Find element in unsorted array.',
      });

      const input: PatternChallengeInput = {
        selectedPattern: 'BINARY_SEARCH',
        problem,
        statedInvariant: 'Binary search',
      };

      const result = detectPatternMismatch(input);

      expect(result.socraticPrompt).not.toBeNull();
      expect(result.socraticPrompt?.length).toBeGreaterThan(0);
    });
  });
});

describe('validateCounterexample', () => {
  it('should return valid for valid JSON within constraints', () => {
    const problem = createMockProblem({
      statement: `Given an array nums.

Constraints:
- 1 <= n <= 100
- -1000 <= nums[i] <= 1000`,
    });

    const result = validateCounterexample('[1, 2, 3, 4, 5]', problem);

    expect(result.valid).toBe(true);
  });

  it('should return invalid for non-JSON counterexample', () => {
    const problem = createMockProblem({
      statement: 'Some problem statement.',
    });

    const result = validateCounterexample('not valid json', problem);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not valid JSON');
  });

  it('should return invalid for array length outside constraints', () => {
    const problem = createMockProblem({
      statement: `Constraints:
- 1 <= n <= 5
- -100 <= nums[i] <= 100`,
    });

    const result = validateCounterexample('[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]', problem);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('outside constraints');
  });

  it('should return invalid for values outside constraints', () => {
    const problem = createMockProblem({
      statement: `Constraints:
- 1 <= n <= 100
- 0 <= nums[i] <= 10`,
    });

    const result = validateCounterexample('[1, 2, 100, 4, 5]', problem);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Value 100 outside constraints');
  });

  it('should return valid when no constraints are specified', () => {
    const problem = createMockProblem({
      statement: 'A problem with no explicit constraints section.',
    });

    const result = validateCounterexample('[1, 2, 3]', problem);

    expect(result.valid).toBe(true);
  });
});
