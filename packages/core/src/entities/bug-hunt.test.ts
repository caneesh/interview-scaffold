import { describe, it, expect } from 'vitest';
import {
  checkLineOverlap,
  checkConceptMatch,
  validateBugHuntSubmission,
  type BugHuntItem,
  type BugHuntSubmission,
} from './bug-hunt.js';

describe('Bug Hunt Validation', () => {
  describe('checkLineOverlap', () => {
    it('should return correct when selected lines overlap with expected', () => {
      const result = checkLineOverlap([5, 6, 7], [6, 7, 8]);
      expect(result.correct).toBe(true);
      expect(result.linesFound).toBe(2); // 6 and 7
    });

    it('should return correct when single line matches', () => {
      const result = checkLineOverlap([9], [9]);
      expect(result.correct).toBe(true);
      expect(result.linesFound).toBe(1);
    });

    it('should return incorrect when no overlap', () => {
      const result = checkLineOverlap([1, 2, 3], [10, 11]);
      expect(result.correct).toBe(false);
      expect(result.linesFound).toBe(0);
    });

    it('should handle empty selected lines', () => {
      const result = checkLineOverlap([], [5, 6]);
      expect(result.correct).toBe(false);
      expect(result.linesFound).toBe(0);
    });

    it('should handle selecting more lines than bugs', () => {
      const result = checkLineOverlap([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [5]);
      expect(result.correct).toBe(true);
      expect(result.linesFound).toBe(1);
    });

    it('should count all matching lines', () => {
      const result = checkLineOverlap([5, 6, 7, 8, 9], [5, 6, 7]);
      expect(result.correct).toBe(true);
      expect(result.linesFound).toBe(3);
    });
  });

  describe('checkConceptMatch', () => {
    it('should match concepts case-insensitively', () => {
      const result = checkConceptMatch(
        'The bug is an OFF-BY-ONE error in the index calculation',
        ['off-by-one', 'index']
      );
      expect(result.matched).toBe(true);
      expect(result.matchedConcepts).toContain('off-by-one');
      expect(result.matchedConcepts).toContain('index');
    });

    it('should match concepts with different separators', () => {
      const result = checkConceptMatch(
        'This is an off by one error',
        ['off-by-one']
      );
      expect(result.matched).toBe(true);
      expect(result.matchedConcepts).toContain('off-by-one');
    });

    it('should return unmatched when no concepts found', () => {
      const result = checkConceptMatch(
        'The code looks wrong',
        ['off-by-one', 'index', 'boundary']
      );
      expect(result.matched).toBe(false);
      expect(result.matchedConcepts).toHaveLength(0);
    });

    it('should respect minimum required concepts', () => {
      const result = checkConceptMatch(
        'There is an index issue',
        ['off-by-one', 'index', 'boundary'],
        2
      );
      expect(result.matched).toBe(false); // Only 1 matched, need 2
      expect(result.matchedConcepts).toHaveLength(1);
    });

    it('should match when meeting minimum requirement', () => {
      const result = checkConceptMatch(
        'The index has an off-by-one error',
        ['off-by-one', 'index', 'boundary'],
        2
      );
      expect(result.matched).toBe(true);
      expect(result.matchedConcepts.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty explanation', () => {
      const result = checkConceptMatch('', ['off-by-one']);
      expect(result.matched).toBe(false);
    });

    it('should handle empty concepts list', () => {
      const result = checkConceptMatch('Some explanation', [], 0);
      expect(result.matched).toBe(true);
      expect(result.matchedConcepts).toHaveLength(0);
    });
  });

  describe('validateBugHuntSubmission', () => {
    const mockItem: BugHuntItem = {
      id: 'test_001',
      tenantId: 'test',
      pattern: 'SLIDING_WINDOW',
      difficulty: 'EASY',
      language: 'python',
      title: 'Test Bug',
      prompt: 'Find the bug',
      code: 'def test():\n  x = 1\n  return x',
      expectedBugLines: [2],
      expectedConcepts: ['off-by-one', 'index'],
      explanation: 'The bug explanation',
      createdAt: new Date(),
    };

    it('should return CORRECT when lines and concepts match', () => {
      const submission: BugHuntSubmission = {
        selectedLines: [2],
        explanation: 'There is an off-by-one error in the index calculation',
      };

      const result = validateBugHuntSubmission(submission, mockItem);
      expect(result.result).toBe('CORRECT');
      expect(result.lineSelectionCorrect).toBe(true);
      expect(result.conceptsMatched).toBe(true);
    });

    it('should return PARTIAL when only lines match', () => {
      const submission: BugHuntSubmission = {
        selectedLines: [2],
        explanation: 'The code looks wrong but I am not sure why',
      };

      const result = validateBugHuntSubmission(submission, mockItem);
      expect(result.result).toBe('PARTIAL');
      expect(result.lineSelectionCorrect).toBe(true);
      expect(result.conceptsMatched).toBe(false);
    });

    it('should return PARTIAL when only concepts match', () => {
      const submission: BugHuntSubmission = {
        selectedLines: [1],
        explanation: 'There is an off-by-one error in the index',
      };

      const result = validateBugHuntSubmission(submission, mockItem);
      expect(result.result).toBe('PARTIAL');
      expect(result.lineSelectionCorrect).toBe(false);
      expect(result.conceptsMatched).toBe(true);
    });

    it('should return INCORRECT when neither matches', () => {
      const submission: BugHuntSubmission = {
        selectedLines: [1, 3],
        explanation: 'I think there might be a problem somewhere',
      };

      const result = validateBugHuntSubmission(submission, mockItem);
      expect(result.result).toBe('INCORRECT');
      expect(result.lineSelectionCorrect).toBe(false);
      expect(result.conceptsMatched).toBe(false);
    });

    it('should include statistics in result', () => {
      const submission: BugHuntSubmission = {
        selectedLines: [2],
        explanation: 'Off-by-one error',
      };

      const result = validateBugHuntSubmission(submission, mockItem);
      expect(result.linesFound).toBe(1);
      expect(result.totalBugLines).toBe(1);
      expect(result.matchedConcepts).toContain('off-by-one');
      expect(result.totalConcepts).toBe(2);
    });

    it('should handle multiple bug lines', () => {
      const multiLineItem: BugHuntItem = {
        ...mockItem,
        expectedBugLines: [2, 5, 8],
      };

      const submission: BugHuntSubmission = {
        selectedLines: [2, 5],
        explanation: 'Index issues on these lines',
      };

      const result = validateBugHuntSubmission(submission, multiLineItem);
      expect(result.lineSelectionCorrect).toBe(true);
      expect(result.linesFound).toBe(2);
      expect(result.totalBugLines).toBe(3);
    });
  });
});

describe('Bug Hunt Items Data', () => {
  it('should have valid structure for all seed items', async () => {
    const { SLIDING_WINDOW_BUG_HUNT_ITEMS } = await import('../data/bug-hunt-items.js');

    expect(SLIDING_WINDOW_BUG_HUNT_ITEMS.length).toBeGreaterThanOrEqual(5);

    for (const item of SLIDING_WINDOW_BUG_HUNT_ITEMS) {
      expect(item.id).toBeDefined();
      expect(item.pattern).toBe('SLIDING_WINDOW');
      expect(item.difficulty).toMatch(/^(EASY|MEDIUM|HARD)$/);
      expect(item.language).toBe('python');
      expect(item.code.length).toBeGreaterThan(0);
      expect(item.prompt.length).toBeGreaterThan(0);
      expect(item.expectedBugLines.length).toBeGreaterThan(0);
      expect(item.expectedConcepts.length).toBeGreaterThan(0);
      expect(item.explanation.length).toBeGreaterThan(0);
    }
  });

  it('should have unique IDs for all items', async () => {
    const { getAllBugHuntItems } = await import('../data/bug-hunt-items.js');
    const items = getAllBugHuntItems();
    const ids = items.map(item => item.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid line numbers (within code range)', async () => {
    const { SLIDING_WINDOW_BUG_HUNT_ITEMS } = await import('../data/bug-hunt-items.js');

    for (const item of SLIDING_WINDOW_BUG_HUNT_ITEMS) {
      const lineCount = item.code.split('\n').length;

      for (const line of item.expectedBugLines) {
        expect(line).toBeGreaterThan(0);
        expect(line).toBeLessThanOrEqual(lineCount);
      }
    }
  });
});
