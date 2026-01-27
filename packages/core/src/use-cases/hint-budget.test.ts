/**
 * Hint Budget System Tests
 *
 * Tests for the V2 hint budget system including budget calculation,
 * consumption, and penalty scoring.
 */

import { describe, it, expect } from 'vitest';
import {
  getV2HintBudget,
  canRequestV2Hint,
  getV2NextHintLevel,
  consumeV2Hint,
  getV2HintBudgetState,
  calculateV2InitialHintBudget,
  getV2HintLevelDescription,
  isV2HighRevealHint,
  calculateV2HintPenalty,
  validateV2HintBudget,
  V2_HINT_BUDGET_BY_RUNG,
  V2_MIN_HINTS,
  V2_MAX_HINTS,
  type V2HintBudgetAttempt,
} from './hint-budget.js';
import type { RungLevel } from '../entities/rung.js';

// ============ Test Fixtures ============

function createHintAttempt(
  rung: RungLevel,
  hintsUsedCount: number = 0
): V2HintBudgetAttempt {
  return {
    rung,
    hintBudget: getV2HintBudget(rung),
    hintsUsedCount,
  };
}

// ============ Budget Tests ============

describe('hint-budget', () => {
  describe('getV2HintBudget', () => {
    it('should return correct budget by rung', () => {
      expect(getV2HintBudget(1)).toBe(6); // Beginners get most hints
      expect(getV2HintBudget(2)).toBe(5);
      expect(getV2HintBudget(3)).toBe(4);
      expect(getV2HintBudget(4)).toBe(3);
      expect(getV2HintBudget(5)).toBe(2); // Advanced get fewest hints
    });

    it('should match V2_HINT_BUDGET_BY_RUNG constant', () => {
      const rungs: RungLevel[] = [1, 2, 3, 4, 5];
      for (const rung of rungs) {
        expect(getV2HintBudget(rung)).toBe(V2_HINT_BUDGET_BY_RUNG[rung]);
      }
    });

    it('should enforce minimum hint budget', () => {
      // Even if we somehow get an invalid rung, should be >= MIN
      const budget = getV2HintBudget(3);
      expect(budget).toBeGreaterThanOrEqual(V2_MIN_HINTS);
    });

    it('should enforce maximum hint budget', () => {
      const budget = getV2HintBudget(1);
      expect(budget).toBeLessThanOrEqual(V2_MAX_HINTS);
    });
  });

  describe('canRequestV2Hint', () => {
    it('should return true when under budget', () => {
      const attempt = createHintAttempt(3, 0); // 0/4 used
      expect(canRequestV2Hint(attempt)).toBe(true);
    });

    it('should return true when one below budget', () => {
      const attempt = createHintAttempt(3, 3); // 3/4 used
      expect(canRequestV2Hint(attempt)).toBe(true);
    });

    it('should return false when at budget', () => {
      const attempt = createHintAttempt(3, 4); // 4/4 used
      expect(canRequestV2Hint(attempt)).toBe(false);
    });

    it('should return false when over budget', () => {
      const attempt = createHintAttempt(3, 5); // 5/4 used (edge case)
      expect(canRequestV2Hint(attempt)).toBe(false);
    });

    it('should work for rung 1 with highest budget', () => {
      const attempt = createHintAttempt(1, 5); // 5/6 used
      expect(canRequestV2Hint(attempt)).toBe(true);
    });

    it('should work for rung 5 with lowest budget', () => {
      const attempt = createHintAttempt(5, 1); // 1/2 used
      expect(canRequestV2Hint(attempt)).toBe(true);
    });
  });

  describe('getV2NextHintLevel', () => {
    it('should return 1 for first hint', () => {
      expect(getV2NextHintLevel(0)).toBe(1);
    });

    it('should return 2 for second hint', () => {
      expect(getV2NextHintLevel(1)).toBe(2);
    });

    it('should return progressive levels', () => {
      expect(getV2NextHintLevel(0)).toBe(1);
      expect(getV2NextHintLevel(1)).toBe(2);
      expect(getV2NextHintLevel(2)).toBe(3);
      expect(getV2NextHintLevel(3)).toBe(4);
      expect(getV2NextHintLevel(4)).toBe(5);
    });

    it('should return null when at level 5 cap', () => {
      expect(getV2NextHintLevel(5)).toBe(null);
    });

    it('should return null when beyond level 5', () => {
      expect(getV2NextHintLevel(6)).toBe(null);
      expect(getV2NextHintLevel(10)).toBe(null);
    });
  });

  describe('consumeV2Hint', () => {
    it('should consume hint and return remaining', () => {
      const attempt = createHintAttempt(3, 0); // 0/4 used
      const result = consumeV2Hint(attempt);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(3); // 4 - 1 = 3
      expect(result.hintLevel).toBe(1);
      expect(result.error).toBeUndefined();
    });

    it('should increment hint count correctly', () => {
      const attempt = createHintAttempt(3, 2); // 2/4 used
      const result = consumeV2Hint(attempt);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1); // 4 - 3 = 1
      expect(result.hintLevel).toBe(3);
    });

    it('should consume last hint successfully', () => {
      const attempt = createHintAttempt(3, 3); // 3/4 used
      const result = consumeV2Hint(attempt);

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.hintLevel).toBe(4);
    });

    it('should fail when budget exhausted', () => {
      const attempt = createHintAttempt(3, 4); // 4/4 used
      const result = consumeV2Hint(attempt);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.hintLevel).toBe(0);
      expect(result.error).toBe('Hint budget exhausted');
    });

    it('should cap hint level at 5', () => {
      const attempt = createHintAttempt(1, 5); // 5/6 used, next would be level 6
      const result = consumeV2Hint(attempt);

      expect(result.success).toBe(true);
      expect(result.hintLevel).toBe(5); // Capped at 5
    });
  });

  describe('getV2HintBudgetState', () => {
    it('should return complete state for fresh attempt', () => {
      const attempt = createHintAttempt(3, 0);
      const state = getV2HintBudgetState(attempt);

      expect(state.total).toBe(4);
      expect(state.used).toBe(0);
      expect(state.remaining).toBe(4);
      expect(state.isExhausted).toBe(false);
      expect(state.nextHintLevel).toBe(1);
    });

    it('should return state after hints used', () => {
      const attempt = createHintAttempt(3, 2);
      const state = getV2HintBudgetState(attempt);

      expect(state.total).toBe(4);
      expect(state.used).toBe(2);
      expect(state.remaining).toBe(2);
      expect(state.isExhausted).toBe(false);
      expect(state.nextHintLevel).toBe(3);
    });

    it('should show exhausted when budget consumed', () => {
      const attempt = createHintAttempt(3, 4);
      const state = getV2HintBudgetState(attempt);

      expect(state.total).toBe(4);
      expect(state.used).toBe(4);
      expect(state.remaining).toBe(0);
      expect(state.isExhausted).toBe(true);
      expect(state.nextHintLevel).toBe(5);
    });

    it('should handle negative remaining gracefully', () => {
      const attempt = createHintAttempt(3, 5); // Over budget
      const state = getV2HintBudgetState(attempt);

      expect(state.remaining).toBe(0); // Clamped to 0
      expect(state.isExhausted).toBe(true);
    });

    it('should cap next hint level', () => {
      const attempt = createHintAttempt(1, 6); // 6/6 used
      const state = getV2HintBudgetState(attempt);

      expect(state.nextHintLevel).toBe(null); // Beyond level 5
    });
  });

  describe('calculateV2InitialHintBudget', () => {
    it('should return budget for each rung', () => {
      expect(calculateV2InitialHintBudget(1)).toBe(6);
      expect(calculateV2InitialHintBudget(2)).toBe(5);
      expect(calculateV2InitialHintBudget(3)).toBe(4);
      expect(calculateV2InitialHintBudget(4)).toBe(3);
      expect(calculateV2InitialHintBudget(5)).toBe(2);
    });

    it('should match getV2HintBudget', () => {
      const rungs: RungLevel[] = [1, 2, 3, 4, 5];
      for (const rung of rungs) {
        expect(calculateV2InitialHintBudget(rung)).toBe(getV2HintBudget(rung));
      }
    });
  });

  describe('getV2HintLevelDescription', () => {
    it('should return descriptions for levels 1-5', () => {
      expect(getV2HintLevelDescription(1)).toContain('Question');
      expect(getV2HintLevelDescription(2)).toContain('Conceptual');
      expect(getV2HintLevelDescription(3)).toContain('Invariant');
      expect(getV2HintLevelDescription(4)).toContain('Structural');
      expect(getV2HintLevelDescription(5)).toContain('Focused');
    });

    it('should return default for invalid level', () => {
      expect(getV2HintLevelDescription(0)).toBe('Additional guidance');
      expect(getV2HintLevelDescription(6)).toBe('Additional guidance');
    });
  });

  describe('isV2HighRevealHint', () => {
    it('should return false for levels 1-3', () => {
      expect(isV2HighRevealHint(1)).toBe(false);
      expect(isV2HighRevealHint(2)).toBe(false);
      expect(isV2HighRevealHint(3)).toBe(false);
    });

    it('should return true for levels 4-5', () => {
      expect(isV2HighRevealHint(4)).toBe(true);
      expect(isV2HighRevealHint(5)).toBe(true);
    });

    it('should return true for higher levels', () => {
      expect(isV2HighRevealHint(6)).toBe(true);
      expect(isV2HighRevealHint(10)).toBe(true);
    });
  });

  describe('calculateV2HintPenalty', () => {
    it('should return 0 penalty for no hints', () => {
      expect(calculateV2HintPenalty(0, 100)).toBe(0);
    });

    it('should return 0 penalty for first hint (encourages asking)', () => {
      expect(calculateV2HintPenalty(1, 100)).toBe(0);
    });

    it('should calculate 5% penalty per hint after first', () => {
      expect(calculateV2HintPenalty(2, 100)).toBe(5); // 1 * 5%
      expect(calculateV2HintPenalty(3, 100)).toBe(10); // 2 * 5%
      expect(calculateV2HintPenalty(4, 100)).toBe(15); // 3 * 5%
    });

    it('should cap penalty at 25% of max score', () => {
      expect(calculateV2HintPenalty(10, 100)).toBe(25); // Capped
      expect(calculateV2HintPenalty(20, 100)).toBe(25); // Still capped
    });

    it('should scale with max score', () => {
      expect(calculateV2HintPenalty(2, 200)).toBe(10); // 5% of 200
      expect(calculateV2HintPenalty(3, 50)).toBe(5); // 10% of 50
    });

    it('should cap penalty relative to max score', () => {
      expect(calculateV2HintPenalty(10, 200)).toBe(50); // 25% of 200
    });

    it('should handle hint usage reducing score by expected amount', () => {
      const maxScore = 100;
      const hintsUsed = 4;
      const penalty = calculateV2HintPenalty(hintsUsed, maxScore);
      const finalScore = maxScore - penalty;

      expect(penalty).toBe(15); // 3 hints * 5%
      expect(finalScore).toBe(85);
    });
  });

  describe('validateV2HintBudget', () => {
    it('should validate correct budget and usage', () => {
      const result = validateV2HintBudget(4, 2);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate budget at minimum', () => {
      const result = validateV2HintBudget(V2_MIN_HINTS, 0);
      expect(result.valid).toBe(true);
    });

    it('should validate budget at maximum', () => {
      const result = validateV2HintBudget(V2_MAX_HINTS, 0);
      expect(result.valid).toBe(true);
    });

    it('should reject budget below minimum', () => {
      const result = validateV2HintBudget(V2_MIN_HINTS - 1, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between');
    });

    it('should reject budget above maximum', () => {
      const result = validateV2HintBudget(V2_MAX_HINTS + 1, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('between');
    });

    it('should reject negative hints used', () => {
      const result = validateV2HintBudget(4, -1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be negative');
    });

    it('should reject hints used exceeding budget', () => {
      const result = validateV2HintBudget(4, 5);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed budget');
    });

    it('should allow hints used equal to budget', () => {
      const result = validateV2HintBudget(4, 4);
      expect(result.valid).toBe(true);
    });
  });

  describe('Budget progression by rung', () => {
    it('should decrease budget as skill increases', () => {
      expect(getV2HintBudget(1)).toBeGreaterThan(getV2HintBudget(2));
      expect(getV2HintBudget(2)).toBeGreaterThan(getV2HintBudget(3));
      expect(getV2HintBudget(3)).toBeGreaterThan(getV2HintBudget(4));
      expect(getV2HintBudget(4)).toBeGreaterThan(getV2HintBudget(5));
    });

    it('should provide meaningful difference between rungs', () => {
      const budgets = [1, 2, 3, 4, 5].map((r) => getV2HintBudget(r as RungLevel));
      const differences = budgets.slice(0, -1).map((b, i) => b - budgets[i + 1]!);

      // Each step should reduce by 1
      for (const diff of differences) {
        expect(diff).toBe(1);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle zero budget edge case', () => {
      const attempt: V2HintBudgetAttempt = {
        rung: 3,
        hintBudget: 0,
        hintsUsedCount: 0,
      };

      expect(canRequestV2Hint(attempt)).toBe(false);
    });

    it('should handle very high usage count', () => {
      const attempt = createHintAttempt(3, 100);
      const result = consumeV2Hint(attempt);

      expect(result.success).toBe(false);
    });

    it('should handle state when all hints at max level consumed', () => {
      const attempt = createHintAttempt(1, 5); // Level 5 hints
      const state = getV2HintBudgetState(attempt);

      expect(state.nextHintLevel).toBe(null); // Can't go beyond 5
    });
  });
});
