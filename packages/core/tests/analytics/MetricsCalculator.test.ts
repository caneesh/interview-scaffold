import { describe, it, expect } from 'vitest';
import {
  calculateLearningMetrics,
  calculatePatternMetrics,
  calculateAllPatternMetrics,
  calculateCumulativeProgress,
  calculateDailyMetrics,
  calculateUserMetrics,
} from '../../src/analytics/MetricsCalculator.js';
import { EventType, type AnyLearningEvent, type AnalyticsEvent } from '../../src/entities/LearningEvent.js';
import { PatternId, TenantId, UserId } from '../../src/entities/types.js';

describe('MetricsCalculator', () => {
  // Helper to create sample analytics events
  const createAnalyticsEvent = (
    type: AnalyticsEvent['type'],
    overrides: Partial<AnalyticsEvent> = {}
  ): AnalyticsEvent => ({
    id: `event-${Math.random().toString(36).slice(2)}`,
    tenantId: TenantId('tenant-1'),
    userId: UserId('user-1'),
    type,
    timestamp: Date.now(),
    metadata: {},
    patternId: PatternId('sliding-window'),
    problemId: null,
    drillId: null,
    rungLevel: null,
    timeTakenSec: 60,
    ...overrides,
  });

  describe('calculateLearningMetrics', () => {
    it('should return zero metrics for empty events', () => {
      const metrics = calculateLearningMetrics([]);

      expect(metrics.minutesPerMasteredRung).toBe(0);
      expect(metrics.errorRecurrenceRate).toBe(0);
      expect(metrics.transferSuccessRate).toBe(0);
      expect(metrics.totalRungsMastered).toBe(0);
    });

    it('should calculate minutesPerMasteredRung correctly', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.PROMOTED, { timeTakenSec: 600, rungLevel: 1 }),
        createAnalyticsEvent(EventType.PROMOTED, { timeTakenSec: 600, rungLevel: 2 }),
      ];

      const metrics = calculateLearningMetrics(events);

      // Total time: 1200 sec = 20 min, 2 rungs mastered = 10 min per rung
      expect(metrics.minutesPerMasteredRung).toBe(10);
      expect(metrics.totalRungsMastered).toBe(2);
    });

    it('should calculate transferSuccessRate correctly', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.TRANSFER_SUCCESS),
        createAnalyticsEvent(EventType.TRANSFER_SUCCESS),
        createAnalyticsEvent(EventType.TRANSFER_FAIL),
      ];

      const metrics = calculateLearningMetrics(events);

      // 2 successes out of 3 total = 0.667
      expect(metrics.transferSuccessRate).toBeCloseTo(0.667, 2);
      expect(metrics.totalTransferSuccesses).toBe(2);
      expect(metrics.totalTransferAttempts).toBe(3);
    });

    it('should calculate drillPassRate correctly', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED),
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED),
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED),
        createAnalyticsEvent(EventType.MICRO_DRILL_FAILED),
      ];

      const metrics = calculateLearningMetrics(events);

      // 3 passed out of 4 total = 0.75
      expect(metrics.drillPassRate).toBe(0.75);
    });

    it('should count hints and time overruns', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.HINT_USED),
        createAnalyticsEvent(EventType.HINT_USED),
        createAnalyticsEvent(EventType.TIME_OVERRUN),
      ];

      const metrics = calculateLearningMetrics(events);

      expect(metrics.totalHintsUsed).toBe(2);
      expect(metrics.timeOverrunCount).toBe(1);
    });

    it('should calculate errorRecurrenceRate for repeated errors', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.ERROR_DETECTED, {
          patternId: PatternId('p1'),
          problemId: 'problem-1' as any,
        }),
        createAnalyticsEvent(EventType.ERROR_DETECTED, {
          patternId: PatternId('p1'),
          problemId: 'problem-1' as any,
        }),
        createAnalyticsEvent(EventType.ERROR_DETECTED, {
          patternId: PatternId('p2'),
          problemId: 'problem-2' as any,
        }),
      ];

      const metrics = calculateLearningMetrics(events);

      // 2 unique patterns, 1 has recurrence = 0.5
      expect(metrics.errorRecurrenceRate).toBe(0.5);
    });

    it('should return 0 errorRecurrenceRate for single error', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.ERROR_DETECTED),
      ];

      const metrics = calculateLearningMetrics(events);

      expect(metrics.errorRecurrenceRate).toBe(0);
    });
  });

  describe('calculatePatternMetrics', () => {
    it('should calculate metrics for a specific pattern', () => {
      const patternId = PatternId('sliding-window');
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.PROMOTED, { patternId, timeTakenSec: 300 }),
        createAnalyticsEvent(EventType.PROMOTED, { patternId, timeTakenSec: 300 }),
        createAnalyticsEvent(EventType.ERROR_DETECTED, { patternId }),
        createAnalyticsEvent(EventType.TRANSFER_SUCCESS, { patternId }),
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED, { patternId }),
        // Different pattern - should be excluded
        createAnalyticsEvent(EventType.PROMOTED, { patternId: PatternId('two-pointers') }),
      ];

      const metrics = calculatePatternMetrics(events, patternId);

      expect(metrics.patternId).toBe(patternId);
      expect(metrics.rungsMastered).toBe(2);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.transferSuccessRate).toBe(1); // 1/1
      expect(metrics.drillPassRate).toBe(1); // 1/1
    });

    it('should return zero metrics for pattern with no events', () => {
      const metrics = calculatePatternMetrics([], PatternId('unknown'));

      expect(metrics.rungsMastered).toBe(0);
      expect(metrics.minutesPerRung).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });

  describe('calculateAllPatternMetrics', () => {
    it('should calculate metrics for all patterns in events', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.PROMOTED, { patternId: PatternId('sliding-window') }),
        createAnalyticsEvent(EventType.PROMOTED, { patternId: PatternId('two-pointers') }),
        createAnalyticsEvent(EventType.ERROR_DETECTED, { patternId: PatternId('sliding-window') }),
      ];

      const allMetrics = calculateAllPatternMetrics(events);

      expect(allMetrics.length).toBe(2);

      const swMetrics = allMetrics.find(m => m.patternId === 'sliding-window');
      expect(swMetrics).toBeDefined();
      expect(swMetrics?.rungsMastered).toBe(1);
      expect(swMetrics?.errorCount).toBe(1);

      const tpMetrics = allMetrics.find(m => m.patternId === 'two-pointers');
      expect(tpMetrics).toBeDefined();
      expect(tpMetrics?.rungsMastered).toBe(1);
      expect(tpMetrics?.errorCount).toBe(0);
    });
  });

  describe('calculateCumulativeProgress', () => {
    it('should return cumulative rung mastery over time', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.PROMOTED, { timestamp: 1000, rungLevel: 1 }),
        createAnalyticsEvent(EventType.PROMOTED, { timestamp: 2000, rungLevel: 2 }),
        createAnalyticsEvent(EventType.PROMOTED, { timestamp: 3000, rungLevel: 3 }),
      ];

      const progress = calculateCumulativeProgress(events);

      expect(progress.length).toBe(3);
      expect(progress[0]).toEqual({ timestamp: 1000, value: 1 });
      expect(progress[1]).toEqual({ timestamp: 2000, value: 2 });
      expect(progress[2]).toEqual({ timestamp: 3000, value: 3 });
    });

    it('should return empty for no promoted events', () => {
      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.ERROR_DETECTED),
      ];

      const progress = calculateCumulativeProgress(events);

      expect(progress.length).toBe(0);
    });
  });

  describe('calculateDailyMetrics', () => {
    it('should group metrics by day', () => {
      const day1 = new Date('2024-01-15T10:00:00Z').getTime();
      const day2 = new Date('2024-01-16T10:00:00Z').getTime();

      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.PROMOTED, { timestamp: day1, timeTakenSec: 300 }),
        createAnalyticsEvent(EventType.PROMOTED, { timestamp: day1, timeTakenSec: 300 }),
        createAnalyticsEvent(EventType.PROMOTED, { timestamp: day2, timeTakenSec: 600 }),
      ];

      const dailyMetrics = calculateDailyMetrics(events);

      expect(dailyMetrics.size).toBe(2);

      const day1Metrics = dailyMetrics.get('2024-01-15');
      expect(day1Metrics?.totalRungsMastered).toBe(2);

      const day2Metrics = dailyMetrics.get('2024-01-16');
      expect(day2Metrics?.totalRungsMastered).toBe(1);
    });
  });

  describe('calculateUserMetrics', () => {
    it('should calculate comprehensive metrics for a user', () => {
      const tenantId = TenantId('tenant-1');
      const userId = UserId('user-1');

      const day1 = new Date('2024-01-15').getTime();
      const day2 = new Date('2024-01-16').getTime();

      const events: AnyLearningEvent[] = [
        createAnalyticsEvent(EventType.PROMOTED, {
          tenantId,
          userId,
          timestamp: day1,
          timeTakenSec: 300,
        }),
        createAnalyticsEvent(EventType.TRANSFER_SUCCESS, {
          tenantId,
          userId,
          timestamp: day2,
          timeTakenSec: 300,
        }),
        // Different user - should be excluded
        createAnalyticsEvent(EventType.PROMOTED, {
          tenantId,
          userId: UserId('other-user'),
        }),
      ];

      const userMetrics = calculateUserMetrics(events, tenantId, userId);

      expect(userMetrics.tenantId).toBe(tenantId);
      expect(userMetrics.userId).toBe(userId);
      expect(userMetrics.metrics.totalRungsMastered).toBe(1);
      expect(userMetrics.metrics.transferSuccessRate).toBe(1);
      expect(userMetrics.activeDays).toBe(2);
    });
  });

  describe('Sample Event Metric Correctness', () => {
    it('should calculate correct metrics from comprehensive sample events', () => {
      // Simulate a learning session with various events
      const events: AnyLearningEvent[] = [
        // Day 1: User works on sliding-window
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED, { timeTakenSec: 45 }),
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED, { timeTakenSec: 30 }),
        createAnalyticsEvent(EventType.ERROR_DETECTED, { timeTakenSec: 0 }),
        createAnalyticsEvent(EventType.HINT_USED, { timeTakenSec: 0 }),
        createAnalyticsEvent(EventType.TRANSFER_SUCCESS, { timeTakenSec: 300 }),
        createAnalyticsEvent(EventType.PROMOTED, { timeTakenSec: 600, rungLevel: 1 }),

        // Day 2: User continues
        createAnalyticsEvent(EventType.MICRO_DRILL_FAILED, { timeTakenSec: 60 }),
        createAnalyticsEvent(EventType.MICRO_DRILL_PASSED, { timeTakenSec: 40 }),
        createAnalyticsEvent(EventType.TIME_OVERRUN, { timeTakenSec: 0 }),
        createAnalyticsEvent(EventType.TRANSFER_FAIL, { timeTakenSec: 400 }),
        createAnalyticsEvent(EventType.PROMOTED, { timeTakenSec: 700, rungLevel: 2 }),
      ];

      const metrics = calculateLearningMetrics(events);

      // Verify counts
      expect(metrics.totalRungsMastered).toBe(2);
      expect(metrics.totalHintsUsed).toBe(1);
      expect(metrics.totalErrors).toBe(1);
      expect(metrics.timeOverrunCount).toBe(1);

      // Verify rates
      expect(metrics.transferSuccessRate).toBe(0.5); // 1/2
      expect(metrics.drillPassRate).toBe(0.75); // 3/4

      // Verify time calculation
      // Total time: 45+30+0+0+300+600+60+40+0+400+700 = 2175 sec = 36.25 min
      expect(metrics.totalLearningTimeMinutes).toBeCloseTo(36.25, 1);

      // Minutes per rung: 36.25 / 2 = 18.125
      expect(metrics.minutesPerMasteredRung).toBeCloseTo(18.125, 1);
    });
  });
});
