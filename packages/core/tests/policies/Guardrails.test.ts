import { describe, it, expect } from 'vitest';
import {
  checkGuardrails,
  checkPromotionRequirements,
  GuardrailAction,
  GUARDRAIL_THRESHOLDS,
} from '../../src/policies/Guardrails.js';
import { PatternId, ProblemId } from '../../src/entities/types.js';

describe('Guardrails', () => {
  describe('checkGuardrails', () => {
    const createBaseInput = () => ({
      patternId: PatternId('sliding-window'),
      currentProblemId: ProblemId('problem-1'),
      recentSiblingAttempts: [],
      consecutiveCleanWins: 0,
      confidenceLevel: 3,
      passedDrillsCount: 0,
      timeRatio: 1.0,
      currentProblemRetries: 0,
      rungLevel: 1,
      maxRung: 5,
      hasMetPromotionRequirements: false,
    });

    describe('Repeated Sibling Failures (Rule: 2 sibling failures same error → lesson + drills)', () => {
      it('should trigger MICRO_LESSON_GATE when 2 siblings fail with same error', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          recentSiblingAttempts: [
            { problemId: ProblemId('sibling-1'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
            { problemId: ProblemId('sibling-2'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
          ],
        });

        expect(result.action).toBe(GuardrailAction.MICRO_LESSON_GATE);
        expect(result.metadata).toHaveProperty('repeatedErrorType', 'NESTED_LOOP_IN_SLIDING_WINDOW');
        expect(result.metadata).toHaveProperty('failureCount', 2);
      });

      it('should NOT trigger when sibling failures have different errors', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          recentSiblingAttempts: [
            { problemId: ProblemId('sibling-1'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
            { problemId: ProblemId('sibling-2'), errorTypes: ['OFF_BY_ONE'], passed: false },
          ],
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });

      it('should NOT trigger when only 1 sibling failed', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          recentSiblingAttempts: [
            { problemId: ProblemId('sibling-1'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
          ],
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });

      it('should NOT count passed attempts', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          recentSiblingAttempts: [
            { problemId: ProblemId('sibling-1'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: true },
            { problemId: ProblemId('sibling-2'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
          ],
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });
    });

    describe('Time Overrun (Rule: TIME_OVERRUN → prioritize drill/discovery)', () => {
      it('should trigger PRIORITIZE_DISCOVERY when time overrun exceeds threshold', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          timeRatio: 1.6, // 60% over (threshold is 50%)
        });

        expect(result.action).toBe(GuardrailAction.PRIORITIZE_DISCOVERY);
        expect(result.metadata).toHaveProperty('timeRatio', 1.6);
      });

      it('should NOT trigger when exactly at threshold', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          timeRatio: 1.5, // Exactly 50% over
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });

      it('should NOT trigger when under time budget', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          timeRatio: 0.8,
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });
    });

    describe('Max Retries', () => {
      it('should trigger FORCE_MOVE_TO_SIBLING when max retries reached', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          currentProblemRetries: GUARDRAIL_THRESHOLDS.MAX_SAME_PROBLEM_RETRIES,
        });

        expect(result.action).toBe(GuardrailAction.FORCE_MOVE_TO_SIBLING);
        expect(result.metadata).toHaveProperty('retryCount', GUARDRAIL_THRESHOLDS.MAX_SAME_PROBLEM_RETRIES);
      });

      it('should NOT trigger when below max retries', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          currentProblemRetries: GUARDRAIL_THRESHOLDS.MAX_SAME_PROBLEM_RETRIES - 1,
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });
    });

    describe('Clean Wins Promotion (Rule: 3 clean wins → promote or switch pattern)', () => {
      it('should trigger PROMOTE_RUNG with 3 clean wins and high confidence', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          consecutiveCleanWins: 3,
          confidenceLevel: 4,
          rungLevel: 2,
          maxRung: 5,
        });

        expect(result.action).toBe(GuardrailAction.PROMOTE_RUNG);
        expect(result.metadata).toHaveProperty('cleanWins', 3);
        expect(result.metadata).toHaveProperty('currentRung', 2);
        expect(result.metadata).toHaveProperty('nextRung', 3);
      });

      it('should trigger PROMOTE_RUNG with stabilization via drills', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          consecutiveCleanWins: 3,
          confidenceLevel: 2, // Low confidence
          passedDrillsCount: 3, // But stabilized via drills
          rungLevel: 1,
          maxRung: 5,
        });

        expect(result.action).toBe(GuardrailAction.PROMOTE_RUNG);
      });

      it('should trigger SERVE_DRILLS when clean wins but no confidence or stabilization', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          consecutiveCleanWins: 3,
          confidenceLevel: 2, // Low confidence
          passedDrillsCount: 1, // Not enough drills
          rungLevel: 1,
          maxRung: 5,
        });

        expect(result.action).toBe(GuardrailAction.SERVE_DRILLS);
        expect(result.metadata).toHaveProperty('needsConfidence', true);
        expect(result.metadata).toHaveProperty('needsStabilization', true);
      });

      it('should trigger SWITCH_PATTERN when at max rung with clean wins', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          consecutiveCleanWins: 3,
          confidenceLevel: 5,
          rungLevel: 5,
          maxRung: 5,
        });

        expect(result.action).toBe(GuardrailAction.SWITCH_PATTERN);
        expect(result.metadata).toHaveProperty('currentRung', 5);
        expect(result.metadata).toHaveProperty('maxRung', 5);
      });

      it('should NOT trigger with less than 3 clean wins', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          consecutiveCleanWins: 2,
          confidenceLevel: 5,
        });

        expect(result.action).toBe(GuardrailAction.CONTINUE);
      });
    });

    describe('Priority Order', () => {
      it('should prioritize sibling failures over time overrun', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          recentSiblingAttempts: [
            { problemId: ProblemId('sibling-1'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
            { problemId: ProblemId('sibling-2'), errorTypes: ['NESTED_LOOP_IN_SLIDING_WINDOW'], passed: false },
          ],
          timeRatio: 2.0, // Also over time
        });

        expect(result.action).toBe(GuardrailAction.MICRO_LESSON_GATE);
      });

      it('should prioritize time overrun over max retries', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          timeRatio: 2.0,
          currentProblemRetries: 5,
        });

        expect(result.action).toBe(GuardrailAction.PRIORITIZE_DISCOVERY);
      });

      it('should prioritize max retries over promotion', () => {
        const result = checkGuardrails({
          ...createBaseInput(),
          currentProblemRetries: 5,
          consecutiveCleanWins: 3,
          confidenceLevel: 5,
        });

        expect(result.action).toBe(GuardrailAction.FORCE_MOVE_TO_SIBLING);
      });
    });
  });

  describe('checkPromotionRequirements', () => {
    it('should allow promotion with high confidence attempt', () => {
      const result = checkPromotionRequirements({
        confidenceLevel: 4,
        passedDrillsCount: 0,
        hasAttemptWithHighConfidence: true,
      });

      expect(result.canPromote).toBe(true);
      expect(result.via).toBe('confidence');
    });

    it('should allow promotion via current high confidence level', () => {
      const result = checkPromotionRequirements({
        confidenceLevel: 4,
        passedDrillsCount: 0,
        hasAttemptWithHighConfidence: false,
      });

      expect(result.canPromote).toBe(true);
      expect(result.via).toBe('confidence');
    });

    it('should allow promotion via stabilization (passed drills)', () => {
      const result = checkPromotionRequirements({
        confidenceLevel: 2,
        passedDrillsCount: 3,
        hasAttemptWithHighConfidence: false,
      });

      expect(result.canPromote).toBe(true);
      expect(result.via).toBe('stabilization');
    });

    it('should NOT allow promotion without confidence or stabilization', () => {
      const result = checkPromotionRequirements({
        confidenceLevel: 2,
        passedDrillsCount: 1,
        hasAttemptWithHighConfidence: false,
      });

      expect(result.canPromote).toBe(false);
      expect(result.via).toBe('not_met');
    });
  });

  describe('Guardrail Constants', () => {
    it('should have correct threshold values', () => {
      expect(GUARDRAIL_THRESHOLDS.SIBLING_FAILURES_SAME_ERROR).toBe(2);
      expect(GUARDRAIL_THRESHOLDS.CLEAN_WINS_FOR_PROMOTION).toBe(3);
      expect(GUARDRAIL_THRESHOLDS.TIME_OVERRUN_PERCENT).toBe(0.5);
      expect(GUARDRAIL_THRESHOLDS.MIN_CONFIDENCE_FOR_PROMOTION).toBe(4);
      expect(GUARDRAIL_THRESHOLDS.MIN_DRILLS_FOR_STABILIZATION).toBe(3);
    });
  });
});
