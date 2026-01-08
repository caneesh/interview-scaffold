import { describe, it, expect } from 'vitest';
import {
  computeMEPDecision,
  evaluateTransfer,
  filterByTimeBudget,
  canPromote,
  selectSibling,
  getTimeBudgetedActions,
} from '../../src/mep/MEPDecisionEngine.js';
import {
  MEPAction,
  TransferResult,
  MEP_THRESHOLDS,
  TIME_COST_MODEL,
  type MEPContext,
  type MEPDecision,
  type SiblingProblem,
} from '../../src/mep/types.js';
import { PatternId, ProblemId } from '../../src/entities/types.js';

describe('MEPDecisionEngine', () => {
  const createContext = (overrides: Partial<MEPContext> = {}): MEPContext => ({
    patternId: PatternId('two-pointers'),
    currentProblemId: ProblemId('problem-1'),
    lastScore: null,
    confidence: 3,
    errorCount: 0,
    errorTypes: [],
    retryCount: 0,
    daysSinceLastPractice: 0,
    consecutiveWins: 0,
    rungLevel: 1,
    maxRung: 5,
    hasCriticalError: false,
    repeatedCriticalError: false,
    timeBudgetSec: null,
    siblingAttempted: false,
    siblingFirstTrySuccess: false,
    ...overrides,
  });

  describe('computeMEPDecision', () => {
    describe('Rule 1: Repeated critical error → MICRO_LESSON_GATE', () => {
      it('should gate when repeated critical error', () => {
        const context = createContext({ repeatedCriticalError: true });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.MICRO_LESSON_GATE);
        expect(decision.priority).toBe(1);
      });

      it('should not gate on single critical error', () => {
        const context = createContext({
          hasCriticalError: true,
          repeatedCriticalError: false,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).not.toBe(MEPAction.MICRO_LESSON_GATE);
      });
    });

    describe('Rule 2: Passed but confidence <3 → SERVE_MICRO_DRILL', () => {
      it('should serve drill when passed but low confidence', () => {
        const context = createContext({
          lastScore: 80,
          confidence: 2,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.SERVE_MICRO_DRILL);
        expect(decision.priority).toBe(2);
      });

      it('should not serve drill when confidence >= 3', () => {
        const context = createContext({
          lastScore: 80,
          confidence: 3,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).not.toBe(MEPAction.SERVE_MICRO_DRILL);
      });
    });

    describe('Rule 3: Score 50–74 or errors≥2 → SERVE_SIBLING', () => {
      it('should serve sibling when score in partial range', () => {
        const context = createContext({
          lastScore: 65,
          siblingAttempted: false,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.SERVE_SIBLING);
        expect(decision.priority).toBe(3);
      });

      it('should serve sibling when errors >= 2', () => {
        const context = createContext({
          errorCount: 2,
          siblingAttempted: false,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.SERVE_SIBLING);
      });

      it('should not serve sibling if already attempted', () => {
        const context = createContext({
          lastScore: 65,
          siblingAttempted: true,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).not.toBe(MEPAction.SERVE_SIBLING);
      });
    });

    describe('Rule 4: Mastery + confidence≥4 → PROMOTE_RUNG', () => {
      it('should promote when mastery and high confidence', () => {
        const context = createContext({
          lastScore: 95,
          confidence: 4,
          rungLevel: 1,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.PROMOTE_RUNG);
        expect(decision.priority).toBe(4);
      });

      it('should complete pattern when at max rung', () => {
        const context = createContext({
          lastScore: 95,
          confidence: 4,
          rungLevel: 5,
          maxRung: 5,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.COMPLETE_PATTERN);
      });

      it('should not promote with low confidence', () => {
        const context = createContext({
          lastScore: 95,
          confidence: 3,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).not.toBe(MEPAction.PROMOTE_RUNG);
      });
    });

    describe('Rule 5: Skill decay → SPACED_REVIEW', () => {
      it('should trigger spaced review after decay threshold', () => {
        const context = createContext({
          daysSinceLastPractice: MEP_THRESHOLDS.SKILL_DECAY_DAYS,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.SPACED_REVIEW);
        expect(decision.priority).toBe(5);
      });

      it('should not trigger before decay threshold', () => {
        const context = createContext({
          daysSinceLastPractice: MEP_THRESHOLDS.SKILL_DECAY_DAYS - 1,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).not.toBe(MEPAction.SPACED_REVIEW);
      });
    });

    describe('Rule 6: Else RETRY_SAME or sibling', () => {
      it('should retry same when under max retries', () => {
        const context = createContext({
          retryCount: 1,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.RETRY_SAME);
        expect(decision.priority).toBe(6);
      });

      it('should serve sibling after max retries exceeded', () => {
        const context = createContext({
          retryCount: MEP_THRESHOLDS.MAX_SAME_RETRIES,
        });

        const decision = computeMEPDecision(context);

        expect(decision.action).toBe(MEPAction.SERVE_SIBLING);
      });
    });

    describe('Determinism', () => {
      it('should produce same output for same input', () => {
        const context = createContext({
          lastScore: 70,
          confidence: 2,
          errorCount: 1,
        });

        const decision1 = computeMEPDecision(context);
        const decision2 = computeMEPDecision(context);

        expect(decision1.action).toBe(decision2.action);
        expect(decision1.reason).toBe(decision2.reason);
        expect(decision1.priority).toBe(decision2.priority);
      });
    });
  });

  describe('evaluateTransfer', () => {
    it('should return TRANSFER_SUCCESS when sibling first try success', () => {
      const result = evaluateTransfer(true, true);
      expect(result).toBe(TransferResult.TRANSFER_SUCCESS);
    });

    it('should return TRANSFER_FAIL when sibling not first try success', () => {
      const result = evaluateTransfer(false, true);
      expect(result).toBe(TransferResult.TRANSFER_FAIL);
    });

    it('should return NOT_APPLICABLE when sibling not attempted', () => {
      const result = evaluateTransfer(false, false);
      expect(result).toBe(TransferResult.NOT_APPLICABLE);
    });
  });

  describe('filterByTimeBudget', () => {
    const createDecision = (estimatedTimeSec: number): MEPDecision => ({
      action: MEPAction.SERVE_SIBLING,
      reason: 'test',
      targetId: null,
      patternId: PatternId('two-pointers'),
      estimatedTimeSec,
      priority: 1,
      metadata: {},
    });

    it('should return primary decision when no budget', () => {
      const decision = createDecision(600);

      const result = filterByTimeBudget(decision, null, []);

      expect(result).toBe(decision);
    });

    it('should return primary decision when fits budget', () => {
      const decision = createDecision(300);

      const result = filterByTimeBudget(decision, 600, []);

      expect(result).toBe(decision);
    });

    it('should return fallback when primary exceeds budget', () => {
      const primary = createDecision(900);
      const fallback: MEPDecision = {
        ...primary,
        action: MEPAction.SERVE_MICRO_DRILL,
        estimatedTimeSec: 60,
        priority: 2,
      };

      const result = filterByTimeBudget(primary, 300, [fallback]);

      expect(result.action).toBe(MEPAction.SERVE_MICRO_DRILL);
    });

    it('should return micro-drill when nothing fits', () => {
      const primary = createDecision(900);

      const result = filterByTimeBudget(primary, 30, []);

      expect(result.action).toBe(MEPAction.SERVE_MICRO_DRILL);
      expect(result.priority).toBe(99);
    });
  });

  describe('canPromote', () => {
    it('should allow promotion when requirements met', () => {
      const result = canPromote(80, 4, 1, 0);

      expect(result.canPromote).toBe(true);
    });

    it('should block promotion when score too low', () => {
      const result = canPromote(50, 4, 1, 0);

      expect(result.canPromote).toBe(false);
      expect(result.reason).toContain('Score');
    });

    it('should block promotion when confidence too low', () => {
      const result = canPromote(90, 2, 1, 0);

      expect(result.canPromote).toBe(false);
      expect(result.reason).toContain('Confidence');
    });

    it('should allow promotion with consecutive wins', () => {
      const result = canPromote(70, 3, 1, 3);

      expect(result.canPromote).toBe(true);
      expect(result.reason).toContain('clean wins');
    });

    it('should block promotion at max rung', () => {
      const result = canPromote(100, 5, 5, 0);

      expect(result.canPromote).toBe(false);
      expect(result.reason).toContain('max rung');
    });
  });

  describe('selectSibling', () => {
    const createSiblings = (): SiblingProblem[] => [
      {
        problemId: ProblemId('p1'),
        patternId: PatternId('two-pointers'),
        difficulty: 'HARD',
        isAttempted: false,
        estimatedTimeSec: 900,
      },
      {
        problemId: ProblemId('p2'),
        patternId: PatternId('two-pointers'),
        difficulty: 'EASY',
        isAttempted: false,
        estimatedTimeSec: 300,
      },
      {
        problemId: ProblemId('p3'),
        patternId: PatternId('two-pointers'),
        difficulty: 'MEDIUM',
        isAttempted: true,
        estimatedTimeSec: 600,
      },
    ];

    it('should select unattempted sibling', () => {
      const siblings = createSiblings();

      const result = selectSibling(siblings, null, null);

      expect(result).not.toBeNull();
      expect(result?.isAttempted).toBe(false);
    });

    it('should prefer easier siblings', () => {
      const siblings = createSiblings();

      const result = selectSibling(siblings, null, null);

      expect(result?.difficulty).toBe('EASY');
    });

    it('should filter by time budget', () => {
      const siblings = createSiblings();

      const result = selectSibling(siblings, null, 400);

      expect(result?.estimatedTimeSec).toBeLessThanOrEqual(400);
    });

    it('should exclude current problem', () => {
      const siblings = createSiblings();

      const result = selectSibling(siblings, ProblemId('p2'), null);

      expect(result?.problemId).not.toBe('p2');
    });

    it('should return null when no valid siblings', () => {
      const siblings: SiblingProblem[] = [
        {
          problemId: ProblemId('p1'),
          patternId: PatternId('two-pointers'),
          difficulty: 'HARD',
          isAttempted: true,
          estimatedTimeSec: 900,
        },
      ];

      const result = selectSibling(siblings, null, null);

      expect(result).toBeNull();
    });
  });

  describe('getTimeBudgetedActions', () => {
    it('should return actions fitting budget', () => {
      const context = createContext();

      const actions = getTimeBudgetedActions(context, 120);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.every(a => a.estimatedTimeSec <= 120)).toBe(true);
    });

    it('should include micro-drill for minimal budget', () => {
      const context = createContext();

      const actions = getTimeBudgetedActions(context, TIME_COST_MODEL.MICRO_DRILL_SEC);

      expect(actions.some(a => a.action === MEPAction.SERVE_MICRO_DRILL)).toBe(true);
    });

    it('should include more actions for larger budget', () => {
      const context = createContext();

      const small = getTimeBudgetedActions(context, 60);
      const large = getTimeBudgetedActions(context, 900);

      expect(large.length).toBeGreaterThan(small.length);
    });
  });

  describe('Time cost model', () => {
    it('should have correct time costs', () => {
      expect(TIME_COST_MODEL.MICRO_DRILL_SEC).toBe(60);
      expect(TIME_COST_MODEL.SIBLING_SEC).toBe(600);
      expect(TIME_COST_MODEL.FULL_PROBLEM_SEC).toBe(900);
    });
  });
});
