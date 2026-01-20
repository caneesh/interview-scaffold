import { describe, it, expect } from 'vitest';
import {
  detectJargon,
  detectCircularLogic,
  assessComplexity,
  countSentences,
  checkCompleteness,
  validateFeynmanExplanation,
  processFeynmanAttempt,
  createInitialFeynmanData,
  MAX_SENTENCES,
  PASSING_SCORE,
} from './feynman-validator.js';
import type { Problem } from '../entities/problem.js';

// Test fixtures
const mockProblem: Problem = {
  id: 'test-problem-1',
  tenantId: 'test-tenant',
  title: 'Sliding Window Maximum',
  statement: 'Find the maximum in each sliding window of size k.',
  pattern: 'SLIDING_WINDOW',
  rung: 1,
  targetComplexity: 'O(n)',
  testCases: [],
  hints: [],
  createdAt: new Date(),
};

describe('Feynman Validator Module', () => {
  describe('detectJargon', () => {
    it('should detect technical jargon', () => {
      const text = 'We use a hash table with O(1) amortized lookup using memoization';
      const jargon = detectJargon(text);
      expect(jargon).toContain('hash table');
      expect(jargon).toContain('amortized');
      expect(jargon).toContain('memoization');
    });

    it('should not flag acceptable terms', () => {
      const text = 'We look at each number in the array and count how many we find';
      const jargon = detectJargon(text);
      expect(jargon.length).toBe(0);
    });

    it('should detect complexity notation as jargon', () => {
      const text = 'This algorithm runs in O(n) time complexity';
      const jargon = detectJargon(text);
      expect(jargon).toContain('o(n)');
    });
  });

  describe('detectCircularLogic', () => {
    it('should detect "it works because it works" patterns', () => {
      expect(detectCircularLogic('It works because it works correctly')).toBe(true);
    });

    it('should detect "obviously" without explanation', () => {
      expect(detectCircularLogic('Obviously this is the correct approach')).toBe(true);
    });

    it('should accept explanations with clear reasoning', () => {
      expect(detectCircularLogic('This works because each element is visited only once so that we save time')).toBe(false);
    });

    it('should accept "for example" explanations', () => {
      expect(detectCircularLogic('Simply put, for example if we have three items')).toBe(false);
    });
  });

  describe('assessComplexity', () => {
    it('should flag complex sentence structures', () => {
      const result = assessComplexity('Wherein the algorithm subsequently processes the data, consequently yielding optimal results; furthermore, the complexity thereof remains bounded.');
      expect(result.isSimple).toBe(false);
    });

    it('should accept simple explanations', () => {
      const result = assessComplexity('First we look at each number. Then we check if it fits. Next we move on.');
      expect(result.isSimple).toBe(true);
    });

    it('should flag very long sentences', () => {
      const longSentence = 'We need to process each element in the array and for each element we check if it satisfies the condition and if it does we add it to our result and if it does not we move on to the next element until we have processed all elements in the entire array.';
      const result = assessComplexity(longSentence);
      expect(result.complexityScore).toBeGreaterThan(0);
    });
  });

  describe('countSentences', () => {
    it('should count sentences correctly', () => {
      expect(countSentences('One. Two. Three.')).toBe(3);
      expect(countSentences('Hello! How are you? I am fine.')).toBe(3);
      expect(countSentences('Just one sentence')).toBe(1);
    });

    it('should handle empty strings', () => {
      expect(countSentences('')).toBe(0);
    });
  });

  describe('checkCompleteness', () => {
    it('should detect missing key concepts', () => {
      const result = checkCompleteness('We process the numbers.', 'SLIDING_WINDOW');
      expect(result.isComplete).toBe(false);
      expect(result.missingConcepts.length).toBeGreaterThan(0);
    });

    it('should accept explanations with key concepts', () => {
      const result = checkCompleteness(
        'We move a window across the array and track the maximum as we expand and shrink it.',
        'SLIDING_WINDOW'
      );
      expect(result.isComplete).toBe(true);
    });
  });

  describe('validateFeynmanExplanation', () => {
    it('should pass good simple explanation', () => {
      const result = validateFeynmanExplanation({
        problem: mockProblem,
        explanation: 'Imagine you have a row of boxes. You look through a small window that shows only a few boxes at a time. As you move the window, you track which box has the biggest number. When you shrink the window, you update your tracking. This way, you find the biggest number in each window position.',
      });
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(PASSING_SCORE);
    });

    it('should fail explanation with too much jargon', () => {
      const result = validateFeynmanExplanation({
        problem: mockProblem,
        explanation: 'We use a deque data structure with O(n) amortized complexity to maintain a monotonic stack of indices. The algorithm leverages memoization to avoid redundant computations.',
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.type === 'JARGON')).toBe(true);
    });

    it('should fail explanation exceeding sentence limit', () => {
      const result = validateFeynmanExplanation({
        problem: mockProblem,
        explanation: 'First step. Second step. Third step. Fourth step. Fifth step. Sixth step. Seventh step.',
      });
      expect(result.issues.some(i => i.type === 'TOO_LONG')).toBe(true);
    });

    it('should provide clarifying question for weak explanation', () => {
      const result = validateFeynmanExplanation({
        problem: mockProblem,
        explanation: 'We use dynamic programming with memoization and optimal substructure obviously.',
      });
      // This should fail due to jargon + circular logic
      expect(result.score).toBeLessThan(PASSING_SCORE);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should flag vague language', () => {
      const result = validateFeynmanExplanation({
        problem: mockProblem,
        explanation: 'We do something with stuff and things, and somehow it gives us the answer etc.',
      });
      expect(result.issues.some(i => i.type === 'VAGUE')).toBe(true);
    });
  });

  describe('processFeynmanAttempt', () => {
    it('should record attempt and update data', () => {
      const data = createInitialFeynmanData();
      const { attempt, result, updatedData } = processFeynmanAttempt(
        {
          problem: mockProblem,
          explanation: 'We move a window and track the biggest number as we slide it along.',
        },
        data
      );

      expect(attempt.explanation).toContain('window');
      expect(updatedData.attempts.length).toBe(1);
    });

    it('should mark complete after valid explanation', () => {
      const data = createInitialFeynmanData();
      const { updatedData } = processFeynmanAttempt(
        {
          problem: mockProblem,
          explanation: 'Imagine a window sliding across numbers. We track the biggest number we can see. When the window moves, we expand to see new numbers and shrink to remove old ones. This lets us find the maximum in each window position.',
        },
        data
      );

      expect(updatedData.isComplete).toBe(true);
    });
  });

  describe('createInitialFeynmanData', () => {
    it('should create empty Feynman data', () => {
      const data = createInitialFeynmanData();

      expect(data.explanation).toBeNull();
      expect(data.validation).toBeNull();
      expect(data.attempts).toHaveLength(0);
      expect(data.isComplete).toBe(false);
    });
  });
});
