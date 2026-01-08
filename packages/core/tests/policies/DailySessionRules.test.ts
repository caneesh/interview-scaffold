import { describe, it, expect } from 'vitest';
import {
  calculateDailySessionConfig,
  calculateNextReviewDate,
  calculateItemPriority,
  DAILY_LIMITS,
  SPACED_REPETITION,
  DAILY_MODE_10MIN,
  DailyModeBlock,
  createDailyModeState,
  advanceDailyModeBlock,
  isBlockTimedOut,
  getDailyModeBlockInfo,
  validateDailyModeDuration,
} from '../../src/policies/DailySessionRules.js';
import { PatternId } from '../../src/entities/types.js';

describe('DailySessionRules', () => {
  describe('calculateDailySessionConfig', () => {
    it('should return default config when no params provided', () => {
      const config = calculateDailySessionConfig({});

      expect(config.totalItems).toBe(DAILY_LIMITS.DEFAULT_ITEMS);
      expect(config.targetTimeSec).toBe(DAILY_LIMITS.TARGET_TIME_SEC);
    });

    it('should respect preferred item count', () => {
      const config = calculateDailySessionConfig({
        preferredItemCount: 7,
      });

      expect(config.totalItems).toBe(7);
    });

    it('should cap at max items', () => {
      const config = calculateDailySessionConfig({
        preferredItemCount: 20,
      });

      expect(config.totalItems).toBe(DAILY_LIMITS.MAX_ITEMS);
    });

    it('should include focus patterns', () => {
      const weakPatterns = [PatternId('pattern-1'), PatternId('pattern-2'), PatternId('pattern-3')];
      const config = calculateDailySessionConfig({
        weakPatterns,
      });

      expect(config.focusPatterns).toEqual(weakPatterns);
    });

    it('should limit focus patterns to 3', () => {
      const manyPatterns = [
        PatternId('p1'),
        PatternId('p2'),
        PatternId('p3'),
        PatternId('p4'),
        PatternId('p5'),
      ];
      const config = calculateDailySessionConfig({
        weakPatterns: manyPatterns,
      });

      expect(config.focusPatterns.length).toBe(3);
    });
  });

  describe('calculateNextReviewDate', () => {
    it('should double interval on success', () => {
      const lastReview = Date.now();
      const nextReview = calculateNextReviewDate({
        lastReviewDate: lastReview,
        wasSuccessful: true,
        currentIntervalDays: 2,
      });

      const expectedDays = 4;
      const msPerDay = 24 * 60 * 60 * 1000;
      expect(nextReview).toBe(lastReview + expectedDays * msPerDay);
    });

    it('should halve interval on failure', () => {
      const lastReview = Date.now();
      const nextReview = calculateNextReviewDate({
        lastReviewDate: lastReview,
        wasSuccessful: false,
        currentIntervalDays: 4,
      });

      const expectedDays = 2;
      const msPerDay = 24 * 60 * 60 * 1000;
      expect(nextReview).toBe(lastReview + expectedDays * msPerDay);
    });

    it('should cap at max interval', () => {
      const lastReview = Date.now();
      const nextReview = calculateNextReviewDate({
        lastReviewDate: lastReview,
        wasSuccessful: true,
        currentIntervalDays: 25,
      });

      const msPerDay = 24 * 60 * 60 * 1000;
      const maxInterval = SPACED_REPETITION.MAX_INTERVAL_DAYS * msPerDay;
      expect(nextReview).toBeLessThanOrEqual(lastReview + maxInterval);
    });

    it('should not go below min interval', () => {
      const lastReview = Date.now();
      const nextReview = calculateNextReviewDate({
        lastReviewDate: lastReview,
        wasSuccessful: false,
        currentIntervalDays: 1,
      });

      const msPerDay = 24 * 60 * 60 * 1000;
      expect(nextReview).toBe(lastReview + SPACED_REPETITION.MIN_INTERVAL_DAYS * msPerDay);
    });
  });

  describe('calculateItemPriority', () => {
    it('should give highest priority to items due for review', () => {
      const dueForReview = calculateItemPriority({
        isDueForReview: true,
        isWeakPattern: false,
        isNew: false,
        daysSinceLastPractice: 7,
        streakDays: 0,
      });

      const notDue = calculateItemPriority({
        isDueForReview: false,
        isWeakPattern: false,
        isNew: false,
        daysSinceLastPractice: 7,
        streakDays: 0,
      });

      expect(dueForReview).toBeGreaterThan(notDue);
    });

    it('should prioritize weak patterns', () => {
      const weakPattern = calculateItemPriority({
        isDueForReview: false,
        isWeakPattern: true,
        isNew: false,
        daysSinceLastPractice: 2,
        streakDays: 0,
      });

      const strongPattern = calculateItemPriority({
        isDueForReview: false,
        isWeakPattern: false,
        isNew: false,
        daysSinceLastPractice: 2,
        streakDays: 0,
      });

      expect(weakPattern).toBeGreaterThan(strongPattern);
    });

    it('should penalize recently practiced items', () => {
      const recent = calculateItemPriority({
        isDueForReview: false,
        isWeakPattern: false,
        isNew: true,
        daysSinceLastPractice: 0.5,
        streakDays: 0,
      });

      const notRecent = calculateItemPriority({
        isDueForReview: false,
        isWeakPattern: false,
        isNew: true,
        daysSinceLastPractice: 2,
        streakDays: 0,
      });

      expect(recent).toBeLessThan(notRecent);
    });
  });

  describe('10-Minute Daily Mode', () => {
    describe('DAILY_MODE_10MIN configuration', () => {
      it('should have total duration of 600 seconds', () => {
        expect(DAILY_MODE_10MIN.TOTAL_DURATION_SEC).toBe(600);
      });

      it('should have Block A (spaced review) of 120 seconds', () => {
        expect(DAILY_MODE_10MIN.BLOCK_A_SPACED_REVIEW.DURATION_SEC).toBe(120);
      });

      it('should have Block B (MEP task) of 360 seconds', () => {
        expect(DAILY_MODE_10MIN.BLOCK_B_MEP_TASK.DURATION_SEC).toBe(360);
      });

      it('should have Block C (reflection) of 120 seconds', () => {
        expect(DAILY_MODE_10MIN.BLOCK_C_REFLECTION.DURATION_SEC).toBe(120);
      });

      it('should validate that blocks sum to total (600s)', () => {
        expect(validateDailyModeDuration()).toBe(true);
      });

      it('should have blocks that sum to exactly 600 seconds', () => {
        const total =
          DAILY_MODE_10MIN.BLOCK_A_SPACED_REVIEW.DURATION_SEC +
          DAILY_MODE_10MIN.BLOCK_B_MEP_TASK.DURATION_SEC +
          DAILY_MODE_10MIN.BLOCK_C_REFLECTION.DURATION_SEC;

        expect(total).toBe(600);
      });
    });

    describe('createDailyModeState', () => {
      it('should start with SPACED_REVIEW block', () => {
        const state = createDailyModeState(Date.now());

        expect(state.currentBlock).toBe(DailyModeBlock.SPACED_REVIEW);
        expect(state.isComplete).toBe(false);
        expect(state.blocksCompleted).toHaveLength(0);
      });

      it('should initialize with zero elapsed time', () => {
        const state = createDailyModeState(Date.now());

        expect(state.totalTimeElapsedSec).toBe(0);
      });
    });

    describe('advanceDailyModeBlock', () => {
      it('should advance from SPACED_REVIEW to MEP_TASK', () => {
        const startTime = Date.now();
        const state = createDailyModeState(startTime);
        const nextState = advanceDailyModeBlock(state, startTime + 120000); // 2 minutes later

        expect(nextState.currentBlock).toBe(DailyModeBlock.MEP_TASK);
        expect(nextState.blocksCompleted).toContain(DailyModeBlock.SPACED_REVIEW);
        expect(nextState.isComplete).toBe(false);
      });

      it('should advance from MEP_TASK to REFLECTION', () => {
        const startTime = Date.now();
        let state = createDailyModeState(startTime);
        state = advanceDailyModeBlock(state, startTime + 120000);
        state = advanceDailyModeBlock(state, startTime + 480000); // 8 minutes total

        expect(state.currentBlock).toBe(DailyModeBlock.REFLECTION);
        expect(state.blocksCompleted).toContain(DailyModeBlock.SPACED_REVIEW);
        expect(state.blocksCompleted).toContain(DailyModeBlock.MEP_TASK);
      });

      it('should mark complete after REFLECTION block', () => {
        const startTime = Date.now();
        let state = createDailyModeState(startTime);
        state = advanceDailyModeBlock(state, startTime + 120000);
        state = advanceDailyModeBlock(state, startTime + 480000);
        state = advanceDailyModeBlock(state, startTime + 600000); // 10 minutes total

        expect(state.isComplete).toBe(true);
        expect(state.blocksCompleted).toContain(DailyModeBlock.REFLECTION);
      });
    });

    describe('isBlockTimedOut', () => {
      it('should return true when SPACED_REVIEW block exceeds 120 seconds', () => {
        const startTime = Date.now();
        const state = createDailyModeState(startTime);

        expect(isBlockTimedOut(state, startTime + 119000)).toBe(false);
        expect(isBlockTimedOut(state, startTime + 120000)).toBe(true);
      });

      it('should return true when MEP_TASK block exceeds 360 seconds', () => {
        const startTime = Date.now();
        let state = createDailyModeState(startTime);
        state = advanceDailyModeBlock(state, startTime + 120000);

        expect(isBlockTimedOut(state, startTime + 120000 + 359000)).toBe(false);
        expect(isBlockTimedOut(state, startTime + 120000 + 360000)).toBe(true);
      });

      it('should return true when REFLECTION block exceeds 120 seconds', () => {
        const startTime = Date.now();
        let state = createDailyModeState(startTime);
        state = advanceDailyModeBlock(state, startTime + 120000);
        state = advanceDailyModeBlock(state, startTime + 480000);

        expect(isBlockTimedOut(state, startTime + 480000 + 119000)).toBe(false);
        expect(isBlockTimedOut(state, startTime + 480000 + 120000)).toBe(true);
      });
    });

    describe('getDailyModeBlockInfo', () => {
      it('should return SPACED_REVIEW info for initial state', () => {
        const state = createDailyModeState(Date.now());
        const info = getDailyModeBlockInfo(state);

        expect(info.block).toBe(DailyModeBlock.SPACED_REVIEW);
        expect(info.name).toBe('Spaced Review');
        expect(info.durationSec).toBe(120);
      });

      it('should return MEP_TASK info after first block', () => {
        const startTime = Date.now();
        let state = createDailyModeState(startTime);
        state = advanceDailyModeBlock(state, startTime + 120000);
        const info = getDailyModeBlockInfo(state);

        expect(info.block).toBe(DailyModeBlock.MEP_TASK);
        expect(info.name).toBe('Focused Practice');
        expect(info.durationSec).toBe(360);
      });

      it('should return REFLECTION info after second block', () => {
        const startTime = Date.now();
        let state = createDailyModeState(startTime);
        state = advanceDailyModeBlock(state, startTime + 120000);
        state = advanceDailyModeBlock(state, startTime + 480000);
        const info = getDailyModeBlockInfo(state);

        expect(info.block).toBe(DailyModeBlock.REFLECTION);
        expect(info.name).toBe('Reflection');
        expect(info.durationSec).toBe(120);
      });
    });

    describe('Daily Session Fits 600s', () => {
      it('should complete entire session within 600 seconds', () => {
        const startTime = 0;
        let state = createDailyModeState(startTime);

        // Block A: 120s
        state = advanceDailyModeBlock(state, 120000);
        expect(state.currentBlock).toBe(DailyModeBlock.MEP_TASK);

        // Block B: 360s (120 + 360 = 480)
        state = advanceDailyModeBlock(state, 480000);
        expect(state.currentBlock).toBe(DailyModeBlock.REFLECTION);

        // Block C: 120s (480 + 120 = 600)
        state = advanceDailyModeBlock(state, 600000);
        expect(state.isComplete).toBe(true);
        expect(state.totalTimeElapsedSec).toBeLessThanOrEqual(600);
      });
    });
  });
});
