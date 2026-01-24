/**
 * State Machine Tests
 * Tests gate transitions, retry limits, and policy checks.
 */

import { describe, it, expect } from 'vitest';
import {
  getNextGate,
  getGateIndex,
  isFinalGate,
  hasExhaustedRetries,
  getRemainingRetries,
  computeTransition,
  formatGateName,
  canRequestHint,
  DEFAULT_RETRY_LIMITS,
  GATE_ORDER,
} from './state-machine.js';
import type { DebugAttempt, EvaluationResult, DebugPolicyConfig } from './entities.js';
import { DEFAULT_DEBUG_POLICY } from './entities.js';

// ============ Test Helpers ============

function createMockAttempt(overrides: Partial<DebugAttempt> = {}): DebugAttempt {
  return {
    attemptId: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    scenarioId: 'scenario-1',
    currentGate: 'SYMPTOM_CLASSIFICATION',
    gateHistory: [],
    hintsUsed: 0,
    timers: [],
    status: 'IN_PROGRESS',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: null,
    scoreJson: null,
    retriesPerGate: {
      SYMPTOM_CLASSIFICATION: 0,
      DETERMINISM_ANALYSIS: 0,
      PATTERN_CLASSIFICATION: 0,
      ROOT_CAUSE_HYPOTHESIS: 0,
      FIX_STRATEGY: 0,
      REGRESSION_PREVENTION: 0,
      REFLECTION: 0,
    },
    ...overrides,
  };
}

function createPassResult(): EvaluationResult {
  return {
    isCorrect: true,
    confidence: 1.0,
    feedback: 'Correct',
    rubricScores: {
      ACCURACY: 1.0,
      COMPLETENESS: 1.0,
      SPECIFICITY: 1.0,
      TECHNICAL_DEPTH: 1.0,
      CLARITY: 1.0,
      ACTIONABILITY: 1.0,
    },
    nextGate: 'DETERMINISM_ANALYSIS',
    allowProceed: true,
  };
}

function createFailResult(): EvaluationResult {
  return {
    isCorrect: false,
    confidence: 0.0,
    feedback: 'Incorrect',
    rubricScores: {
      ACCURACY: 0.0,
      COMPLETENESS: 0.0,
      SPECIFICITY: 0.0,
      TECHNICAL_DEPTH: 0.0,
      CLARITY: 0.0,
      ACTIONABILITY: 0.0,
    },
    nextGate: null,
    allowProceed: false,
  };
}

// ============ Tests ============

describe('Gate Transitions', () => {
  describe('getNextGate', () => {
    it('returns correct next gate for each gate', () => {
      expect(getNextGate('SYMPTOM_CLASSIFICATION')).toBe('DETERMINISM_ANALYSIS');
      expect(getNextGate('DETERMINISM_ANALYSIS')).toBe('PATTERN_CLASSIFICATION');
      expect(getNextGate('PATTERN_CLASSIFICATION')).toBe('ROOT_CAUSE_HYPOTHESIS');
      expect(getNextGate('ROOT_CAUSE_HYPOTHESIS')).toBe('FIX_STRATEGY');
      expect(getNextGate('FIX_STRATEGY')).toBe('REGRESSION_PREVENTION');
      expect(getNextGate('REGRESSION_PREVENTION')).toBe('REFLECTION');
      expect(getNextGate('REFLECTION')).toBe(null);
    });
  });

  describe('getGateIndex', () => {
    it('returns correct index for each gate', () => {
      expect(getGateIndex('SYMPTOM_CLASSIFICATION')).toBe(0);
      expect(getGateIndex('DETERMINISM_ANALYSIS')).toBe(1);
      expect(getGateIndex('PATTERN_CLASSIFICATION')).toBe(2);
      expect(getGateIndex('ROOT_CAUSE_HYPOTHESIS')).toBe(3);
      expect(getGateIndex('FIX_STRATEGY')).toBe(4);
      expect(getGateIndex('REGRESSION_PREVENTION')).toBe(5);
      expect(getGateIndex('REFLECTION')).toBe(6);
    });
  });

  describe('isFinalGate', () => {
    it('returns true only for REFLECTION', () => {
      expect(isFinalGate('SYMPTOM_CLASSIFICATION')).toBe(false);
      expect(isFinalGate('PATTERN_CLASSIFICATION')).toBe(false);
      expect(isFinalGate('REFLECTION')).toBe(true);
    });
  });

  describe('GATE_ORDER', () => {
    it('contains all 7 gates in correct order', () => {
      expect(GATE_ORDER).toHaveLength(7);
      expect(GATE_ORDER[0]).toBe('SYMPTOM_CLASSIFICATION');
      expect(GATE_ORDER[6]).toBe('REFLECTION');
    });
  });
});

