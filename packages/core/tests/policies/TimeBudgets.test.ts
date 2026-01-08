import { describe, it, expect } from 'vitest';
import {
  PROBLEM_TIME_BUDGETS,
  DRILL_TIME_BUDGETS,
  MODE_TIME_MULTIPLIERS,
  getProblemTimeBudget,
  getDrillTimeBudget,
  isTimeOverrun,
  getTimeRemainingPercent,
} from '../../src/policies/TimeBudgets.js';

describe('TimeBudgets', () => {
  describe('PROBLEM_TIME_BUDGETS', () => {
    it('should have correct time budgets for each difficulty', () => {
      expect(PROBLEM_TIME_BUDGETS.EASY).toBe(15 * 60); // 15 minutes
      expect(PROBLEM_TIME_BUDGETS.MEDIUM).toBe(25 * 60); // 25 minutes
      expect(PROBLEM_TIME_BUDGETS.HARD).toBe(45 * 60); // 45 minutes
    });
  });

  describe('getProblemTimeBudget', () => {
    it('should apply mode multiplier to base time', () => {
      const easyGuided = getProblemTimeBudget('EASY', 'GUIDED');
      expect(easyGuided).toBe(Math.round(15 * 60 * 1.5)); // 1350 seconds

      const mediumDaily = getProblemTimeBudget('MEDIUM', 'DAILY');
      expect(mediumDaily).toBe(Math.round(25 * 60 * 0.8)); // 1200 seconds
    });

    it('should handle explorer mode with 2x multiplier', () => {
      const hardExplorer = getProblemTimeBudget('HARD', 'EXPLORER');
      expect(hardExplorer).toBe(Math.round(45 * 60 * 2.0)); // 5400 seconds
    });
  });

  describe('getDrillTimeBudget', () => {
    it('should calculate drill time with mode multiplier', () => {
      const patternRecognition = getDrillTimeBudget('PATTERN_RECOGNITION', 'INTERVIEW');
      expect(patternRecognition).toBe(60); // 1 minute, 1.0 multiplier

      const bugFixGuided = getDrillTimeBudget('BUG_FIX', 'GUIDED');
      expect(bugFixGuided).toBe(Math.round(3 * 60 * 1.5)); // 270 seconds
    });
  });

  describe('isTimeOverrun', () => {
    it('should return true when elapsed exceeds budget', () => {
      expect(isTimeOverrun(100, 90)).toBe(true);
      expect(isTimeOverrun(90, 90)).toBe(false);
      expect(isTimeOverrun(89, 90)).toBe(false);
    });
  });

  describe('getTimeRemainingPercent', () => {
    it('should calculate correct percentage', () => {
      expect(getTimeRemainingPercent(0, 100)).toBe(1);
      expect(getTimeRemainingPercent(50, 100)).toBe(0.5);
      expect(getTimeRemainingPercent(100, 100)).toBe(0);
    });

    it('should handle overrun gracefully', () => {
      expect(getTimeRemainingPercent(150, 100)).toBe(0);
    });

    it('should handle zero budget', () => {
      expect(getTimeRemainingPercent(50, 0)).toBe(0);
    });
  });
});
