/**
 * Attempt V2 State Machine Tests
 *
 * Tests for state transition logic in the V2 5-step flow.
 * Validates transition rules, preconditions, and error handling.
 */

import { describe, it, expect } from 'vitest';
import {
  assertCanTransition,
  canTransition,
  getValidNextSteps,
  isTerminalState,
  InvalidTransitionError,
} from './attempt-v2-state-machine.js';
import type { Attempt, AttemptV2Step, AttemptV2Mode } from '../entities/attempt.js';

// ============ Test Fixtures ============

/**
 * Create a minimal V2 attempt for testing
 */
function createV2Attempt(
  step: AttemptV2Step,
  mode: AttemptV2Mode = 'BEGINNER',
  overrides: Partial<Attempt> = {}
): Attempt {
  const base: Attempt = {
    id: 'test-attempt',
    tenantId: 'test-tenant',
    userId: 'test-user',
    pattern: 'SLIDING_WINDOW' as any,
    rung: 3,
    state: 'CODING',
    steps: [],
    hintsUsed: [],
    codeSubmissions: 0,
    score: null,
    startedAt: new Date(),
    completedAt: null,
    mode,
    v2Step: step,
    understandPayload: null,
    planPayload: null,
    verifyPayload: null,
    reflectPayload: null,
    hintBudget: 4,
    hintsUsedCount: 0,
    problemId: 'test-problem',
    ...overrides,
  };
  return base;
}

/**
 * Create attempt with UNDERSTAND assessment passed
 */
function createUnderstandPassedAttempt(mode: AttemptV2Mode = 'BEGINNER'): Attempt {
  return createV2Attempt('UNDERSTAND', mode, {
    understandPayload: {
      explanation: 'Test explanation',
      inputOutputDescription: 'Test I/O',
      constraintsDescription: 'Test constraints',
      exampleWalkthrough: 'Test walkthrough',
      wrongApproach: 'Test wrong approach',
      aiAssessment: {
        status: 'PASS',
        strengths: ['Good understanding'],
        gaps: [],
        followupQuestions: [],
      },
      followups: [],
    },
  });
}

/**
 * Create attempt with pattern chosen
 */
function createPatternChosenAttempt(mode: AttemptV2Mode = 'BEGINNER'): Attempt {
  return createV2Attempt('PLAN', mode, {
    planPayload: {
      suggestedPatterns: [],
      chosenPattern: 'SLIDING_WINDOW',
      userConfidence: 4,
      invariant: {
        text: 'Window maintains at most k distinct elements',
        builderUsed: false,
      },
      complexity: 'O(n)',
      discoveryTriggered: false,
    },
  });
}

/**
 * Create attempt with code submitted
 */
function createCodeSubmittedAttempt(): Attempt {
  return createV2Attempt('IMPLEMENT', 'BEGINNER', {
    codeSubmissions: 1,
  });
}

/**
 * Create attempt with test results
 */
function createTestResultsAttempt(): Attempt {
  return createV2Attempt('VERIFY', 'BEGINNER', {
    codeSubmissions: 1,
    verifyPayload: {
      testResults: [
        {
          testIndex: 0,
          passed: true,
          input: '[1,2,3]',
          expected: '6',
          actual: '6',
          isHidden: false,
        },
      ],
      failureExplanations: [],
      traceNotes: null,
    },
  });
}

// ============ State Machine Tests ============

