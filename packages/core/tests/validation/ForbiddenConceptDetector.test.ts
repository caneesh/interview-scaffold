import { describe, it, expect } from 'vitest';
import {
  detectForbiddenConcepts,
  validateSlidingWindow,
  validateDFSGrid,
} from '../../src/validation/ForbiddenConceptDetector.js';
import { PatternId } from '../../src/entities/types.js';

describe('ForbiddenConceptDetector', () => {
  describe('detectForbiddenConcepts', () => {
    it('should detect nested loops in sliding window', () => {
      const code = `
def max_sum(arr, k):
    for i in range(len(arr)):
        for j in range(i, i + k):
            # nested loop - forbidden!
            pass
`;

      const result = detectForbiddenConcepts({
        code,
        language: 'python',
        patternId: PatternId('sliding-window'),
      });

      expect(result.hasForbidden).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]?.conceptId).toBe('nested-loop-sliding-window');
    });

    it('should not flag valid sliding window code', () => {
      const code = `
def max_sum(arr, k):
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, len(arr)):
        window_sum += arr[i] - arr[i - k]
        max_sum = max(max_sum, window_sum)
    return max_sum
`;

      const result = detectForbiddenConcepts({
        code,
        language: 'python',
        patternId: PatternId('sliding-window'),
      });

      expect(result.hasForbidden).toBe(false);
    });

    it('should include error suggestions', () => {
      const code = `
for i in range(n):
    for j in range(i, n):
        pass
`;

      const result = detectForbiddenConcepts({
        code,
        language: 'python',
        patternId: PatternId('sliding-window'),
      });

      if (result.hasForbidden) {
        expect(result.errors[0]?.suggestion).toBeDefined();
      }
    });
  });

  describe('validateSlidingWindow', () => {
    it('should detect if statement used instead of while for shrinking', () => {
      const code = `
def sliding_window(arr):
    left = 0
    for right in range(len(arr)):
        if window_sum > target:
            left += 1  # Should be while, not if!
`;

      const errors = validateSlidingWindow(code, 'python');

      expect(errors.some(e => e.type === 'WRONG_SHRINK_CONSTRUCT')).toBe(true);
    });

    it('should pass valid while-based shrinking', () => {
      const code = `
def sliding_window(arr):
    left = 0
    for right in range(len(arr)):
        while window_sum > target:
            left += 1
`;

      const errors = validateSlidingWindow(code, 'python');

      expect(errors.some(e => e.type === 'WRONG_SHRINK_CONSTRUCT')).toBe(false);
    });

    it('should detect nested loops', () => {
      const code = `
def bad_sliding_window(arr):
    for i in range(len(arr)):
        for j in range(i, len(arr)):
            pass
`;

      const errors = validateSlidingWindow(code, 'python');

      expect(errors.some(e => e.type === 'NESTED_LOOP_IN_SLIDING_WINDOW')).toBe(true);
    });
  });

  describe('validateDFSGrid', () => {
    it('should detect missing visited set', () => {
      const code = `
def dfs(grid, row, col):
    if row < 0 or col < 0:
        return
    dfs(grid, row + 1, col)
    dfs(grid, row, col + 1)
`;

      const errors = validateDFSGrid(code, 'python');

      expect(errors.some(e => e.type === 'MISSING_VISITED_SET')).toBe(true);
    });

    it('should pass when visited set is used', () => {
      const code = `
def dfs(grid, row, col, visited):
    if (row, col) in visited:
        return
    visited.add((row, col))
    dfs(grid, row + 1, col, visited)
`;

      const errors = validateDFSGrid(code, 'python');

      expect(errors.some(e => e.type === 'MISSING_VISITED_SET')).toBe(false);
    });

    it('should detect missing backtrack when using visited.add', () => {
      const code = `
def dfs(grid, row, col, visited):
    visited.add((row, col))
    for next_row, next_col in get_neighbors(row, col):
        dfs(grid, next_row, next_col, visited)
`;

      const errors = validateDFSGrid(code, 'python');

      expect(errors.some(e => e.type === 'MISSING_BACKTRACK')).toBe(true);
    });

    it('should pass when backtracking is present', () => {
      const code = `
def dfs(grid, row, col, visited):
    visited.add((row, col))
    for next_row, next_col in get_neighbors(row, col):
        dfs(grid, next_row, next_col, visited)
    visited.remove((row, col))
`;

      const errors = validateDFSGrid(code, 'python');

      expect(errors.some(e => e.type === 'MISSING_BACKTRACK')).toBe(false);
    });
  });
});
