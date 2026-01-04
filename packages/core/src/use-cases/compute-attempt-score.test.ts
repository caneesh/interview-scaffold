import { describe, it, expect } from 'vitest';
import {
  computeAttemptScore,
  SCORING_CONSTANTS,
} from './compute-attempt-score.js';
import type { Attempt } from '../entities/attempt.js';
import type { Step } from '../entities/step.js';

function createBaseAttempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 'attempt-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    problemId: 'problem-1',
    pattern: 'SLIDING_WINDOW',
    rung: 1,
    state: 'COMPLETED',
    steps: [],
    hintsUsed: [],
    codeSubmissions: 1,
    score: null,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:05:00Z'),
    ...overrides,
  };
}

function createThinkingStep(result: 'PASS' | 'FAIL'): Step {
  return {
    id: 'step-thinking',
    attemptId: 'attempt-1',
    type: 'THINKING_GATE',
    result,
    data: {
      type: 'THINKING_GATE',
      selectedPattern: 'SLIDING_WINDOW',
      statedInvariant: 'Some invariant',
      statedComplexity: 'O(n)',
    },
    startedAt: new Date(),
    completedAt: new Date(),
  };
}

function createCodingStep(testResults: Array<{ passed: boolean }>): Step {
  return {
    id: 'step-coding',
    attemptId: 'attempt-1',
    type: 'CODING',
    result: testResults.every((t) => t.passed) ? 'PASS' : 'FAIL',
    data: {
      type: 'CODING',
      code: 'function solution() {}',
      language: 'javascript',
      testResults: testResults.map((t, i) => ({
        input: `input-${i}`,
        expected: 'expected',
        actual: t.passed ? 'expected' : 'wrong',
        passed: t.passed,
        error: t.passed ? null : 'Mismatch',
      })),
    },
    startedAt: new Date(),
    completedAt: new Date(),
  };
}

function createReflectionStep(result: 'PASS' | 'FAIL'): Step {
  return {
    id: 'step-reflection',
    attemptId: 'attempt-1',
    type: 'REFLECTION',
    result,
    data: {
      type: 'REFLECTION',
      selectedOptionId: 'option-1',
      correct: result === 'PASS',
    },
    startedAt: new Date(),
    completedAt: new Date(),
  };
}