describe('Retry Limits', () => {
  describe('hasExhaustedRetries', () => {
    it('returns false when retries remaining', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
        retriesPerGate: {
          SYMPTOM_CLASSIFICATION: 1,
          DETERMINISM_ANALYSIS: 0,
          PATTERN_CLASSIFICATION: 0,
          ROOT_CAUSE_HYPOTHESIS: 0,
          FIX_STRATEGY: 0,
          REGRESSION_PREVENTION: 0,
          REFLECTION: 0,
        },
      });

      expect(hasExhaustedRetries(attempt)).toBe(false);
    });

    it('returns true when retries exhausted', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
        retriesPerGate: {
          SYMPTOM_CLASSIFICATION: 3, // Default limit is 3
          DETERMINISM_ANALYSIS: 0,
          PATTERN_CLASSIFICATION: 0,
          ROOT_CAUSE_HYPOTHESIS: 0,
          FIX_STRATEGY: 0,
          REGRESSION_PREVENTION: 0,
          REFLECTION: 0,
        },
      });

      expect(hasExhaustedRetries(attempt)).toBe(true);
    });
  });

  describe('getRemainingRetries', () => {
    it('calculates remaining retries correctly', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
        retriesPerGate: {
          SYMPTOM_CLASSIFICATION: 1,
          DETERMINISM_ANALYSIS: 0,
          PATTERN_CLASSIFICATION: 0,
          ROOT_CAUSE_HYPOTHESIS: 0,
          FIX_STRATEGY: 0,
          REGRESSION_PREVENTION: 0,
          REFLECTION: 0,
        },
      });

      // SYMPTOM_CLASSIFICATION has limit of 3
      expect(getRemainingRetries(attempt)).toBe(2);
    });

    it('returns 0 when no retries remaining', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
        retriesPerGate: {
          SYMPTOM_CLASSIFICATION: 5, // More than limit
          DETERMINISM_ANALYSIS: 0,
          PATTERN_CLASSIFICATION: 0,
          ROOT_CAUSE_HYPOTHESIS: 0,
          FIX_STRATEGY: 0,
          REGRESSION_PREVENTION: 0,
          REFLECTION: 0,
        },
      });

      expect(getRemainingRetries(attempt)).toBe(0);
    });
  });
});

describe('computeTransition', () => {
  describe('on correct answer', () => {
    it('transitions to next gate', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
      });
      const result = computeTransition(attempt, createPassResult());

      expect(result.allowed).toBe(true);
      expect(result.nextGate).toBe('DETERMINISM_ANALYSIS');
      expect(result.attemptCompleted).toBe(false);
    });

    it('completes attempt on final gate', () => {
      const attempt = createMockAttempt({
        currentGate: 'REFLECTION',
      });
      const result = computeTransition(attempt, createPassResult());

      expect(result.allowed).toBe(true);
      expect(result.nextGate).toBe(null);
      expect(result.attemptCompleted).toBe(true);
    });
  });

  describe('on incorrect answer', () => {
    it('stays on current gate with retries remaining', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
        retriesPerGate: {
          SYMPTOM_CLASSIFICATION: 1, // After this fail, will be 2
          DETERMINISM_ANALYSIS: 0,
          PATTERN_CLASSIFICATION: 0,
          ROOT_CAUSE_HYPOTHESIS: 0,
          FIX_STRATEGY: 0,
          REGRESSION_PREVENTION: 0,
          REFLECTION: 0,
        },
      });
      const result = computeTransition(attempt, createFailResult());

      expect(result.allowed).toBe(false);
      expect(result.nextGate).toBe('SYMPTOM_CLASSIFICATION');
      expect(result.attemptCompleted).toBe(false);
      expect(result.reason).toContain('retries remaining');
    });

    it('proceeds with penalty when retries exhausted', () => {
      const attempt = createMockAttempt({
        currentGate: 'SYMPTOM_CLASSIFICATION',
        retriesPerGate: {
          SYMPTOM_CLASSIFICATION: 3, // At limit, next fail exhausts
          DETERMINISM_ANALYSIS: 0,
          PATTERN_CLASSIFICATION: 0,
          ROOT_CAUSE_HYPOTHESIS: 0,
          FIX_STRATEGY: 0,
          REGRESSION_PREVENTION: 0,
          REFLECTION: 0,
        },
      });
      const result = computeTransition(attempt, createFailResult());

      expect(result.allowed).toBe(true);
      expect(result.nextGate).toBe('DETERMINISM_ANALYSIS');
      expect(result.reason).toContain('Retries exhausted');
    });
  });
});

describe('formatGateName', () => {
  it('formats gate names for display', () => {
    expect(formatGateName('SYMPTOM_CLASSIFICATION')).toBe('Symptom Classification');
    expect(formatGateName('ROOT_CAUSE_HYPOTHESIS')).toBe('Root Cause Hypothesis');
    expect(formatGateName('REGRESSION_PREVENTION')).toBe('Regression Prevention');
  });
});

describe('Policy Checks', () => {
  describe('canRequestHint', () => {
    it('allows hints when under limit', () => {
      const attempt = createMockAttempt({ hintsUsed: 2 });
      const policy: DebugPolicyConfig = { ...DEFAULT_DEBUG_POLICY, maxHintsPerAttempt: 5 };

      const result = canRequestHint(attempt, policy, 10);
      expect(result.allowed).toBe(true);
    });

    it('denies hints when at limit', () => {
      const attempt = createMockAttempt({ hintsUsed: 5 });
      const policy: DebugPolicyConfig = { ...DEFAULT_DEBUG_POLICY, maxHintsPerAttempt: 5 };

      const result = canRequestHint(attempt, policy, 10);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum hints');
    });

    it('denies hints when hint ladder exhausted', () => {
      const attempt = createMockAttempt({ hintsUsed: 3 });
      const policy: DebugPolicyConfig = { ...DEFAULT_DEBUG_POLICY, maxHintsPerAttempt: 10 };

      const result = canRequestHint(attempt, policy, 3); // Only 3 hints in ladder
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('All available hints');
    });
  });
});