describe('attempt-v2-state-machine', () => {
  describe('assertCanTransition', () => {
    describe('UNDERSTAND -> PLAN transitions', () => {
      it('should allow transition when AI assessment PASS', () => {
        const attempt = createUnderstandPassedAttempt('BEGINNER');
        expect(() => assertCanTransition(attempt, 'PLAN')).not.toThrow();
      });

      it('should block transition when AI assessment not passed (beginner)', () => {
        const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
          understandPayload: {
            explanation: 'Test',
            inputOutputDescription: 'Test',
            constraintsDescription: 'Test',
            exampleWalkthrough: 'Test',
            wrongApproach: 'Test',
            aiAssessment: {
              status: 'NEEDS_WORK',
              strengths: [],
              gaps: ['Missing key insight'],
              followupQuestions: ['What about edge cases?'],
            },
            followups: [],
          },
        });

        expect(() => assertCanTransition(attempt, 'PLAN')).toThrow(InvalidTransitionError);
        expect(() => assertCanTransition(attempt, 'PLAN')).toThrow(/Understanding not yet validated/);
      });

      it('should allow transition skip in EXPERT mode', () => {
        const attempt = createV2Attempt('UNDERSTAND', 'EXPERT', {
          understandPayload: null, // No assessment needed
        });
        expect(() => assertCanTransition(attempt, 'PLAN')).not.toThrow();
      });

      it('should block transition without AI assessment in BEGINNER mode', () => {
        const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
          understandPayload: null,
        });

        expect(() => assertCanTransition(attempt, 'PLAN')).toThrow(InvalidTransitionError);
      });
    });

    describe('PLAN -> IMPLEMENT transitions', () => {
      it('should allow transition when pattern chosen', () => {
        const attempt = createPatternChosenAttempt('BEGINNER');
        expect(() => assertCanTransition(attempt, 'IMPLEMENT')).not.toThrow();
      });

      it('should block transition without pattern (beginner)', () => {
        const attempt = createV2Attempt('PLAN', 'BEGINNER', {
          planPayload: {
            suggestedPatterns: [],
            chosenPattern: null,
            userConfidence: null,
            invariant: null,
            complexity: null,
            discoveryTriggered: false,
          },
        });

        expect(() => assertCanTransition(attempt, 'IMPLEMENT')).toThrow(InvalidTransitionError);
        expect(() => assertCanTransition(attempt, 'IMPLEMENT')).toThrow(/No pattern selected/);
      });

      it('should allow transition skip in EXPERT mode', () => {
        const attempt = createV2Attempt('PLAN', 'EXPERT', {
          planPayload: null, // No pattern selection needed
        });
        expect(() => assertCanTransition(attempt, 'IMPLEMENT')).not.toThrow();
      });
    });

    describe('IMPLEMENT -> VERIFY transitions', () => {
      it('should allow transition with code submitted', () => {
        const attempt = createCodeSubmittedAttempt();
        expect(() => assertCanTransition(attempt, 'VERIFY')).not.toThrow();
      });

      it('should block transition without code', () => {
        const attempt = createV2Attempt('IMPLEMENT', 'BEGINNER', {
          codeSubmissions: 0,
        });

        expect(() => assertCanTransition(attempt, 'VERIFY')).toThrow(InvalidTransitionError);
        expect(() => assertCanTransition(attempt, 'VERIFY')).toThrow(/No code submitted/);
      });
    });

    describe('VERIFY -> REFLECT transitions', () => {
      it('should allow transition after tests run', () => {
        const attempt = createTestResultsAttempt();
        expect(() => assertCanTransition(attempt, 'REFLECT')).not.toThrow();
      });

      it('should block transition without test results', () => {
        const attempt = createV2Attempt('VERIFY', 'BEGINNER', {
          codeSubmissions: 1,
          verifyPayload: null,
        });

        expect(() => assertCanTransition(attempt, 'VERIFY')).toThrow(InvalidTransitionError);
      });

      it('should allow transition even when tests fail', () => {
        const attempt = createV2Attempt('VERIFY', 'BEGINNER', {
          codeSubmissions: 1,
          verifyPayload: {
            testResults: [
              {
                testIndex: 0,
                passed: false,
                input: '[1,2,3]',
                expected: '6',
                actual: '7',
                isHidden: false,
              },
            ],
            failureExplanations: [],
            traceNotes: null,
          },
        });

        expect(() => assertCanTransition(attempt, 'REFLECT')).not.toThrow();
      });
    });

    describe('VERIFY -> IMPLEMENT transitions (retry)', () => {
      it('should allow retry from VERIFY to IMPLEMENT', () => {
        const attempt = createTestResultsAttempt();
        expect(() => assertCanTransition(attempt, 'IMPLEMENT')).not.toThrow();
      });
    });

    describe('REFLECT -> COMPLETE transitions', () => {
      it('should allow transition always', () => {
        const attempt = createV2Attempt('REFLECT', 'BEGINNER');
        expect(() => assertCanTransition(attempt, 'COMPLETE')).not.toThrow();
      });
    });

    describe('Invalid transitions', () => {
      it('should throw 409 error on invalid transition path', () => {
        const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER');

        try {
          assertCanTransition(attempt, 'IMPLEMENT');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidTransitionError);
          expect((error as InvalidTransitionError).code).toBe('INVALID_TRANSITION_PATH');
          expect((error as InvalidTransitionError).currentStep).toBe('UNDERSTAND');
          expect((error as InvalidTransitionError).targetStep).toBe('IMPLEMENT');
        }
      });

      it('should throw error for legacy attempt', () => {
        const legacyAttempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
          v2Step: null, // Legacy
        });

        try {
          assertCanTransition(legacyAttempt, 'PLAN');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidTransitionError);
          expect((error as InvalidTransitionError).code).toBe('NOT_V2_ATTEMPT');
        }
      });

      it('should throw error when trying to transition to UNDERSTAND', () => {
        const attempt = createV2Attempt('PLAN', 'BEGINNER');

        try {
          assertCanTransition(attempt, 'UNDERSTAND');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidTransitionError);
          expect((error as InvalidTransitionError).message).toContain('UNDERSTAND');
        }
      });

      it('should throw error from COMPLETE (terminal state)', () => {
        const attempt = createV2Attempt('COMPLETE', 'BEGINNER');

        try {
          assertCanTransition(attempt, 'REFLECT');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidTransitionError);
          expect((error as InvalidTransitionError).code).toBe('INVALID_TRANSITION_PATH');
        }
      });
    });

    describe('Error suggestions', () => {
      it('should provide helpful suggestion for blocked transition', () => {
        const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
          understandPayload: null,
        });

        try {
          assertCanTransition(attempt, 'PLAN');
          expect.fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidTransitionError);
          expect((error as InvalidTransitionError).suggestion).toBeDefined();
          expect((error as InvalidTransitionError).suggestion).toContain('AI feedback');
        }
      });
    });
  });

  describe('canTransition', () => {
    it('should return allowed: true for valid transition', () => {
      const attempt = createUnderstandPassedAttempt('BEGINNER');
      const result = canTransition(attempt, 'PLAN');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return allowed: false with reason for invalid transition', () => {
      const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
        understandPayload: null,
      });
      const result = canTransition(attempt, 'PLAN');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.suggestion).toBeDefined();
    });

    it('should not throw on invalid transition', () => {
      const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER');
      expect(() => canTransition(attempt, 'IMPLEMENT')).not.toThrow();
    });
  });

  describe('getValidNextSteps', () => {
    it('should return PLAN when UNDERSTAND passed', () => {
      const attempt = createUnderstandPassedAttempt('BEGINNER');
      const nextSteps = getValidNextSteps(attempt);

      expect(nextSteps).toContain('PLAN');
      expect(nextSteps).toHaveLength(1);
    });

    it('should return empty when UNDERSTAND not passed (beginner)', () => {
      const attempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
        understandPayload: null,
      });
      const nextSteps = getValidNextSteps(attempt);

      expect(nextSteps).toHaveLength(0);
    });

    it('should return IMPLEMENT when pattern chosen', () => {
      const attempt = createPatternChosenAttempt('BEGINNER');
      const nextSteps = getValidNextSteps(attempt);

      expect(nextSteps).toContain('IMPLEMENT');
      expect(nextSteps).toHaveLength(1);
    });

    it('should return both IMPLEMENT and REFLECT from VERIFY', () => {
      const attempt = createTestResultsAttempt();
      const nextSteps = getValidNextSteps(attempt);

      expect(nextSteps).toContain('IMPLEMENT');
      expect(nextSteps).toContain('REFLECT');
      expect(nextSteps).toHaveLength(2);
    });

    it('should return COMPLETE from REFLECT', () => {
      const attempt = createV2Attempt('REFLECT', 'BEGINNER');
      const nextSteps = getValidNextSteps(attempt);

      expect(nextSteps).toContain('COMPLETE');
      expect(nextSteps).toHaveLength(1);
    });

    it('should return empty for terminal COMPLETE state', () => {
      const attempt = createV2Attempt('COMPLETE', 'BEGINNER');
      const nextSteps = getValidNextSteps(attempt);

      expect(nextSteps).toHaveLength(0);
    });

    it('should return empty for legacy attempt', () => {
      const legacyAttempt = createV2Attempt('UNDERSTAND', 'BEGINNER', {
        v2Step: null,
      });
      const nextSteps = getValidNextSteps(legacyAttempt);

      expect(nextSteps).toHaveLength(0);
    });

    it('should allow skipping in EXPERT mode', () => {
      const expertAttempt = createV2Attempt('UNDERSTAND', 'EXPERT', {
        understandPayload: null,
      });
      const nextSteps = getValidNextSteps(expertAttempt);

      expect(nextSteps).toContain('PLAN');
    });
  });

  describe('isTerminalState', () => {
    it('should return true for COMPLETE v2Step', () => {
      const attempt = createV2Attempt('COMPLETE', 'BEGINNER');
      expect(isTerminalState(attempt)).toBe(true);
    });

    it('should return true for COMPLETED state', () => {
      const attempt = createV2Attempt('REFLECT', 'BEGINNER', {
        state: 'COMPLETED',
      });
      expect(isTerminalState(attempt)).toBe(true);
    });

    it('should return true for ABANDONED state', () => {
      const attempt = createV2Attempt('IMPLEMENT', 'BEGINNER', {
        state: 'ABANDONED',
      });
      expect(isTerminalState(attempt)).toBe(true);
    });

    it('should return false for in-progress steps', () => {
      const steps: AttemptV2Step[] = ['UNDERSTAND', 'PLAN', 'IMPLEMENT', 'VERIFY', 'REFLECT'];

      for (const step of steps) {
        const attempt = createV2Attempt(step, 'BEGINNER');
        expect(isTerminalState(attempt)).toBe(false);
      }
    });
  });

  describe('Mode-specific behavior', () => {
    it('should allow EXPERT to skip UNDERSTAND gate', () => {
      const expert = createV2Attempt('UNDERSTAND', 'EXPERT');
      expect(() => assertCanTransition(expert, 'PLAN')).not.toThrow();
    });

    it('should allow EXPERT to skip PLAN gate', () => {
      const expert = createV2Attempt('PLAN', 'EXPERT');
      expect(() => assertCanTransition(expert, 'IMPLEMENT')).not.toThrow();
    });

    it('should require BEGINNER to complete gates', () => {
      const beginner = createV2Attempt('UNDERSTAND', 'BEGINNER');
      expect(() => assertCanTransition(beginner, 'PLAN')).toThrow();
    });
  });
});