describe('computeAttemptScore', () => {
  describe('perfect attempt', () => {
    it('returns maximum base score (100) for perfect attempt', () => {
      const attempt = createBaseAttempt({
        steps: [
          createThinkingStep('PASS'),
          createCodingStep([{ passed: true }, { passed: true }]),
        ],
      });

      const result = computeAttemptScore({ attempt });

      expect(result.score.patternRecognition).toBe(100);
      expect(result.score.implementation).toBe(100);
      expect(result.score.edgeCases).toBe(100);
      expect(result.score.efficiency).toBe(100);
    });

    it('awards bonuses for perfect performance', () => {
      const attempt = createBaseAttempt({
        steps: [createThinkingStep('PASS')],
        codeSubmissions: 1,
        completedAt: new Date('2024-01-01T10:05:00Z'), // 5 min = fast
      });

      const result = computeAttemptScore({ attempt });

      // Perfect thinking (5) + first try pass (10) + no hints (5) + fast (5) = 25
      expect(result.score.bonus).toBe(25);
    });
  });

  describe('penalties', () => {
    it('penalizes thinking gate failures', () => {
      const attempt = createBaseAttempt({
        steps: [
          createThinkingStep('FAIL'),
          createThinkingStep('PASS'),
        ],
      });

      const result = computeAttemptScore({ attempt });

      expect(result.score.patternRecognition).toBe(
        100 - SCORING_CONSTANTS.THINKING_GATE_FAIL_PENALTY
      );
    });

    it('penalizes extra code submissions', () => {
      const attempt = createBaseAttempt({
        codeSubmissions: 5,
      });

      const result = computeAttemptScore({ attempt });

      // 5 - 2 = 3 extra submissions, 3 * 5 = 15 penalty
      expect(result.score.implementation).toBe(
        100 - 3 * SCORING_CONSTANTS.SUBMISSION_PENALTY
      );
    });

    it('penalizes failed test cases', () => {
      const attempt = createBaseAttempt({
        steps: [
          createCodingStep([
            { passed: true },
            { passed: false },
            { passed: false },
          ]),
        ],
      });

      const result = computeAttemptScore({ attempt });

      // 2 failed tests * 2 penalty = 4
      expect(result.score.edgeCases).toBe(
        100 - 2 * SCORING_CONSTANTS.FAILED_TEST_PENALTY
      );
    });

    it('penalizes hint usage based on level', () => {
      const attempt = createBaseAttempt({
        hintsUsed: ['DIRECTIONAL_QUESTION', 'HEURISTIC_HINT'],
      });

      const result = computeAttemptScore({ attempt });

      const expectedPenalty =
        SCORING_CONSTANTS.HINT_PENALTIES.DIRECTIONAL_QUESTION +
        SCORING_CONSTANTS.HINT_PENALTIES.HEURISTIC_HINT;
      expect(result.score.efficiency).toBe(100 - expectedPenalty);
    });

    it('penalizes reflection failures', () => {
      const attempt = createBaseAttempt({
        steps: [createReflectionStep('FAIL')],
      });

      const result = computeAttemptScore({ attempt });

      expect(result.score.implementation).toBe(
        100 - SCORING_CONSTANTS.REFLECTION_FAIL_PENALTY
      );
    });
  });

  describe('bonuses', () => {
    it('awards bonus for perfect thinking gate', () => {
      const perfectThinking = createBaseAttempt({
        steps: [createThinkingStep('PASS')],
        codeSubmissions: 2, // More than 1 to not get first-try bonus
      });

      const result = computeAttemptScore({ attempt: perfectThinking });

      expect(result.score.bonus).toBeGreaterThanOrEqual(
        SCORING_CONSTANTS.BONUS_PERFECT_THINKING
      );
    });

    it('awards bonus for first try code pass', () => {
      const firstTry = createBaseAttempt({
        codeSubmissions: 1,
        steps: [
          createThinkingStep('FAIL'), // Failed thinking to not get that bonus
          createThinkingStep('PASS'),
        ],
      });

      const result = computeAttemptScore({ attempt: firstTry });

      expect(result.score.bonus).toBeGreaterThanOrEqual(
        SCORING_CONSTANTS.BONUS_FIRST_TRY_PASS
      );
    });

    it('awards bonus for no hints', () => {
      const noHints = createBaseAttempt({
        hintsUsed: [],
        codeSubmissions: 2,
        steps: [
          createThinkingStep('FAIL'),
          createThinkingStep('PASS'),
        ],
      });

      const result = computeAttemptScore({ attempt: noHints });

      expect(result.score.bonus).toBeGreaterThanOrEqual(
        SCORING_CONSTANTS.BONUS_NO_HINTS
      );
    });

    it('awards bonus for fast completion', () => {
      const fast = createBaseAttempt({
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:05:00Z'), // 5 min < 10 min threshold
        codeSubmissions: 2,
        steps: [
          createThinkingStep('FAIL'),
          createThinkingStep('PASS'),
        ],
      });

      const result = computeAttemptScore({ attempt: fast });

      expect(result.score.bonus).toBeGreaterThanOrEqual(
        SCORING_CONSTANTS.BONUS_FAST_COMPLETION
      );
    });

    it('does not award fast completion bonus for slow attempts', () => {
      const slow = createBaseAttempt({
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:30:00Z'), // 30 min > 10 min threshold
        hintsUsed: ['PATCH_SNIPPET'], // Remove no hints bonus
        codeSubmissions: 2, // Remove first try bonus
        steps: [
          createThinkingStep('FAIL'), // Remove perfect thinking bonus
          createThinkingStep('PASS'),
        ],
      });

      const result = computeAttemptScore({ attempt: slow });

      // Only no hints bonus is possible, but we used a hint
      expect(result.score.bonus).toBe(0);
    });
  });

  describe('overall score calculation', () => {
    it('computes weighted average of components plus bonus', () => {
      const attempt = createBaseAttempt({
        steps: [createThinkingStep('PASS')],
        codeSubmissions: 1,
      });

      const result = computeAttemptScore({ attempt });

      // All components at 100, bonus is 25 (max)
      // 100 * 0.25 + 100 * 0.35 + 100 * 0.25 + 100 * 0.15 = 100
      // 100 + 25 = 125, but capped at 100
      expect(result.score.overall).toBe(100);
    });

    it('clamps component scores to 0', () => {
      const terrible = createBaseAttempt({
        steps: [
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'),
          createThinkingStep('FAIL'), // 11 failures = 110 penalty
        ],
      });

      const result = computeAttemptScore({ attempt: terrible });

      expect(result.score.patternRecognition).toBe(0);
      expect(result.score.patternRecognition).toBeGreaterThanOrEqual(0);
    });
  });

  describe('score is 0-100 range', () => {
    it('returns scores between 0 and 100', () => {
      const attempt = createBaseAttempt();
      const result = computeAttemptScore({ attempt });

      expect(result.score.overall).toBeGreaterThanOrEqual(0);
      expect(result.score.overall).toBeLessThanOrEqual(100);
      expect(result.score.patternRecognition).toBeGreaterThanOrEqual(0);
      expect(result.score.patternRecognition).toBeLessThanOrEqual(100);
      expect(result.score.implementation).toBeGreaterThanOrEqual(0);
      expect(result.score.implementation).toBeLessThanOrEqual(100);
      expect(result.score.edgeCases).toBeGreaterThanOrEqual(0);
      expect(result.score.edgeCases).toBeLessThanOrEqual(100);
      expect(result.score.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.score.efficiency).toBeLessThanOrEqual(100);
      expect(result.score.bonus).toBeGreaterThanOrEqual(0);
      expect(result.score.bonus).toBeLessThanOrEqual(25);
    });
  });
});
