import { describe, it, expect } from 'vitest';
import {
  validateThinkingGate,
  MIN_INVARIANT_LENGTH,
  type ThinkingGateInput,
  type ThinkingGateContext,
} from './thinking-gate.js';
import type { Problem } from '../entities/problem.js';

const createProblem = (pattern: string): Problem => ({
  id: 'test-problem',
  tenantId: 'test-tenant',
  title: 'Test Problem',
  statement: 'Solve this problem',
  pattern: pattern as any,
  rung: 1,
  targetComplexity: 'O(n)',
  testCases: [],
  hints: [],
  createdAt: new Date(),
});

const createContext = (pattern: string): ThinkingGateContext => ({
  problem: createProblem(pattern),
  allowedPatterns: [pattern as any],
});

describe('Thinking Gate Validator', () => {
  describe('Pattern Validation', () => {
    it('should pass when correct pattern is selected', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'The window [left, right] always contains at most k distinct characters, maintaining the invariant that the window is valid at all times.',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when wrong pattern is selected', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'BFS',
        statedInvariant: 'The window [left, right] always contains at most k distinct characters.',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(false);
      expect(result.errors.some(e => e.field === 'pattern')).toBe(true);
    });

    it('should provide helpful hint for related patterns', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'TWO_POINTERS',
        statedInvariant: 'The window [left, right] always contains the optimal substring.',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(false);
      const patternError = result.errors.find(e => e.field === 'pattern');
      expect(patternError?.code).toBe('WRONG_PATTERN_RELATED');
      expect(patternError?.hint).toContain('SLIDING_WINDOW');
    });

    it('should reject invalid pattern strings', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'INVALID_PATTERN',
        statedInvariant: 'This is a valid invariant statement for the problem.',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(false);
      const patternError = result.errors.find(e => e.field === 'pattern');
      expect(patternError?.code).toBe('INVALID_PATTERN');
    });
  });

  describe('Invariant Validation', () => {
    it('should fail when invariant is too short', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'short',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(false);
      const invariantError = result.errors.find(e => e.field === 'invariant');
      expect(invariantError?.code).toBe('INVARIANT_TOO_SHORT');
    });

    it('should fail when invariant contains filler text', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'asdf asdf asdf asdf asdf asdf asdf',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(false);
      const invariantError = result.errors.find(e => e.field === 'invariant');
      expect(invariantError?.code).toBe('INVARIANT_FILLER');
    });

    it('should pass with meaningful invariant', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'DFS',
        statedInvariant: 'The visited set always contains exactly the cells we have explored in the current path, and we backtrack by removing cells when we return from recursion.',
      };
      const context = createContext('DFS');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
    });

    it('should warn when invariant lacks pattern keywords', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'We process the array from start to finish maintaining the correct answer throughout.',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      // May pass but should have warnings
      const hasKeywordWarning = result.warnings.some(w => w.code === 'INVARIANT_MISSING_KEYWORDS');
      expect(hasKeywordWarning).toBe(true);
    });
  });

  describe('Complexity Validation', () => {
    it('should warn for incorrect complexity format', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'The window [left, right] always contains at most k distinct elements.',
        statedComplexity: 'linear time',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      const hasFormatWarning = result.warnings.some(w => w.code === 'COMPLEXITY_FORMAT');
      expect(hasFormatWarning).toBe(true);
    });

    it('should accept valid Big-O notation', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'The window [left, right] always contains at most k distinct elements.',
        statedComplexity: 'O(n)',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      const hasFormatWarning = result.warnings.some(w => w.code === 'COMPLEXITY_FORMAT');
      expect(hasFormatWarning).toBe(false);
    });
  });

  describe('Pattern-Specific Invariants', () => {
    it('should accept invariant with backtracking concepts', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'BACKTRACKING',
        statedInvariant: 'At each recursive call, we explore all valid choices, and backtrack by undoing the choice when returning from the recursion.',
      };
      const context = createContext('BACKTRACKING');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept invariant with interval merging concepts', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'INTERVAL_MERGING',
        statedInvariant: 'After sorting by start time, we iterate and merge overlapping intervals by extending the current interval end if the next interval overlaps.',
      };
      const context = createContext('INTERVAL_MERGING');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept invariant with binary search concepts', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'BINARY_SEARCH',
        statedInvariant: 'The search space [left, right] always contains the target if it exists, and we halve it each iteration by updating mid.',
      };
      const context = createContext('BINARY_SEARCH');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null complexity gracefully', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'DFS',
        statedInvariant: 'We maintain a visited set that contains all explored nodes, preventing cycles.',
        statedComplexity: null,
      };
      const context = createContext('DFS');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
    });

    it('should reject repeated character spam', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(false);
    });

    it('should pass with constraint language in invariant', () => {
      const input: ThinkingGateInput = {
        selectedPattern: 'SLIDING_WINDOW',
        statedInvariant: 'The window always contains at most k elements, and we shrink while the sum exceeds the limit.',
      };
      const context = createContext('SLIDING_WINDOW');

      const result = validateThinkingGate(input, context);

      expect(result.passed).toBe(true);
    });
  });
});
